// src/app/api/incidents/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Incident from "@/models/Incident";
import Booking from "@/models/Booking";
import User from "@/models/User";
import { requireValidOrigin } from "@/lib/validation";
import { sendEmail, bookingDetailsText, bookingDetailsHtml, BookingEmailDetails } from "@/lib/email";
import { notifyAdmin } from "@/lib/notifications";
import { SUPPORT_PHONE } from "@/lib/policy";

export const dynamic = "force-dynamic";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Calm, generic email to the customer after an incident is logged.
// Deliberately excludes internal incident details/severity.
async function sendCustomerIncidentEmail(booking: {
  userEmail: string;
  userName?: string;
  vehicleRegistration?: string;
  serviceDate?: Date | string;
  pickupAddress?: string;
  garageName?: string;
  trackingCode?: string;
}): Promise<boolean> {
  const customerName = booking.userName || "there";
  const rego = booking.vehicleRegistration || "your vehicle";

  const details: BookingEmailDetails = {
    vehicleRegistration: booking.vehicleRegistration,
    serviceDate: booking.serviceDate,
    pickupAddress: booking.pickupAddress,
    garageName: booking.garageName,
    trackingCode: booking.trackingCode,
  };

  const subject = `An update about your vehicle — ${rego}`;

  const textContent = `
Hi ${customerName},

We're writing to let you know we've logged an incident relating to your booking. There's nothing you need to do right now — our team is already on it and will contact you shortly with more information.

${bookingDetailsText(details)}

If you have any questions in the meantime, please call us on ${SUPPORT_PHONE} — we're happy to help.

Thanks,
The drivlet team
  `.trim();

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc;">
  <div style="max-width: 520px; margin: 0 auto; padding: 40px 20px;">
    <div style="background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #059669 0%, #0d9488 100%); padding: 32px; text-align: center;">
        <h1 style="margin: 0; color: white; font-size: 24px; font-weight: 700;">An update about your vehicle</h1>
        <p style="margin: 8px 0 0; color: #d1fae5; font-size: 14px;">${escapeHtml(rego)}</p>
      </div>

      <!-- Content -->
      <div style="padding: 32px;">
        <p style="margin: 0 0 16px; color: #475569; font-size: 16px;">Hi ${escapeHtml(customerName)},</p>

        <p style="margin: 0 0 24px; color: #475569; font-size: 16px; line-height: 1.6;">We're writing to let you know we've logged an incident relating to your booking. There's nothing you need to do right now — our team is already on it and will contact you shortly with more information.</p>

        ${bookingDetailsHtml(details)}

        <p style="margin: 0 0 8px; color: #475569; font-size: 15px; line-height: 1.6;">If you have any questions in the meantime, please call us on <a href="tel:${SUPPORT_PHONE.replace(/\s/g, "")}" style="color: #059669; text-decoration: none; font-weight: 600;">${SUPPORT_PHONE}</a> — we're happy to help.</p>
      </div>

      <!-- Footer -->
      <div style="background: #f8fafc; padding: 20px 32px; border-top: 1px solid #e2e8f0; text-align: center;">
        <p style="margin: 0; color: #94a3b8; font-size: 12px;">
          Questions? Reply to this email or visit <a href="https://drivlet.com.au" style="color: #059669;">drivlet.com.au</a>
        </p>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();

  return sendEmail({
    to: booking.userEmail,
    toName: booking.userName || booking.userEmail,
    subject,
    textContent,
    htmlContent,
  });
}

