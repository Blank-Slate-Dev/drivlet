// src/models/Testimonial.ts
import mongoose, { Schema, Document, Model } from "mongoose";

export interface ITestimonial extends Document {
  customerName: string;
  customerLocation?: string;
  rating: number;
  review: string;
  vehicleType?: string;
  serviceType?: string;
  isApproved: boolean;
  isDisplayed: boolean;
  source: "user_submitted" | "admin_created";
  submittedAt: Date;
  approvedAt?: Date;
  approvedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const TestimonialSchema = new Schema<ITestimonial>(
  {
    customerName: {
      type: String,
      required: [true, "Customer name is required"],
      trim: true,
      maxlength: 100,
    },
    customerLocation: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    rating: {
      type: Number,
      required: [true, "Rating is required"],
      min: 1,
      max: 5,
    },
    review: {
      type: String,
      required: [true, "Review is required"],
      trim: true,
      maxlength: 500,
    },
    vehicleType: {
      type: String,
      trim: true,
      maxlength: 50,
    },
    serviceType: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    isApproved: {
      type: Boolean,
      default: false,
    },
    isDisplayed: {
      type: Boolean,
      default: false,
    },
    source: {
      type: String,
      enum: ["user_submitted", "admin_created"],
      default: "user_submitted",
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
    approvedAt: {
      type: Date,
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

TestimonialSchema.index({ isDisplayed: 1, createdAt: -1 });
TestimonialSchema.index({ isApproved: 1, createdAt: -1 });

const Testimonial: Model<ITestimonial> =
  mongoose.models.Testimonial ||
  mongoose.model<ITestimonial>("Testimonial", TestimonialSchema);

export default Testimonial;
