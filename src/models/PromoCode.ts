// src/models/PromoCode.ts
// Single-use promo codes: a percentage off Drivlet's transport/booking fee.
// Redemption is an ATOMIC claim (findOneAndUpdate active→used) so two
// simultaneous bookings can never both use the same code.
import mongoose, { Schema, Document, Model, Types } from "mongoose";

export type PromoCodeStatus = "active" | "used" | "disabled";

export interface IPromoCode extends Document {
  code: string; // stored uppercase, unique
  percentOff: number; // 1-100
  status: PromoCodeStatus;
  notes?: string;
  createdBy?: string; // admin email

  // Redemption details
  usedAt?: Date;
  usedByRequestId?: Types.ObjectId;
  usedByBookingId?: Types.ObjectId;
  /** Human reference for admin display (booking tracking code once known) */
  usedByReference?: string;
  discountAmount?: number; // cents actually discounted

  createdAt: Date;
  updatedAt: Date;
}

const PromoCodeSchema = new Schema<IPromoCode>(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      minlength: 3,
      maxlength: 24,
    },
    percentOff: {
      type: Number,
      required: true,
      min: 1,
      max: 100,
    },
    status: {
      type: String,
      enum: ["active", "used", "disabled"],
      default: "active",
      index: true,
    },
    notes: { type: String, trim: true, maxlength: 500 },
    createdBy: { type: String, trim: true },

    usedAt: { type: Date },
    usedByRequestId: { type: Schema.Types.ObjectId, ref: "BookingRequest" },
    usedByBookingId: { type: Schema.Types.ObjectId, ref: "Booking" },
    usedByReference: { type: String, trim: true },
    discountAmount: { type: Number },
  },
  { timestamps: true }
);

PromoCodeSchema.index({ status: 1, createdAt: -1 });

const PromoCode: Model<IPromoCode> =
  mongoose.models.PromoCode ||
  mongoose.model<IPromoCode>("PromoCode", PromoCodeSchema);

export default PromoCode;
