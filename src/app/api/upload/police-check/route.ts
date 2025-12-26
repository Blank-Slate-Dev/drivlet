// src/app/api/upload/police-check/route.ts
import { put } from "@vercel/blob";
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
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (session.user.role !== "driver") {
      return NextResponse.json(
        { error: "Only drivers can upload police checks" },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const certificateNumber = formData.get("certificateNumber") as string;
    const issueDate = formData.get("issueDate") as string;
    const expiryDate = formData.get("expiryDate") as string;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    if (!certificateNumber || !issueDate || !expiryDate) {
      return NextResponse.json(
        { error: "Certificate number, issue date, and expiry date are required" },
        { status: 400 }
      );
    }

    // Validate file type (PDF or images only)
    const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Please upload a PDF or image (JPEG, PNG, WebP)" },
        { status: 400 }
      );
    }

    // Max 10MB
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 10MB" },
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
      return NextResponse.json(
        { error: "Driver not found" },
        { status: 404 }
      );
    }

    // Upload to Vercel Blob
    const filename = `police-checks/${driver._id}/${Date.now()}-${file.name}`;
    const blob = await put(filename, file, {
      access: "public",
    });

    // Update driver's police check info
    driver.policeCheck = {
      completed: true,
      certificateNumber,
      issueDate: new Date(issueDate),
      expiryDate: new Date(expiryDate),
      documentUrl: blob.url,
    };

    await driver.save();

    return NextResponse.json({
      message: "Police check uploaded successfully",
      url: blob.url,
      policeCheck: driver.policeCheck,
    });
  } catch (error) {
    console.error("Error uploading police check:", error);
    return NextResponse.json(
      { error: "Failed to upload police check" },
      { status: 500 }
    );
  }
}
