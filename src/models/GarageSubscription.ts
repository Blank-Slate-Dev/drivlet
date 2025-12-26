// src/models/GarageSubscription.ts
import mongoose, { Schema, Document, Model, Types } from "mongoose";

/**
 * Subscription tiers for garages
 * 
 * Free ($0/mo):
 * - Listed in search results
 * - Accept drivlet bookings
 * - Basic profile
 * 
 * Analytics ($79/mo):
 * - Everything in Free
 * - Revenue analytics
 * - Customer insights
 * - Booking trends
 * - Comparison reports
 * 
 * Premium ($119/mo):
 * - Everything in Analytics
 * - Priority ranking in search
 * - Featured placement
 * - Priority support
 * - Marketing badge
 */
export type SubscriptionTier = "free" | "analytics" | "premium";
export type SubscriptionStatus = "active" | "past_due" | "cancelled" | "trialing";
export type BillingInterval = "monthly" | "yearly";

export interface ISubscriptionEvent {
  type: "created" | "upgraded" | "downgraded" | "cancelled" | "renewed" | "payment_failed" | "payment_succeeded";
  fromTier?: SubscriptionTier;
  toTier?: SubscriptionTier;
  amount?: number;
  stripeEventId?: string;
  timestamp: Date;
  notes?: string;
}

export interface IGarageSubscription extends Document {
  garageId: Types.ObjectId;
  userId: Types.ObjectId;
  
  // Current subscription
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  billingInterval: BillingInterval;
  
  // Pricing (in cents)
  monthlyPrice: number;
  yearlyPrice: number;
  
  // Stripe integration
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  stripePriceId?: string;
  stripePaymentMethodId?: string;
  
  // Billing dates
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  trialEndsAt?: Date;
  cancelledAt?: Date;
  cancelAtPeriodEnd: boolean;
  
  // Usage this period
  bookingsThisPeriod: number;
  revenueThisPeriod: number;  // In cents
  
  // Features based on tier
  features: {
    searchListing: boolean;
    acceptBookings: boolean;
    basicProfile: boolean;
    analytics: boolean;
    customerInsights: boolean;
    trendReports: boolean;
    priorityRanking: boolean;
    featuredPlacement: boolean;
    prioritySupport: boolean;
    marketingBadge: boolean;
  };
  
  // History
  events: ISubscriptionEvent[];
  
  createdAt: Date;
  updatedAt: Date;
}

