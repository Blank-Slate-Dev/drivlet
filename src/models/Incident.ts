// src/models/Incident.ts
import mongoose, { Schema, Document } from "mongoose";

export type IncidentType =
  | "road_accident"
  | "damage_dispute"
  | "breakdown"
  | "customer_unavailable"
  | "workshop_refusal"
  | "keys_incident"
  | "safety_risk"
  | "privacy_incident"
  | "other";

export type IncidentSeverity = "low" | "medium" | "high" | "critical";
export type ExceptionState = "continue" | "hold" | "stop";
export type IncidentStatus =
  | "open"
  | "investigating"
  | "awaiting_response"
  | "resolved"
  | "closed";

export interface IIncident extends Document {
  // Core references
  bookingId: mongoose.Types.ObjectId;
  driverId: mongoose.Types.ObjectId;
  reportedBy: mongoose.Types.ObjectId;

  // Incident details
  incidentType: IncidentType;
  severity: IncidentSeverity;

  // What happened
  title: string;
  description: string;

  // When & where
  occurredAt: Date;
  location: {
    address: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };

  // Booking context
  bookingStage: string;

  // Evidence
  photos: Array<{
    url: string;
    caption?: string;
    uploadedAt: Date;
  }>;
  dashcamFootageRef?: string;

  // Third party details (for accidents)
  thirdParty?: {
    name: string;
    phone: string;
    registration: string;
    insurer?: string;
    witnessDetails?: string;
  };

  // Police involvement
  policeInvolved: boolean;
  policeReference?: string;

  // Exception state
  exceptionState: ExceptionState;

  // Resolution
  status: IncidentStatus;
  resolution?: {
    resolvedBy: mongoose.Types.ObjectId;
    resolvedAt: Date;
    outcome: string;
    notes: string;
    insuranceClaim?: boolean;
    claimReference?: string;
  };

  // Admin notes
  adminNotes: Array<{
    note: string;
    addedBy: mongoose.Types.ObjectId;
    addedAt: Date;
  }>;

  // Vehicle status after incident
  vehicleStatus: "drivable" | "towed" | "held" | "unknown";

  // Customer notification
  customerNotified: boolean;
  customerNotifiedAt?: Date;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const IncidentSchema = new Schema<IIncident>(
  {
    bookingId: {
      type: Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
    },
    driverId: {
      type: Schema.Types.ObjectId,
      ref: "Driver",
      required: true,
    },
    reportedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    incidentType: {
      type: String,
      enum: [
        "road_accident",
        "damage_dispute",
        "breakdown",
        "customer_unavailable",
        "workshop_refusal",
        "keys_incident",
        "safety_risk",
        "privacy_incident",
        "other",
      ],
      required: true,
    },
    severity: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      required: true,
    },
    title: { type: String, required: true, maxlength: 200 },
    description: { type: String, required: true, maxlength: 5000 },
    occurredAt: { type: Date, required: true },
    location: {
      address: { type: String, required: true },
      coordinates: {
        lat: Number,
        lng: Number,
      },
    },
    bookingStage: { type: String, required: true },
    photos: [
      {
        url: { type: String, required: true },
        caption: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    dashcamFootageRef: String,
    thirdParty: {
      name: String,
      phone: String,
      registration: String,
      insurer: String,
      witnessDetails: String,
    },
    policeInvolved: { type: Boolean, default: false },
    policeReference: String,
    exceptionState: {
      type: String,
      enum: ["continue", "hold", "stop"],
      default: "continue",
    },
    status: {
      type: String,
      enum: ["open", "investigating", "awaiting_response", "resolved", "closed"],
      default: "open",
    },
    resolution: {
      resolvedBy: { type: Schema.Types.ObjectId, ref: "User" },
      resolvedAt: Date,
      outcome: String,
      notes: String,
      insuranceClaim: Boolean,
      claimReference: String,
    },
    adminNotes: [
      {
        note: { type: String, required: true },
        addedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
        addedAt: { type: Date, default: Date.now },
      },
    ],
    vehicleStatus: {
      type: String,
      enum: ["drivable", "towed", "held", "unknown"],
      default: "unknown",
    },
    customerNotified: { type: Boolean, default: false },
    customerNotifiedAt: Date,
  },
  { timestamps: true }
);

// Indexes
IncidentSchema.index({ bookingId: 1 });
IncidentSchema.index({ driverId: 1 });
IncidentSchema.index({ status: 1 });
IncidentSchema.index({ severity: 1 });
IncidentSchema.index({ createdAt: -1 });
IncidentSchema.index({ status: 1, severity: -1, createdAt: -1 });

export default mongoose.models.Incident ||
  mongoose.model<IIncident>("Incident", IncidentSchema);