// POST /api/incidents — Create a new incident report
export async function POST(request: NextRequest) {
  const originCheck = requireValidOrigin(request);
  if (!originCheck.valid) {
    return NextResponse.json({ error: originCheck.error }, { status: 403 });
  }

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role !== "driver") {
      return NextResponse.json({ error: "Not a driver" }, { status: 403 });
    }

    await connectDB();

    const user = await User.findById(session.user.id);
    if (!user?.driverProfile) {
      return NextResponse.json({ error: "Driver profile not found" }, { status: 404 });
    }

    const body = await request.json();
    const {
      bookingId,
      incidentType,
      severity,
      title,
      description,
      location,
      photos,
      thirdParty,
      policeInvolved,
      policeReference,
      vehicleStatus,
      dashcamFootageRef,
    } = body;

    // Validate required
    if (!bookingId || !incidentType || !severity || !title || !description || !location?.address) {
      return NextResponse.json(
        { error: "Missing required fields: bookingId, incidentType, severity, title, description, location.address" },
        { status: 400 }
      );
    }

    // Validate field lengths
    if (typeof title === "string" && title.length > 200) {
      return NextResponse.json({ error: "Title must be 200 characters or less" }, { status: 400 });
    }
    if (typeof description === "string" && description.length > 5000) {
      return NextResponse.json({ error: "Description must be 5000 characters or less" }, { status: 400 });
    }

    // Validate booking exists and driver is assigned
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const driverIdStr = user.driverProfile.toString();
    if (
      booking.assignedDriverId?.toString() !== driverIdStr &&
      booking.returnDriverId?.toString() !== driverIdStr
    ) {
      return NextResponse.json(
        { error: "You are not assigned to this booking" },
        { status: 403 }
      );
    }

    // Auto-determine exception state based on severity/type
    let exceptionState: "continue" | "hold" | "stop" = "continue";
    if (severity === "critical" || incidentType === "road_accident") {
      exceptionState = "stop";
    } else if (severity === "high") {
      exceptionState = "hold";
    }

    const incident = await Incident.create({
      bookingId,
      driverId: user.driverProfile,
      reportedBy: session.user.id,
      incidentType,
      severity,
      title,
      description,
      occurredAt: new Date(),
      location,
      bookingStage: booking.currentStage || "unknown",
      photos: photos || [],
      thirdParty: thirdParty || undefined,
      policeInvolved: policeInvolved || false,
      policeReference: policeReference || undefined,
      exceptionState,
      status: "open",
      vehicleStatus: vehicleStatus || "unknown",
      dashcamFootageRef: dashcamFootageRef || undefined,
    });

    // Update booking with incident reference
    await Booking.findByIdAndUpdate(bookingId, {
      $push: { incidents: incident._id },
      hasActiveIncident: true,
      incidentExceptionState: exceptionState,
    });

    // Notify the customer (non-blocking, calm and generic — no internal details)
    if (booking.userEmail) {
      sendCustomerIncidentEmail({
        userEmail: booking.userEmail,
        userName: booking.userName,
        vehicleRegistration: booking.vehicleRegistration,
        serviceDate: booking.serviceDate,
        pickupAddress: booking.pickupAddress,
        garageName: booking.garageName,
        trackingCode: booking.trackingCode,
      }).catch((err: unknown) => {
        console.error("Failed to send customer incident email:", err);
      });
    }

    // Alert admins (non-blocking)
    const incidentTypeLabel = String(incidentType).replace(/_/g, " ");
    notifyAdmin({
      type: "incident",
      title: `Incident reported — ${booking.vehicleRegistration || "unknown rego"}`,
      message: `${user.username || "A driver"} reported a ${incidentTypeLabel} incident on booking ${booking.vehicleRegistration || bookingId} (severity: ${severity}, exception state: ${exceptionState}).`,
      bookingId: booking._id,
      metadata: {
        vehicleRegistration: booking.vehicleRegistration,
        customerName: booking.userName,
      },
    }).catch((err: unknown) => {
      console.error("Failed to send admin incident notification:", err);
    });

    return NextResponse.json({ incident, exceptionState }, { status: 201 });
  } catch (error) {
    console.error("Error creating incident:", error);
    return NextResponse.json({ error: "Failed to create incident" }, { status: 500 });
  }
}
