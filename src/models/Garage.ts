// src/models/Garage.ts
import mongoose, { Schema, Document, Model } from "mongoose";

export type GarageStatus = "pending" | "approved" | "suspended" | "rejected";
export type AppointmentPolicy = "walk_ins" | "appointment_only" | "both";
export type ServiceType =
  | "mechanical"
  | "panel_beating"
  | "detailing"
  | "electrical"
  | "tyres"
  | "aircon"
  | "other";
export type VehicleType =
  | "sedan"
  | "suv"
  | "ute"
  | "truck"
  | "motorcycle"
  | "electric"
  | "hybrid"
  | "commercial";

interface OperatingHoursDay {
  open: string;
  close: string;
  closed: boolean;
}

interface OperatingHours {
  monday: OperatingHoursDay;
  tuesday: OperatingHoursDay;
  wednesday: OperatingHoursDay;
  thursday: OperatingHoursDay;
  friday: OperatingHoursDay;
  saturday: OperatingHoursDay;
  sunday: OperatingHoursDay;
}

interface InsuranceDetails {
  provider: string;
  policyNumber: string;
  expiryDate: Date;
  coverAmount: number;
}

export interface IGarage extends Document {
  userId: mongoose.Types.ObjectId;

  // Linked Garage Business (for booking matching)
  // This is the physical garage location the partner represents
  linkedGarageName: string;
  linkedGarageAddress: string;
  linkedGaragePlaceId: string; // Google Places ID - PRIMARY MATCHING KEY
  linkedGarageCoordinates?: {
    lat: number;
    lng: number;
  };

  // Business Information
  businessName: string;
  tradingName?: string;
  abn: string;
  businessAddress: {
    street: string;
    suburb: string;
    state: string;
    postcode: string;
  };
  location: {
    type: "Point";
    coordinates: [number, number]; // [longitude, latitude]
  };
  yearsInOperation: number;
  servicesOffered: ServiceType[];

  // Contact Details
  primaryContact: {
    name: string;
    role: string;
    phone: string;
    email: string;
  };
  afterHoursContact?: {
    name?: string;
    phone?: string;
  };

  // Operational Capacity
  operatingHours: OperatingHours;
  serviceBays: number;
  vehicleTypes: VehicleType[];
  averageTurnaroundTimes?: {
    standardService?: string;
    majorService?: string;
    logbookService?: string;
    other?: string;
  };
  appointmentPolicy: AppointmentPolicy;

  // Service Coverage
  serviceRadius: number; // in kilometers
  pickupDropoff: {
    available: boolean;
    additionalFee?: number;
    maxDistance?: number;
  };

  // Insurance & Compliance
  publicLiabilityInsurance: InsuranceDetails;
  professionalIndemnityInsurance?: {
    provider?: string;
    policyNumber?: string;
    expiryDate?: Date;
    coverAmount?: number;
  };
  certifications: string[];

  // Payment & Billing
  paymentTerms: string;
  bankDetails: {
    accountName: string;
    bsb: string;
    accountNumber: string;
  };
  gstRegistered: boolean;

  // Status
  status: GarageStatus;
  submittedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: mongoose.Types.ObjectId;
  rejectionReason?: string;

  createdAt: Date;
  updatedAt: Date;
}

const OperatingHoursDaySchema = new Schema(
  {
    open: { type: String, default: "08:00" },
    close: { type: String, default: "17:00" },
    closed: { type: Boolean, default: false },
  },
  { _id: false }
);

