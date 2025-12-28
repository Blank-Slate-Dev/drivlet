// src/app/api/bookings/track/photos/route.ts
// Guest photo viewing endpoint - uses email + registration for verification
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Booking from "@/models/Booking";
import VehiclePhoto, {
  CheckpointType,
  CHECKPOINT_TYPES,
  CHECKPOINT_LABELS,
  PHOTO_TYPE_LABELS,
} from "@/models/VehiclePhoto";
import { withRateLimit, RATE_LIMITS } from "@/lib/rateLimit";
import mongoose from "mongoose";

// POST /api/bookings/track/photos - Get photos for a booking (guest view)
// Uses email + registration for verification (same as track endpoint)
export async function POST(request: NextRequest) {
  // Apply rate limiting - prevent enumeration attacks
  const rateLimit = withRateLimit(request, RATE_LIMITS.form, "track-photos");
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil(rateLimit.resetIn / 1000)),
        },
      }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON in request body" },
      { status: 400 }
    );
  }

  try {
    const { email, registration, checkpoint } = body;

    if (!email || !registration) {
      return NextResponse.json(
        { error: "Email and vehicle registration are required" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Validate registration format (basic alphanumeric, 2-10 chars)
    const regClean = registration.trim().toUpperCase();
    if (!/^[A-Z0-9]{2,10}$/.test(regClean)) {
      return NextResponse.json(
        { error: "Invalid vehicle registration format" },
        { status: 400 }
      );
    }

    await connectDB();

    // Find booking with exact matching (security)
    const booking = await Booking.findOne({
      userEmail: email.toLowerCase().trim(),
      vehicleRegistration: regClean,
    })
      .sort({ createdAt: -1 })
      .lean();

    if (!booking) {
      return NextResponse.json(
        { error: "No booking found with this email and registration" },
        { status: 404 }
      );
    }

    // Build photo query
    const query: Record<string, unknown> = {
      bookingId: new mongoose.Types.ObjectId(String(booking._id)),
    };

    // Optional checkpoint filter
    if (checkpoint && CHECKPOINT_TYPES.includes(checkpoint as CheckpointType)) {
      query.checkpointType = checkpoint;
    }

    // Get photos
    const photos = await VehiclePhoto.find(query)
      .sort({ checkpointType: 1, photoType: 1, uploadedAt: -1 })
      .lean();

    // Format response with human-readable labels
    const formattedPhotos = photos.map((photo) => ({
      id: photo._id.toString(),
      checkpointType: photo.checkpointType,
      checkpointLabel: CHECKPOINT_LABELS[photo.checkpointType as CheckpointType],
      photoType: photo.photoType,
      photoTypeLabel: PHOTO_TYPE_LABELS[photo.photoType as keyof typeof PHOTO_TYPE_LABELS],
      url: `/api/photos/${photo._id}`,
      uploadedAt: photo.uploadedAt,
      notes: photo.notes,
    }));

    // Group by checkpoint with labels
    const checkpointStatus = booking.checkpointStatus || {
      pre_pickup: 0,
      service_dropoff: 0,
      service_pickup: 0,
      final_delivery: 0,
    };

    const groupedPhotos = CHECKPOINT_TYPES.map((cp) => ({
      checkpoint: cp,
      label: CHECKPOINT_LABELS[cp],
      completedCount: checkpointStatus[cp as keyof typeof checkpointStatus] || 0,
      requiredCount: 5,
      photos: formattedPhotos.filter((p) => p.checkpointType === cp),
    }));

    return NextResponse.json({
      success: true,
      booking: {
        id: String(booking._id),
        vehicleRegistration: booking.vehicleRegistration,
        vehicleState: booking.vehicleState,
        status: booking.status,
        currentStage: booking.currentStage,
      },
      checkpoints: groupedPhotos,
      totalPhotos: photos.length,
    });
  } catch (error) {
    console.error("Error fetching booking photos:", error);
    return NextResponse.json(
      { error: "Failed to fetch photos" },
      { status: 500 }
    );
  }
}
