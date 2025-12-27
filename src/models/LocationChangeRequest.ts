// src/models/LocationChangeRequest.ts
import mongoose, { Schema, Document, Model } from "mongoose";

export type LocationChangeRequestStatus = "pending" | "approved" | "rejected";

export interface ILocationChangeRequest extends Document {
  garageId: mongoose.Types.ObjectId; // Required - garage profile must exist
  garageUserId: mongoose.Types.ObjectId;

  // Current location details (optional for new location assignments)
  currentLocationId?: string;
  currentLocationName?: string;
  currentLocationAddress?: string;

  // Requested new location details
  requestedLocationId: string;
  requestedLocationName: string;
  requestedLocationAddress: string;
  requestedLocationCoordinates?: {
    lat: number;
    lng: number;
  };

  // Request details
  reason: string;
  status: LocationChangeRequestStatus;

  // Timestamps
  submittedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: mongoose.Types.ObjectId;
  adminNotes?: string;

  createdAt: Date;
  updatedAt: Date;
}

const LocationChangeRequestSchema = new Schema<ILocationChangeRequest>(
  {
    garageId: {
      type: Schema.Types.ObjectId,
      ref: "Garage",
      required: true, // Required - garage profile must exist to submit location requests
      index: true,
    },
    garageUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Current location (optional for new location assignments)
    currentLocationId: {
      type: String,
      required: false,
      trim: true,
    },
    currentLocationName: {
      type: String,
      required: false,
      trim: true,
    },
    currentLocationAddress: {
      type: String,
      required: false,
      trim: true,
    },

    // Requested location
    requestedLocationId: {
      type: String,
      required: true,
      trim: true,
    },
    requestedLocationName: {
      type: String,
      required: true,
      trim: true,
    },
    requestedLocationAddress: {
      type: String,
      required: true,
      trim: true,
    },
    requestedLocationCoordinates: {
      lat: { type: Number },
      lng: { type: Number },
    },

    // Request details
    reason: {
      type: String,
      required: [true, "Reason is required"],
      trim: true,
      minlength: [20, "Reason must be at least 20 characters"],
      maxlength: [1000, "Reason cannot exceed 1000 characters"],
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },

    // Timestamps
    submittedAt: {
      type: Date,
      default: Date.now,
    },
    reviewedAt: {
      type: Date,
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    adminNotes: {
      type: String,
      trim: true,
      maxlength: [500, "Admin notes cannot exceed 500 characters"],
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient queries
LocationChangeRequestSchema.index({ garageUserId: 1, status: 1 });
LocationChangeRequestSchema.index({ status: 1, submittedAt: -1 });

// Prevent OverwriteModelError
const LocationChangeRequest: Model<ILocationChangeRequest> =
  mongoose.models.LocationChangeRequest ||
  mongoose.model<ILocationChangeRequest>("LocationChangeRequest", LocationChangeRequestSchema);

export default LocationChangeRequest;
