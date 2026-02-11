// src/models/TimeEntry.ts
import mongoose, { Schema, Document, Model } from "mongoose";

export interface ITimeEntry extends Document {
  _id: mongoose.Types.ObjectId;
  driverId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  clockIn: Date;
  clockOut?: Date;
  durationMinutes?: number;
  clockOutReason?: "manual" | "auto" | "admin";
  clockOutBy?: mongoose.Types.ObjectId;
  clockOutNote?: string;
  jobsCompleted: number;
  createdAt: Date;
  updatedAt: Date;
}

const TimeEntrySchema = new Schema<ITimeEntry>(
  {
    driverId: {
      type: Schema.Types.ObjectId,
      ref: "Driver",
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    clockIn: {
      type: Date,
      required: true,
    },
    clockOut: {
      type: Date,
    },
    durationMinutes: {
      type: Number,
    },
    clockOutReason: {
      type: String,
      enum: ["manual", "auto", "admin"],
    },
    clockOutBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    clockOutNote: {
      type: String,
      maxlength: 500,
    },
    jobsCompleted: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Index for querying active sessions
TimeEntrySchema.index({ driverId: 1, clockOut: 1 });

// Index for date range queries
TimeEntrySchema.index({ clockIn: -1 });

const TimeEntry: Model<ITimeEntry> =
  mongoose.models.TimeEntry || mongoose.model<ITimeEntry>("TimeEntry", TimeEntrySchema);

export default TimeEntry;
