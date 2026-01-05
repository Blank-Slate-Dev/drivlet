// src/models/QuoteRequest.ts
import mongoose, { Schema, Document, Model } from "mongoose";

// Re-export constants from shared file for backward compatibility
export { SERVICE_CATEGORIES, URGENCY_LEVELS } from "@/constants/quoteRequest";
export type { ServiceCategory, UrgencyLevel } from "@/constants/quoteRequest";

export type QuoteRequestStatus = "open" | "quoted" | "accepted" | "expired" | "cancelled";

export interface IQuoteRequest extends Document {
  customerId?: mongoose.Types.ObjectId;
  customerEmail: string;
  customerName: string;
  customerPhone: string;
  isGuest: boolean;
  vehicleRegistration: string;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleYear?: number;
  serviceCategory: string;
  serviceDescription: string;
  urgency: string;
  preferredDate?: Date;
  locationAddress: string;
  locationPlaceId?: string;
  locationCoordinates?: {
    lat: number;
    lng: number;
  };
  photos: string[];
  status: QuoteRequestStatus;
  quotesReceived: number;
  acceptedQuoteId?: mongoose.Types.ObjectId;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const QuoteRequestSchema = new Schema<IQuoteRequest>(
  {
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false,
      index: true,
    },
    customerEmail: {
      type: String,
      required: [true, "Customer email is required"],
      lowercase: true,
      trim: true,
    },
    customerName: {
      type: String,
      required: [true, "Customer name is required"],
      trim: true,
    },
    customerPhone: {
      type: String,
      required: [true, "Customer phone is required"],
      trim: true,
    },
    isGuest: {
      type: Boolean,
      default: false,
    },
    vehicleRegistration: {
      type: String,
      required: [true, "Vehicle registration is required"],
      uppercase: true,
      trim: true,
    },
    vehicleMake: {
      type: String,
      trim: true,
    },
    vehicleModel: {
      type: String,
      trim: true,
    },
    vehicleYear: {
      type: Number,
      min: 1900,
      max: new Date().getFullYear() + 1,
    },
    serviceCategory: {
      type: String,
      required: [true, "Service category is required"],
      enum: ["mechanical", "electrical", "bodywork", "tyres", "servicing", "other"],
    },
    serviceDescription: {
      type: String,
      required: [true, "Service description is required"],
      maxlength: [2000, "Service description cannot exceed 2000 characters"],
      trim: true,
    },
    urgency: {
      type: String,
      enum: ["immediate", "this_week", "flexible"],
      default: "flexible",
    },
    preferredDate: {
      type: Date,
    },
    locationAddress: {
      type: String,
      required: [true, "Location address is required"],
      trim: true,
    },
    locationPlaceId: {
      type: String,
      trim: true,
    },
    locationCoordinates: {
      lat: { type: Number, min: -90, max: 90 },
      lng: { type: Number, min: -180, max: 180 },
    },
    photos: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: ["open", "quoted", "accepted", "expired", "cancelled"],
      default: "open",
    },
    quotesReceived: {
      type: Number,
      default: 0,
      min: 0,
    },
    acceptedQuoteId: {
      type: Schema.Types.ObjectId,
      ref: "Quote",
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
QuoteRequestSchema.index({ customerId: 1, status: 1 });
QuoteRequestSchema.index({ customerEmail: 1, status: 1 });
QuoteRequestSchema.index({ status: 1, expiresAt: 1 });
QuoteRequestSchema.index({ "locationCoordinates": "2dsphere" });

// Virtual for checking if request is expired
QuoteRequestSchema.virtual("isExpired").get(function () {
  return this.expiresAt < new Date();
});

// Pre-save middleware to auto-expire
QuoteRequestSchema.pre("save", function () {
  if (this.expiresAt < new Date() && this.status === "open") {
    this.status = "expired";
  }
});

// Prevent model overwrite
const QuoteRequest: Model<IQuoteRequest> =
  mongoose.models.QuoteRequest ||
  mongoose.model<IQuoteRequest>("QuoteRequest", QuoteRequestSchema);

export default QuoteRequest;
