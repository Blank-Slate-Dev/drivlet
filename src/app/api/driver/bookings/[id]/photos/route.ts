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
  CHECKPOINT_LABELS,
  PHOTO_TYPE_LABELS,
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

// POST /api/driver/bookings/[id]/photos - Upload vehicle photo (new or replace)
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id: bookingId } = await context.params;

    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return NextResponse.json({ error: "Invalid booking ID" }, { status: 400 });
    }

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "driver") {
      return NextResponse.json({ error: "Only drivers can upload photos" }, { status: 403 });
    }

    await connectDB();

    const user = await User.findById(session.user.id);
    if (!user?.driverProfile) {
      return NextResponse.json({ error: "Driver profile not found" }, { status: 404 });
    }

    const driver = await Driver.findById(user.driverProfile);
    if (!driver) {
      return NextResponse.json({ error: "Driver not found" }, { status: 404 });
    }

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

    const formData = await request.formData();
    const file = formData.get("photo") as File | null;
    const checkpointType = formData.get("checkpoint_type") as string;
    const photoType = formData.get("photo_type") as string;
    const notes = formData.get("notes") as string | null;
    const gpsLat = formData.get("gps_latitude") as string | null;
    const gpsLng = formData.get("gps_longitude") as string | null;
    const capturedAtRaw = formData.get("captured_at") as string | null;
    const capturedLocation = formData.get("captured_location") as string | null;
    const replacePhotoId = formData.get("replace_photo_id") as string | null;

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

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const mimeType = file.type;

    const validation = validateFile(buffer, mimeType);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // --- Replace flow: supersede old photo ---
    let isReplacement = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Mongoose document type for rollback reference
    let supersededPhoto: any = null;

    if (replacePhotoId) {
      if (!mongoose.Types.ObjectId.isValid(replacePhotoId)) {
        return NextResponse.json({ error: "Invalid replace photo ID" }, { status: 400 });
      }

      const oldPhoto = await VehiclePhoto.findOne({
        _id: new mongoose.Types.ObjectId(replacePhotoId),
        bookingId: new mongoose.Types.ObjectId(bookingId),
        superseded: { $ne: true },
      });

      if (!oldPhoto) {
        return NextResponse.json({ error: "Photo to replace not found" }, { status: 404 });
      }

      if (oldPhoto.checkpointType !== checkpointType || oldPhoto.photoType !== photoType) {
        return NextResponse.json({ error: "Checkpoint/photo type mismatch" }, { status: 400 });
      }

      oldPhoto.superseded = true;
      oldPhoto.supersededAt = new Date();
      await oldPhoto.save();
      supersededPhoto = oldPhoto;
      isReplacement = true;
    }

    // --- Existing photo check (skip for replacements) ---
    if (!isReplacement) {
      // Commented out — replaced with superseded-aware query
      // const existingPhoto = await VehiclePhoto.findOne({
      //   bookingId: new mongoose.Types.ObjectId(bookingId),
      //   checkpointType: checkpointType as CheckpointType,
      //   photoType: photoType as PhotoType,
      // });
      const existingPhoto = await VehiclePhoto.findOne({
        bookingId: new mongoose.Types.ObjectId(bookingId),
        checkpointType: checkpointType as CheckpointType,
        photoType: photoType as PhotoType,
        superseded: { $ne: true },
      });

      if (existingPhoto) {
        return NextResponse.json(
          { error: "Photo already uploaded for this checkpoint and type. Delete it first to replace." },
          { status: 409 }
        );
      }
    }

    // --- Upload ---
    try {
      const extension = getExtensionFromMimeType(mimeType);
      const filePath = generateFilePath(
        bookingId,
        checkpointType as CheckpointType,
        photoType as PhotoType,
        extension
      );

      const uploadResult = await uploadToCloud(buffer, filePath);
      if (!uploadResult.success) {
        // Rollback supersede on upload failure
        if (supersededPhoto) {
          supersededPhoto.superseded = false;
          supersededPhoto.supersededAt = undefined;
          await supersededPhoto.save();
        }
        return NextResponse.json(
          { error: uploadResult.error || "Failed to upload photo" },
          { status: 500 }
        );
      }

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
        capturedAt: capturedAtRaw ? new Date(capturedAtRaw) : undefined,
        capturedLocation: capturedLocation?.trim() || undefined,
        fileSize: buffer.length,
        mimeType,
      });

      // Update booking checkpoint status (only for new uploads, not replacements)
      if (!isReplacement) {
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
      }

      // Audit entry for replacements
      if (isReplacement) {
        const cpLabel = CHECKPOINT_LABELS[checkpointType as CheckpointType];
        const ptLabel = PHOTO_TYPE_LABELS[photoType as PhotoType];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- booking.updates has complex union type
        const updates = ((booking as any).updates as any[]) || [];
        updates.push({
          stage: booking.currentStage || "photo_audit",
          timestamp: new Date(),
          message: `Photo replaced: ${cpLabel} - ${ptLabel}`,
          updatedBy: session.user.id,
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- assigning audit trail
        (booking as any).updates = updates;
      }

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
          capturedAt: vehiclePhoto.capturedAt,
          capturedLocation: vehiclePhoto.capturedLocation,
        },
        checkpointStatus: booking.checkpointStatus,
      });
    } catch (uploadError) {
      // Rollback supersede if upload/create failed
      if (supersededPhoto) {
        try {
          supersededPhoto.superseded = false;
          supersededPhoto.supersededAt = undefined;
          await supersededPhoto.save();
        } catch (_) {
          /* best-effort rollback */
        }
      }
      throw uploadError;
    }
  } catch (error) {
    console.error("Error uploading vehicle photo:", error);
    return NextResponse.json(
      { error: "Failed to upload photo" },
      { status: 500 }
    );
  }
}

