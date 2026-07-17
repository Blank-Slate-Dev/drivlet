// src/app/api/bookings/[id]/forms/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Booking from "@/models/Booking";
import User from "@/models/User";
import SignedForm, { FormType } from "@/models/SignedForm";
import { sendSignedFormEmail } from "@/lib/email";

// A driver may only submit/view forms for bookings they are assigned to
// (pickup or return leg) — mirrors the photos route.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function isAssignedDriver(sessionUserId: string, booking: any): Promise<boolean> {
  const user = await User.findById(sessionUserId).select("driverProfile");
  if (!user?.driverProfile) return false;
  const profileId = user.driverProfile.toString();
  return (
    booking.assignedDriverId?.toString() === profileId ||
    booking.returnDriverId?.toString() === profileId
  );
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: bookingId } = await params;

  try {
    await connectDB();

    // Verify booking exists first
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    // Auth check: must be logged in as the booking owner, an assigned driver, or admin
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const isAdmin = session.user.role === "admin";
    const isOwner =
      (session.user.id && booking.userId?.toString() === session.user.id) ||
      (session.user.email && booking.userEmail?.toLowerCase() === session.user.email.toLowerCase());
    // Drivers must be assigned to this booking (pickup or return leg)
    const isDriver =
      session.user.role === "driver" &&
      !!session.user.id &&
      (await isAssignedDriver(session.user.id, booking));

    if (!isAdmin && !isOwner && !isDriver) {
      return NextResponse.json(
        { error: "Not authorized to submit forms for this booking" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      formType,
      formData,
      signatures,
      privacyAcknowledged,
      submittedByName,
      submittedByEmail,
    } = body as {
      formType: FormType;
      formData: Record<string, unknown>;
      signatures: { customer?: string; driver?: string };
      privacyAcknowledged: boolean;
      submittedByName: string;
      submittedByEmail?: string;
    };

    // Validate form type
    const validTypes: FormType[] = [
      "pickup_consent",
      "return_confirmation",
      "claim_lodgement",
    ];
    if (!validTypes.includes(formType)) {
      return NextResponse.json(
        { error: "Invalid form type" },
        { status: 400 }
      );
    }

    // Dispute path: on the return form the customer can refuse to sign.
    // The form is still recorded (with the driver's signature) and flagged.
    const customerRefused =
      formType === "return_confirmation" &&
      formData?.customerRefusedToSign === true;

    // Validate signatures exist
    if (!signatures?.customer && !customerRefused) {
      return NextResponse.json(
        { error: "Customer signature is required" },
        { status: 400 }
      );
    }

    // For pickup/return forms, driver signature is also required
    if (
      (formType === "pickup_consent" || formType === "return_confirmation") &&
      !signatures?.driver
    ) {
      return NextResponse.json(
        { error: "Driver signature is required for this form type" },
        { status: 400 }
      );
    }

    // Privacy acknowledgement required, except when the customer refused to
    // sign (dispute path — there is nothing for them to acknowledge).
    if (!privacyAcknowledged && !customerRefused) {
      return NextResponse.json(
        { error: "Privacy acknowledgement is required" },
        { status: 400 }
      );
    }

    const email =
      session?.user?.email || submittedByEmail || booking.userEmail;

    // Get version string based on form type
    const versionMap: Record<FormType, string> = {
      pickup_consent: "pickup-consent-v1.0",
      return_confirmation: "return-confirmation-v1.0",
      claim_lodgement: "claim-lodgement-v1.0",
    };

    // Create the signed form
    const signedForm = await SignedForm.create({
      bookingId: booking._id,
      formType,
      formVersion: versionMap[formType],
      submittedBy: email,
      submittedByName: submittedByName || booking.userName,
      submittedAt: new Date(),
      formData,
      signatures,
      privacyAcknowledged,
      ipAddress:
        request.headers.get("x-forwarded-for") ||
        request.headers.get("x-real-ip") ||
        "unknown",
      userAgent: request.headers.get("user-agent") || "unknown",
    });

    // Add a reference to the booking's signedForms array + a timeline entry
    // (visible in the admin detail modal and the live tracking board).
    const formLabels: Record<FormType, string> = {
      pickup_consent: "Pick-up Condition & Consent form",
      return_confirmation: "Return Confirmation & Acceptance form",
      claim_lodgement: "Claim Lodgement form",
    };
    const updateMessage = customerRefused
      ? `⚠️ Customer refused to sign the ${formLabels[formType]} — dispute recorded. Please review.`
      : `${formLabels[formType]} signed${signatures?.customer && signatures?.driver ? " by customer and driver" : ""}.`;

    await Booking.findByIdAndUpdate(bookingId, {
      $push: {
        signedForms: {
          formId: signedForm._id,
          formType,
          submittedAt: signedForm.submittedAt,
        },
        updates: {
          stage: booking.currentStage || "booking_confirmed",
          timestamp: signedForm.submittedAt,
          message: updateMessage,
          updatedBy: session.user.role === "driver" ? "driver" : session.user.role === "admin" ? "admin" : "customer",
        },
      },
    });

    // Email the customer their copy (async — don't block the response).
    // Skipped when the customer refused to sign (dispute path).
    if (!customerRefused && booking.userEmail) {
      const fd = (formData || {}) as Record<string, string>;
      const fields: Array<[string, string]> =
        formType === "pickup_consent"
          ? [
              ["Customer", fd.customerName],
              ["Booking reference", booking.trackingCode || bookingId],
              ["Vehicle", fd.vehicleMakeModel],
              ["Registration", fd.vehicleRego],
              ["Pickup location", fd.pickupLocation],
              ["Odometer at pick-up", fd.odometerPickupKm ? `${fd.odometerPickupKm} km` : ""],
              ["Fuel level at pick-up", fd.fuelLevelPickup],
              ["Existing damage noted", fd.existingDamageNotes || "None noted"],
              ["Service centre", fd.serviceCentreName],
              ["Service centre address", fd.serviceCentreAddress],
              ["Special instructions", fd.customerNotes],
            ]
          : formType === "return_confirmation"
            ? [
                ["Customer", fd.customerName],
                ["Booking reference", booking.trackingCode || bookingId],
                ["Vehicle", fd.vehicleMakeModel],
                ["Registration", fd.vehicleRego],
                ["Return address", fd.returnAddress],
                ["Odometer at return", fd.odometerReturnKm ? `${fd.odometerReturnKm} km` : ""],
                ["Fuel level at return", fd.fuelLevelReturn],
                ["Damage / concerns noted", fd.returnDamageNotes || "None noted"],
              ]
            : [];

      if (fields.length > 0 && (formType === "pickup_consent" || formType === "return_confirmation")) {
        sendSignedFormEmail({
          customerEmail: booking.userEmail,
          customerName: booking.userName || fd.customerName || "there",
          formType,
          vehicleRegistration: booking.vehicleRegistration,
          trackingCode: booking.trackingCode,
          submittedAt: signedForm.submittedAt,
          fields: fields.filter(([, v]) => typeof v === "string") as Array<[string, string]>,
          // Include both signatures as inline images in the customer's copy
          signatures: {
            customer: signatures?.customer,
            driver: signatures?.driver,
          },
          driverName: typeof fd.driverName === "string" ? fd.driverName : undefined,
        }).then((sent) => {
          if (sent) console.log("Signed form copy emailed to:", booking.userEmail);
        });
      }
    }

    return NextResponse.json({
      success: true,
      formId: signedForm._id.toString(),
      message: "Form submitted successfully",
    });
  } catch (error) {
    console.error("Error saving signed form:", error);
    return NextResponse.json(
      { error: "Failed to save form" },
      { status: 500 }
    );
  }
}

// GET — fetch signed forms for a booking (admin/customer/driver)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: bookingId } = await params;

  try {
    // Auth check
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    await connectDB();

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    // Verify caller has access to this booking
    const isAdmin = session.user.role === "admin";
    const isOwner =
      (session.user.id && booking.userId?.toString() === session.user.id) ||
      (session.user.email && booking.userEmail?.toLowerCase() === session.user.email.toLowerCase());
    // Drivers must be assigned to this booking (pickup or return leg)
    const isDriver =
      session.user.role === "driver" &&
      !!session.user.id &&
      (await isAssignedDriver(session.user.id, booking));

    if (!isAdmin && !isOwner && !isDriver) {
      return NextResponse.json(
        { error: "Not authorized to view forms for this booking" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const formType = searchParams.get("formType") as FormType | null;

    const query: Record<string, unknown> = { bookingId };
    if (formType) query.formType = formType;

    const forms = await SignedForm.find(query)
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ forms });
  } catch (error) {
    console.error("Error fetching signed forms:", error);
    return NextResponse.json(
      { error: "Failed to fetch forms" },
      { status: 500 }
    );
  }
}
