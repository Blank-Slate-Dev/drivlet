// src/lib/promoCodes.ts
// Shared promo-code helpers: atomic claim, release (on decline/cancellation),
// and discount math. Discount applies to Drivlet's transport fee total
// (base fee + distance surcharge).
import PromoCode, { IPromoCode } from "@/models/PromoCode";
import { Types } from "mongoose";
import crypto from "crypto";

// Stripe's minimum charge is 50c AUD — a 100% code discounts down to $0,
// which skips payment entirely; anything between 1c and 49c is clamped up.
export const STRIPE_MIN_CHARGE_CENTS = 50;

/** Generate a readable 8-char code (no ambiguous 0/O/1/I characters). */
export function generatePromoCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  const bytes = crypto.randomBytes(8);
  for (let i = 0; i < 8; i++) {
    out += alphabet[bytes[i] % alphabet.length];
  }
  return out;
}

export function normalisePromoCode(raw: string): string {
  return raw.toUpperCase().trim().replace(/\s+/g, "");
}

/** Percentage discount in cents, applied to the full transport total. */
export function calculatePromoDiscount(totalCents: number, percentOff: number): number {
  const discount = Math.round((totalCents * percentOff) / 100);
  const remaining = totalCents - discount;
  // Clamp: either free ($0) or at least the Stripe minimum charge
  if (remaining > 0 && remaining < STRIPE_MIN_CHARGE_CENTS) {
    return totalCents - STRIPE_MIN_CHARGE_CENTS;
  }
  return discount;
}

/**
 * Atomically claim an active promo code (active → used). Returns the claimed
 * code, or null if it doesn't exist / was already used / is disabled.
 * Because this is a single findOneAndUpdate, two simultaneous bookings can
 * never both claim the same code.
 */
export async function claimPromoCode(rawCode: string): Promise<IPromoCode | null> {
  const code = normalisePromoCode(rawCode);
  if (!code) return null;
  return PromoCode.findOneAndUpdate(
    { code, status: "active" },
    { $set: { status: "used", usedAt: new Date() } },
    { new: true }
  );
}

/** Release a claimed code back to active (failed submission rollback). */
export async function releasePromoCode(rawCode: string): Promise<void> {
  const code = normalisePromoCode(rawCode);
  if (!code) return;
  await PromoCode.updateOne(
    { code, status: "used" },
    {
      $set: { status: "active" },
      $unset: {
        usedAt: "",
        usedByRequestId: "",
        usedByBookingId: "",
        usedByReference: "",
        discountAmount: "",
      },
    }
  ).catch((err) => console.error("Failed to release promo code:", err));
}

/**
 * Free a code when the request/booking it was redeemed on is declined or
 * cancelled — the customer never got the discount, so the code becomes
 * usable again. Matched by usage reference to avoid releasing a code that
 * was since re-used elsewhere.
 */
export async function releasePromoCodeForUsage(params: {
  code?: string | null;
  requestId?: Types.ObjectId | string | null;
  bookingId?: Types.ObjectId | string | null;
}): Promise<void> {
  if (!params.code) return;
  const code = normalisePromoCode(params.code);
  const usageMatch: Record<string, unknown>[] = [];
  if (params.requestId) usageMatch.push({ usedByRequestId: params.requestId });
  if (params.bookingId) usageMatch.push({ usedByBookingId: params.bookingId });
  if (usageMatch.length === 0) return;

  await PromoCode.updateOne(
    { code, status: "used", $or: usageMatch },
    {
      $set: { status: "active" },
      $unset: {
        usedAt: "",
        usedByRequestId: "",
        usedByBookingId: "",
        usedByReference: "",
        discountAmount: "",
      },
    }
  ).catch((err) => console.error("Failed to release promo code for usage:", err));
}
