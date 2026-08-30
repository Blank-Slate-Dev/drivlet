// src/lib/paymentLinkExpiry.ts
// Payment-link TTL (re-audit 2026-08-30). Previously nothing anywhere read
// paymentTokenCreatedAt/expiresAt, so a pay link worked forever: a customer
// could pay weeks after the serviceDate and the webhook would convert it, and
// an approved-but-never-paid request held a MAX_BOOKINGS_PER_SLOT seat (and
// its promo code) indefinitely.
//
// Expiry is LAZY — checked when the link is used (pay page GET / PI creation)
// and when slot capacity is counted at approval time. There is no cron.
// Admins revive an expired link with "Resend Payment Link", which issues a
// fresh token + timestamp.
//
// Product note: the window is a flat 7 days from token issue. If a booking's
// serviceDate is sooner than that, the link intentionally still works up to
// 7 days (ops may reschedule); capping expiry at the serviceDate instead is
// a product call — see PRE_LAUNCH_AUDIT.md.

export const PAYMENT_LINK_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * True when the request's payment link is older than the TTL.
 * Legacy links without a stored timestamp never expire (safer than
 * retro-actively killing outstanding links).
 */
export function isPaymentLinkExpired(bookingRequest: {
  paymentTokenCreatedAt?: Date | string | null;
}): boolean {
  const createdAt = bookingRequest.paymentTokenCreatedAt;
  if (!createdAt) return false;
  const created = new Date(createdAt).getTime();
  if (Number.isNaN(created)) return false;
  return Date.now() - created > PAYMENT_LINK_TTL_MS;
}
