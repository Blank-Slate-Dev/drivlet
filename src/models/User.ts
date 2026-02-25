// src/models/User.ts
import mongoose, { Schema, Document, Model } from "mongoose";

export type UserRole = "user" | "admin" | "garage" | "driver";
export type AccountStatus = "active" | "suspended" | "deleted";

export interface ISuspensionInfo {
  suspendedAt: Date;
  suspendedBy: mongoose.Types.ObjectId;
  reason: string;
  suspendedUntil?: Date;
  notes?: string;
}

export interface ISuspensionHistoryEntry {
  suspendedAt: Date;
  suspendedBy: mongoose.Types.ObjectId;
  reason: string;
  suspendedUntil?: Date;
  reactivatedAt?: Date;
  reactivatedBy?: mongoose.Types.ObjectId;
  notes?: string;
}

export interface IEmergencyContact {
  name: string;
  relationship: string;
  phone: string;
}

// REMOVED: Payment method storage handled by Stripe directly - 2026-02-25
// export interface IPaymentMethod {
//   stripePaymentMethodId: string;
//   brand: string;
//   last4: string;
//   expMonth: number;
//   expYear: number;
//   isDefault: boolean;
//   addedAt: Date;
// }

export interface IUser extends Document {
  username: string;
  email: string;
  mobile?: string;
  password: string;
  role: UserRole;
  garageProfile?: mongoose.Types.ObjectId;
  driverProfile?: mongoose.Types.ObjectId;
  isApproved: boolean;

  // Email verification fields
  emailVerified: boolean;
  verificationCode?: string;
  verificationCodeExpires?: Date;

  // Auto-login token (for post-verification auto-login)
  autoLoginToken?: string;
  autoLoginTokenExpires?: Date;

  // Account status fields
  accountStatus: AccountStatus;
  suspensionInfo?: ISuspensionInfo;
  suspensionHistory: ISuspensionHistoryEntry[];
  deletedAt?: Date;
  deletedBy?: mongoose.Types.ObjectId;

  // Customer profile fields
  profilePhoto?: string;
  stripeCustomerId?: string;
  // REMOVED: Payment method storage handled by Stripe directly - 2026-02-25
  // paymentMethods: IPaymentMethod[];
  emergencyContact?: IEmergencyContact;

  // Garage location fields (for garage users without full profile yet)
  garageLocationId?: string; // Google Place ID
  garageLocationName?: string;
  garageLocationAddress?: string;
  garageLocationCoordinates?: {
    lat: number;
    lng: number;
  };
  locationUpdatedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    username: {
      type: String,
      required: [true, "Username is required"],
      unique: true,
      trim: true,
      minlength: [3, "Username must be at least 3 characters"],
      maxlength: [30, "Username cannot exceed 30 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    mobile: {
      type: String,
      trim: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
    },
    role: {
      type: String,
      enum: ["user", "admin", "garage", "driver"],
      default: "user",
    },
    garageProfile: {
      type: Schema.Types.ObjectId,
      ref: "Garage",
    },
    driverProfile: {
      type: Schema.Types.ObjectId,
      ref: "Driver",
    },
    isApproved: {
      type: Boolean,
      default: true, // Auto-approve customers, garages and drivers need manual approval
    },

    // Email verification fields
    emailVerified: {
      type: Boolean,
      default: false,
    },
    verificationCode: {
      type: String,
      default: null,
    },
    verificationCodeExpires: {
      type: Date,
      default: null,
    },

    // Auto-login token (for post-verification auto-login)
    autoLoginToken: {
      type: String,
      default: null,
    },
    autoLoginTokenExpires: {
      type: Date,
      default: null,
    },

    // Account status fields
    accountStatus: {
      type: String,
      enum: ["active", "suspended", "deleted"],
      default: "active",
      index: true,
    },
    suspensionInfo: {
      suspendedAt: { type: Date },
      suspendedBy: { type: Schema.Types.ObjectId, ref: "User" },
      reason: { type: String },
      suspendedUntil: { type: Date },
      notes: { type: String, maxlength: 500 },
    },
    suspensionHistory: [{
      suspendedAt: { type: Date, required: true },
      suspendedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
      reason: { type: String, required: true },
      suspendedUntil: { type: Date },
      reactivatedAt: { type: Date },
      reactivatedBy: { type: Schema.Types.ObjectId, ref: "User" },
      notes: { type: String, maxlength: 500 },
    }],
    deletedAt: { type: Date },
    deletedBy: { type: Schema.Types.ObjectId, ref: "User" },

    // Customer profile fields
    profilePhoto: {
      type: String,
      trim: true,
    },
    stripeCustomerId: {
      type: String,
      trim: true,
      index: true,
    },
    // REMOVED: Payment method storage handled by Stripe directly - 2026-02-25
    // paymentMethods: [{
    //   stripePaymentMethodId: { type: String, required: true },
    //   brand: { type: String, required: true },
    //   last4: { type: String, required: true },
    //   expMonth: { type: Number, required: true },
    //   expYear: { type: Number, required: true },
    //   isDefault: { type: Boolean, default: false },
    //   addedAt: { type: Date, default: Date.now },
    // }],
    emergencyContact: {
      name: { type: String, trim: true, maxlength: 100 },
      relationship: { type: String, trim: true, maxlength: 50 },
      phone: { type: String, trim: true },
    },

    // Garage location fields (for garage users without full profile yet)
    garageLocationId: {
      type: String,
      trim: true,
      index: true,
    },
    garageLocationName: {
      type: String,
      trim: true,
    },
    garageLocationAddress: {
      type: String,
      trim: true,
    },
    garageLocationCoordinates: {
      lat: { type: Number },
      lng: { type: Number },
    },
    locationUpdatedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent OverwriteModelError by checking if model exists
const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

export default User;
