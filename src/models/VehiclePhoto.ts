// src/models/VehiclePhoto.ts
import mongoose, { Schema, Document, Model } from "mongoose";

export type CheckpointType = "pre_pickup" | "service_dropoff" | "service_pickup" | "final_delivery";
export type PhotoType = "front" | "back" | "left_side" | "right_side" | "odometer";

export const CHECKPOINT_TYPES: CheckpointType[] = [
  "pre_pickup",
  "service_dropoff",
  "service_pickup",
  "final_delivery"
];

export const PHOTO_TYPES: PhotoType[] = [
  "front",
  "back",
  "left_side",
  "right_side",
  "odometer"
];

export const CHECKPOINT_LABELS: Record<CheckpointType, string> = {
  pre_pickup: "Pre-Pickup (Customer Location)",
  service_dropoff: "Service Drop-off (Garage)",
  service_pickup: "Service Pickup (Garage)",
  final_delivery: "Final Delivery (Customer Location)"
};

export const PHOTO_TYPE_LABELS: Record<PhotoType, string> = {
  front: "Front View",
  back: "Rear View",
  left_side: "Left Side",
  right_side: "Right Side",
  odometer: "Odometer Reading"
};

export interface IVehiclePhoto extends Document {
  bookingId: mongoose.Types.ObjectId;
  checkpointType: CheckpointType;
  photoType: PhotoType;
  photoPath: string; // Local path, designed for easy S3 migration
  cloudUrl?: string; // For future cloud storage URL
  uploadedBy: mongoose.Types.ObjectId; // Driver user ID
  uploadedAt: Date;
  notes?: string;
  gpsLatitude?: number;
  gpsLongitude?: number;
  fileSize: number; // in bytes
  mimeType: string;
  createdAt: Date;
  updatedAt: Date;
}

const VehiclePhotoSchema = new Schema<IVehiclePhoto>(
  {
    bookingId: {
      type: Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
      index: true,
    },
    checkpointType: {
      type: String,
      enum: CHECKPOINT_TYPES,
      required: true,
    },
    photoType: {
      type: String,
      enum: PHOTO_TYPES,
      required: true,
    },
    photoPath: {
      type: String,
      required: true,
    },
    cloudUrl: {
      type: String,
      required: false,
    },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
    notes: {
      type: String,
      maxlength: 500,
      trim: true,
    },
    gpsLatitude: {
      type: Number,
      min: -90,
      max: 90,
    },
    gpsLongitude: {
      type: Number,
      min: -180,
      max: 180,
    },
    fileSize: {
      type: Number,
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
      enum: ["image/jpeg", "image/jpg", "image/png"],
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient queries
VehiclePhotoSchema.index({ bookingId: 1, checkpointType: 1 });
VehiclePhotoSchema.index({ bookingId: 1, checkpointType: 1, photoType: 1 }, { unique: true });

// Virtual for public URL (for serving photos)
VehiclePhotoSchema.virtual("publicUrl").get(function () {
  return `/api/photos/${this._id}`;
});

// Static method to get checkpoint completion status
VehiclePhotoSchema.statics.getCheckpointStatus = async function (
  bookingId: mongoose.Types.ObjectId
): Promise<Record<CheckpointType, number>> {
  const counts = await this.aggregate([
    { $match: { bookingId } },
    { $group: { _id: "$checkpointType", count: { $sum: 1 } } },
  ]);

  const status: Record<CheckpointType, number> = {
    pre_pickup: 0,
    service_dropoff: 0,
    service_pickup: 0,
    final_delivery: 0,
  };

  counts.forEach((item: { _id: CheckpointType; count: number }) => {
    status[item._id] = item.count;
  });

  return status;
};

// Prevent OverwriteModelError
const VehiclePhoto: Model<IVehiclePhoto> =
  mongoose.models.VehiclePhoto ||
  mongoose.model<IVehiclePhoto>("VehiclePhoto", VehiclePhotoSchema);

export default VehiclePhoto;
