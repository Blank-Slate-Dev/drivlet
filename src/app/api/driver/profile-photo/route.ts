// src/app/api/driver/profile-photo/route.ts
import { put, del } from "@vercel/blob";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Driver from "@/models/Driver";
import User from "@/models/User";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "driver") {
      return NextResponse.json(
        { error: "Only drivers can upload profile photos" },
        { status: 403 }
      );
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

    const user = await User.findById(session.user.id);
    if (!user?.driverProfile) {
      return NextResponse.json(
        { error: "Driver profile not found" },
        { status: 404 }
      );
    }

    const driver = await Driver.findById(user.driverProfile);
    if (!driver) {
      return NextResponse.json({ error: "Driver not found" }, { status: 404 });
    }

    // Delete old profile photo if exists
    if (driver.profilePhoto) {
      try {
        await del(driver.profilePhoto);
      } catch (error) {
        console.warn("Failed to delete old profile photo:", error);
        // Continue anyway - old photo cleanup is not critical
      }
    }

    // Upload to Vercel Blob
    const filename = `driver-photos/${driver._id}/${Date.now()}-profile.${file.type.split("/")[1]}`;
    const blob = await put(filename, file, {
      access: "public",
    });

    // Update driver's profile photo
    driver.profilePhoto = blob.url;
    await driver.save();

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

    if (session.user.role !== "driver") {
      return NextResponse.json(
        { error: "Only drivers can delete profile photos" },
        { status: 403 }
      );
    }

    await connectDB();

    const user = await User.findById(session.user.id);
    if (!user?.driverProfile) {
      return NextResponse.json(
        { error: "Driver profile not found" },
        { status: 404 }
      );
    }

    const driver = await Driver.findById(user.driverProfile);
    if (!driver) {
      return NextResponse.json({ error: "Driver not found" }, { status: 404 });
    }

    // Delete from Vercel Blob if exists
    if (driver.profilePhoto) {
      try {
        await del(driver.profilePhoto);
      } catch (error) {
        console.warn("Failed to delete profile photo from blob:", error);
      }
    }

    // Clear profile photo
    driver.profilePhoto = undefined;
    await driver.save();

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