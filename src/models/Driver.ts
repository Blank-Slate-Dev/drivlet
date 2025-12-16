// src/models/Driver.ts
import mongoose, { Schema, Document, Model } from "mongoose";

export type DriverStatus = "pending" | "approved" | "suspended" | "rejected";
export type LicenseClass = "C" | "LR" | "MR" | "HR" | "HC" | "MC";
export type EmploymentType = "employee" | "contractor";

interface OperatingHoursDay {
  available: boolean;
  startTime: string;
  endTime: string;
}

interface Availability {
  monday: OperatingHoursDay;
  tuesday: OperatingHoursDay;
  wednesday: OperatingHoursDay;
  thursday: OperatingHoursDay;
  friday: OperatingHoursDay;
  saturday: OperatingHoursDay;
  sunday: OperatingHoursDay;
}

export interface IDriver extends Document {
  userId: mongoose.Types.ObjectId;

  // Personal Information
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  phone: string;
  address: {
    street: string;
    suburb: string;
    state: string;
    postcode: string;
  };
  profilePhoto?: string;

  // License Information
  license: {
    number: string;
    state: string;
    class: LicenseClass;
    expiryDate: Date;
    photoUrl?: string;
  };

  // Additional Checks
  policeCheck?: {
    completed: boolean;
    certificateNumber?: string;
    issueDate?: Date;
    expiryDate?: Date;
  };

  // Vehicle Information (optional - some drivers may use company vehicles)
  hasOwnVehicle: boolean;
  vehicle?: {
    make: string;
    model: string;
    year: number;
    color: string;
    registration: string;
    registrationState: string;
    registrationExpiry: Date;
    insuranceProvider?: string;
    insurancePolicyNumber?: string;
    insuranceExpiry?: Date;
  };

  // Availability
  availability: Availability;
  maxJobsPerDay: number;
  preferredAreas: string[]; // Suburbs/postcodes they prefer to work in

  // Employment Details
  employmentType: EmploymentType;
  tfn?: string; // Tax File Number (encrypted/hashed in production)
  abn?: string; // If contractor
  superannuationFund?: string;
  superannuationMemberNumber?: string;

  // Banking for Payments
  bankDetails: {
    accountName: string;
    bsb: string;
    accountNumber: string;
  };

  // Emergency Contact
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
  };

  // Status & Verification
  status: DriverStatus;
  submittedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: mongoose.Types.ObjectId;
  rejectionReason?: string;

  // Performance Metrics (updated over time)
  metrics?: {
    totalJobs: number;
    completedJobs: number;
    cancelledJobs: number;
    averageRating: number;
    totalRatings: number;
  };

  // Flags
  isActive: boolean; // Can toggle availability
  canAcceptJobs: boolean; // Admin can disable

  createdAt: Date;
  updatedAt: Date;
}

const OperatingHoursDaySchema = new Schema(
  {
    available: { type: Boolean, default: true },
    startTime: { type: String, default: "07:00" },
    endTime: { type: String, default: "18:00" },
  },
  { _id: false }
);

