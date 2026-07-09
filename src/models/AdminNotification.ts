import mongoose, { Schema, Document, Model, Types } from "mongoose";

export type AdminNotificationType = "new_request" | "cancel_request" | "incident" | "system";

export interface IAdminNotificationMetadata {
  vehicleRegistration?: string;
  customerName?: string;
  pickupSuburb?: string;
  quotedAmount?: number;
}

export interface IAdminNotification extends Document {
  type: AdminNotificationType;
  title: string;
  message: string;
  isRead: boolean;
  readAt?: Date;
  bookingRequestId?: Types.ObjectId;
  bookingId?: Types.ObjectId;
  metadata?: IAdminNotificationMetadata;
  createdAt: Date;
  updatedAt: Date;
}

const AdminNotificationMetadataSchema = new Schema<IAdminNotificationMetadata>(
  {
    vehicleRegistration: { type: String },
    customerName: { type: String },
    pickupSuburb: { type: String },
    quotedAmount: { type: Number },
  },
  { _id: false }
);

const AdminNotificationSchema = new Schema<IAdminNotification>(
  {
    type: {
      type: String,
      enum: ["new_request", "cancel_request", "incident", "system"],
      required: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    isRead: { type: Boolean, default: false },
    readAt: { type: Date },
    bookingRequestId: {
      type: Schema.Types.ObjectId,
      ref: "BookingRequest",
      required: false,
    },
    bookingId: {
      type: Schema.Types.ObjectId,
      ref: "Booking",
      required: false,
    },
    metadata: {
      type: AdminNotificationMetadataSchema,
      default: {},
    },
  },
  { timestamps: true }
);

AdminNotificationSchema.index({ isRead: 1, createdAt: -1 });

const AdminNotification: Model<IAdminNotification> =
  mongoose.models.AdminNotification ||
  mongoose.model<IAdminNotification>("AdminNotification", AdminNotificationSchema);

export default AdminNotification;
