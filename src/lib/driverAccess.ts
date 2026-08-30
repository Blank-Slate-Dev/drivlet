// src/lib/driverAccess.ts
// Shared suspension gate for driver endpoints (re-audit 2026-08-30).
//
// Suspension was previously enforced only on /api/driver/jobs and
// /api/driver/latest-assignment — a suspended driver with a live session
// could still upload/remove custody photos, sign forms, and place masked
// (Twilio-billed) calls on bookings they were still assigned to. Suspension
// is the emergency brake for a misbehaving driver, so every driver-actionable
// endpoint checks it via this helper.

import { NextResponse } from "next/server";

/**
 * Returns the standard 403 response when the user's account is suspended,
 * else null. Pass the already-fetched User document (or any object exposing
 * accountStatus) — callers all load the user to resolve driverProfile anyway,
 * so this adds no extra query. Same shape/wording as the /api/driver/jobs
 * check so the driver layout's forced sign-out handling recognises it.
 */
export function driverSuspensionResponse(
  user: { accountStatus?: string } | null | undefined
): NextResponse | null {
  if (user?.accountStatus === "suspended") {
    return NextResponse.json(
      { error: "Your account has been disabled. Please contact Drivlet.", accountDisabled: true },
      { status: 403 }
    );
  }
  return null;
}
