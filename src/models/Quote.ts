// src/models/Quote.ts
import mongoose, { Schema, Document, Model } from "mongoose";

export type QuoteStatus = "pending" | "viewed" | "expired" | "cancelled";

export interface IQuote extends Document {
  quoteRequestId: mongoose.Types.ObjectId;
  garageId: mongoose.Types.ObjectId;
  garageName: string;
  garageAddress: string;
  quotedAmount: number;
  estimatedDuration: string;
  includedServices: string[];
  additionalNotes?: string;
  warrantyOffered?: string;
  availableFrom: Date;
  status: QuoteStatus;
  firstViewedAt?: Date;
  expiresAt?: Date;
  validUntil: Date;
  createdAt: Date;
  updatedAt: Date;
}

const QuoteSchema = new Schema<IQuote>(
  {
    quoteRequestId: {
      type: Schema.Types.ObjectId,
      ref: "QuoteRequest",
      required: [true, "Quote request ID is required"],
      index: true,
    },
    garageId: {
      type: Schema.Types.ObjectId,
      ref: "Garage",
      required: [true, "Garage ID is required"],
      index: true,
    },
    garageName: {
      type: String,
      required: [true, "Garage name is required"],
      trim: true,
    },
    garageAddress: {
      type: String,
      required: [true, "Garage address is required"],
      trim: true,
    },
    quotedAmount: {
      type: Number,
      required: [true, "Quoted amount is required"],
      min: [0, "Quoted amount cannot be negative"],
    },
    estimatedDuration: {
      type: String,
      required: [true, "Estimated duration is required"],
      trim: true,
    },
    includedServices: {
      type: [String],
      required: [true, "At least one included service is required"],
      validate: {
        validator: function (v: string[]) {
          return v && v.length > 0;
        },
        message: "At least one included service is required",
      },
    },
    additionalNotes: {
      type: String,
      maxlength: [1000, "Additional notes cannot exceed 1000 characters"],
      trim: true,
    },
    warrantyOffered: {
      type: String,
      trim: true,
    },
    availableFrom: {
      type: Date,
      required: [true, "Available from date is required"],
    },
    status: {
      type: String,
      enum: ["pending", "viewed", "expired", "cancelled"],
      default: "pending",
    },
    firstViewedAt: {
      type: Date,
    },
    expiresAt: {
      type: Date,
      index: true,
    },
    validUntil: {
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
QuoteSchema.index({ quoteRequestId: 1, status: 1 });
QuoteSchema.index({ garageId: 1, status: 1 });
// Unique index to prevent duplicate quotes from same garage
QuoteSchema.index({ quoteRequestId: 1, garageId: 1 }, { unique: true });

// Virtual for checking if quote is expired
QuoteSchema.virtual("isExpired").get(function () {
  // Quote expires 48 hours after first view, or when validUntil passes
  if (this.expiresAt && this.expiresAt < new Date()) {
    return true;
  }
  return this.validUntil < new Date();
});

// Pre-save middleware to auto-expire
QuoteSchema.pre("save", function () {
  const now = new Date();
  // Expire if validUntil has passed
  if (this.validUntil < now && this.status === "pending") {
    this.status = "expired";
  }
  // Expire if 48-hour window has passed after first view
  if (this.expiresAt && this.expiresAt < now && this.status === "viewed") {
    this.status = "expired";
  }
});

// Prevent model overwrite
const Quote: Model<IQuote> =
  mongoose.models.Quote || mongoose.model<IQuote>("Quote", QuoteSchema);

export default Quote;