// Subscription event schema
const SubscriptionEventSchema = new Schema<ISubscriptionEvent>(
  {
    type: {
      type: String,
      enum: [
        "created",
        "upgraded",
        "downgraded",
        "cancelled",
        "renewed",
        "payment_failed",
        "payment_succeeded",
      ],
      required: true,
    },
    fromTier: {
      type: String,
      enum: ["free", "analytics", "premium"],
    },
    toTier: {
      type: String,
      enum: ["free", "analytics", "premium"],
    },
    amount: {
      type: Number,
    },
    stripeEventId: {
      type: String,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    notes: {
      type: String,
    },
  },
  { _id: false }
);

const GarageSubscriptionSchema = new Schema<IGarageSubscription>(
  {
    garageId: {
      type: Schema.Types.ObjectId,
      ref: "Garage",
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    tier: {
      type: String,
      enum: ["free", "analytics", "premium"],
      default: "free",
    },
    status: {
      type: String,
      enum: ["active", "past_due", "cancelled", "trialing"],
      default: "active",
    },
    billingInterval: {
      type: String,
      enum: ["monthly", "yearly"],
      default: "monthly",
    },
    monthlyPrice: {
      type: Number,
      default: 0,
    },
    yearlyPrice: {
      type: Number,
      default: 0,
    },
    stripeCustomerId: {
      type: String,
      index: true,
    },
    stripeSubscriptionId: {
      type: String,
      index: true,
    },
    stripePriceId: {
      type: String,
    },
    stripePaymentMethodId: {
      type: String,
    },
    currentPeriodStart: {
      type: Date,
    },
    currentPeriodEnd: {
      type: Date,
    },
    trialEndsAt: {
      type: Date,
    },
    cancelledAt: {
      type: Date,
    },
    cancelAtPeriodEnd: {
      type: Boolean,
      default: false,
    },
    bookingsThisPeriod: {
      type: Number,
      default: 0,
    },
    revenueThisPeriod: {
      type: Number,
      default: 0,
    },
    features: {
      searchListing: { type: Boolean, default: true },
      acceptBookings: { type: Boolean, default: true },
      basicProfile: { type: Boolean, default: true },
      analytics: { type: Boolean, default: false },
      customerInsights: { type: Boolean, default: false },
      trendReports: { type: Boolean, default: false },
      priorityRanking: { type: Boolean, default: false },
      featuredPlacement: { type: Boolean, default: false },
      prioritySupport: { type: Boolean, default: false },
      marketingBadge: { type: Boolean, default: false },
    },
    events: {
      type: [SubscriptionEventSchema],
      default: [],
    },
  },
  { timestamps: true }
);

// Indexes
GarageSubscriptionSchema.index({ tier: 1, status: 1 });
GarageSubscriptionSchema.index({ stripeSubscriptionId: 1 });
GarageSubscriptionSchema.index({ currentPeriodEnd: 1 });

// Pre-save hook to set features based on tier
GarageSubscriptionSchema.pre("save", function () {
  const tierFeatures = TIER_FEATURES[this.tier];
  this.features = { ...tierFeatures };
  
  // Set prices
  this.monthlyPrice = TIER_PRICES[this.tier].monthly;
  this.yearlyPrice = TIER_PRICES[this.tier].yearly;
});

// Prevent OverwriteModelError
const GarageSubscription: Model<IGarageSubscription> =
  mongoose.models.GarageSubscription ||
  mongoose.model<IGarageSubscription>("GarageSubscription", GarageSubscriptionSchema);

export default GarageSubscription;

// Tier configurations
export const TIER_PRICES: Record<SubscriptionTier, { monthly: number; yearly: number }> = {
  free: { monthly: 0, yearly: 0 },
  analytics: { monthly: 7900, yearly: 79000 },  // $79/mo, $790/yr (2 months free)
  premium: { monthly: 11900, yearly: 119000 },  // $119/mo, $1190/yr (2 months free)
};

export const TIER_FEATURES: Record<SubscriptionTier, IGarageSubscription["features"]> = {
  free: {
    searchListing: true,
    acceptBookings: true,
    basicProfile: true,
    analytics: false,
    customerInsights: false,
    trendReports: false,
    priorityRanking: false,
    featuredPlacement: false,
    prioritySupport: false,
    marketingBadge: false,
  },
  analytics: {
    searchListing: true,
    acceptBookings: true,
    basicProfile: true,
    analytics: true,
    customerInsights: true,
    trendReports: true,
    priorityRanking: false,
    featuredPlacement: false,
    prioritySupport: false,
    marketingBadge: false,
  },
  premium: {
    searchListing: true,
    acceptBookings: true,
    basicProfile: true,
    analytics: true,
    customerInsights: true,
    trendReports: true,
    priorityRanking: true,
    featuredPlacement: true,
    prioritySupport: true,
    marketingBadge: true,
  },
};

export const TIER_LABELS: Record<SubscriptionTier, string> = {
  free: "Free",
  analytics: "Analytics",
  premium: "Premium",
};

export const TIER_DESCRIPTIONS: Record<SubscriptionTier, string> = {
  free: "Get started with drivlet. Accept bookings and build your reputation.",
  analytics: "Understand your business better with detailed analytics and insights.",
  premium: "Maximize visibility with priority ranking and featured placement.",
};

export const TIER_RANKING_BOOST: Record<SubscriptionTier, number> = {
  free: 0,
  analytics: 0.1,    // 10% boost
  premium: 0.25,     // 25% boost
};
