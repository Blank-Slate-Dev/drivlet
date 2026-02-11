// src/models/Driver.ts
import mongoose, { Schema, Document, Model } from "mongoose";

export type DriverStatus = "pending" | "approved" | "suspended" | "rejected";
export type LicenseClass = "C" | "LR" | "MR" | "HR" | "HC" | "MC";
export type EmploymentType = "employee"; // ENFORCED: All drivers must be employees

// Onboarding state machine - this is the core of the insurance-compliant flow
// SIMPLIFIED MODEL (no extra admin checkpoint needed):
//   not_started → contracts_pending → active
export type OnboardingStatus = 
  | "not_started"       // Initial state after registration (awaiting admin review)
  | "contracts_pending" // Admin approved, must sign employment contracts
  | "active";           // Contracts signed, can work, insured

// Contract types that must be signed
export interface DriverContracts {
  employmentContractSignedAt?: Date;
  driverAgreementSignedAt?: Date;
  workHealthSafetySignedAt?: Date;
  codeOfConductSignedAt?: Date;
}

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

  // Police Check - REQUIRED for onboarding
  policeCheck?: {
    completed: boolean;
    certificateNumber?: string;
    issueDate?: Date;
    expiryDate?: Date;
    documentUrl?: string; // Vercel Blob URL
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

  // Employment Details - ENFORCED EMPLOYEE STATUS
  employmentType: EmploymentType; // Always "employee"
  tfn?: string; // Tax File Number (encrypted/hashed in production) - collected during onboarding
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

  // Application Status (Admin review)
  status: DriverStatus;
  submittedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: mongoose.Types.ObjectId;
  rejectionReason?: string;
  
  // Rejection history for audit trail (preserves history on re-application)
  rejectionHistory?: Array<{
    rejectedAt: Date;
    rejectedBy: mongoose.Types.ObjectId;
    reason: string;
  }>;

  // ========== ONBOARDING STATE MACHINE ==========
  // This controls the insurance-compliant employment flow
  onboardingStatus: OnboardingStatus;
  
  // Contract signatures - required for insurance eligibility
  contracts: DriverContracts;
  
  // NOTE: insuranceEligible is now a VIRTUAL (derived) field, not stored
  // It is computed as: employmentType === "employee" && onboardingStatus === "active"
  
  // Official employee start date - set when onboarding completes
  employeeStartDate?: Date;
  // ====================================================

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
  canAcceptJobs: boolean; // ONLY true when onboardingStatus === "active" AND insuranceEligible

  // Clock In/Out tracking
  isClockedIn: boolean;
  lastClockIn?: Date;
  lastClockOut?: Date;
  currentTimeEntryId?: mongoose.Types.ObjectId;

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

    // Police Check - REQUIRED for onboarding
    policeCheck: {
      completed: { type: Boolean, default: false },
      certificateNumber: { type: String, trim: true },
      issueDate: { type: Date },
      expiryDate: { type: Date },
      documentUrl: { type: String }, // Vercel Blob URL
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

    // Employment Details - ENFORCED EMPLOYEE STATUS
    employmentType: {
      type: String,
      enum: ["employee"], // Only "employee" allowed - no contractors
      default: "employee",
      required: true,
    },
    tfn: {
      type: String,
      trim: true,
      // TFN collected during onboarding, not registration
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

    // Application Status (Admin review)
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
    
    // Rejection history for audit trail (preserves history on re-application)
    rejectionHistory: [{
      rejectedAt: { type: Date, required: true },
      rejectedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
      reason: { type: String, required: true },
    }],

    // ========== ONBOARDING STATE MACHINE ==========
    // Simplified model: not_started → contracts_pending → active
    onboardingStatus: {
      type: String,
      enum: ["not_started", "contracts_pending", "active"],
      default: "not_started",
      required: true,
    },
    
    // Contract signatures with timestamps
    contracts: {
      employmentContractSignedAt: { type: Date },
      driverAgreementSignedAt: { type: Date },
      workHealthSafetySignedAt: { type: Date },
      codeOfConductSignedAt: { type: Date },
    },
    
    // Official employee start date
    employeeStartDate: {
      type: Date,
    },
    // ================================================

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
      default: false, // ONLY true when onboardingStatus === "active"
    },

    // Clock In/Out tracking
    isClockedIn: {
      type: Boolean,
      default: false,
    },
    lastClockIn: {
      type: Date,
    },
    lastClockOut: {
      type: Date,
    },
    currentTimeEntryId: {
      type: Schema.Types.ObjectId,
      ref: "TimeEntry",
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Create indexes
DriverSchema.index({ status: 1 });
DriverSchema.index({ onboardingStatus: 1 });
DriverSchema.index({ isActive: 1, canAcceptJobs: 1 });
DriverSchema.index({ "license.number": 1, "license.state": 1 });
DriverSchema.index({ preferredAreas: 1 });
DriverSchema.index({ isClockedIn: 1 });

// Virtual for full name
DriverSchema.virtual("fullName").get(function () {
  return `${this.firstName} ${this.lastName}`;
});

// DERIVED VIRTUAL: insuranceEligible
// This is computed, not stored - prevents bypass attacks
DriverSchema.virtual("insuranceEligible").get(function () {
  return this.employmentType === "employee" && this.onboardingStatus === "active";
});

// Virtual to check if driver can work (all requirements met)
DriverSchema.virtual("canWork").get(function () {
  return (
    this.status === "approved" &&
    this.onboardingStatus === "active" &&
    this.canAcceptJobs === true &&
    this.isActive === true &&
    this.isClockedIn === true
  );
});

// Pre-save hook - AUTO-CORRECTS invalid state instead of throwing errors
// This makes the system self-healing and prevents crashes from bad data
DriverSchema.pre("save", async function () {
  // AUTO-FIX: canAcceptJobs can only be true if onboardingStatus is "active"
  // Instead of throwing an error, we automatically correct invalid state
  if (this.canAcceptJobs === true && this.onboardingStatus !== "active") {
    this.canAcceptJobs = false;
  }
  
  // AUTO-FIX: Cannot be "active" without having all contracts signed
  // If someone tries to set active without contracts, reset to contracts_pending
  if (this.onboardingStatus === "active") {
    const contracts = this.contracts;
    const allContractsSigned = 
      contracts?.employmentContractSignedAt && 
      contracts?.driverAgreementSignedAt &&
      contracts?.workHealthSafetySignedAt &&
      contracts?.codeOfConductSignedAt;
    
    const policeCheckComplete = 
      this.policeCheck?.completed && 
      this.policeCheck?.documentUrl;
    
    // If trying to be active without requirements, reset to appropriate state
    if (!allContractsSigned || !policeCheckComplete) {
      this.onboardingStatus = "contracts_pending";
      this.canAcceptJobs = false;
    }
  }
  
  // ENFORCEMENT: Employment type must always be "employee"
  this.employmentType = "employee";
});

// Prevent OverwriteModelError
const Driver: Model<IDriver> =
  mongoose.models.Driver || mongoose.model<IDriver>("Driver", DriverSchema);

export default Driver;
