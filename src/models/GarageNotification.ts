// src/models/GarageNotification.ts
import mongoose, { Schema, Document, Model, Types } from "mongoose";

export type NotificationType = "new_booking" | "booking_update" | "booking_cancelled" | "system";
export type NotificationUrgency = "normal" | "urgent";

export interface INotificationMetadata {
  vehicleRegistration?: string;
  serviceType?: string;
  pickupTime?: Date;
  customerName?: string;
  urgency?: NotificationUrgency;
}

export interface IGarageNotification extends Document {
  garageId: Types.ObjectId;
  bookingId?: Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  readAt?: Date;
  metadata?: INotificationMetadata;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationMetadataSchema = new Schema<INotificationMetadata>(
  {
    vehicleRegistration: { type: String },
    serviceType: { type: String },
    pickupTime: { type: Date },
    customerName: { type: String },
    urgency: {
      type: String,
      enum: ["normal", "urgent"],
      default: "normal",
    },
  },
  { _id: false }
);

const GarageNotificationSchema = new Schema<IGarageNotification>(
  {
    garageId: {
      type: Schema.Types.ObjectId,
      ref: "Garage",
      required: true,
      index: true,
    },
    bookingId: {
      type: Schema.Types.ObjectId,
      ref: "Booking",
      required: false,
      index: true,
    },
    type: {
      type: String,
      enum: ["new_booking", "booking_update", "booking_cancelled", "system"],
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
    },
    metadata: {
      type: NotificationMetadataSchema,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient queries
GarageNotificationSchema.index({ garageId: 1, isRead: 1, createdAt: -1 });
GarageNotificationSchema.index({ garageId: 1, createdAt: -1 });

// Prevent OverwriteModelError by checking if model exists
const GarageNotification: Model<IGarageNotification> =
  mongoose.models.GarageNotification ||
  mongoose.model<IGarageNotification>("GarageNotification", GarageNotificationSchema);

export default GarageNotification;
