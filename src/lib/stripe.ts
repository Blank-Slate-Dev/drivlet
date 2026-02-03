// src/lib/stripe.ts
import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set in environment variables');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  typescript: true,
});

// Fixed base price for Drivlet transport service (Phase 1 - Transport Only)
export const DRIVLET_PRICE = 12000; // $120.00 in cents
export const DRIVLET_PRICE_DISPLAY = '$120.00';

// Distance-zone surcharges in cents (server-side source of truth)
// Keep in sync with ZONE_SURCHARGE_CENTS in src/lib/distanceZones.ts
export const ZONE_SURCHARGES: Record<string, number> = {
  green: 0,       // 0–12 km — no extra fee
  yellow: 2900,   // >12–15 km — +$29.00
  orange: 4900,   // >15–18 km — +$49.00
  // red is not bookable online
};

/**
 * Calculate the total charge in cents for a given distance zone.
 * Returns base price + applicable surcharge.
 */
export function calculateTotalAmount(distanceZone: string): number {
  const surcharge = ZONE_SURCHARGES[distanceZone] ?? 0;
  return DRIVLET_PRICE + surcharge;
}
