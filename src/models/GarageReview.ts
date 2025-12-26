// src/models/GarageReview.ts
import mongoose, { Schema, Document, Model, Types } from "mongoose";

/**
 * Review status for moderation
 */
export type ReviewStatus = "pending" | "approved" | "rejected" | "flagged";

/**
 * Rating categories that customers rate
 */
export interface IRatingBreakdown {
  quality: number;        // Quality of work (1-5)
  communication: number;  // Communication with customer (1-5)
  timeliness: number;     // On-time service (1-5)
  value: number;          // Value for money (1-5)
}

/**
 * Garage response to a review
 */
export interface IGarageResponse {
  message: string;
  respondedAt: Date;
  respondedBy: Types.ObjectId;
}

/**
 * Customer review for a garage
 */
export interface IGarageReview extends Document {
  // Relationships
  garageId: Types.ObjectId;
  bookingId: Types.ObjectId;
  customerId?: Types.ObjectId;      // Null for guest reviews
  customerEmail: string;
  customerName: string;
  
  // Review content
  overallRating: number;            // 1-5 stars
  ratingBreakdown: IRatingBreakdown;
  title?: string;
  content: string;
  
  // Service details
  serviceType: string;
  vehicleType?: string;
  
  // Media
  photos?: string[];                // URLs to uploaded photos
  
  // Verification
  isVerifiedPurchase: boolean;      // Linked to a completed booking
  
  // Moderation
  status: ReviewStatus;
  moderatedAt?: Date;
  moderatedBy?: Types.ObjectId;
  moderationNotes?: string;
  
  // Garage response
  garageResponse?: IGarageResponse;
  
  // Engagement
  helpfulCount: number;
  reportCount: number;
  
  createdAt: Date;
  updatedAt: Date;
}

const RatingBreakdownSchema = new Schema<IRatingBreakdown>(
  {
    quality: {
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
    timeliness: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    value: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
  },
  { _id: false }
);

const GarageResponseSchema = new Schema<IGarageResponse>(
  {
    message: {
      type: String,
      required: true,
      maxlength: 1000,
    },
    respondedAt: {
      type: Date,
      default: Date.now,
    },
    respondedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { _id: false }
);

const GarageReviewSchema = new Schema<IGarageReview>(
  {
    garageId: {
      type: Schema.Types.ObjectId,
      ref: "Garage",
      required: true,
      index: true,
    },
    bookingId: {
      type: Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
      unique: true,  // One review per booking
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
      type: RatingBreakdownSchema,
      required: true,
    },
    title: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    serviceType: {
      type: String,
      required: true,
    },
    vehicleType: {
      type: String,
    },
    photos: {
      type: [String],
      default: [],
      validate: {
        validator: function (v: string[]) {
          return v.length <= 5;  // Max 5 photos per review
        },
        message: "Maximum 5 photos allowed",
      },
    },
    isVerifiedPurchase: {
      type: Boolean,
      default: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "flagged"],
      default: "pending",
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
    garageResponse: {
      type: GarageResponseSchema,
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
GarageReviewSchema.index({ garageId: 1, status: 1, createdAt: -1 });
GarageReviewSchema.index({ garageId: 1, overallRating: 1 });
GarageReviewSchema.index({ status: 1, createdAt: -1 });
GarageReviewSchema.index({ customerEmail: 1 });

// Virtual for average rating from breakdown
GarageReviewSchema.virtual("averageBreakdownRating").get(function () {
  const breakdown = this.ratingBreakdown;
  return (
    (breakdown.quality +
      breakdown.communication +
      breakdown.timeliness +
      breakdown.value) /
    4
  );
});

// Prevent OverwriteModelError
const GarageReview: Model<IGarageReview> =
  mongoose.models.GarageReview ||
  mongoose.model<IGarageReview>("GarageReview", GarageReviewSchema);

export default GarageReview;

// Helper to calculate aggregate ratings for a garage
export interface IGarageRatingStats {
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
    quality: number;
    communication: number;
    timeliness: number;
    value: number;
  };
}

export async function calculateGarageRatingStats(
  garageId: Types.ObjectId | string
): Promise<IGarageRatingStats | null> {
  const GarageReviewModel = mongoose.models.GarageReview || GarageReview;

  const stats = await GarageReviewModel.aggregate([
    {
      $match: {
        garageId: new mongoose.Types.ObjectId(garageId),
        status: "approved",
      },
    },
    {
      $group: {
        _id: null,
        averageRating: { $avg: "$overallRating" },
        totalReviews: { $sum: 1 },
        avgQuality: { $avg: "$ratingBreakdown.quality" },
        avgCommunication: { $avg: "$ratingBreakdown.communication" },
        avgTimeliness: { $avg: "$ratingBreakdown.timeliness" },
        avgValue: { $avg: "$ratingBreakdown.value" },
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
      quality: Math.round(s.avgQuality * 10) / 10,
      communication: Math.round(s.avgCommunication * 10) / 10,
      timeliness: Math.round(s.avgTimeliness * 10) / 10,
      value: Math.round(s.avgValue * 10) / 10,
    },
  };
}
