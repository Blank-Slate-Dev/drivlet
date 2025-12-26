// src/app/api/garages/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Garage from "@/models/Garage";
import GarageServicePricing, {
  SERVICE_CATEGORY_LABELS,
  VEHICLE_CATEGORY_LABELS,
} from "@/models/GarageServicePricing";
import GarageSubscription from "@/models/GarageSubscription";
import GarageReview, { calculateGarageRatingStats } from "@/models/GarageReview";
import Booking from "@/models/Booking";
import mongoose from "mongoose";
import { logger } from "@/lib/logger";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/garages/[id] - Get public garage profile
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid garage ID" }, { status: 400 });
    }

    await connectDB();

    // Get garage
    const garage = await Garage.findOne({
      _id: id,
      status: "approved",
    }).lean();

    if (!garage) {
      return NextResponse.json({ error: "Garage not found" }, { status: 404 });
    }

    // Get additional data
    const [servicePricing, subscription, ratingStats, recentReviews, bookingStats] =
      await Promise.all([
        GarageServicePricing.findOne({
          garageId: garage._id,
          isPublished: true,
        }).lean(),
        GarageSubscription.findOne({ garageId: garage._id }).lean(),
        calculateGarageRatingStats(garage._id),
        GarageReview.find({
          garageId: garage._id,
          status: "approved",
        })
          .sort({ createdAt: -1 })
          .limit(10)
          .lean(),
        Booking.aggregate([
          {
            $match: {
              assignedGarageId: garage._id,
            },
          },
          {
            $group: {
              _id: null,
              totalBookings: { $sum: 1 },
              completedBookings: {
                $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
              },
              avgResponseTime: {
                $avg: {
                  $cond: [
                    { $and: [{ $ne: ["$garageAcceptedAt", null] }, { $ne: ["$createdAt", null] }] },
                    { $subtract: ["$garageAcceptedAt", "$createdAt"] },
                    null,
                  ],
                },
              },
            },
          },
        ]),
      ]);

    // Format services with labels
    const formattedServices = servicePricing?.services
      ?.filter((s) => s.isActive)
      .map((service) => ({
        id: service.category,
        name: service.name,
        category: service.category,
        categoryLabel: SERVICE_CATEGORY_LABELS[service.category] || service.category,
        description: service.description,
        prices: service.prices.map((p) => ({
          vehicleCategory: p.vehicleCategory,
          vehicleCategoryLabel: VEHICLE_CATEGORY_LABELS[p.vehicleCategory],
          priceFrom: p.priceFrom / 100, // Convert to dollars
          priceTo: p.priceTo ? p.priceTo / 100 : undefined,
          estimatedHours: p.estimatedHours,
          notes: p.notes,
        })),
        includesPickup: service.includesPickup,
        averageRating: service.averageRating,
        completedCount: service.completedCount,
      })) || [];

    // Format reviews
    const formattedReviews = recentReviews.map((review) => ({
      id: review._id,
      customerName: review.customerName,
      overallRating: review.overallRating,
      ratingBreakdown: review.ratingBreakdown,
      title: review.title,
      content: review.content,
      serviceType: review.serviceType,
      isVerifiedPurchase: review.isVerifiedPurchase,
      garageResponse: review.garageResponse
        ? {
            message: review.garageResponse.message,
            respondedAt: review.garageResponse.respondedAt,
          }
        : undefined,
      helpfulCount: review.helpfulCount,
      createdAt: review.createdAt,
    }));

    // Calculate response time
    const stats = bookingStats[0];
    const avgResponseHours = stats?.avgResponseTime
      ? stats.avgResponseTime / (1000 * 60 * 60)
      : null;

    // Build badges
    const badges: string[] = [];
    if (subscription?.tier === "premium") badges.push("premium");
    if (ratingStats && ratingStats.averageRating >= 4.5 && ratingStats.totalReviews >= 10) {
      badges.push("top_rated");
    }
    if (avgResponseHours && avgResponseHours <= 2) badges.push("quick_responder");
    if (ratingStats && ratingStats.totalReviews >= 50) badges.push("trusted");
    if (stats && stats.completedBookings >= 20 && stats.completedBookings / stats.totalBookings >= 0.95) {
      badges.push("reliable");
    }

    // Build public profile
    const profile = {
      id: garage._id,
      businessName: garage.businessName,
      linkedGarageName: garage.linkedGarageName || "",
      tradingName: garage.tradingName,
      address: {
        suburb: garage.businessAddress?.suburb,
        state: garage.businessAddress?.state,
        postcode: garage.businessAddress?.postcode,
      },
      location: garage.location?.coordinates
        ? {
            lat: garage.location.coordinates[1],
            lng: garage.location.coordinates[0],
          }
        : null,
      yearsInOperation: garage.yearsInOperation,
      operatingHours: garage.operatingHours,
      appointmentPolicy: garage.appointmentPolicy,

      // Services
      services: formattedServices,
      vehicleTypes: servicePricing?.acceptsManualTransmission !== false
        ? ["automatic", "manual"]
        : ["automatic"],
      acceptsElectric: servicePricing?.acceptsElectricVehicles || false,
      acceptsHybrid: servicePricing?.acceptsHybridVehicles || true,
      acceptsDiesel: servicePricing?.acceptsDiesel || true,

      // Drivlet settings
      drivletEnabled: servicePricing?.drivletEnabled ?? true,
      drivletRadius: servicePricing?.drivletRadius || 15,
      leadTimeHours: servicePricing?.leadTimeHours || 24,

      // Ratings
      ratings: ratingStats || {
        averageRating: 0,
        totalReviews: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        categoryAverages: {
          quality: 0,
          communication: 0,
          timeliness: 0,
          value: 0,
        },
      },

      // Reviews
      reviews: formattedReviews,

      // Stats
      stats: {
        totalBookings: stats?.totalBookings || 0,
        completedBookings: stats?.completedBookings || 0,
        completionRate: stats?.totalBookings
          ? Math.round((stats.completedBookings / stats.totalBookings) * 100)
          : 0,
        avgResponseTime: avgResponseHours
          ? formatResponseTime(avgResponseHours)
          : "N/A",
      },

      // Badges and tier
      badges,
      isPremium: subscription?.tier === "premium",
      isAnalytics: subscription?.tier === "analytics",

      // Certifications
      certifications: garage.certifications || [],
    };

    return NextResponse.json({
      success: true,
      profile,
    });
  } catch (error) {
    logger.error("Error fetching garage profile", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json(
      { error: "Failed to fetch garage profile" },
      { status: 500 }
    );
  }
}

function formatResponseTime(hours: number): string {
  if (hours < 1) return "Under 1 hour";
  if (hours < 2) return "About 1 hour";
  if (hours < 4) return "2-4 hours";
  if (hours < 12) return "Same day";
  if (hours < 24) return "Within 24 hours";
  return "1-2 days";
}
