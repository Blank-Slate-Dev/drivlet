// src/app/api/auth/verify/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";

// GET /api/auth/verify?token=xxx - Verify email address
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      // Redirect to error page
      return NextResponse.redirect(
        new URL("/auth/verify?error=missing_token", request.url)
      );
    }

    await connectDB();

    // Find user with matching token that hasn't expired
    const user = await User.findOne({
      verificationToken: token,
      verificationTokenExpires: { $gt: new Date() },
    });

    if (!user) {
      // Token invalid or expired
      return NextResponse.redirect(
        new URL("/auth/verify?error=invalid_token", request.url)
      );
    }

    // Update user as verified
    user.emailVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpires = undefined;
    await user.save();

    console.log("Email verified for user:", user.email);

    // Redirect to success page
    return NextResponse.redirect(new URL("/auth/verify/success", request.url));
  } catch (error) {
    console.error("Error verifying email:", error);
    return NextResponse.redirect(
      new URL("/auth/verify?error=server_error", request.url)
    );
  }
}
