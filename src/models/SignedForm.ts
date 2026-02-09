// src/models/SignedForm.ts
import mongoose, { Schema, Document, Model, Types } from "mongoose";

export type FormType =
  | "pickup_consent"
  | "return_confirmation"
  | "claim_lodgement";

export interface ISignedForm extends Document {
  bookingId: Types.ObjectId;
  formType: FormType;
  formVersion: string;

  // Who submitted
  submittedBy: string; // email
  submittedByName: string;
  submittedAt: Date;

  // Form data (flexible JSON — each form type has different fields)
  formData: Record<string, unknown>;

  // Signatures stored as base64 PNG data URIs
  signatures: {
    customer?: string;
    driver?: string;
  };

  // Privacy acknowledgement
  privacyAcknowledged: boolean;

  // Metadata
  ipAddress?: string;
  userAgent?: string;

  createdAt: Date;
  updatedAt: Date;
}

const SignedFormSchema = new Schema<ISignedForm>(
  {
    bookingId: {
      type: Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
      index: true,
    },
    formType: {
      type: String,
      enum: ["pickup_consent", "return_confirmation", "claim_lodgement"],
      required: true,
    },
    formVersion: {
      type: String,
      required: true,
      default: "1.0",
    },

    submittedBy: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    submittedByName: {
      type: String,
      required: true,
      trim: true,
    },
    submittedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },

    formData: {
      type: Schema.Types.Mixed,
      required: true,
      default: {},
    },

    signatures: {
      customer: { type: String },
      driver: { type: String },
    },

    privacyAcknowledged: {
      type: Boolean,
      required: true,
      default: false,
    },

    ipAddress: { type: String },
    userAgent: { type: String },
  },
  {
    timestamps: true,
  }
);

// Indexes for admin team queries
SignedFormSchema.index({ bookingId: 1, formType: 1 });
SignedFormSchema.index({ formType: 1, createdAt: -1 });
SignedFormSchema.index({ submittedBy: 1, createdAt: -1 });

// Prevent OverwriteModelError
const SignedForm: Model<ISignedForm> =
  mongoose.models.SignedForm ||
  mongoose.model<ISignedForm>("SignedForm", SignedFormSchema);

export default SignedForm;
