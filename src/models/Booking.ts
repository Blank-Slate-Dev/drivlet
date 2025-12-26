// src/models/Booking.ts
import mongoose, { Schema, Document, Model, Types } from "mongoose";

export type BookingStatus = "pending" | "in_progress" | "completed" | "cancelled";

export interface IUpdate {
  stage: string;
  timestamp: Date;
  message: string;
  updatedBy: string;
}

export interface IFlag {
  type: 'manual_transmission' | 'high_value_vehicle' | 'other';
  reason: string;
  createdAt: Date;
}

export interface ISelectedService {
  category: string;
  services: string[];
}

export type GarageBookingStatus = "new" | "acknowledged" | "accepted" | "declined" | "in_progress" | "completed";

export interface IGarageResponse {
  respondedAt: Date;
  respondedBy: Types.ObjectId;
  notes?: string;
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
  garageAddress?: string;
  garagePlaceId?: string; // Google Places ID for exact garage matching
  existingBookingRef?: string;
  existingBookingNotes?: string;

  // Garage assignment
  assignedGarageId?: Types.ObjectId;
  assignedAt?: Date;
  garageNotifiedAt?: Date;
  garageViewedAt?: Date;
  garageStatus: GarageBookingStatus;
  garageNotes?: string;
  garageAcceptedAt?: Date;
  garageCompletedAt?: Date;
  garageResponse?: IGarageResponse;

  // Driver assignment
  assignedDriverId?: Types.ObjectId;
  driverAssignedAt?: Date;
  driverAcceptedAt?: Date;
  driverStartedAt?: Date;
  driverCompletedAt?: Date;

  // Payment information
  paymentId?: string;
  paymentAmount?: number;
  paymentStatus?: 'pending' | 'paid' | 'failed' | 'refunded';
  stripeSessionId?: string;

  // Vehicle details
  transmissionType: 'automatic' | 'manual';
  isManualTransmission: boolean;

  // Service selection
  selectedServices: ISelectedService[];
  primaryServiceCategory: string | null;
  serviceNotes: string;

  // Flags for special attention
  flags: IFlag[];

  // Progress tracking
  currentStage: string;
  overallProgress: number;
  status: BookingStatus;
  updates: IUpdate[];

  // Timestamps
  createdAt: Date;
  updatedAt: Date;

  // Cancellation details
  cancellation?: {
    cancelledAt: Date;
    cancelledBy: Types.ObjectId | string;
    cancelledByRole: 'customer' | 'admin' | 'system';
    reason?: string;
    refundAmount: number;
    refundPercentage: number;
    refundId?: string;
    refundStatus: 'pending' | 'succeeded' | 'failed' | 'not_applicable';
  };
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

const FlagSchema = new Schema<IFlag>(
  {
    type: {
      type: String,
      enum: ['manual_transmission', 'high_value_vehicle', 'other'],
      required: true,
    },
    reason: {
      type: String,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const SelectedServiceSchema = new Schema<ISelectedService>(
  {
    category: {
      type: String,
      required: true,
    },
    services: {
      type: [String],
      default: [],
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
      index: true, // Index for fallback name-based matching
    },
    garageAddress: {
      type: String,
      required: false,
    },
    garagePlaceId: {
      type: String,
      required: false,
      index: true, // Index for exact matching by Google Place ID
    },
    existingBookingRef: {
      type: String,
      required: false,
    },
    existingBookingNotes: {
      type: String,
      required: false,
    },

    // Garage assignment
    assignedGarageId: {
      type: Schema.Types.ObjectId,
      ref: "Garage",
      required: false,
      index: true,
    },
    assignedAt: {
      type: Date,
      required: false,
    },
    garageNotifiedAt: {
      type: Date,
      required: false,
    },
    garageViewedAt: {
      type: Date,
      required: false,
    },
    garageStatus: {
      type: String,
      enum: ["new", "acknowledged", "accepted", "declined", "in_progress", "completed"],
      default: "new",
    },
    garageNotes: {
      type: String,
      required: false,
    },
    garageAcceptedAt: {
      type: Date,
      required: false,
    },
    garageCompletedAt: {
      type: Date,
      required: false,
    },
    garageResponse: {
      respondedAt: { type: Date },
      respondedBy: { type: Schema.Types.ObjectId, ref: "User" },
      notes: { type: String },
    },

    // Driver assignment
    assignedDriverId: {
      type: Schema.Types.ObjectId,
      ref: "Driver",
      required: false,
      index: true,
    },
    driverAssignedAt: {
      type: Date,
      required: false,
    },
    driverAcceptedAt: {
      type: Date,
      required: false,
    },
    driverStartedAt: {
      type: Date,
      required: false,
    },
    driverCompletedAt: {
      type: Date,
      required: false,
    },

    // Payment information
    paymentId: {
      type: String,
      index: true,
    },
    paymentAmount: {
      type: Number,
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
    },
    stripeSessionId: {
      type: String,
      index: true,
    },

    // Vehicle details
    transmissionType: {
      type: String,
      enum: ["automatic", "manual"],
      default: "automatic",
    },
    isManualTransmission: {
      type: Boolean,
      default: false,
    },

    // Service selection
    selectedServices: {
      type: [SelectedServiceSchema],
      default: [],
    },
    primaryServiceCategory: {
      type: String,
      default: null,
    },
    serviceNotes: {
      type: String,
      default: "",
    },

    // Flags for special attention
    flags: {
      type: [FlagSchema],
      default: [],
    },

    // Progress tracking
    currentStage: {
      type: String,
      default: "booking_confirmed",
    },
    overallProgress: {
      type: Number,
      default: 0,
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

    // Cancellation details
    cancellation: {
      cancelledAt: { type: Date },
      cancelledBy: { type: Schema.Types.Mixed }, // Can be ObjectId or string
      cancelledByRole: {
        type: String,
        enum: ["customer", "admin", "system"],
      },
      reason: { type: String },
      refundAmount: { type: Number, default: 0 },
      refundPercentage: { type: Number, default: 0 },
      refundId: { type: String },
      refundStatus: {
        type: String,
        enum: ["pending", "succeeded", "failed", "not_applicable"],
      },
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
BookingSchema.index({ status: 1, createdAt: -1 });
BookingSchema.index({ isGuest: 1 });
BookingSchema.index({ hasExistingBooking: 1 });
BookingSchema.index({ assignedGarageId: 1, garageStatus: 1 });
BookingSchema.index({ garageStatus: 1 });
BookingSchema.index({ garagePlaceId: 1, garageStatus: 1 }); // For garage-based booking matching
BookingSchema.index({ assignedDriverId: 1, status: 1 }); // For driver job queries
BookingSchema.index({ paymentId: 1 }, { unique: true, sparse: true }); // Prevent duplicate bookings for same payment

// Prevent OverwriteModelError by checking if model exists
const Booking: Model<IBooking> =
  mongoose.models.Booking || mongoose.model<IBooking>("Booking", BookingSchema);

export default Booking;