const GarageSchema = new Schema<IGarage>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Linked Garage Business (for booking matching)
    // This is the specific physical garage/mechanic the partner represents
    linkedGarageName: {
      type: String,
      trim: true,
      default: "",
      index: true, // Index for name-based fallback matching
    },
    linkedGarageAddress: {
      type: String,
      trim: true,
      default: "",
    },
    linkedGaragePlaceId: {
      type: String,
      trim: true,
      default: "",
      index: true, // Index for exact matching by Google Place ID
    },
    linkedGarageCoordinates: {
      lat: { type: Number },
      lng: { type: Number },
    },

    // Business Information
    businessName: {
      type: String,
      required: [true, "Business name is required"],
      trim: true,
    },
    tradingName: {
      type: String,
      trim: true,
    },
    abn: {
      type: String,
      required: [true, "ABN is required"],
      trim: true,
      validate: {
        validator: function (v: string) {
          // ABN is 11 digits
          return /^\d{11}$/.test(v.replace(/\s/g, ""));
        },
        message: "ABN must be 11 digits",
      },
    },
    businessAddress: {
      street: { type: String, required: true, trim: true },
      suburb: { type: String, required: true, trim: true },
      state: {
        type: String,
        required: true,
        enum: ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "NT", "ACT"],
      },
      postcode: {
        type: String,
        required: true,
        validate: {
          validator: function (v: string) {
            return /^\d{4}$/.test(v);
          },
          message: "Postcode must be 4 digits",
        },
      },
    },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number],
        default: [0, 0],
      },
    },
    yearsInOperation: {
      type: Number,
      required: true,
      min: 0,
    },
    servicesOffered: {
      type: [String],
      enum: [
        "mechanical",
        "panel_beating",
        "detailing",
        "electrical",
        "tyres",
        "aircon",
        "other",
      ],
      required: true,
      validate: {
        validator: function (v: string[]) {
          return v.length > 0;
        },
        message: "At least one service must be selected",
      },
    },

    // Contact Details
    primaryContact: {
      name: { type: String, required: true, trim: true },
      role: { type: String, required: true, trim: true },
      phone: {
        type: String,
        required: true,
        trim: true,
        validate: {
          validator: function (v: string) {
            // Australian phone number format
            return /^(\+?61|0)[2-478](\d{8}|\d{4}\s?\d{4})$/.test(
              v.replace(/\s/g, "")
            );
          },
          message: "Please enter a valid Australian phone number",
        },
      },
      email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
        validate: {
          validator: function (v: string) {
            return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
          },
          message: "Please enter a valid email address",
        },
      },
    },
    afterHoursContact: {
      name: { type: String, trim: true },
      phone: { type: String, trim: true },
    },

    // Operational Capacity
    operatingHours: {
      monday: { type: OperatingHoursDaySchema, default: () => ({}) },
      tuesday: { type: OperatingHoursDaySchema, default: () => ({}) },
      wednesday: { type: OperatingHoursDaySchema, default: () => ({}) },
      thursday: { type: OperatingHoursDaySchema, default: () => ({}) },
      friday: { type: OperatingHoursDaySchema, default: () => ({}) },
      saturday: {
        type: OperatingHoursDaySchema,
        default: () => ({ open: "08:00", close: "12:00", closed: false }),
      },
      sunday: {
        type: OperatingHoursDaySchema,
        default: () => ({ open: "08:00", close: "17:00", closed: true }),
      },
    },
    serviceBays: {
      type: Number,
      required: true,
      min: 1,
    },
    vehicleTypes: {
      type: [String],
      enum: [
        "sedan",
        "suv",
        "ute",
        "truck",
        "motorcycle",
        "electric",
        "hybrid",
        "commercial",
      ],
      required: true,
      validate: {
        validator: function (v: string[]) {
          return v.length > 0;
        },
        message: "At least one vehicle type must be selected",
      },
    },
    averageTurnaroundTimes: {
      standardService: { type: String },
      majorService: { type: String },
      logbookService: { type: String },
      other: { type: String },
    },
    appointmentPolicy: {
      type: String,
      enum: ["walk_ins", "appointment_only", "both"],
      default: "both",
    },

    // Service Coverage
    serviceRadius: {
      type: Number,
      required: true,
      min: 5,
      max: 100,
      default: 15,
    },
    pickupDropoff: {
      available: { type: Boolean, default: false },
      additionalFee: { type: Number, min: 0 },
      maxDistance: { type: Number, min: 0 },
    },

    // Insurance & Compliance
    publicLiabilityInsurance: {
      provider: { type: String, required: true, trim: true },
      policyNumber: { type: String, required: true, trim: true },
      expiryDate: { type: Date, required: true },
      coverAmount: { type: Number, required: true, min: 0 },
    },
    professionalIndemnityInsurance: {
      provider: { type: String, trim: true },
      policyNumber: { type: String, trim: true },
      expiryDate: { type: Date },
      coverAmount: { type: Number, min: 0 },
    },
    certifications: {
      type: [String],
      default: [],
    },

    // Payment & Billing
    paymentTerms: {
      type: String,
      required: true,
      enum: ["immediate", "7_days", "14_days", "30_days"],
      default: "14_days",
    },
    bankDetails: {
      accountName: { type: String, required: true, trim: true },
      bsb: {
        type: String,
        required: true,
        validate: {
          validator: function (v: string) {
            return /^\d{3}-?\d{3}$/.test(v.replace(/\s/g, ""));
          },
          message: "BSB must be 6 digits (e.g., 123-456)",
        },
      },
      accountNumber: {
        type: String,
        required: true,
        validate: {
          validator: function (v: string) {
            return /^\d{6,10}$/.test(v.replace(/\s/g, ""));
          },
          message: "Account number must be 6-10 digits",
        },
      },
    },
    gstRegistered: {
      type: Boolean,
      default: false,
    },

    // Status
    status: {
      type: String,
      enum: ["pending", "approved", "suspended", "rejected"],
      default: "pending",
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
    reviewedAt: {
      type: Date,
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    rejectionReason: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Create 2dsphere index for geospatial queries
GarageSchema.index({ location: "2dsphere" });

// Create index on status for admin queries
GarageSchema.index({ status: 1 });

// Create index on userId for lookups
GarageSchema.index({ userId: 1 });

// Prevent OverwriteModelError by checking if model exists
const Garage: Model<IGarage> =
  mongoose.models.Garage || mongoose.model<IGarage>("Garage", GarageSchema);

export default Garage;
