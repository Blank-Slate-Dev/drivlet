// src/app/api/customer/profile-photo/route.ts
import { put, del } from "@vercel/blob";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type (images only)
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Please upload an image (JPEG, PNG, WebP)" },
        { status: 400 }
      );
    }

    // Max 5MB for profile photos
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 5MB" },
        { status: 400 }
      );
    }

    await connectDB();

    const user = await User.findById(session.user.id).lean();
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Delete old profile photo if exists
    if (user.profilePhoto) {
      try {
        await del(user.profilePhoto);
      } catch (error) {
        console.warn("Failed to delete old profile photo:", error);
      }
    }

    // Upload to Vercel Blob
    const filename = `customer-photos/${session.user.id}/${Date.now()}-profile.${file.type.split("/")[1]}`;
    const blob = await put(filename, file, {
      access: "public",
    });

    // Update user record
    await User.findByIdAndUpdate(
      session.user.id,
      { $set: { profilePhoto: blob.url } },
      { runValidators: false }
    );

    return NextResponse.json({
      success: true,
      message: "Profile photo uploaded successfully",
      url: blob.url,
    });
  } catch (error) {
    console.error("Error uploading profile photo:", error);
    return NextResponse.json(
      { error: "Failed to upload profile photo" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const user = await User.findById(session.user.id).lean();
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Delete from Vercel Blob if exists
    if (user.profilePhoto) {
      try {
        await del(user.profilePhoto);
      } catch (error) {
        console.warn("Failed to delete profile photo from blob:", error);
      }
    }

    // Remove from user record
    await User.findByIdAndUpdate(
      session.user.id,
      { $unset: { profilePhoto: 1 } },
      { runValidators: false }
    );

    return NextResponse.json({
      success: true,
      message: "Profile photo deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting profile photo:", error);
    return NextResponse.json(
      { error: "Failed to delete profile photo" },
      { status: 500 }
    );
  }
}
