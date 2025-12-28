// src/app/api/photos/[id]/route.ts
// Photo serving endpoint with access control
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Booking from "@/models/Booking";
import User from "@/models/User";
import VehiclePhoto from "@/models/VehiclePhoto";
import { getFromStorage } from "@/lib/storage";
import mongoose from "mongoose";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/photos/[id] - Serve photo with access control
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id: photoId } = await context.params;

    // Validate photo ID
    if (!mongoose.Types.ObjectId.isValid(photoId)) {
      return NextResponse.json({ error: "Invalid photo ID" }, { status: 400 });
    }

    await connectDB();

    // Find photo
    const photo = await VehiclePhoto.findById(photoId).lean();
    if (!photo) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    }

    // Get booking for access control
    const booking = await Booking.findById(photo.bookingId).lean();
    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Check access control
    const session = await getServerSession(authOptions);
    const { searchParams } = new URL(request.url);

    // Guest access: requires email + registration in query params
    const guestEmail = searchParams.get("email");
    const guestRego = searchParams.get("rego");

    let hasAccess = false;

    if (session?.user?.id) {
      // Authenticated user access
      const user = await User.findById(session.user.id).lean();
      const isAdmin = user?.role === "admin";
      const isOwner =
        booking.userId?.toString() === session.user.id ||
        booking.userEmail?.toLowerCase() === session.user.email?.toLowerCase();
      const isAssignedDriver = Boolean(
        session.user.role === "driver" &&
        user?.driverProfile &&
        booking.assignedDriverId?.toString() === user.driverProfile.toString()
      );

      hasAccess = isAdmin || isOwner || isAssignedDriver;
    } else if (guestEmail && guestRego) {
      // Guest access via email + registration
      const emailMatch =
        booking.userEmail?.toLowerCase() === guestEmail.toLowerCase().trim();
      const regoMatch =
        booking.vehicleRegistration?.toUpperCase() ===
        guestRego.toUpperCase().trim();
      hasAccess = emailMatch && regoMatch;
    }

    if (!hasAccess) {
      return NextResponse.json(
        { error: "You do not have permission to view this photo" },
        { status: 403 }
      );
    }

    // If cloud URL exists, redirect to it
    if (photo.cloudUrl) {
      return NextResponse.redirect(photo.cloudUrl);
    }

    // Serve from local storage
    const fileBuffer = await getFromStorage(photo.photoPath);
    if (!fileBuffer) {
      return NextResponse.json(
        { error: "Photo file not found in storage" },
        { status: 404 }
      );
    }

    // Return image with appropriate headers
    // Convert Buffer to Uint8Array for NextResponse compatibility
    const uint8Array = new Uint8Array(fileBuffer);
    return new NextResponse(uint8Array, {
      status: 200,
      headers: {
        "Content-Type": photo.mimeType,
        "Content-Length": String(fileBuffer.length),
        "Cache-Control": "private, max-age=3600", // Cache for 1 hour
        "Content-Disposition": `inline; filename="vehicle-photo-${photoId}.${photo.mimeType === "image/png" ? "png" : "jpg"}"`,
      },
    });
  } catch (error) {
    console.error("Error serving photo:", error);
    return NextResponse.json(
      { error: "Failed to serve photo" },
      { status: 500 }
    );
  }
}
