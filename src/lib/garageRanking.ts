// src/lib/garageRanking.ts
/**
 * Garage Ranking Algorithm for Search Results
 * 
 * This algorithm determines the order of garages in search results based on:
 * 1. Subscription tier (premium > analytics > free)
 * 2. Average rating
 * 3. Number of reviews (trust factor)
 * 4. Response time to bookings
 * 5. Completion rate
 * 6. Distance from customer (if location provided)
 * 7. Availability (can accept bookings)
 * 8. Price competitiveness (optional)
 * 
 * The algorithm produces a score from 0-100 for each garage.
 */

import { SubscriptionTier, TIER_RANKING_BOOST } from "@/models/GarageSubscription";

export interface GarageRankingInput {
  // Basic info
  garageId: string;
  garageName: string;
  
  // Subscription
  subscriptionTier: SubscriptionTier;
  isFeatured?: boolean;
  
  // Ratings
  averageRating: number;         // 0-5
  totalReviews: number;
  
  // Performance
  responseTimeHours: number;     // Average hours to respond to bookings
  completionRate: number;        // 0-1 (percentage of completed bookings)
  cancellationRate: number;      // 0-1 (percentage of cancelled bookings)
  
  // Location
  distanceKm?: number;           // Distance from customer (if available)
  
  // Availability
  isAvailable: boolean;          // Can accept bookings
  nextAvailableSlot?: Date;      // When next slot is available
  
  // Pricing
  priceLevel?: "budget" | "mid" | "premium";
  
  // Activity
  lastActiveAt?: Date;
  totalBookingsCompleted: number;
}

export interface GarageRankingResult {
  garageId: string;
  garageName: string;
  score: number;
  breakdown: {
    tierScore: number;
    ratingScore: number;
    trustScore: number;
    responseScore: number;
    completionScore: number;
    distanceScore: number;
    availabilityScore: number;
    activityScore: number;
  };
  badges: string[];
  isFeatured: boolean;
}

// Scoring weights (must sum to 1.0)
const WEIGHTS = {
  tier: 0.15,           // Subscription tier boost
  rating: 0.25,         // Average rating importance
  trust: 0.15,          // Number of reviews (trust)
  response: 0.12,       // Response time
  completion: 0.10,     // Completion rate
  distance: 0.13,       // Geographic proximity
  availability: 0.05,   // Current availability
  activity: 0.05,       // Recent activity
};

/**
 * Calculate ranking score for a single garage
 */
export function calculateGarageScore(input: GarageRankingInput): GarageRankingResult {
  const breakdown = {
    tierScore: calculateTierScore(input.subscriptionTier),
    ratingScore: calculateRatingScore(input.averageRating),
    trustScore: calculateTrustScore(input.totalReviews),
    responseScore: calculateResponseScore(input.responseTimeHours),
    completionScore: calculateCompletionScore(input.completionRate, input.cancellationRate),
    distanceScore: calculateDistanceScore(input.distanceKm),
    availabilityScore: calculateAvailabilityScore(input.isAvailable, input.nextAvailableSlot),
    activityScore: calculateActivityScore(input.lastActiveAt, input.totalBookingsCompleted),
  };

  // Calculate weighted score
  let score =
    breakdown.tierScore * WEIGHTS.tier +
    breakdown.ratingScore * WEIGHTS.rating +
    breakdown.trustScore * WEIGHTS.trust +
    breakdown.responseScore * WEIGHTS.response +
    breakdown.completionScore * WEIGHTS.completion +
    breakdown.distanceScore * WEIGHTS.distance +
    breakdown.availabilityScore * WEIGHTS.availability +
    breakdown.activityScore * WEIGHTS.activity;

  // Apply subscription tier boost
  const tierBoost = TIER_RANKING_BOOST[input.subscriptionTier];
  score = score * (1 + tierBoost);

  // Cap at 100
  score = Math.min(100, Math.round(score * 100) / 100);

  // Determine badges
  const badges = determineBadges(input, breakdown);

  return {
    garageId: input.garageId,
    garageName: input.garageName,
    score,
    breakdown,
    badges,
    isFeatured: input.subscriptionTier === "premium" || input.isFeatured === true,
  };
}

/**
 * Rank multiple garages and return sorted results
 */
export function rankGarages(garages: GarageRankingInput[]): GarageRankingResult[] {
  const results = garages.map((g) => calculateGarageScore(g));

  // Sort by score (descending), with featured garages first
  return results.sort((a, b) => {
    // Featured garages always come first
    if (a.isFeatured && !b.isFeatured) return -1;
    if (!a.isFeatured && b.isFeatured) return 1;

    // Then sort by score
    return b.score - a.score;
  });
}

// Individual scoring functions

function calculateTierScore(tier: SubscriptionTier): number {
  const scores: Record<SubscriptionTier, number> = {
    free: 60,
    analytics: 80,
    premium: 100,
  };
  return scores[tier];
}

function calculateRatingScore(rating: number): number {
  if (rating === 0) return 50; // No reviews yet, neutral score
  
  // Scale 1-5 rating to 0-100
  // Below 3.0 = poor (0-40)
  // 3.0-3.5 = okay (40-60)
  // 3.5-4.0 = good (60-75)
  // 4.0-4.5 = great (75-90)
  // 4.5-5.0 = excellent (90-100)
  
  if (rating < 3.0) return rating * 13.33;
  if (rating < 3.5) return 40 + (rating - 3.0) * 40;
  if (rating < 4.0) return 60 + (rating - 3.5) * 30;
  if (rating < 4.5) return 75 + (rating - 4.0) * 30;
  return 90 + (rating - 4.5) * 20;
}

