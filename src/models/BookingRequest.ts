import mongoose, { Schema, Document, Model, Types } from "mongoose";

export type BookingRequestStatus =
  | "pending_review"
  | "accepted_awaiting_payment"
  | "approved"
  | "payment_link_sent"
  | "paid"
  | "declined"
  | "converted"
  | "expired";

export interface IBookingRequestFlag {
  type: "manual_transmission" | "high_value_vehicle" | "other";
  reason: string;
  createdAt: Date;
}

export interface IBookingRequestService {
  category: string;
  services: string[];
}

export interface IBookingRequest extends Document {
  // Customer
  userName: string;
  userEmail: string;
  userId: Types.ObjectId | null;
  isGuest: boolean;
  customerPhone: string;

  // Vehicle
  vehicleRegistration: string;
  vehicleState: string;
  vehicleYear: string;
  vehicleModel: string;
  transmissionType: "automatic" | "manual";
  isManualTransmission: boolean;

  // Pickup / service
  pickupAddress: string;
  serviceType: string;
  serviceDate: Date;
  earliestPickup: string;
  latestDropoff: string;
  pickupTimeSlot: string;
  dropoffTimeSlot: string;
  estimatedServiceDuration: number | null;

  // Existing booking / garage
  hasExistingBooking: boolean;
  garageName: string | null;
  garageAddress: string | null;
  garagePlaceId: string | null;
  existingBookingRef: string | null;

  // Services
  selectedServices: IBookingRequestService[];
  primaryServiceCategory: string | null;
  serviceNotes: string;

  // Server-verified pricing
  distanceZone: string;
  distanceSurcharge: number;
  distanceKm: number;
  quotedAmount: number;
  pickupLat: number;
  pickupLng: number;
  garageLat: number;
  garageLng: number;

  // Flags
  flags: IBookingRequestFlag[];

  // Review / lifecycle
  status: BookingRequestStatus;
  reviewedBy: Types.ObjectId | null;
  reviewedAt: Date | null;
  declineReason: string | null;
  adminNotes: string | null;

  // Payment linkage
  paymentToken: string | null;
  paymentTokenCreatedAt: Date | null;
  approvedAt: Date | null;
  approvedBy: string | null;
  paymentIntentId: string | null;
  checkoutSessionId: string | null;
  paymentLinkUrl: string | null;
  paymentLinkSentAt: Date | null;
  expiresAt: Date | null;
  convertedBookingId: Types.ObjectId | null;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const BookingRequestFlagSchema = new Schema<IBookingRequestFlag>(
  {
    type: {
      type: String,
      enum: ["manual_transmission", "high_value_vehicle", "other"],
      required: true,
    },
    reason: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const BookingRequestServiceSchema = new Schema<IBookingRequestService>(
  {
    category: { type: String, required: true },
    services: { type: [String], default: [] },
  },
  { _id: false }
);

const BookingRequestSchema = new Schema<IBookingRequest>(
  {
    // Customer
    userName: { type: String, required: true, trim: true },
    userEmail: { type: String, required: true, lowercase: true, trim: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    isGuest: { type: Boolean, default: true },
    customerPhone: { type: String, default: "" },

    // Vehicle
    vehicleRegistration: { type: String, required: true, uppercase: true, trim: true },
    vehicleState: { type: String, required: true, uppercase: true },
    vehicleYear: { type: String, default: "" },
    vehicleModel: { type: String, default: "" },
    transmissionType: { type: String, enum: ["automatic", "manual"], default: "automatic" },
    isManualTransmission: { type: Boolean, default: false },

    // Pickup / service
    pickupAddress: { type: String, required: true },
    serviceType: { type: String, default: "regular_service" },
    serviceDate: { type: Date, required: true },
    earliestPickup: { type: String, required: true },
    latestDropoff: { type: String, required: true },
    pickupTimeSlot: { type: String, default: "" },
    dropoffTimeSlot: { type: String, default: "" },
    estimatedServiceDuration: { type: Number, default: null },

    // Existing booking / garage
    hasExistingBooking: { type: Boolean, default: false },
    garageName: { type: String, default: null },
    garageAddress: { type: String, default: null },
    garagePlaceId: { type: String, default: null },
    existingBookingRef: { type: String, default: null },

    // Services
    selectedServices: { type: [BookingRequestServiceSchema], default: [] },
    primaryServiceCategory: { type: String, default: null },
    serviceNotes: { type: String, default: "" },

    // Server-verified pricing
    distanceZone: { type: String, enum: ["green", "yellow", "orange"], default: "green" },
    distanceSurcharge: { type: Number, default: 0, min: 0 },
    distanceKm: { type: Number, default: 0, min: 0 },
    quotedAmount: { type: Number, required: true, min: 0 },
    pickupLat: { type: Number, default: 0 },
    pickupLng: { type: Number, default: 0 },
    garageLat: { type: Number, default: 0 },
    garageLng: { type: Number, default: 0 },

    // Flags
    flags: { type: [BookingRequestFlagSchema], default: [] },

    // Review / lifecycle
    status: {
      type: String,
      enum: ["pending_review", "accepted_awaiting_payment", "approved", "payment_link_sent", "paid", "declined", "converted", "expired"],
      default: "pending_review",
    },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    reviewedAt: { type: Date, default: null },
    declineReason: { type: String, default: null },
    adminNotes: { type: String, default: null },

    // Payment linkage
    paymentToken: { type: String, default: null },
    paymentTokenCreatedAt: { type: Date, default: null },
    approvedAt: { type: Date, default: null },
    approvedBy: { type: String, default: null },
    paymentIntentId: { type: String, default: null },
    checkoutSessionId: { type: String, default: null },
    paymentLinkUrl: { type: String, default: null },
    paymentLinkSentAt: { type: Date, default: null },
    expiresAt: { type: Date, default: null },
    convertedBookingId: { type: Schema.Types.ObjectId, ref: "Booking", default: null },
  },
  { timestamps: true }
);

BookingRequestSchema.index({ status: 1, createdAt: -1 });
BookingRequestSchema.index({ userEmail: 1, createdAt: -1 });
BookingRequestSchema.index({ paymentToken: 1 }, { unique: true, sparse: true });

const BookingRequest: Model<IBookingRequest> =
  mongoose.models.BookingRequest ||
  mongoose.model<IBookingRequest>("BookingRequest", BookingRequestSchema);

export default BookingRequest;
