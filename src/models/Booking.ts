// src/models/Booking.ts
import mongoose, { Schema, Document, Model, Types } from "mongoose";

export type BookingStatus = "pending" | "in_progress" | "completed" | "cancelled";

// Vehicle photo checkpoint tracking
export interface ICheckpointStatus {
  pre_pickup: number;      // 0-5 photos completed
  service_dropoff: number; // 0-5 photos completed
  service_pickup: number;  // 0-5 photos completed
  final_delivery: number;  // 0-5 photos completed
}

export interface IUpdate {
  stage: string;
  timestamp: Date;
  message: string;
  updatedBy: string;
}

export interface IFlag {
  type: 'manual_transmission' | 'high_value_vehicle' | 'other';
  reason: string;
  createdAt: Date;
}

export interface ISelectedService {
  category: string;
  services: string[];
}

export type GarageBookingStatus = "new" | "acknowledged" | "accepted" | "declined" | "in_progress" | "completed";

export interface IGarageResponse {
  respondedAt: Date;
  respondedBy: Types.ObjectId;
  notes?: string;
}

// Signed form reference (lightweight pointer to SignedForm collection)
export interface ISignedFormRef {
  formId: Types.ObjectId;
  formType: 'pickup_consent' | 'return_confirmation' | 'claim_lodgement';
  submittedAt: Date;
}

// Driver leg assignment for pickup and return phases
export interface IDriverLeg {
  driverId: Types.ObjectId;
  assignedAt: Date;
  acceptedAt?: Date;
  startedAt?: Date;       // marked en route
  arrivedAt?: Date;       // arrived at location
  collectedAt?: Date;     // vehicle collected
  completedAt?: Date;     // leg completed (dropped off)
}

export interface IBooking extends Document {
  // User info (userId is optional for guests)
  userId: Types.ObjectId | null;
  userEmail: string;
  userName: string;

  // Guest-specific fields
  isGuest: boolean;
  guestPhone?: string;

  // Core booking details
  pickupTime: string;
  dropoffTime: string;
  pickupTimeSlot?: string;
  dropoffTimeSlot?: string;
  pickupAddress: string;
  vehicleRegistration: string;
  vehicleState: string;
  vehicleYear?: string;
  vehicleModel?: string;
  vehicleColor?: string;
  serviceType: string;
  estimatedServiceDuration?: number;
  serviceDate?: Date;

  // Tracking code for secure booking lookup
  trackingCode?: string;

  // Existing booking fields (for stage 1)
  hasExistingBooking: boolean;
  garageName?: string;
  garageAddress?: string;
  garagePlaceId?: string;
  existingBookingRef?: string;
  existingBookingNotes?: string;

  // Distance zone pricing
  distanceZone?: string;       // green | yellow | orange | red
  distanceSurcharge?: number;  // surcharge in cents (0, 2900, 4900)
  distanceKm?: number;         // distance in km (e.g. 13.2)

  // Garage assignment (for future stages)
  assignedGarageId?: Types.ObjectId;
  assignedAt?: Date;
  garageNotifiedAt?: Date;
  garageViewedAt?: Date;
  garageStatus: GarageBookingStatus;
  garageNotes?: string;
  garageAcceptedAt?: Date;
  garageCompletedAt?: Date;
  garageResponse?: IGarageResponse;

  // Driver assignment
  assignedDriverId?: Types.ObjectId;   // Pickup driver (set by admin dispatch)
  returnDriverId?: Types.ObjectId;     // Return driver (set by admin dispatch)
  driverAssignedAt?: Date;
  driverAcceptedAt?: Date;
  driverStartedAt?: Date;
  driverCompletedAt?: Date;

  // Driver leg state tracking (timestamps for pickup/return progress)
  pickupDriver?: IDriverLeg;
  returnDriver?: IDriverLeg;

  // Drivlet fee payment information (paid at booking)
  paymentId?: string;
  paymentAmount?: number;
  paymentStatus?: 'pending' | 'paid' | 'failed' | 'refunded';
  stripeSessionId?: string;

  // Service payment (paid before car return)
  servicePaymentAmount?: number;
  servicePaymentUrl?: string;
  servicePaymentId?: string;
  servicePaymentIntentId?: string;
  servicePaymentStatus?: 'pending' | 'paid' | 'failed';

  // Vehicle details
  transmissionType: 'automatic' | 'manual';
  isManualTransmission: boolean;

  // Service selection
  selectedServices: ISelectedService[];
  primaryServiceCategory: string | null;
  serviceNotes: string;

  // Flags for special attention
  flags: IFlag[];

  // Progress tracking
  currentStage: string;
  overallProgress: number;
  status: BookingStatus;
  updates: IUpdate[];

  // Timestamps
  createdAt: Date;
  updatedAt: Date;

  // Cancellation details
  cancellation?: {
    cancelledAt: Date;
    cancelledBy: Types.ObjectId | string;
    cancelledByRole: 'customer' | 'admin' | 'system';
    reason?: string;
    refundAmount: number;
    refundPercentage: number;
    refundId?: string;
    refundStatus?: 'pending' | 'succeeded' | 'failed' | 'not_applicable';
  };

