// src/app/api/auth/reset-password/route.ts
// Completes the forgot-password flow: verifies the emailed token (hashed,
// unexpired, single-use) and sets the new password.
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import { withRateLimit, RATE_LIMITS } from "@/lib/rateLimit";

export async function POST(request: NextRequest) {
  const rateLimit = await withRateLimit(request, RATE_LIMITS.auth, "reset-password");
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

  const token = typeof body.token === "string" ? body.token.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!token || !/^[a-f0-9]{64}$/.test(token)) {
    return NextResponse.json(
      { error: "This reset link is invalid. Please request a new one." },
      { status: 400 }
    );
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters" },
      { status: 400 }
    );
  }

  try {
    await connectDB();

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const user = await User.findOne({
      passwordResetToken: tokenHash,
      passwordResetExpires: { $gt: new Date() },
    });

    if (!user) {
      return NextResponse.json(
        { error: "This reset link is invalid or has expired. Please request a new one." },
        { status: 400 }
      );
    }

    user.password = await bcrypt.hash(password, 12);
    // Single-use: clear the token so the link can't be replayed
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateModifiedOnly: true });

    return NextResponse.json({
      success: true,
      message: "Password updated. You can now sign in with your new password.",
      role: user.role || "user",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json({ error: "Failed to reset password" }, { status: 500 });
  }
}