function calculateTrustScore(totalReviews: number): number {
  // More reviews = more trust
  // 0 reviews = 30 (new garage penalty)
  // 1-5 reviews = 40-60
  // 5-20 reviews = 60-80
  // 20-50 reviews = 80-90
  // 50+ reviews = 90-100
  
  if (totalReviews === 0) return 30;
  if (totalReviews < 5) return 40 + (totalReviews / 5) * 20;
  if (totalReviews < 20) return 60 + ((totalReviews - 5) / 15) * 20;
  if (totalReviews < 50) return 80 + ((totalReviews - 20) / 30) * 10;
  return Math.min(100, 90 + ((totalReviews - 50) / 100) * 10);
}

function calculateResponseScore(responseTimeHours: number): number {
  // Faster response = higher score
  // < 1 hour = 100
  // 1-4 hours = 80-100
  // 4-12 hours = 60-80
  // 12-24 hours = 40-60
  // > 24 hours = 20-40
  
  if (responseTimeHours <= 1) return 100;
  if (responseTimeHours <= 4) return 100 - ((responseTimeHours - 1) / 3) * 20;
  if (responseTimeHours <= 12) return 80 - ((responseTimeHours - 4) / 8) * 20;
  if (responseTimeHours <= 24) return 60 - ((responseTimeHours - 12) / 12) * 20;
  return Math.max(20, 40 - ((responseTimeHours - 24) / 24) * 20);
}

function calculateCompletionScore(completionRate: number, cancellationRate: number): number {
  // High completion + low cancellation = good
  const completion = completionRate * 100;
  const cancellation = cancellationRate * 100;
  
  // Heavily penalize high cancellation rates
  const cancellationPenalty = Math.min(30, cancellation * 3);
  
  return Math.max(0, completion - cancellationPenalty);
}

function calculateDistanceScore(distanceKm?: number): number {
  if (distanceKm === undefined) return 50; // No location data, neutral
  
  // Closer = better
  // < 5km = 100
  // 5-10km = 80-100
  // 10-20km = 60-80
  // 20-30km = 40-60
  // > 30km = 20-40
  
  if (distanceKm <= 5) return 100;
  if (distanceKm <= 10) return 100 - ((distanceKm - 5) / 5) * 20;
  if (distanceKm <= 20) return 80 - ((distanceKm - 10) / 10) * 20;
  if (distanceKm <= 30) return 60 - ((distanceKm - 20) / 10) * 20;
  return Math.max(20, 40 - ((distanceKm - 30) / 20) * 20);
}

function calculateAvailabilityScore(isAvailable: boolean, nextSlot?: Date): number {
  if (!isAvailable) return 20;
  
  if (!nextSlot) return 80; // Available but no slot info
  
  const hoursUntilSlot = (nextSlot.getTime() - Date.now()) / (1000 * 60 * 60);
  
  // Available today = 100
  // Tomorrow = 80-100
  // 2-3 days = 60-80
  // 4-7 days = 40-60
  // > 7 days = 20-40
  
  if (hoursUntilSlot <= 24) return 100;
  if (hoursUntilSlot <= 48) return 90;
  if (hoursUntilSlot <= 72) return 70;
  if (hoursUntilSlot <= 168) return 50;
  return 30;
}

function calculateActivityScore(lastActiveAt?: Date, totalBookings?: number): number {
  let score = 50;
  
  // Recent activity bonus
  if (lastActiveAt) {
    const daysSinceActive = (Date.now() - lastActiveAt.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceActive <= 1) score += 30;
    else if (daysSinceActive <= 7) score += 20;
    else if (daysSinceActive <= 30) score += 10;
    else score -= 10;
  }
  
  // Total bookings bonus
  if (totalBookings) {
    if (totalBookings >= 100) score += 20;
    else if (totalBookings >= 50) score += 15;
    else if (totalBookings >= 20) score += 10;
    else if (totalBookings >= 5) score += 5;
  }
  
  return Math.min(100, Math.max(0, score));
}

function determineBadges(input: GarageRankingInput, breakdown: GarageRankingResult["breakdown"]): string[] {
  const badges: string[] = [];
  
  // Premium badge
  if (input.subscriptionTier === "premium") {
    badges.push("premium");
  }
  
  // Top rated
  if (input.averageRating >= 4.5 && input.totalReviews >= 10) {
    badges.push("top_rated");
  }
  
  // Quick responder
  if (input.responseTimeHours <= 2) {
    badges.push("quick_responder");
  }
  
  // Highly trusted
  if (input.totalReviews >= 50) {
    badges.push("trusted");
  }
  
  // High completion rate
  if (input.completionRate >= 0.95 && input.totalBookingsCompleted >= 20) {
    badges.push("reliable");
  }
  
  // New garage (< 3 months, < 10 reviews)
  if (input.totalReviews < 10 && input.totalBookingsCompleted < 20) {
    badges.push("new");
  }
  
  return badges;
}

// Badge display info
export const BADGE_INFO: Record<string, { label: string; color: string; icon: string }> = {
  premium: {
    label: "Premium Partner",
    color: "bg-purple-100 text-purple-700 border-purple-200",
    icon: "crown",
  },
  top_rated: {
    label: "Top Rated",
    color: "bg-amber-100 text-amber-700 border-amber-200",
    icon: "star",
  },
  quick_responder: {
    label: "Quick Responder",
    color: "bg-blue-100 text-blue-700 border-blue-200",
    icon: "zap",
  },
  trusted: {
    label: "Highly Trusted",
    color: "bg-emerald-100 text-emerald-700 border-emerald-200",
    icon: "shield-check",
  },
  reliable: {
    label: "Reliable",
    color: "bg-green-100 text-green-700 border-green-200",
    icon: "check-circle",
  },
  new: {
    label: "New",
    color: "bg-slate-100 text-slate-600 border-slate-200",
    icon: "sparkles",
  },
};
