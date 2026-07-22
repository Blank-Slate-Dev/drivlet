// src/app/api/promo-codes/validate/route.ts
// Public promo-code check for the booking flow. READ-ONLY — the code is only
// claimed (atomically) when the booking request is actually submitted, so
// checking a code here never burns it.
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import PromoCode from "@/models/PromoCode";
import { normalisePromoCode } from "@/lib/promoCodes";
import { withRateLimit, RATE_LIMITS } from "@/lib/rateLimit";

export async function POST(request: NextRequest) {
  // Rate-limited to prevent brute-force guessing of codes
  const rateLimitResult = withRateLimit(request, RATE_LIMITS.auth, "promo-validate");
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: "Too many attempts. Please try again shortly." },
      { status: 429 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const code = normalisePromoCode(String(body.code || ""));
  if (!code) {
    return NextResponse.json({ error: "Please enter a promo code" }, { status: 400 });
  }

  try {
    await connectDB();
    const promo = await PromoCode.findOne({ code }).select("status percentOff").lean();

    if (!promo || promo.status === "disabled") {
      return NextResponse.json(
        { valid: false, error: "That promo code isn't valid. Please check and try again." },
        { status: 404 }
      );
    }
    if (promo.status === "used") {
      return NextResponse.json(
        { valid: false, error: "That promo code has already been used." },
        { status: 409 }
      );
    }

    return NextResponse.json({ valid: true, code, percentOff: promo.percentOff });
  } catch (error) {
    console.error("Error validating promo code:", error);
    return NextResponse.json({ error: "Failed to check promo code" }, { status: 500 });
  }
}