// GET /api/driver/bookings/[id]/photos - Get all active photos for a booking (driver view)
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id: bookingId } = await context.params;

    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return NextResponse.json({ error: "Invalid booking ID" }, { status: 400 });
    }

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "driver") {
      return NextResponse.json({ error: "Only drivers can access this endpoint" }, { status: 403 });
    }

    await connectDB();

    const user = await User.findById(session.user.id);
    if (!user?.driverProfile) {
      return NextResponse.json({ error: "Driver profile not found" }, { status: 404 });
    }

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

    const { searchParams } = new URL(request.url);
    const checkpoint = searchParams.get("checkpoint") as CheckpointType | null;

    // Commented out — replaced with superseded-aware query
    // const query: Record<string, unknown> = {
    //   bookingId: new mongoose.Types.ObjectId(bookingId),
    // };
    const query: Record<string, unknown> = {
      bookingId: new mongoose.Types.ObjectId(bookingId),
      superseded: { $ne: true },
    };
    if (checkpoint && CHECKPOINT_TYPES.includes(checkpoint)) {
      query.checkpointType = checkpoint;
    }

    const photos = await VehiclePhoto.find(query)
      .sort({ checkpointType: 1, photoType: 1, uploadedAt: -1 })
      .lean();

    const formattedPhotos = photos.map((photo) => ({
      id: photo._id.toString(),
      checkpointType: photo.checkpointType,
      photoType: photo.photoType,
      url: `/api/photos/${photo._id}`,
      uploadedAt: photo.uploadedAt,
      notes: photo.notes,
      gpsLatitude: photo.gpsLatitude,
      gpsLongitude: photo.gpsLongitude,
      capturedAt: photo.capturedAt,
      capturedLocation: photo.capturedLocation,
    }));

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

    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return NextResponse.json({ error: "Invalid booking ID" }, { status: 400 });
    }
    if (!photoId || !mongoose.Types.ObjectId.isValid(photoId)) {
      return NextResponse.json({ error: "Invalid photo ID" }, { status: 400 });
    }

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "driver") {
      return NextResponse.json({ error: "Only drivers can delete photos" }, { status: 403 });
    }

    await connectDB();

    const user = await User.findById(session.user.id);
    if (!user?.driverProfile) {
      return NextResponse.json({ error: "Driver profile not found" }, { status: 404 });
    }

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

    const photo = await VehiclePhoto.findOne({
      _id: new mongoose.Types.ObjectId(photoId),
      bookingId: new mongoose.Types.ObjectId(bookingId),
    });

    if (!photo) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    }

    const { deleteFromStorage } = await import("@/lib/storage");
    const deleteUrl = photo.cloudUrl || photo.photoPath;
    deleteFromStorage(deleteUrl).catch((err) => {
      console.error("Failed to delete photo file:", err);
    });

    await VehiclePhoto.deleteOne({ _id: photo._id });

    // Update booking checkpoint status
    const checkpointKey = photo.checkpointType as keyof typeof booking.checkpointStatus;
    if (booking.checkpointStatus && booking.checkpointStatus[checkpointKey] > 0) {
      booking.checkpointStatus[checkpointKey] -= 1;
    }

    // Audit entry
    const cpLabel = CHECKPOINT_LABELS[photo.checkpointType];
    const ptLabel = PHOTO_TYPE_LABELS[photo.photoType];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- booking.updates has complex union type
    const updates = ((booking as any).updates as any[]) || [];
    updates.push({
      stage: booking.currentStage || "photo_audit",
      timestamp: new Date(),
      message: `Photo deleted: ${cpLabel} - ${ptLabel}`,
      updatedBy: session.user.id,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- assigning audit trail
    (booking as any).updates = updates;

    await booking.save();

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

// PATCH /api/driver/bookings/[id]/photos - Edit photo details (notes, capturedAt, capturedLocation)
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id: bookingId } = await context.params;

    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return NextResponse.json({ error: "Invalid booking ID" }, { status: 400 });
    }

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "driver") {
      return NextResponse.json({ error: "Only drivers can edit photo details" }, { status: 403 });
    }

    await connectDB();

    const user = await User.findById(session.user.id);
    if (!user?.driverProfile) {
      return NextResponse.json({ error: "Driver profile not found" }, { status: 404 });
    }

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

    const body = await request.json();
    const { photoId, notes, capturedAt, capturedLocation } = body;

    if (!photoId || !mongoose.Types.ObjectId.isValid(photoId)) {
      return NextResponse.json({ error: "Invalid photo ID" }, { status: 400 });
    }

    const photo = await VehiclePhoto.findOne({
      _id: new mongoose.Types.ObjectId(photoId),
      bookingId: new mongoose.Types.ObjectId(bookingId),
      superseded: { $ne: true },
    });

    if (!photo) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    }

    if (notes !== undefined) photo.notes = notes?.trim() || undefined;
    if (capturedAt !== undefined) photo.capturedAt = capturedAt ? new Date(capturedAt) : undefined;
    if (capturedLocation !== undefined) photo.capturedLocation = capturedLocation?.trim() || undefined;

    await photo.save();

    // Audit entry
    const cpLabel = CHECKPOINT_LABELS[photo.checkpointType];
    const ptLabel = PHOTO_TYPE_LABELS[photo.photoType];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- booking.updates has complex union type
    const updates = ((booking as any).updates as any[]) || [];
    updates.push({
      stage: booking.currentStage || "photo_audit",
      timestamp: new Date(),
      message: `Photo details edited: ${cpLabel} - ${ptLabel}`,
      updatedBy: session.user.id,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- assigning audit trail
    (booking as any).updates = updates;
    await booking.save();

    return NextResponse.json({
      success: true,
      photo: {
        id: photo._id.toString(),
        checkpointType: photo.checkpointType,
        photoType: photo.photoType,
        url: `/api/photos/${photo._id}`,
        uploadedAt: photo.uploadedAt,
        notes: photo.notes,
        capturedAt: photo.capturedAt,
        capturedLocation: photo.capturedLocation,
      },
    });
  } catch (error) {
    console.error("Error updating photo details:", error);
    return NextResponse.json(
      { error: "Failed to update photo details" },
      { status: 500 }
    );
  }
}
