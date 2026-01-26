// src/app/api/auth/verify/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";

// Force dynamic rendering - this route uses request.url
export const dynamic = "force-dynamic";

// GET /api/auth/verify?token=xxx - Verify email address
export async function GET(request: NextRequest) {
  try {
    const { code } = await request.json();

    console.log("=== Email Verification Request ===");
    console.log("Code received:", code);

    if (!code || typeof code !== "string" || code.length !== 6 || !/^\d{6}$/.test(code)) {
      console.log("Error: Invalid code format");
      return NextResponse.json(
        { error: "Please enter a valid 6-digit code" },
        { status: 400 }
      );
    }

    await connectDB();
    console.log("Database connected");

    // First, find the user to check code existence (for debugging)
    const existingUser = await User.findOne({ verificationCode: code });
    console.log("User with this code exists:", !!existingUser);

    if (existingUser) {
      console.log("User email:", existingUser.email);
      console.log("Code expires:", existingUser.verificationCodeExpires);
      console.log("Current time:", new Date());
      console.log(
        "Code expired:",
        existingUser.verificationCodeExpires
          ? existingUser.verificationCodeExpires < new Date()
          : "no expiry set"
      );
      console.log("Current emailVerified status:", existingUser.emailVerified);
    }

    // Find and update user atomically
    const user = await User.findOneAndUpdate(
      {
        verificationCode: code,
        verificationCodeExpires: { $gt: new Date() },
      },
      {
        $set: { emailVerified: true },
        $unset: { verificationCode: "", verificationCodeExpires: "" },
      },
      { new: true }
    );

    if (!user) {
      console.log("Error: Code invalid or expired - no user updated");
      return NextResponse.json(
        { error: "Invalid or expired code. Please request a new one." },
        { status: 400 }
      );
    }

    console.log("✅ Email verified successfully for:", user.email);
    console.log("New emailVerified status:", user.emailVerified);

    return NextResponse.json({
      success: true,
      message: "Email verified successfully",
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