const DriverSchema = new Schema<IDriver>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    // Personal Information
    firstName: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
    },
    lastName: {
      type: String,
      required: [true, "Last name is required"],
      trim: true,
    },
    dateOfBirth: {
      type: Date,
      required: [true, "Date of birth is required"],
      validate: {
        validator: function (v: Date) {
          // Must be at least 18 years old
          const today = new Date();
          const age = today.getFullYear() - v.getFullYear();
          return age >= 18;
        },
        message: "Driver must be at least 18 years old",
      },
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
      validate: {
        validator: function (v: string) {
          return /^(\+?61|0)[2-478](\d{8}|\d{4}\s?\d{4})$/.test(
            v.replace(/[\s-]/g, "")
          );
        },
        message: "Please enter a valid Australian phone number",
      },
    },
    address: {
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
    profilePhoto: {
      type: String,
    },

    // License Information
    license: {
      number: {
        type: String,
        required: [true, "License number is required"],
        trim: true,
      },
      state: {
        type: String,
        required: true,
        enum: ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "NT", "ACT"],
      },
      class: {
        type: String,
        required: true,
        enum: ["C", "LR", "MR", "HR", "HC", "MC"],
        default: "C",
      },
      expiryDate: {
        type: Date,
        required: [true, "License expiry date is required"],
        validate: {
          validator: function (v: Date) {
            return v > new Date();
          },
          message: "License must not be expired",
        },
      },
      photoUrl: {
        type: String,
      },
    },

    // Police Check
    policeCheck: {
      completed: { type: Boolean, default: false },
      certificateNumber: { type: String, trim: true },
      issueDate: { type: Date },
      expiryDate: { type: Date },
    },

    // Vehicle Information
    hasOwnVehicle: {
      type: Boolean,
      default: false,
    },
    vehicle: {
      make: { type: String, trim: true },
      model: { type: String, trim: true },
      year: { type: Number },
      color: { type: String, trim: true },
      registration: { type: String, trim: true, uppercase: true },
      registrationState: {
        type: String,
        enum: ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "NT", "ACT"],
      },
      registrationExpiry: { type: Date },
      insuranceProvider: { type: String, trim: true },
      insurancePolicyNumber: { type: String, trim: true },
      insuranceExpiry: { type: Date },
    },

    // Availability
    availability: {
      monday: { type: OperatingHoursDaySchema, default: () => ({}) },
      tuesday: { type: OperatingHoursDaySchema, default: () => ({}) },
      wednesday: { type: OperatingHoursDaySchema, default: () => ({}) },
      thursday: { type: OperatingHoursDaySchema, default: () => ({}) },
      friday: { type: OperatingHoursDaySchema, default: () => ({}) },
      saturday: {
        type: OperatingHoursDaySchema,
        default: () => ({ available: false, startTime: "08:00", endTime: "14:00" }),
      },
      sunday: {
        type: OperatingHoursDaySchema,
        default: () => ({ available: false, startTime: "08:00", endTime: "14:00" }),
      },
    },
    maxJobsPerDay: {
      type: Number,
      default: 10,
      min: 1,
      max: 20,
    },
    preferredAreas: {
      type: [String],
      default: [],
    },

    // Employment Details
    employmentType: {
      type: String,
      enum: ["employee", "contractor"],
      default: "employee",
    },
    tfn: {
      type: String,
      trim: true,
    },
    abn: {
      type: String,
      trim: true,
      validate: {
        validator: function (v: string) {
          if (!v) return true; // Optional
          return /^\d{11}$/.test(v.replace(/\s/g, ""));
        },
        message: "ABN must be 11 digits",
      },
    },
    superannuationFund: {
      type: String,
      trim: true,
    },
    superannuationMemberNumber: {
      type: String,
      trim: true,
    },

    // Banking
    bankDetails: {
      accountName: { type: String, required: true, trim: true },
      bsb: {
        type: String,
        required: true,
        validate: {
          validator: function (v: string) {
            return /^\d{3}-?\d{3}$/.test(v.replace(/\s/g, ""));
          },
          message: "BSB must be 6 digits",
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

    // Emergency Contact
    emergencyContact: {
      name: { type: String, required: true, trim: true },
      relationship: { type: String, required: true, trim: true },
      phone: {
        type: String,
        required: true,
        trim: true,
        validate: {
          validator: function (v: string) {
            return /^(\+?61|0)[2-478](\d{8}|\d{4}\s?\d{4})$/.test(
              v.replace(/[\s-]/g, "")
            );
          },
          message: "Please enter a valid Australian phone number",
        },
      },
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

    // Metrics
    metrics: {
      totalJobs: { type: Number, default: 0 },
      completedJobs: { type: Number, default: 0 },
      cancelledJobs: { type: Number, default: 0 },
      averageRating: { type: Number, default: 0 },
      totalRatings: { type: Number, default: 0 },
    },

    // Flags
    isActive: {
      type: Boolean,
      default: true,
    },
    canAcceptJobs: {
      type: Boolean,
      default: false, // Set to true after approval
    },
  },
  {
    timestamps: true,
  }
);

// Create indexes
DriverSchema.index({ userId: 1 });
DriverSchema.index({ status: 1 });
DriverSchema.index({ isActive: 1, canAcceptJobs: 1 });
DriverSchema.index({ "license.number": 1, "license.state": 1 });
DriverSchema.index({ preferredAreas: 1 });

// Virtual for full name
DriverSchema.virtual("fullName").get(function () {
  return `${this.firstName} ${this.lastName}`;
});

// Prevent OverwriteModelError
const Driver: Model<IDriver> =
  mongoose.models.Driver || mongoose.model<IDriver>("Driver", DriverSchema);

export default Driver;
