// src/app/api/auth/forgot-password/route.ts
// Sends a password reset email (all account types: customers, drivers,
// admins). Always responds success so account existence can't be probed.
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import { sendPasswordResetEmail } from "@/lib/email";
import { withRateLimit, RATE_LIMITS } from "@/lib/rateLimit";

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

function getAppUrl(): string {
  return process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

export async function POST(request: NextRequest) {
  const rateLimit = withRateLimit(request, RATE_LIMITS.auth, "forgot-password");
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Please enter a valid email address" }, { status: 400 });
  }

  // The response is identical whether or not the account exists
  const genericResponse = NextResponse.json({
    success: true,
    message: "If an account exists for that email, a reset link is on its way.",
  });

  try {
    await connectDB();

    const user = await User.findOne({ email });
    if (!user || user.accountStatus === "deleted") {
      return genericResponse;
    }

    // Single-use token: store only the sha256 hash; the raw token goes in the email
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

    user.passwordResetToken = tokenHash;
    user.passwordResetExpires = new Date(Date.now() + RESET_TOKEN_TTL_MS);
    await user.save({ validateModifiedOnly: true });

    const resetUrl = `${getAppUrl()}/reset-password?token=${rawToken}`;
    // Awaited: Vercel can kill fire-and-forget work after the response
    await sendPasswordResetEmail(user.email, user.username || "", resetUrl);

    return genericResponse;
  } catch (error) {
    console.error("Forgot password error:", error);
    // Still generic — never reveal internals or existence
    return genericResponse;
  }
}
