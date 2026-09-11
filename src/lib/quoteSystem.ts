// src/lib/quoteSystem.ts
// PHASE 1: the quote system is dormant — pages are proxy-blocked, but until
// 2026-09-11 the /api/quotes/** routes were live anyway: unauthenticated,
// un-rate-limited DB writes for a feature that's "off". Every quote API
// handler now calls quoteSystemGate() first, mirroring the garage-portal
// pattern (src/lib/garagePortal.ts). Enable with
// NEXT_PUBLIC_ENABLE_QUOTE_SYSTEM=true when the quotes feature launches.

import { NextResponse } from "next/server";
import { FEATURES } from "@/lib/featureFlags";

export function isQuoteSystemEnabled(): boolean {
  return FEATURES.QUOTE_SYSTEM;
}

/**
 * Call at the top of every quote API handler:
 *   const gate = quoteSystemGate();
 *   if (gate) return gate;
 */
export function quoteSystemGate(): NextResponse | null {
  if (isQuoteSystemEnabled()) return null;
  return NextResponse.json(
    { error: "The quote system is not available." },
    { status: 404 }
  );
}
