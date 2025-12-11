// src/models/Booking.ts
import mongoose, { Schema, Document, Model, Types } from "mongoose";

export type JourneyStage =
  | "Booking Confirmed"
  | "Driver En Route To You"
  | "Car Picked Up"
  | "At Garage"
  | "Service In Progress"
  | "Driver En Route Back"
  | "Delivered";

export type BookingStatus = "pending" | "active" | "completed" | "cancelled";

export type ServiceType =
  | "Standard Service"
  | "Major Service"
  | "Logbook Service"
  | "Diagnostic Check";

export interface IJourneyEvent {
  stage: JourneyStage;
  timestamp: Date | null;
  completed: boolean;
  notes?: string;
}

export interface IVehicleDetails {
  make: string;
  model: string;
  year?: string;
  color?: string;
  plate: string;
  state: string;
  vin?: string;
}

export interface IBooking extends Document {
  userId: Types.ObjectId;
  userEmail: string;
  userName: string;
  vehicle: IVehicleDetails;
  serviceType: ServiceType;
  pickupAddress: string;
  pickupDate: Date;
  pickupTimeStart: string;
  pickupTimeEnd: string;
  dropoffTimeStart: string;
  dropoffTimeEnd: string;
  garageName: string;
  garageAddress: string;
  currentStage: JourneyStage;
  journeyEvents: IJourneyEvent[];
  overallProgress: number;
  status: BookingStatus;
  statusMessage: string;
  etaToGarage?: Date;
  etaReturn?: Date;
  adminNotes?: string;
  lastUpdatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const JourneyEventSchema = new Schema<IJourneyEvent>(
  {
    stage: {
      type: String,
      enum: [
        "Booking Confirmed",
        "Driver En Route To You",
        "Car Picked Up",
        "At Garage",
        "Service In Progress",
        "Driver En Route Back",
        "Delivered",
      ],
      required: true,
    },
    timestamp: {
      type: Date,
      default: null,
    },
    completed: {
      type: Boolean,
      default: false,
    },
    notes: {
      type: String,
      default: "",
    },
  },
  { _id: false }
);

const VehicleDetailsSchema = new Schema<IVehicleDetails>(
  {
    make: { type: String, required: true },
    model: { type: String, required: true },
    year: { type: String },
    color: { type: String },
    plate: { type: String, required: true },
    state: { type: String, required: true },
    vin: { type: String },
  },
  { _id: false }
);

const BookingSchema = new Schema<IBooking>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    userEmail: {
      type: String,
      required: true,
    },
    userName: {
      type: String,
      required: true,
    },
    vehicle: {
      type: VehicleDetailsSchema,
      required: true,
    },
    serviceType: {
      type: String,
      enum: [
        "Standard Service",
        "Major Service",
        "Logbook Service",
        "Diagnostic Check",
      ],
      required: true,
    },
    pickupAddress: {
      type: String,
      required: true,
    },
    pickupDate: {
      type: Date,
      required: true,
    },
    pickupTimeStart: {
      type: String,
      required: true,
    },
    pickupTimeEnd: {
      type: String,
      required: true,
    },
    dropoffTimeStart: {
      type: String,
      required: true,
    },
    dropoffTimeEnd: {
      type: String,
      required: true,
    },
    garageName: {
      type: String,
      default: "Partner Garage",
    },
    garageAddress: {
      type: String,
      default: "",
    },
    currentStage: {
      type: String,
      enum: [
        "Booking Confirmed",
        "Driver En Route To You",
        "Car Picked Up",
        "At Garage",
        "Service In Progress",
        "Driver En Route Back",
        "Delivered",
      ],
      default: "Booking Confirmed",
    },
    journeyEvents: {
      type: [JourneyEventSchema],
      default: function () {
        const stages: JourneyStage[] = [
          "Booking Confirmed",
          "Driver En Route To You",
          "Car Picked Up",
          "At Garage",
          "Service In Progress",
          "Driver En Route Back",
          "Delivered",
        ];
        return stages.map((stage, index) => ({
          stage,
          timestamp: index === 0 ? new Date() : null,
          completed: index === 0,
          notes: "",
        }));
      },
    },
    overallProgress: {
      type: Number,
      default: 14, // 1/7 stages = ~14%
      min: 0,
      max: 100,
    },
    status: {
      type: String,
      enum: ["pending", "active", "completed", "cancelled"],
      default: "pending",
    },
    statusMessage: {
      type: String,
      default: "Your booking has been confirmed. We'll pick up your car at the scheduled time.",
    },
    etaToGarage: {
      type: Date,
    },
    etaReturn: {
      type: Date,
    },
    adminNotes: {
      type: String,
      default: "",
    },
    lastUpdatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
BookingSchema.index({ status: 1, pickupDate: 1 });
BookingSchema.index({ createdAt: -1 });

// Static method to calculate progress based on current stage
BookingSchema.methods.calculateProgress = function (): number {
  const stages: JourneyStage[] = [
    "Booking Confirmed",
    "Driver En Route To You",
    "Car Picked Up",
    "At Garage",
    "Service In Progress",
    "Driver En Route Back",
    "Delivered",
  ];
  const currentIndex = stages.indexOf(this.currentStage);
  return Math.round(((currentIndex + 1) / stages.length) * 100);
};

// Prevent OverwriteModelError by checking if model exists
const Booking: Model<IBooking> =
  mongoose.models.Booking || mongoose.model<IBooking>("Booking", BookingSchema);

export default Booking;
