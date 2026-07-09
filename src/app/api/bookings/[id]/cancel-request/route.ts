// src/app/api/bookings/[id]/cancel-request/route.ts
// Customer cancellation requests. Customers no longer cancel bookings directly:
// more than CANCELLATION_CUTOFF_HOURS before pickup they can file a request the
// admin approves or denies; inside the cutoff they must call support.
// Refunds are always a manual admin action.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Booking from "@/models/Booking";
import { requireValidOrigin } from "@/lib/validation";
import { notifyAdmin } from "@/lib/notifications";
import { sendEmail, bookingDetailsText } from "@/lib/email";
import {
  CANCELLATION_CUTOFF_HOURS,
  SUPPORT_PHONE,
  getPickupDateTime,
  isBeforeCancellationCutoff,
} from "@/lib/policy";

// Stages where the job is already underway — cancellation must go through support
const BLOCKED_STAGES = ["car_picked_up", "at_garage", "service_in_progress", "driver_returning", "delivered"];

interface RequestBody {
  reason?: string;
  // Guest verification (same pattern as the cancel route)
  guestEmail?: string;
  guestPhone?: string;
  guestVehicleRego?: string;
}

interface Eligibility {
  canRequest: boolean;
  reason: string;
  hoursUntilPickup: number | null;
  supportPhone: string;
}

function checkEligibility(booking: {
  status: string;
  currentStage?: string;
  serviceDate?: Date;
  pickupTimeSlot?: string;
  pickupTime?: string;
  cancellationRequest?: { status?: string };
}): Eligibility {
  const base = { supportPhone: SUPPORT_PHONE, hoursUntilPickup: null as number | null };

  if (booking.status === "cancelled") {
    return { ...base, canRequest: false, reason: "This booking has already been cancelled." };
  }
  if (booking.status === "completed") {
    return { ...base, canRequest: false, reason: "This booking has been completed and can no longer be cancelled." };
  }
  if (booking.cancellationRequest?.status === "pending") {
    return { ...base, canRequest: false, reason: "A cancellation request for this booking is already being reviewed by our team." };
  }
  if (booking.currentStage && BLOCKED_STAGES.includes(booking.currentStage)) {
    return {
      ...base,
      canRequest: false,
      reason: `Your vehicle is already with our driver or the garage. Please call ${SUPPORT_PHONE} to discuss this booking.`,
    };
  }

  const pickupAt = getPickupDateTime(booking);
  if (pickupAt) {
    const hoursUntilPickup = Math.floor((pickupAt.getTime() - Date.now()) / (1000 * 60 * 60));
    if (!isBeforeCancellationCutoff(pickupAt)) {
      return {
        ...base,
        hoursUntilPickup,
        canRequest: false,
        reason: `Your pickup is less than ${CANCELLATION_CUTOFF_HOURS} hours away. Please call ${SUPPORT_PHONE} — changes at this stage are at drivlet's discretion and may not be refundable.`,
      };
    }
    return {
      ...base,
      hoursUntilPickup,
      canRequest: true,
      reason: `You can request a cancellation up to ${CANCELLATION_CUTOFF_HOURS} hours before pickup. Our team will review it and confirm by email.`,
    };
  }

  // Unknown pickup time — allow the request and let the team decide
  return {
    ...base,
    canRequest: true,
    reason: "Our team will review your cancellation request and confirm by email.",
  };
}

function resolveAccess(
  session: { user?: { id?: string; email?: string | null; role?: string } } | null,
  booking: {
    userId?: { toString(): string } | null;
    userEmail: string;
    isGuest?: boolean;
    guestPhone?: string;
    vehicleRegistration?: string;
  },
  body: RequestBody
): boolean {
  if (session?.user?.role === "admin") return true;
  if (session?.user?.id && booking.userId?.toString() === session.user.id) return true;
  if (session?.user?.email && booking.userEmail.toLowerCase() === session.user.email.toLowerCase()) return true;

  // Guest verification: email + phone (or rego when no phone on booking)
  if (!session?.user && booking.isGuest) {
    const providedEmail = body.guestEmail?.toLowerCase().trim();
    const providedPhone = body.guestPhone?.replace(/[\s\-()]/g, "");
    const bookingEmail = booking.userEmail?.toLowerCase();
    const bookingPhone = booking.guestPhone?.replace(/[\s\-()]/g, "");
    if (providedEmail && bookingEmail && providedEmail === bookingEmail) {
      if (bookingPhone) return !!(providedPhone && providedPhone === bookingPhone);
      const providedRego = body.guestVehicleRego?.toUpperCase().replace(/\s/g, "");
      const bookingRego = booking.vehicleRegistration?.toUpperCase().replace(/\s/g, "");
      return !!(providedRego && bookingRego && providedRego === bookingRego);
    }
  }
  return false;
}

