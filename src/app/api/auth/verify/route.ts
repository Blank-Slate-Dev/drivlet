// src/app/api/auth/verify/route.ts
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";

// POST /api/auth/verify - Verify email with 6-digit code
export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();

    console.log("Email verification attempt");

    if (!code || typeof code !== "string" || code.length !== 6 || !/^\d{6}$/.test(code)) {
      return NextResponse.json(
        { error: "Please enter a valid 6-digit code" },
        { status: 400 }
      );
    }

    await connectDB();

    // Generate auto-login token
    const autoLoginToken = crypto.randomBytes(32).toString("hex");
    const autoLoginTokenExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Find and update user atomically
    const user = await User.findOneAndUpdate(
      {
        verificationCode: code,
        verificationCodeExpires: { $gt: new Date() },
      },
      {
        $set: {
          emailVerified: true,
          autoLoginToken,
          autoLoginTokenExpires,
        },
        $unset: { verificationCode: "", verificationCodeExpires: "" },
      },
      { new: true }
    );

    if (!user) {
      return NextResponse.json(
        { error: "Invalid or expired code. Please request a new one." },
        { status: 400 }
      );
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
      console.error("Error stack:", error.stack);
    }
    return NextResponse.json(
      { error: "Verification failed. Please try again." },
      { status: 500 }
    );
  }
}
