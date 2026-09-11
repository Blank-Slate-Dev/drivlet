// src/lib/slotCapacity.ts
// Shared slot-capacity counting (extracted from the approve route,
// re-audit 2026-08-30 RB-2, so the resend/revival path can run the same
// check before putting an expired request back into a slot).

import Booking from "@/models/Booking";
import BookingRequest from "@/models/BookingRequest";
import { PAYMENT_LINK_TTL_MS } from "@/lib/paymentLinkExpiry";

// Statuses (besides live bookings) that already hold a slot for a date.
// `as const` (2026-09-11): mongoose 9.10's stricter query typings require
// literal-union arrays for $in on enum-typed schema fields.
export const SLOT_HOLDING_REQUEST_STATUSES = [
  "approved",
  "payment_link_sent",
  "accepted_awaiting_payment",
] as const;

/**
 * Count how many bookings + slot-holding requests already occupy a given slot
 * on a date, excluding the request being approved/revived. Requests whose
 * payment link has lapsed past the TTL no longer hold the slot (even before
 * lazy expiry has flipped their status); requests without a token timestamp
 * (legacy / link not yet sent) still count.
 */
export async function countSlotUsage(
  serviceDate: Date,
  slotField: "pickupTimeSlot" | "dropoffTimeSlot",
  slotValue: string,
  excludeRequestId: string
): Promise<number> {
  const startOfDay = new Date(serviceDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(serviceDate);
  endOfDay.setHours(23, 59, 59, 999);

  const [bookingCount, requestCount] = await Promise.all([
    Booking.countDocuments({
      serviceDate: { $gte: startOfDay, $lte: endOfDay },
      status: { $ne: "cancelled" },
      [slotField]: slotValue,
    }),
    BookingRequest.countDocuments({
      _id: { $ne: excludeRequestId },
      serviceDate: { $gte: startOfDay, $lte: endOfDay },
      status: { $in: SLOT_HOLDING_REQUEST_STATUSES },
      [slotField]: slotValue,
      $or: [
        { paymentTokenCreatedAt: null },
        { paymentTokenCreatedAt: { $exists: false } },
        { paymentTokenCreatedAt: { $gte: new Date(Date.now() - PAYMENT_LINK_TTL_MS) } },
      ],
    }),
  ]);

  return bookingCount + requestCount;
}
