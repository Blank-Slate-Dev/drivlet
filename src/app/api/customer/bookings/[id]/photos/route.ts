// src/app/api/customer/bookings/[id]/photos/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Booking from "@/models/Booking";
import User from "@/models/User";
import VehiclePhoto, {
  CheckpointType,
  CHECKPOINT_TYPES,
  CHECKPOINT_LABELS,
  PHOTO_TYPE_LABELS,
} from "@/models/VehiclePhoto";
import mongoose from "mongoose";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/customer/bookings/[id]/photos - Get photos for a booking (customer view)
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id: bookingId } = await context.params;

    // Validate booking ID
    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return NextResponse.json({ error: "Invalid booking ID" }, { status: 400 });
    }

    // Verify authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    // Get booking
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Verify user owns this booking
    const user = await User.findById(session.user.id).lean();
    const isAdmin = user?.role === "admin";
    const isOwner =
      booking.userId?.toString() === session.user.id ||
      booking.userEmail?.toLowerCase() === session.user.email?.toLowerCase();

    if (!isAdmin && !isOwner) {
      return NextResponse.json(
        { error: "You are not authorized to view this booking's photos" },
        { status: 403 }
      );
    }

    // Get checkpoint filter from query params
    const { searchParams } = new URL(request.url);
    const checkpoint = searchParams.get("checkpoint") as CheckpointType | null;

    // Build query
    const query: Record<string, unknown> = {
      bookingId: new mongoose.Types.ObjectId(bookingId),
    };
    if (checkpoint && CHECKPOINT_TYPES.includes(checkpoint)) {
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
    const groupedPhotos = CHECKPOINT_TYPES.map((checkpoint) => ({
      checkpoint,
      label: CHECKPOINT_LABELS[checkpoint],
      completedCount: booking.checkpointStatus?.[checkpoint] || 0,
      requiredCount: 5,
      photos: formattedPhotos.filter((p) => p.checkpointType === checkpoint),
    }));

    return NextResponse.json({
      success: true,
      booking: {
        id: bookingId,
        vehicleRegistration: booking.vehicleRegistration,
        status: booking.status,
        currentStage: booking.currentStage,
      },
      checkpoints: groupedPhotos,
      totalPhotos: photos.length,
    });
  } catch (error) {
    console.error("Error fetching customer booking photos:", error);
    return NextResponse.json(
      { error: "Failed to fetch photos" },
      { status: 500 }
    );
  }
}
