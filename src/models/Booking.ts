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
  // User info (userId is optional for guests)
  userId: Types.ObjectId | null;
  userEmail: string;
  userName: string;

  // Guest-specific fields
  isGuest: boolean;
  guestPhone?: string;

  // Core booking details
  pickupTime: string;
  dropoffTime: string;
  pickupAddress: string;
  vehicleRegistration: string;
  vehicleState: string;
  serviceType: string;

  // Existing booking fields (for stage 1)
  hasExistingBooking: boolean;
  garageName?: string;
  existingBookingRef?: string;
  existingBookingNotes?: string;

  // Payment information
  paymentId?: string;
  paymentAmount?: number;
  paymentStatus?: 'pending' | 'paid' | 'failed' | 'refunded';
  stripeSessionId?: string;

  // Progress tracking
  currentStage: string;
  overallProgress: number;
  status: BookingStatus;
  updates: IUpdate[];

  // Timestamps
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
    // User info - userId is optional for guest bookings
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false,
      index: true,
      default: null,
    },
    userEmail: {
      type: String,
      required: true,
      index: true,
    },
    userName: {
      type: String,
      required: true,
    },
    
    // Guest-specific fields
    isGuest: {
      type: Boolean,
      default: false,
    },
    guestPhone: {
      type: String,
      required: false,
    },
    
    // Core booking details
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
    
    // Existing booking fields (for stage 1 - attending existing bookings)
    hasExistingBooking: {
      type: Boolean,
      default: false,
    },
    garageName: {
      type: String,
      required: false,
    },
    existingBookingRef: {
      type: String,
      required: false,
    },
    existingBookingNotes: {
      type: String,
      required: false,
    },

    // Payment information
    paymentId: {
      type: String,
      required: false,
      index: true,
    },
    paymentAmount: {
      type: Number,
      required: false,
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending',
    },
    stripeSessionId: {
      type: String,
      required: false,
    },

    // Progress tracking
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
    
    // Timestamps
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

// Indexes for efficient queries
BookingSchema.index({ status: 1, createdAt: -1 });
BookingSchema.index({ userEmail: 1 });
BookingSchema.index({ isGuest: 1 });
BookingSchema.index({ hasExistingBooking: 1 });

// Prevent OverwriteModelError by checking if model exists
const Booking: Model<IBooking> =
  mongoose.models.Booking || mongoose.model<IBooking>("Booking", BookingSchema);

export default Booking;
