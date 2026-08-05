// src/app/api/auth/verify/route.ts
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import { withRateLimit, RATE_LIMITS } from "@/lib/rateLimit";

// POST /api/auth/verify - Verify email with 6-digit code
//
// SECURITY (fixed 2026-08-05, audit C-1):
// This endpoint previously had (a) no rate limit, (b) a lookup keyed on the
// 6-digit code ALONE with no user scoping, and (c) an `autoLoginToken` in the
// response that `src/lib/auth.ts` accepts as a complete login credential.
// Together that made account takeover a 10^6 brute force with no throttle.
//
// Now:
//   1. Rate limited (5/min per IP, same budget as the other auth routes).
//   2. When `email` is supplied the lookup is scoped to that user, so a brute
//      force must target one known account and is throttled per IP.
//   3. The auto-login token is ONLY issued when the caller proved which
//      account they are verifying (i.e. supplied the matching email).
//      Code-only verification still works — for older links already in
//      inboxes — but it will not hand back a session credential; the user is
//      sent to /login instead.
export async function POST(request: NextRequest) {
  try {
    const rateLimit = await withRateLimit(request, RATE_LIMITS.auth, "verify-email");
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: "Too many attempts. Please wait a minute and try again." },
        {
          status: 429,
          headers: { "Retry-After": String(Math.ceil(rateLimit.resetIn / 1000)) },
        }
      );
    }

    const body = await request.json();
    const code: unknown = body?.code;
    const rawEmail: unknown = body?.email;

    console.log("Email verification attempt");

    if (!code || typeof code !== "string" || code.length !== 6 || !/^\d{6}$/.test(code)) {
      return NextResponse.json(
        { error: "Please enter a valid 6-digit code" },
        { status: 400 }
      );
    }

    const email =
      typeof rawEmail === "string" && rawEmail.trim().length > 0
        ? rawEmail.trim().toLowerCase()
        : null;

    await connectDB();

    // Only issue an auto-login credential when the caller has proved which
    // account they are verifying. A blind code-only guess can verify an email
    // address but can never obtain a session.
    const canAutoLogin = email !== null;

    const autoLoginToken = crypto.randomBytes(32).toString("hex");
    const autoLoginTokenExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    const filter: Record<string, unknown> = {
      verificationCode: code,
      verificationCodeExpires: { $gt: new Date() },
    };
    if (email) {
      filter.email = email;
    }

    const update: Record<string, unknown> = {
      $set: canAutoLogin
        ? { emailVerified: true, autoLoginToken, autoLoginTokenExpires }
        : { emailVerified: true },
      $unset: { verificationCode: "", verificationCodeExpires: "" },
    };

    // Find and update user atomically
    const user = await User.findOneAndUpdate(filter, update, { new: true });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid or expired code. Please request a new one." },
        { status: 400 }
      );
    }

    if (!canAutoLogin) {
      return NextResponse.json({
        success: true,
        requiresLogin: true,
        message: "Email verified successfully. Please sign in to continue.",
      });
    }

    return NextResponse.json({
      success: true,
      message: "Email verified successfully",
      autoLoginToken,
      email: user.email,
    });
  } catch (error) {
    console.error("Error verifying email:", error);
    if (error instanceof Error) {
      console.error("Error name:", error.name);
      console.error("Error message:", error.message);
    }
    return NextResponse.json(
      { error: "Verification failed. Please try again." },
      { status: 500 }
    );
  }
}
