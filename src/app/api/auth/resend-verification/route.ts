// src/app/api/auth/resend-verification/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import { sendVerificationEmail } from "@/lib/email";

// POST /api/auth/resend-verification - Resend verification code
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    await connectDB();

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      // Don't reveal if email exists or not for security
      return NextResponse.json({
        success: true,
        message: "If an account exists with this email, a verification code has been sent.",
      });
    }

    // Check if already verified
    if (user.emailVerified) {
      return NextResponse.json({
        success: true,
        message: "Your email is already verified. You can sign in.",
        alreadyVerified: true,
      });
    }

    // Generate new 6-digit verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationCodeExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Update user with new code
    user.verificationCode = verificationCode;
    user.verificationCodeExpires = verificationCodeExpires;
    await user.save();

    // Send verification email
    try {
      await sendVerificationEmail(
        user.email,
        user.username,
        verificationCode
      );
      console.log("Verification code resent to:", user.email);
    } catch (emailError) {
      console.error("Failed to send verification email:", emailError);
      return NextResponse.json(
        { error: "Failed to send verification code. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Verification code sent. Please check your inbox.",
    });
  } catch (error) {
    console.error("Error resending verification code:", error);
    return NextResponse.json(
      { error: "Failed to resend verification code" },
      { status: 500 }
    );
  }
}
