// src/lib/servicePayment.ts
// Single source of truth for marking a SERVICE payment (the garage invoice,
// paid via the driver-generated Stripe link or the tracker's embedded form)
// as paid. Called from BOTH Stripe webhooks and the direct-verification
// endpoint, so the paid state lands in the DB no matter which endpoint Stripe
// actually delivers events to (2026-07-25 — paid status wasn't reaching the
// driver card / admin tracker because only the main webhook endpoint was
// receiving events, and it ignored service payments).
import { connectDB } from "@/lib/mongodb";
import Booking from "@/models/Booking";
import { notifyBookingUpdate } from "@/lib/emit-booking-update";

export async function markServicePaymentPaid(params: {
  bookingId: string;
  paymentId: string;
  amount: number; // cents
}): Promise<boolean> {
  const { bookingId, paymentId, amount } = params;

  await connectDB();

  // Always record the payment (idempotent — skips if already paid).
  // $nin, not $ne (re-audit 2026-09-11): the old `$ne: "paid"` filter
  // MATCHED "refunded", so a late duplicate webhook — or the guest-reachable
  // confirm-service-payment endpoint retrieving a PI that stays "succeeded"
  // in Stripe after a refund — silently flipped an admin refund back to
  // "paid". A refunded service payment must never be overwritten here.
  const booking = await Booking.findOneAndUpdate(
    { _id: bookingId, servicePaymentStatus: { $nin: ["paid", "refunded"] } },
    {
      $set: {
        servicePaymentStatus: "paid",
        servicePaymentMethod: "stripe_link",
        servicePaymentId: paymentId,
        updatedAt: new Date(),
      },
      $push: {
        updates: {
          stage: "service_payment_received",
          timestamp: new Date(),
          message: `Customer paid $${(amount / 100).toFixed(2)} for service.`,
          updatedBy: "system",
        },
      },
    },
    { new: true }
  );

  if (!booking) {
    // Not found, already paid (duplicate webhook), or refunded — check which
    const existing = await Booking.findById(bookingId).select("servicePaymentStatus");
    if (existing?.servicePaymentStatus === "paid") {
      console.log("Service payment already recorded for booking:", bookingId);
      return true;
    }
    if (existing?.servicePaymentStatus === "refunded") {
      // Acknowledge the event but never resurrect a refunded payment
      console.warn(
        "markServicePaymentPaid: booking is REFUNDED — ignoring paid event:",
        bookingId, paymentId
      );
      return true;
    }
    console.error("markServicePaymentPaid: booking not found:", bookingId);
    return false;
  }

  // …then only advance the stage if the booking hasn't already moved past the
  // service phase (payment is optional; the return may already be underway).
  let finalBooking = booking;
  if (["at_garage", "service_in_progress"].includes(booking.currentStage)) {
    const advanced = await Booking.findOneAndUpdate(
      { _id: bookingId, currentStage: { $in: ["at_garage", "service_in_progress"] } },
      { $set: { currentStage: "ready_for_return", overallProgress: 85 } },
      { new: true }
    );
    if (advanced) finalBooking = advanced;
  }

  console.log("✅ Service payment recorded:", bookingId, "stage:", finalBooking.currentStage);

  // SSE so the customer tracker updates live; driver jobs list and admin live
  // tracker pick the new status up on their next poll (15s / 30s).
  try {
    notifyBookingUpdate(finalBooking, { suppressCustomerNotifications: true });
  } catch (err) {
    console.error("Failed to broadcast service payment update:", err);
  }

  return true;
}