// GET — check whether a cancellation request can be made right now
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await params;

    await connectDB();
    const booking = await Booking.findById(id);
    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const isOwner =
      session?.user?.role === "admin" ||
      (session?.user?.id && booking.userId?.toString() === session.user.id) ||
      (session?.user?.email && booking.userEmail.toLowerCase() === session.user.email.toLowerCase());
    if (!isOwner) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    const eligibility = checkEligibility(booking);
    return NextResponse.json({
      ...eligibility,
      cutoffHours: CANCELLATION_CUTOFF_HOURS,
      existingRequest: booking.cancellationRequest?.status || null,
    });
  } catch (error) {
    console.error("Error checking cancellation request eligibility:", error);
    return NextResponse.json({ error: "Failed to check eligibility" }, { status: 500 });
  }
}

// POST — file a cancellation request
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const originCheck = requireValidOrigin(request);
  if (!originCheck.valid) {
    return NextResponse.json({ error: originCheck.error }, { status: 403 });
  }

  try {
    const session = await getServerSession(authOptions);
    const { id } = await params;

    let body: RequestBody = {};
    try {
      body = await request.json();
    } catch {
      // body optional
    }

    await connectDB();
    const booking = await Booking.findById(id);
    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    if (!resolveAccess(session, booking, body)) {
      return NextResponse.json(
        { error: "You are not authorized to request cancellation for this booking. Guests must provide the email and phone number (or vehicle registration) used when booking." },
        { status: 403 }
      );
    }

    const eligibility = checkEligibility(booking);
    if (!eligibility.canRequest) {
      return NextResponse.json({ error: eligibility.reason, ...eligibility }, { status: 400 });
    }

    const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 500) : "";
    const now = new Date();

    booking.cancellationRequest = {
      status: "pending",
      reason: reason || undefined,
      requestedAt: now,
    };
    booking.updates.push({
      stage: "cancellation_requested",
      timestamp: now,
      message: "Customer requested cancellation. Awaiting review by the drivlet team.",
      updatedBy: "customer",
    });
    await booking.save();

    // Alert the admins (in-app + email) — non-blocking
    const pickupSuburb = booking.pickupAddress?.split(",")[0]?.trim() || "Unknown";
    notifyAdmin({
      type: "cancel_request",
      title: `Cancellation request — ${booking.vehicleRegistration}`,
      message: `${booking.userName || booking.userEmail} requested to cancel the booking for ${booking.vehicleRegistration} (pickup ${pickupSuburb}).${reason ? ` Reason: ${reason}` : ""}`,
      bookingId: booking._id,
      metadata: {
        vehicleRegistration: booking.vehicleRegistration,
        customerName: booking.userName,
        pickupSuburb,
      },
    }).catch((err) => console.error("Failed to notify admin of cancel request:", err));

    // Acknowledge to the customer — non-blocking
    if (booking.userEmail) {
      const detailsText = bookingDetailsText({
        vehicleRegistration: booking.vehicleRegistration,
        serviceDate: booking.serviceDate,
        pickupAddress: booking.pickupAddress,
        trackingCode: booking.trackingCode,
      });
      sendEmail({
        to: booking.userEmail,
        toName: booking.userName || booking.userEmail,
        subject: `We received your cancellation request — ${booking.vehicleRegistration}`,
        textContent: [
          `Hi ${(booking.userName || "there").split(" ")[0]},`,
          ``,
          `We've received your cancellation request and our team is reviewing it. You'll get an email as soon as it's confirmed.`,
          ``,
          detailsText,
          ``,
          `If any payment was made, refunds are processed by our team once the cancellation is confirmed.`,
          ``,
          `Need it sorted urgently? Call ${SUPPORT_PHONE}.`,
          ``,
          `Cheers,`,
          `The drivlet team`,
        ].join("\n"),
        htmlContent: [
          `<p>Hi ${(booking.userName || "there").split(" ")[0]},</p>`,
          `<p>We've received your cancellation request and our team is reviewing it. You'll get an email as soon as it's confirmed.</p>`,
          `<pre style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px;font-family:inherit;font-size:14px;white-space:pre-wrap">${detailsText}</pre>`,
          `<p>If any payment was made, refunds are processed by our team once the cancellation is confirmed.</p>`,
          `<p>Need it sorted urgently? Call <strong>${SUPPORT_PHONE}</strong>.</p>`,
          `<p style="margin-top:24px;color:#94a3b8;font-size:12px">The drivlet team</p>`,
        ].join(""),
      }).catch((err) => console.error("Failed to send cancel-request acknowledgement:", err));
    }

    return NextResponse.json({
      success: true,
      message: "Cancellation request sent. Our team will review it and confirm by email.",
    });
  } catch (error) {
    console.error("Error creating cancellation request:", error);
    return NextResponse.json({ error: "Failed to send cancellation request. Please try again." }, { status: 500 });
  }
}
