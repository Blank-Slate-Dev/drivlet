// src/models/Booking.ts
import mongoose, { Schema, Document, Model, Types } from "mongoose";

export type BookingStatus = "pending" | "in_progress" | "completed" | "cancelled";

export interface IUpdate {
  stage: string;
  timestamp: Date;
  message: string;
  updatedBy: string;
}

export interface IBooking extends Document {
  userId: Types.ObjectId;
  userEmail: string;
  userName: string;
  pickupTime: string;
  dropoffTime: string;
  pickupAddress: string;
  vehicleRegistration: string;
  vehicleState: string;
  serviceType: string;
  currentStage: string;
  overallProgress: number;
  status: BookingStatus;
  updates: IUpdate[];
  createdAt: Date;
  updatedAt: Date;
}

const UpdateSchema = new Schema<IUpdate>(
  {
    stage: {
      type: String,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    message: {
      type: String,
      default: "",
    },
    updatedBy: {
      type: String,
      default: "",
    },
  },
  { _id: false }
);

const BookingSchema = new Schema<IBooking>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    userEmail: {
      type: String,
      required: true,
    },
    userName: {
      type: String,
      required: true,
    },
    pickupTime: {
      type: String,
      required: true,
    },
    dropoffTime: {
      type: String,
      required: true,
    },
    pickupAddress: {
      type: String,
      required: true,
    },
    vehicleRegistration: {
      type: String,
      required: true,
    },
    vehicleState: {
      type: String,
      required: true,
    },
    serviceType: {
      type: String,
      required: true,
    },
    currentStage: {
      type: String,
      default: "booking_confirmed",
    },
    overallProgress: {
      type: Number,
      default: 14,
      min: 0,
      max: 100,
    },
    status: {
      type: String,
      enum: ["pending", "in_progress", "completed", "cancelled"],
      default: "pending",
    },
    updates: {
      type: [UpdateSchema],
      default: [],
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
BookingSchema.index({ status: 1, createdAt: -1 });
BookingSchema.index({ userEmail: 1 });

// Prevent OverwriteModelError by checking if model exists
const Booking: Model<IBooking> =
  mongoose.models.Booking || mongoose.model<IBooking>("Booking", BookingSchema);

export default Booking;
