// src/lib/policy.ts
// Single source of truth for customer-facing policy values.
// Change the cutoff here and it updates the booking page, emails,
// customer cancel flow, and admin tooling together.

// ── REFUND POLICY DECISION (2026-09-11) ─────────────────────────────────
// The site previously showed THREE different refund policies at once. All
// copy is now aligned to what the code actually implements
// (src/lib/refund-calculator.ts):
//   • More than 24h before pickup  → 100% refund
//   • Less than 24h, before pickup → 50% refund
//   • After pickup time            → no refund
// CANCELLATION_CUTOFF_HOURS (3) is a SEPARATE mechanism: the window for
// self-service change/cancel requests online; inside it, customers call.
// ⚠️ Gerome: if you'd rather run the simpler 3h/full-refund policy instead,
// change refund-calculator.ts + REFUND_* constants below together — do NOT
// let copy and calculator drift apart again.
export const CANCELLATION_CUTOFF_HOURS = 3;

// Refund tiers — MUST mirror src/lib/refund-calculator.ts
export const REFUND_FULL_HOURS = 24;
export const REFUND_LATE_PERCENT = 50;

export const SUPPORT_PHONE = "1300 470 886";
export const SUPPORT_PHONE_HREF = "tel:1300470886";
export const SUPPORT_EMAIL = "support@drivlet.com.au";

export const CANCELLATION_POLICY_TEXT =
  `Cancel more than ${REFUND_FULL_HOURS} hours before your scheduled pickup for a full refund; ` +
  `within ${REFUND_FULL_HOURS} hours of pickup a ${REFUND_LATE_PERCENT}% cancellation fee applies, and after the pickup time the fee is non-refundable (except as required under Australian Consumer Law). ` +
  `Changes and cancellations can be requested online up to ${CANCELLATION_CUTOFF_HOURS} hours before pickup — after that, please call ${SUPPORT_PHONE}.`;

// Returns true while the customer can still request changes/cancellation online.
export function isBeforeCancellationCutoff(pickupDateTime: Date, now: Date = new Date()): boolean {
  const cutoffMs = CANCELLATION_CUTOFF_HOURS * 60 * 60 * 1000;
  return pickupDateTime.getTime() - now.getTime() > cutoffMs;
}

// Slot value → starting hour, matching PICKUP_SLOTS in src/config/timeSlots.ts
// (duplicated as a plain map so this stays a tiny dependency-free module).
const SLOT_START_HOURS: Record<string, number> = {
  "8am-9am": 8, "9am-10am": 9, "10am-11am": 10, "11am-12pm": 11,
  "12pm-1pm": 12, "1pm-2pm": 13, "2pm-3pm": 14, "3pm-4pm": 15, "4pm-5pm": 16,
};

/**
 * Best-effort pickup date/time for a booking: serviceDate + pickup slot start hour.
 * Falls back to parsing pickupTime if it's an ISO string. Returns null when unknown.
 */
export function getPickupDateTime(booking: {
  serviceDate?: Date | string | null;
  pickupTimeSlot?: string | null;
  pickupTime?: string | null;
}): Date | null {
  if (booking.serviceDate) {
    const d = new Date(booking.serviceDate);
    if (!isNaN(d.getTime())) {
      const hour = (booking.pickupTimeSlot && SLOT_START_HOURS[booking.pickupTimeSlot]) || 9;
      d.setHours(hour, 0, 0, 0);
      return d;
    }
  }
  if (booking.pickupTime && (booking.pickupTime.includes("T") || /^\d{4}-\d{2}-\d{2}/.test(booking.pickupTime))) {
    const d = new Date(booking.pickupTime);
    if (!isNaN(d.getTime())) return d;
  }
  return null;
}
