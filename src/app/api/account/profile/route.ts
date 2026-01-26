// src/app/api/account/profile/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";

// GET /api/account/profile - Get current user's profile
export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();

    const user = await User.findById(session.user.id).select(
      "username email mobile createdAt"
    );

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      username: user.username,
      email: user.email,
      mobile: user.mobile || "",
      createdAt: user.createdAt,
    });
  } catch (error) {
    console.error("Error fetching profile:", error);
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 }
    );
  }
}

// PATCH /api/account/profile - Update current user's profile
export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { mobile } = await request.json();

    // Validate mobile if provided
    if (mobile !== undefined && mobile !== "") {
      const cleanMobile = mobile.replace(/\s/g, "");
      if (!/^04\d{8}$/.test(cleanMobile)) {
        return NextResponse.json(
          { error: "Please enter a valid Australian mobile number (04XX XXX XXX)" },
          { status: 400 }
        );
      }
    }

    await connectDB();

    const user = await User.findById(session.user.id);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Update mobile (store cleaned version without spaces)
    if (mobile !== undefined) {
      user.mobile = mobile ? mobile.replace(/\s/g, "") : undefined;
    }

    await user.save();

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully",
      mobile: user.mobile || "",
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}
