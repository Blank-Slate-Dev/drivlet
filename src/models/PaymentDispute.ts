// src/models/PaymentDispute.ts
import mongoose, { Schema, Document } from "mongoose";

export type DisputeStatus = "open" | "under_review" | "resolved" | "dismissed";
export type DisputeType =
  | "missing_payment"
  | "incorrect_amount"
  | "late_payment"
  | "other";

export interface IPaymentDispute extends Document {
  driverId: mongoose.Types.ObjectId; // ref: Driver
  bookingId?: mongoose.Types.ObjectId; // ref: Booking (optional)
  type: DisputeType;
  status: DisputeStatus;
  description: string;
  expectedAmount?: number;
  actualAmount?: number;
  adminResponse?: string;
  resolvedAt?: Date;
  resolvedBy?: mongoose.Types.ObjectId; // ref: User (admin)
  createdAt: Date;
  updatedAt: Date;
}

const PaymentDisputeSchema = new Schema<IPaymentDispute>(
  {
    driverId: {
      type: Schema.Types.ObjectId,
      ref: "Driver",
      required: true,
    },
    bookingId: {
      type: Schema.Types.ObjectId,
      ref: "Booking",
    },
    type: {
      type: String,
      enum: ["missing_payment", "incorrect_amount", "late_payment", "other"],
      required: true,
    },
    status: {
      type: String,
      enum: ["open", "under_review", "resolved", "dismissed"],
      default: "open",
    },
    description: {
      type: String,
      required: true,
      maxlength: 1000,
    },
    expectedAmount: Number,
    actualAmount: Number,
    adminResponse: {
      type: String,
      maxlength: 1000,
    },
    resolvedAt: Date,
    resolvedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

// Indexes
PaymentDisputeSchema.index({ driverId: 1, status: 1 });
PaymentDisputeSchema.index({ status: 1, createdAt: -1 });
PaymentDisputeSchema.index({ bookingId: 1 });

export default mongoose.models.PaymentDispute ||
  mongoose.model<IPaymentDispute>("PaymentDispute", PaymentDisputeSchema);
