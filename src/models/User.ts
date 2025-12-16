// src/models/User.ts
import mongoose, { Schema, Document, Model } from "mongoose";

export type UserRole = "user" | "admin" | "garage" | "driver";

export interface IUser extends Document {
  username: string;
  email: string;
  password: string;
  role: UserRole;
  garageProfile?: mongoose.Types.ObjectId;
  driverProfile?: mongoose.Types.ObjectId;
  isApproved: boolean;
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
  },
  {
    timestamps: true,
  }
);

// Prevent OverwriteModelError by checking if model exists
const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

export default User;
