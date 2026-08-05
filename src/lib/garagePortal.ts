// src/lib/garagePortal.ts
// PHASE 1: the entire garage portal is hidden and inert. Phase 1 is pickup
// and drop-off only — no garage involvement. Nothing garage-side may mutate
// bookings or read customer data until NEXT_PUBLIC_ENABLE_GARAGE_PORTAL=true.
//
// Every /api/garage/* route calls garagePortalGate() first (belt) and the
// proxy middleware also blocks /garage pages and /api/garage/* (braces).
//
// ────────────────────────────────────────────────────────────────────────
// MUST FIX BEFORE PHASE 2 — do NOT enable this flag until these are done
// (found in the 2026-08-06 review of commits c0b6033/b9c7474):
//  1. Cross-garage booking seizure: acknowledge-booking normalises garage
//     names on the first " - " segment, so chain branches can claim each
//     other's bookings. Require garagePlaceId equality / full-name match.
//  2. Garage data over-sharing: garage/bookings, garage/bookings/[id] and
//     garage/dashboard/incoming return FULL booking documents (customer
//     email, phone, address, payment fields, internal timeline) with no
//     projection — the privacy policy promises workshops never see payment
//     details. Add a .select() whitelist.
//  3. Legacy garage/booking-action still writes top-level status:"completed"
//     (tracker 410 / dispatch-vanish regression) — retire it properly.
//  4. Garage "Start Service" can pull an un-dispatched booking off the
//     dispatch board and void the customer's cancellation window.
//  5. Garage analytics vs stats count "completed" on different fields.
// ────────────────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";

export function isGaragePortalEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_GARAGE_PORTAL === "true";
}

/**
 * Call at the top of every garage API handler:
 *   const gate = garagePortalGate();
 *   if (gate) return gate;
 */
export function garagePortalGate(): NextResponse | null {
  if (isGaragePortalEnabled()) return null;
  return NextResponse.json(
    { error: "The garage portal is not available yet." },
    { status: 410 }
  );
}
