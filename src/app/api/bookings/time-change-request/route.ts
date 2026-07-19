// src/app/api/bookings/time-change-request/route.ts
// Customers can request a pickup-time change from the tracker. This does NOT
// auto-reschedule — it records the request on the booking timeline and
// notifies admin, who confirm/rearrange via the normal roster flow.
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Booking from "@/models/Booking";
import { isValidTrackingCodeFormat } from "@/lib/trackingCode";
import { withRateLimit, RATE_LIMITS } from "@/lib/rateLimit";
import { notifyAdmin } from "@/lib/notifications";
import { notifyBookingUpdate } from "@/lib/emit-booking-update";

export async function POST(request: NextRequest) {
  // Same auth model as the public track endpoint: code + email + rego must
  // all match. Rate limited to prevent abuse/enumeration.
  const rateLimitResult = withRateLimit(request, RATE_LIMITS.auth, "time-change-request");
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { code, email, rego, requestedTime, note } = body as {
    code?: string;
    email?: string;
    rego?: string;
    requestedTime?: string;
    note?: string;
  };

  if (!code || !email || !rego || !requestedTime) {
    return NextResponse.json(
      { error: "Tracking code, email, registration, and the new pickup time are required" },
      { status: 400 }
    );
  }

  const upperCode = code.toUpperCase().trim();
  const upperRego = rego.toUpperCase().trim();
  const lowerEmail = email.toLowerCase().trim();
  const cleanTime = String(requestedTime).trim().slice(0, 120);
  const cleanNote = typeof note === "string" ? note.trim().slice(0, 500) : "";

  if (!isValidTrackingCodeFormat(upperCode)) {
    return NextResponse.json({ error: "Invalid tracking code format" }, { status: 400 });
  }

  try {
    await connectDB();

    const booking = await Booking.findOne({
      trackingCode: upperCode,
      userEmail: lowerEmail,
      vehicleRegistration: upperRego,
    });

    if (!booking) {
      return NextResponse.json(
        { error: "No booking found. Please check your details." },
        { status: 404 }
      );
    }

    if (booking.status === "completed" || booking.status === "cancelled") {
      return NextResponse.json(
        { error: "This booking is no longer active." },
        { status: 400 }
      );
    }

    // Too late once the driver has the car
    if (booking.pickupDriver?.collectedAt) {
      return NextResponse.json(
        { error: "Your vehicle has already been collected — please call us if you need to change the return arrangements." },
        { status: 400 }
      );
    }

    const now = new Date();
    booking.updates.push({
      stage: booking.currentStage || "booking_confirmed",
      timestamp: now,
      message: `⏰ Customer requested a pickup time change to: ${cleanTime}${cleanNote ? ` — "${cleanNote}"` : ""}. Awaiting confirmation from the Drivlet team.`,
      updatedBy: "customer",
    });
    await booking.save();

    // Timeline entry reaches the admin live tracker + booking modal via the
    // feed; SSE keeps any open views current. No stage email (stage unchanged).
    notifyBookingUpdate(booking, { suppressCustomerNotifications: true });

    // Dashboard bell + email to the admin team
    notifyAdmin({
      type: "system",
      title: "Pickup time change requested",
      message: `${booking.userName || "A customer"} (${booking.vehicleRegistration}) requested a new pickup time: ${cleanTime}${cleanNote ? ` — "${cleanNote}"` : ""}. Booking ${booking.trackingCode || booking._id}.`,
      bookingId: booking._id,
      metadata: {
        vehicleRegistration: booking.vehicleRegistration,
        customerName: booking.userName,
      },
    }).catch((err) => console.error("Failed to notify admin of time change:", err));

    return NextResponse.json({
      success: true,
      message: "Request received — the Drivlet team will confirm your new pickup time shortly.",
    });
  } catch (error) {
    console.error("Error handling time change request:", error);
    return NextResponse.json(
      { error: "Failed to submit request" },
      { status: 500 }
    );
  }
}
