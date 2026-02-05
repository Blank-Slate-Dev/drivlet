// src/app/api/driver/bookings/[id]/photos/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Booking from "@/models/Booking";
import Driver from "@/models/Driver";
import User from "@/models/User";
import VehiclePhoto, {
  CheckpointType,
  PhotoType,
  CHECKPOINT_TYPES,
  PHOTO_TYPES,
} from "@/models/VehiclePhoto";
import {
  validateFile,
  generateFilePath,
  uploadToCloud,
  getExtensionFromMimeType,
} from "@/lib/storage";
import mongoose from "mongoose";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// POST /api/driver/bookings/[id]/photos - Upload vehicle photo
export async function POST(request: NextRequest, context: RouteContext) {
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

    if (session.user.role !== "driver") {
      return NextResponse.json({ error: "Only drivers can upload photos" }, { status: 403 });
    }

    await connectDB();

    // Get driver profile
    const user = await User.findById(session.user.id);
    if (!user?.driverProfile) {
      return NextResponse.json({ error: "Driver profile not found" }, { status: 404 });
    }

    const driver = await Driver.findById(user.driverProfile);
    if (!driver) {
      return NextResponse.json({ error: "Driver not found" }, { status: 404 });
    }

    // Get booking and verify driver is assigned
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    if (booking.assignedDriverId?.toString() !== user.driverProfile.toString()) {
      return NextResponse.json(
        { error: "You are not assigned to this booking" },
        { status: 403 }
      );
    }

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get("photo") as File | null;
    const checkpointType = formData.get("checkpoint_type") as string;
    const photoType = formData.get("photo_type") as string;
    const notes = formData.get("notes") as string | null;
    const gpsLat = formData.get("gps_latitude") as string | null;
    const gpsLng = formData.get("gps_longitude") as string | null;

    // Validate required fields
    if (!file) {
      return NextResponse.json({ error: "Photo file is required" }, { status: 400 });
    }

    if (!checkpointType || !CHECKPOINT_TYPES.includes(checkpointType as CheckpointType)) {
      return NextResponse.json(
        { error: `Invalid checkpoint type. Must be one of: ${CHECKPOINT_TYPES.join(", ")}` },
        { status: 400 }
      );
    }

    if (!photoType || !PHOTO_TYPES.includes(photoType as PhotoType)) {
      return NextResponse.json(
        { error: `Invalid photo type. Must be one of: ${PHOTO_TYPES.join(", ")}` },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const mimeType = file.type;

    // Validate file
    const validation = validateFile(buffer, mimeType);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Check if photo already exists for this checkpoint+type combination
    const existingPhoto = await VehiclePhoto.findOne({
      bookingId: new mongoose.Types.ObjectId(bookingId),
      checkpointType: checkpointType as CheckpointType,
      photoType: photoType as PhotoType,
    });

    if (existingPhoto) {
      return NextResponse.json(
        { error: "Photo already uploaded for this checkpoint and type. Delete it first to replace." },
        { status: 409 }
      );
    }

    // Generate file path and upload
    const extension = getExtensionFromMimeType(mimeType);
    const filePath = generateFilePath(
      bookingId,
      checkpointType as CheckpointType,
      photoType as PhotoType,
      extension
    );

    const uploadResult = await uploadToCloud(buffer, filePath);
    if (!uploadResult.success) {
      return NextResponse.json(
        { error: uploadResult.error || "Failed to upload photo" },
        { status: 500 }
      );
    }

    // Create VehiclePhoto record
    const vehiclePhoto = await VehiclePhoto.create({
      bookingId: new mongoose.Types.ObjectId(bookingId),
      checkpointType: checkpointType as CheckpointType,
      photoType: photoType as PhotoType,
      photoPath: uploadResult.filePath,
      cloudUrl: uploadResult.cloudUrl,
      uploadedBy: new mongoose.Types.ObjectId(session.user.id),
      uploadedAt: new Date(),
      notes: notes?.trim() || undefined,
      gpsLatitude: gpsLat ? parseFloat(gpsLat) : undefined,
      gpsLongitude: gpsLng ? parseFloat(gpsLng) : undefined,
      fileSize: buffer.length,
      mimeType,
    });

    // Update booking checkpoint status
    const checkpointKey = checkpointType as keyof typeof booking.checkpointStatus;
    if (!booking.checkpointStatus) {
      booking.checkpointStatus = {
        pre_pickup: 0,
        service_dropoff: 0,
        service_pickup: 0,
        final_delivery: 0,
      };
    }
    booking.checkpointStatus[checkpointKey] = Math.min(
      (booking.checkpointStatus[checkpointKey] || 0) + 1,
      5
    );
    await booking.save();

    return NextResponse.json({
      success: true,
      photo: {
        id: vehiclePhoto._id.toString(),
        checkpointType: vehiclePhoto.checkpointType,
        photoType: vehiclePhoto.photoType,
        url: `/api/photos/${vehiclePhoto._id}`,
        uploadedAt: vehiclePhoto.uploadedAt,
        notes: vehiclePhoto.notes,
      },
      checkpointStatus: booking.checkpointStatus,
    });
  } catch (error) {
    console.error("Error uploading vehicle photo:", error);
    return NextResponse.json(
      { error: "Failed to upload photo" },
      { status: 500 }
    );
  }
}

// GET /api/driver/bookings/[id]/photos - Get all photos for a booking (driver view)
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

    if (session.user.role !== "driver") {
      return NextResponse.json({ error: "Only drivers can access this endpoint" }, { status: 403 });
    }

    await connectDB();

    // Get driver profile
    const user = await User.findById(session.user.id);
    if (!user?.driverProfile) {
      return NextResponse.json({ error: "Driver profile not found" }, { status: 404 });
    }

    // Get booking and verify driver is assigned
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    if (booking.assignedDriverId?.toString() !== user.driverProfile.toString()) {
      return NextResponse.json(
        { error: "You are not assigned to this booking" },
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

    // Format response
    const formattedPhotos = photos.map((photo) => ({
      id: photo._id.toString(),
      checkpointType: photo.checkpointType,
      photoType: photo.photoType,
      url: `/api/photos/${photo._id}`,
      uploadedAt: photo.uploadedAt,
      notes: photo.notes,
      gpsLatitude: photo.gpsLatitude,
      gpsLongitude: photo.gpsLongitude,
    }));

    // Group by checkpoint
    const groupedPhotos: Record<CheckpointType, typeof formattedPhotos> = {
      pre_pickup: [],
      service_dropoff: [],
      service_pickup: [],
      final_delivery: [],
    };

    formattedPhotos.forEach((photo) => {
      groupedPhotos[photo.checkpointType as CheckpointType].push(photo);
    });

    return NextResponse.json({
      success: true,
      booking: {
        id: bookingId,
        vehicleRegistration: booking.vehicleRegistration,
        checkpointStatus: booking.checkpointStatus,
      },
      photos: formattedPhotos,
      groupedPhotos,
    });
  } catch (error) {
    console.error("Error fetching vehicle photos:", error);
    return NextResponse.json(
      { error: "Failed to fetch photos" },
      { status: 500 }
    );
  }
}

// DELETE /api/driver/bookings/[id]/photos?photoId=xxx - Delete a photo
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id: bookingId } = await context.params;
    const { searchParams } = new URL(request.url);
    const photoId = searchParams.get("photoId");

    // Validate IDs
    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return NextResponse.json({ error: "Invalid booking ID" }, { status: 400 });
    }
    if (!photoId || !mongoose.Types.ObjectId.isValid(photoId)) {
      return NextResponse.json({ error: "Invalid photo ID" }, { status: 400 });
    }

    // Verify authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "driver") {
      return NextResponse.json({ error: "Only drivers can delete photos" }, { status: 403 });
    }

    await connectDB();

    // Get driver profile
    const user = await User.findById(session.user.id);
    if (!user?.driverProfile) {
      return NextResponse.json({ error: "Driver profile not found" }, { status: 404 });
    }

    // Get booking and verify driver is assigned
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    if (booking.assignedDriverId?.toString() !== user.driverProfile.toString()) {
      return NextResponse.json(
        { error: "You are not assigned to this booking" },
        { status: 403 }
      );
    }

    // Find and delete photo
    const photo = await VehiclePhoto.findOne({
      _id: new mongoose.Types.ObjectId(photoId),
      bookingId: new mongoose.Types.ObjectId(bookingId),
    });

    if (!photo) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    }

    // Delete file from cloud storage (async, don't block)
    const { deleteFromStorage } = await import("@/lib/storage");
    const deleteUrl = photo.cloudUrl || photo.photoPath;
    deleteFromStorage(deleteUrl).catch((err) => {
      console.error("Failed to delete photo file:", err);
    });

    // Delete record
    await VehiclePhoto.deleteOne({ _id: photo._id });

    // Update booking checkpoint status
    const checkpointKey = photo.checkpointType as keyof typeof booking.checkpointStatus;
    if (booking.checkpointStatus && booking.checkpointStatus[checkpointKey] > 0) {
      booking.checkpointStatus[checkpointKey] -= 1;
      await booking.save();
    }

    return NextResponse.json({
      success: true,
      message: "Photo deleted",
      checkpointStatus: booking.checkpointStatus,
    });
  } catch (error) {
    console.error("Error deleting vehicle photo:", error);
    return NextResponse.json(
      { error: "Failed to delete photo" },
      { status: 500 }
    );
  }
}
