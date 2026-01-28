// src/models/DriverReview.ts
import mongoose, { Schema, Document, Model, Types } from "mongoose";

/**
 * Review status for moderation
 */
export type DriverReviewStatus = "pending" | "approved" | "rejected" | "flagged";

/**
 * Rating categories for driver reviews
 */
export interface IDriverRatingBreakdown {
  professionalism: number;  // Professional conduct (1-5)
  punctuality: number;      // On-time pickup/delivery (1-5)
  communication: number;    // Communication quality (1-5)
  vehicleCare: number;      // Care taken with vehicle (1-5)
}

/**
 * Customer review for a driver
 */
export interface IDriverReview extends Document {
  // Relationships
  driverId: Types.ObjectId;
  bookingId: Types.ObjectId;
  customerId?: Types.ObjectId;      // Null for guest reviews
  customerEmail: string;
  customerName: string;
  
  // Review content
  overallRating: number;            // 1-5 stars
  ratingBreakdown: IDriverRatingBreakdown;
  content: string;
  
  // Verification
  isVerifiedPurchase: boolean;      // Linked to a completed booking
  
  // Moderation
  status: DriverReviewStatus;
  moderatedAt?: Date;
  moderatedBy?: Types.ObjectId;
  moderationNotes?: string;
  
  // Engagement
  helpfulCount: number;
  reportCount: number;
  
  createdAt: Date;
  updatedAt: Date;
}

const DriverRatingBreakdownSchema = new Schema<IDriverRatingBreakdown>(
  {
    professionalism: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    punctuality: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    communication: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    vehicleCare: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
  },
  { _id: false }
);

const DriverReviewSchema = new Schema<IDriverReview>(
  {
    driverId: {
      type: Schema.Types.ObjectId,
      ref: "Driver",
      required: true,
      index: true,
    },
    bookingId: {
      type: Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
      index: true,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    customerEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    customerName: {
      type: String,
      required: true,
      trim: true,
    },
    overallRating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    ratingBreakdown: {
      type: DriverRatingBreakdownSchema,
      required: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    isVerifiedPurchase: {
      type: Boolean,
      default: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "flagged"],
      default: "approved", // Auto-approve driver reviews for now
    },
    moderatedAt: {
      type: Date,
    },
    moderatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    moderationNotes: {
      type: String,
    },
    helpfulCount: {
      type: Number,
      default: 0,
    },
    reportCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Indexes for efficient queries
DriverReviewSchema.index({ driverId: 1, status: 1, createdAt: -1 });
DriverReviewSchema.index({ driverId: 1, overallRating: 1 });
DriverReviewSchema.index({ bookingId: 1, driverId: 1 }, { unique: true }); // One driver review per booking
DriverReviewSchema.index({ customerEmail: 1 });

// Virtual for average rating from breakdown
DriverReviewSchema.virtual("averageBreakdownRating").get(function () {
  const breakdown = this.ratingBreakdown;
  return (
    (breakdown.professionalism +
      breakdown.punctuality +
      breakdown.communication +
      breakdown.vehicleCare) /
    4
  );
});

// Prevent OverwriteModelError
const DriverReview: Model<IDriverReview> =
  mongoose.models.DriverReview ||
  mongoose.model<IDriverReview>("DriverReview", DriverReviewSchema);

export default DriverReview;

// Helper to calculate aggregate ratings for a driver
export interface IDriverRatingStats {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
  categoryAverages: {
    professionalism: number;
    punctuality: number;
    communication: number;
    vehicleCare: number;
  };
}

export async function calculateDriverRatingStats(
  driverId: Types.ObjectId | string
): Promise<IDriverRatingStats | null> {
  const DriverReviewModel = mongoose.models.DriverReview || DriverReview;

  const stats = await DriverReviewModel.aggregate([
    {
      $match: {
        driverId: new mongoose.Types.ObjectId(driverId),
        status: "approved",
      },
    },
    {
      $group: {
        _id: null,
        averageRating: { $avg: "$overallRating" },
        totalReviews: { $sum: 1 },
        avgProfessionalism: { $avg: "$ratingBreakdown.professionalism" },
        avgPunctuality: { $avg: "$ratingBreakdown.punctuality" },
        avgCommunication: { $avg: "$ratingBreakdown.communication" },
        avgVehicleCare: { $avg: "$ratingBreakdown.vehicleCare" },
        rating1: {
          $sum: { $cond: [{ $eq: ["$overallRating", 1] }, 1, 0] },
        },
        rating2: {
          $sum: { $cond: [{ $eq: ["$overallRating", 2] }, 1, 0] },
        },
        rating3: {
          $sum: { $cond: [{ $eq: ["$overallRating", 3] }, 1, 0] },
        },
        rating4: {
          $sum: { $cond: [{ $eq: ["$overallRating", 4] }, 1, 0] },
        },
        rating5: {
          $sum: { $cond: [{ $eq: ["$overallRating", 5] }, 1, 0] },
        },
      },
    },
  ]);

  if (!stats.length) {
    return null;
  }

  const s = stats[0];
  return {
    averageRating: Math.round(s.averageRating * 10) / 10,
    totalReviews: s.totalReviews,
    ratingDistribution: {
      1: s.rating1,
      2: s.rating2,
      3: s.rating3,
      4: s.rating4,
      5: s.rating5,
    },
    categoryAverages: {
      professionalism: Math.round(s.avgProfessionalism * 10) / 10,
      punctuality: Math.round(s.avgPunctuality * 10) / 10,
      communication: Math.round(s.avgCommunication * 10) / 10,
      vehicleCare: Math.round(s.avgVehicleCare * 10) / 10,
    },
  };
}