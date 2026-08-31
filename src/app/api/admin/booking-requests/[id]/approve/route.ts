import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { requireValidOrigin } from "@/lib/validation";
import { connectDB } from "@/lib/mongodb";
import BookingRequest from "@/models/BookingRequest";
import { MAX_BOOKINGS_PER_SLOT } from "@/config/timeSlots";
import crypto from "crypto";
import { sendConfirmationWithPayLink } from "@/lib/requestConfirmationEmail";
import { notifyAdmin } from "@/lib/notifications";
// Slot counting shared with the resend/revival route (re-audit 2026-08-30
// RB-2) — includes the payment-link-TTL exclusion for lapsed holders.
import { countSlotUsage } from "@/lib/slotCapacity";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminCheck = await requireAdmin();
  if (!adminCheck.authorized) return adminCheck.response;

  const originCheck = requireValidOrigin(request);
  if (!originCheck.valid) {
    return NextResponse.json({ error: originCheck.error }, { status: 403 });
  }

  const { id } = await params;

  try {
    await connectDB();

    const bookingRequest = await BookingRequest.findById(id);
    if (!bookingRequest) {
      return NextResponse.json({ error: "Booking request not found" }, { status: 404 });
    }

    if (bookingRequest.status !== "pending_review") {
      return NextResponse.json(
        { error: `Cannot approve a request with status "${bookingRequest.status}"` },
        { status: 400 }
      );
    }

    // Slot capacity guard — approving reserves the slot, so block if either the pickup
    // or drop-off slot for this date is already full (bookings + other approved requests).
    if (bookingRequest.pickupTimeSlot) {
      const pickupUsage = await countSlotUsage(
        bookingRequest.serviceDate,
        "pickupTimeSlot",
        bookingRequest.pickupTimeSlot,
        id
      );
      if (pickupUsage >= MAX_BOOKINGS_PER_SLOT) {
        return NextResponse.json(
          { error: "The pickup slot for this date is fully booked. Edit the request to a different slot before approving." },
          { status: 409 }
        );
      }
    }
    if (bookingRequest.dropoffTimeSlot) {
      const dropoffUsage = await countSlotUsage(
        bookingRequest.serviceDate,
        "dropoffTimeSlot",
        bookingRequest.dropoffTimeSlot,
        id
      );
      if (dropoffUsage >= MAX_BOOKINGS_PER_SLOT) {
        return NextResponse.json(
          { error: "The drop-off slot for this date is fully booked. Edit the request to a different slot before approving." },
          { status: 409 }
        );
      }
    }

    const paymentToken = crypto.randomBytes(32).toString("hex");
    const now = new Date();

    // Atomic transition (re-audit 2026-08-30): the status must still be
    // pending_review AT WRITE TIME. Two admins approving simultaneously both
    // passed the read-time check above — the second save overwrote the
    // first's paymentToken, so the first confirmation email's pay link 404'd.
    // Now the loser of the race gets a clean 409 instead.
    const approvedRequest = await BookingRequest.findOneAndUpdate(
      { _id: id, status: "pending_review" },
      {
        $set: {
          status: "approved",
          paymentToken,
          paymentTokenCreatedAt: now,
          approvedAt: now,
          approvedBy: adminCheck.session.user?.email || "admin",
          reviewedBy: null,
          reviewedAt: now,
        },
      },
      { new: true }
    );
    if (!approvedRequest) {
      return NextResponse.json(
        { error: "This request was just actioned by someone else. Refresh and review its current status." },
        { status: 409 }
      );
    }

    // Flow change 2026-07-29: the confirmation email (with the payment link
    // included) goes out automatically at approval — no separate
    // "send payment link" step/email. The old endpoint remains for resends.
    const { sent, payLink, ref } = await sendConfirmationWithPayLink(approvedRequest);
    if (sent) {
      approvedRequest.status = "payment_link_sent";
      approvedRequest.paymentLinkSentAt = new Date();
      approvedRequest.paymentLinkUrl = payLink;
      await approvedRequest.save();

      // Tell the admin team the customer has the confirmation + link
      notifyAdmin({
        type: "system",
        title: "Booking confirmation sent",
        message: `${approvedRequest.userName} (${approvedRequest.vehicleRegistration}) has been emailed their booking confirmation with the payment link (Ref ${ref}${typeof approvedRequest.quotedAmount === "number" ? `, $${(approvedRequest.quotedAmount / 100).toFixed(2)}` : ""}). Awaiting payment.`,
        bookingId: approvedRequest._id,
        metadata: {
          vehicleRegistration: approvedRequest.vehicleRegistration,
          customerName: approvedRequest.userName,
        },
      }).catch((err) => console.error("Failed to notify admin of confirmation email:", err));
    } else {
      console.error(`Approve: confirmation email FAILED for request ${approvedRequest._id} — use Resend Payment Link`);
    }

    return NextResponse.json({
      success: true,
      emailSent: sent,
      request: approvedRequest,
    });
  } catch (error) {
    console.error("Failed to approve booking request:", error);
    return NextResponse.json({ error: "Failed to approve booking request" }, { status: 500 });
  }
}