  // Vehicle photo checkpoint tracking
  checkpointStatus: ICheckpointStatus;

  // Signed forms (lightweight references to SignedForm collection)
  signedForms: ISignedFormRef[];
}

const UpdateSchema = new Schema<IUpdate>(
  {
    stage: { type: String, required: true },
    timestamp: { type: Date, required: true },
    message: { type: String, required: true },
    updatedBy: { type: String, required: true },
  },
  { _id: false }
);

const FlagSchema = new Schema<IFlag>(
  {
    type: {
      type: String,
      enum: ['manual_transmission', 'high_value_vehicle', 'other'],
      required: true,
    },
    reason: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const SelectedServiceSchema = new Schema<ISelectedService>(
  {
    category: { type: String, required: true },
    services: { type: [String], default: [] },
  },
  { _id: false }
);

const GarageResponseSchema = new Schema<IGarageResponse>(
  {
    respondedAt: { type: Date, required: true },
    respondedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    notes: { type: String },
  },
  { _id: false }
);

const SignedFormRefSchema = new Schema<ISignedFormRef>(
  {
    formId: { type: Schema.Types.ObjectId, ref: 'SignedForm', required: true },
    formType: {
      type: String,
      enum: ['pickup_consent', 'return_confirmation', 'claim_lodgement'],
      required: true,
    },
    submittedAt: { type: Date, required: true },
  },
  { _id: false }
);

// Driver leg schema for pickup and return phases
const DriverLegSchema = new Schema<IDriverLeg>(
  {
    driverId: { type: Schema.Types.ObjectId, ref: "Driver", required: true },
    assignedAt: { type: Date, required: true },
    acceptedAt: { type: Date },
    startedAt: { type: Date },
    arrivedAt: { type: Date },
    collectedAt: { type: Date },
    completedAt: { type: Date },
  },
  { _id: false }
);

const BookingSchema = new Schema<IBooking>(
  {
    // User info
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false,
      default: null,
    },
    userEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    userName: {
      type: String,
      required: true,
      trim: true,
    },

    // Guest-specific fields
    isGuest: {
      type: Boolean,
      default: false,
    },
    guestPhone: {
      type: String,
      required: false,
    },

    // Core booking details
    pickupTime: {
      type: String,
      required: true,
    },
    dropoffTime: {
      type: String,
      required: true,
    },
    pickupTimeSlot: {
      type: String,
      enum: ['8am-9am', '9am-10am', '10am-11am'],
      required: false,
      index: true,
    },
    dropoffTimeSlot: {
      type: String,
      enum: ['1pm-2pm', '2pm-3pm', '3pm-4pm', '4pm-5pm'],
      required: false,
      index: true,
    },
    pickupAddress: {
      type: String,
      required: true,
    },
    vehicleRegistration: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    vehicleState: {
      type: String,
      required: true,
      uppercase: true,
    },
    vehicleYear: {
      type: String,
      required: false,
      trim: true,
    },
    vehicleModel: {
      type: String,
      required: false,
      trim: true,
    },
    vehicleColor: {
      type: String,
      required: false,
      trim: true,
    },
    serviceType: {
      type: String,
      required: true,
    },
    estimatedServiceDuration: {
      type: Number,
      required: false,
    },
    serviceDate: {
      type: Date,
      required: false,
    },

    // Tracking code
    trackingCode: {
      type: String,
      required: false,
      unique: true,
      sparse: true,
      uppercase: true,
      trim: true,
      index: true,
    },

    // Existing booking fields
    hasExistingBooking: {
      type: Boolean,
      default: false,
    },
    garageName: {
      type: String,
      required: false,
    },
    garageAddress: {
      type: String,
      required: false,
    },
    garagePlaceId: {
      type: String,
      required: false,
    },
    existingBookingRef: {
      type: String,
      required: false,
    },
    existingBookingNotes: {
      type: String,
      required: false,
    },

    // Distance zone pricing
    distanceZone: {
      type: String,
      enum: ['green', 'yellow', 'orange', 'red'],
      required: false,
    },
    distanceSurcharge: {
      type: Number,
      required: false,
      default: 0,
      min: 0,
    },
    distanceKm: {
      type: Number,
      required: false,
      min: 0,
    },

    // Garage assignment (for future stages)
    assignedGarageId: {
      type: Schema.Types.ObjectId,
      ref: "Garage",
      required: false,
      index: true,
    },
    assignedAt: {
      type: Date,
      required: false,
    },
    garageNotifiedAt: {
      type: Date,
      required: false,
    },
    garageViewedAt: {
      type: Date,
      required: false,
    },
    garageStatus: {
      type: String,
      enum: ["new", "acknowledged", "accepted", "declined", "in_progress", "completed"],
      default: "new",
    },
    garageNotes: {
      type: String,
      required: false,
    },
    garageAcceptedAt: {
      type: Date,
      required: false,
    },
    garageCompletedAt: {
      type: Date,
      required: false,
    },
    garageResponse: {
      type: GarageResponseSchema,
      required: false,
    },

    // Driver assignment (set by admin dispatch)
    assignedDriverId: {
      type: Schema.Types.ObjectId,
      ref: "Driver",
      required: false,
      index: true,
    },
    returnDriverId: {
      type: Schema.Types.ObjectId,
      ref: "Driver",
      required: false,
      index: true,
    },
    driverAssignedAt: {
      type: Date,
      required: false,
    },
    driverAcceptedAt: {
      type: Date,
      required: false,
    },
    driverStartedAt: {
      type: Date,
      required: false,
    },
    driverCompletedAt: {
      type: Date,
      required: false,
    },

    // Two-phase driver assignment (new system)
    pickupDriver: {
      type: DriverLegSchema,
      required: false,
    },
    returnDriver: {
      type: DriverLegSchema,
      required: false,
    },

    // Drivlet fee payment information
    paymentId: {
      type: String,
    },
    paymentAmount: {
      type: Number,
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
    },
    stripeSessionId: {
      type: String,
    },

    // Service payment (paid before car return)
    servicePaymentAmount: {
      type: Number,
      required: false,
    },
    servicePaymentUrl: {
      type: String,
      required: false,
    },
    servicePaymentId: {
      type: String,
      required: false,
    },
    servicePaymentIntentId: {
      type: String,
      required: false,
      index: true,
    },
    servicePaymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed"],
    },

    // Vehicle details
    transmissionType: {
      type: String,
      enum: ["automatic", "manual"],
      default: "automatic",
    },
    isManualTransmission: {
      type: Boolean,
      default: false,
    },

    // Service selection
    selectedServices: {
      type: [SelectedServiceSchema],
      default: [],
    },
    primaryServiceCategory: {
      type: String,
      default: null,
    },
    serviceNotes: {
      type: String,
      default: "",
    },

    // Flags for special attention
    flags: {
      type: [FlagSchema],
      default: [],
    },

    // Progress tracking
    currentStage: {
      type: String,
      default: "booking_confirmed",
    },
    overallProgress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    status: {
      type: String,
      enum: ["pending", "in_progress", "completed", "cancelled"],
      default: "pending",
    },
    updates: {
      type: [UpdateSchema],
      default: [],
    },

    // Timestamps
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },

    // Cancellation details
    cancellation: {
      cancelledAt: { type: Date },
      cancelledBy: { type: Schema.Types.Mixed },
      cancelledByRole: {
        type: String,
        enum: ["customer", "admin", "system"],
      },
      reason: { type: String },
      refundAmount: { type: Number, default: 0 },
      refundPercentage: { type: Number, default: 0 },
      refundId: { type: String },
      refundStatus: {
        type: String,
        enum: ["pending", "succeeded", "failed", "not_applicable"],
      },
    },

    // Vehicle photo checkpoint tracking
    checkpointStatus: {
      pre_pickup: { type: Number, default: 0, min: 0, max: 5 },
      service_dropoff: { type: Number, default: 0, min: 0, max: 5 },
      service_pickup: { type: Number, default: 0, min: 0, max: 5 },
      final_delivery: { type: Number, default: 0, min: 0, max: 5 },
    },

    // Signed forms (lightweight references to SignedForm collection)
    signedForms: {
      type: [SignedFormRefSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
BookingSchema.index({ status: 1, createdAt: -1 });
BookingSchema.index({ serviceDate: 1, status: 1 });
BookingSchema.index({ serviceDate: 1, pickupTimeSlot: 1, status: 1 });
BookingSchema.index({ serviceDate: 1, dropoffTimeSlot: 1, status: 1 });
BookingSchema.index({ trackingCode: 1, status: 1 });
BookingSchema.index({ isGuest: 1 });
BookingSchema.index({ hasExistingBooking: 1 });
BookingSchema.index({ assignedGarageId: 1, garageStatus: 1 });
BookingSchema.index({ garageStatus: 1 });
BookingSchema.index({ garagePlaceId: 1, garageStatus: 1 });
BookingSchema.index({ assignedDriverId: 1, status: 1 });
BookingSchema.index({ returnDriverId: 1, status: 1 });
BookingSchema.index({ "pickupDriver.driverId": 1 });
BookingSchema.index({ "returnDriver.driverId": 1 });
BookingSchema.index({ "pickupDriver.completedAt": 1, servicePaymentStatus: 1 });
BookingSchema.index({ paymentId: 1 });
BookingSchema.index({ stripeSessionId: 1 });
BookingSchema.index({ servicePaymentId: 1 });
BookingSchema.index({ userEmail: 1, createdAt: -1 });

// Prevent OverwriteModelError by checking if model exists
const Booking: Model<IBooking> =
  mongoose.models.Booking || mongoose.model<IBooking>("Booking", BookingSchema);

export default Booking;
