// src/app/api/bookings/[id]/forms/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Booking from "@/models/Booking";
import SignedForm, { FormType } from "@/models/SignedForm";

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
    const isDriver = session.user.role === "driver";

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

    // Validate signatures exist
    if (!signatures?.customer) {
      return NextResponse.json(
        { error: "Customer signature is required" },
        { status: 400 }
      );
    }

    // For pickup/return forms, driver signature is also required
    if (
      (formType === "pickup_consent" || formType === "return_confirmation") &&
      !signatures.driver
    ) {
      return NextResponse.json(
        { error: "Driver signature is required for this form type" },
        { status: 400 }
      );
    }

    if (!privacyAcknowledged) {
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

    // Add a reference to the booking's signedForms array
    await Booking.findByIdAndUpdate(bookingId, {
      $push: {
        signedForms: {
          formId: signedForm._id,
          formType,
          submittedAt: signedForm.submittedAt,
        },
      },
    });

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
    const isDriver = session.user.role === "driver";

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
