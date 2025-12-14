// src/models/Contact.ts
import mongoose, { Schema, Document, Model } from "mongoose";

export type ContactStatus = "new" | "read" | "responded";

export interface IContact extends Document {
  name: string;
  email: string;
  phone?: string;
  message: string;
  status: ContactStatus;
  createdAt: Date;
  updatedAt: Date;
}

const ContactSchema = new Schema<IContact>(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      maxlength: [100, "Name cannot exceed 100 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      trim: true,
      maxlength: [20, "Phone cannot exceed 20 characters"],
    },
    message: {
      type: String,
      required: [true, "Message is required"],
      trim: true,
      maxlength: [1000, "Message cannot exceed 1000 characters"],
    },
    status: {
      type: String,
      enum: ["new", "read", "responded"],
      default: "new",
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
ContactSchema.index({ status: 1, createdAt: -1 });
ContactSchema.index({ email: 1 });

// Prevent OverwriteModelError by checking if model exists
const Contact: Model<IContact> =
  mongoose.models.Contact || mongoose.model<IContact>("Contact", ContactSchema);

export default Contact;
