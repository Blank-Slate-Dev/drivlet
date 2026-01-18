// src/lib/stripe.ts
import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set in environment variables');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  typescript: true,
});

// Fixed price for drivlet transport service (Phase 1 - Transport Only)
export const DRIVLET_PRICE = 6500; // $65.00 in cents
export const DRIVLET_PRICE_DISPLAY = '$65.00';
