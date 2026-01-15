// src/app/api/garages/search/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Garage from "@/models/Garage";
import GarageServicePricing from "@/models/GarageServicePricing";
import GarageSubscription from "@/models/GarageSubscription";
import GarageReview, { calculateGarageRatingStats } from "@/models/GarageReview";
import Booking from "@/models/Booking";
import {
  rankGarages,
  GarageRankingInput,
  GarageRankingResult,
} from "@/lib/garageRanking";
import { logger } from "@/lib/logger";

export const dynamic = 'force-dynamic';

export interface GarageSearchResult {
  _id: string;
  businessName: string;
  linkedGarageName: string;
  address: {
    suburb: string;
    state: string;
    postcode: string;
  };
  services: string[];
  averageRating: number;
  totalReviews: number;
  responseTime: string;
  priceRange?: {
    min: number;
    max: number;
  };
  badges: string[];
  isFeatured: boolean;
  isPremium: boolean;
  distanceKm?: number;
  nextAvailable?: string;
  score: number;
}

// GET /api/garages/search - Public garage search
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Search parameters
    const query = searchParams.get("q") || "";
    const suburb = searchParams.get("suburb") || "";
    const state = searchParams.get("state") || "";
    const postcode = searchParams.get("postcode") || "";
    const service = searchParams.get("service") || "";
    const vehicleType = searchParams.get("vehicleType") || "";
    const lat = searchParams.get("lat");
    const lng = searchParams.get("lng");
    const maxDistance = Math.max(1, parseInt(searchParams.get("maxDistance") || "30") || 30);
    const minRating = Math.max(0, Math.min(5, parseFloat(searchParams.get("minRating") || "0") || 0));
    const sortBy = searchParams.get("sortBy") || "relevance"; // relevance, rating, distance, price
    // Ensure page is at least 1 and handle NaN from invalid input
    const page = Math.max(1, parseInt(searchParams.get("page") || "1") || 1);
    // Ensure limit is between 1 and 50
    const limit = Math.max(1, Math.min(parseInt(searchParams.get("limit") || "20") || 20, 50));

    await connectDB();

    // Build base query for approved, active garages
    const garageQuery: Record<string, unknown> = {
      status: "approved",
    };

    // Location filters
    if (state) {
      garageQuery["businessAddress.state"] = state;
    }
    if (postcode) {
      garageQuery["businessAddress.postcode"] = postcode;
    }
    if (suburb) {
      garageQuery["businessAddress.suburb"] = { $regex: suburb, $options: "i" };
    }

    // Text search on business name
    if (query) {
      garageQuery.$or = [
        { businessName: { $regex: query, $options: "i" } },
        { linkedGarageName: { $regex: query, $options: "i" } },
        { tradingName: { $regex: query, $options: "i" } },
      ];
    }

    // Geo query if coordinates provided
    if (lat && lng) {
      const parsedLat = parseFloat(lat);
      const parsedLng = parseFloat(lng);

      // Validate coordinates are within valid geographic ranges
      // Latitude: -90 to 90, Longitude: -180 to 180
      if (
        isNaN(parsedLat) ||
        isNaN(parsedLng) ||
        parsedLat < -90 ||
        parsedLat > 90 ||
        parsedLng < -180 ||
        parsedLng > 180
      ) {
        return NextResponse.json(
          { error: "Invalid coordinates. Latitude must be -90 to 90, longitude must be -180 to 180." },
          { status: 400 }
        );
      }

      garageQuery.location = {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [parsedLng, parsedLat],
          },
          $maxDistance: maxDistance * 1000, // Convert km to meters
        },
      };
    }

    // Get garages matching base criteria
    const garages = await Garage.find(garageQuery)
      .select("_id businessName linkedGarageName businessAddress location servicesOffered vehicleTypes")
      .lean();

    if (garages.length === 0) {
      return NextResponse.json({
        success: true,
        garages: [],
        total: 0,
        page,
        totalPages: 0,
        filters: { service, vehicleType, minRating },
      });
    }

    const garageIds = garages.map((g) => g._id);

    // Get additional data for ranking
    const [servicePricings, subscriptions, reviewStats, bookingStats] = await Promise.all([
      GarageServicePricing.find({
        garageId: { $in: garageIds },
        isPublished: true,
      }).lean(),
      GarageSubscription.find({
        garageId: { $in: garageIds },
      }).lean(),
      // Get review stats for each garage
      Promise.all(garageIds.map((id) => calculateGarageRatingStats(id))),
      // Get booking stats for each garage
      Booking.aggregate([
        {
          $match: {
            assignedGarageId: { $in: garageIds },
          },
        },
        {
          $group: {
            _id: "$assignedGarageId",
            totalBookings: { $sum: 1 },
            completedBookings: {
              $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
            },
            cancelledBookings: {
              $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] },
            },
            avgResponseTime: {
              $avg: {
                $subtract: ["$garageAcceptedAt", "$createdAt"],
              },
            },
          },
        },
      ]),
    ]);

    // Create maps for quick lookup
    const pricingMap = new Map(servicePricings.map((p) => [p.garageId.toString(), p]));
    const subscriptionMap = new Map(subscriptions.map((s) => [s.garageId.toString(), s]));
    const bookingMap = new Map(bookingStats.map((b) => [b._id.toString(), b]));

    // Filter by service if specified
    let filteredGarages = garages;
    if (service) {
      const garageIdsWithService = servicePricings
        .filter((p) => p.services.some((s) => s.category === service && s.isActive))
        .map((p) => p.garageId.toString());

      filteredGarages = garages.filter((g) =>
        garageIdsWithService.includes(g._id.toString())
      );
    }

    // Build ranking inputs
    const rankingInputs: GarageRankingInput[] = filteredGarages.map((garage, index) => {
      const garageIdStr = garage._id.toString();
      const subscription = subscriptionMap.get(garageIdStr);
      const reviewStat = reviewStats[index];
      const bookingStat = bookingMap.get(garageIdStr);

      // Calculate distance if coordinates provided
      let distanceKm: number | undefined;
      if (lat && lng && garage.location?.coordinates) {
        distanceKm = calculateDistance(
          parseFloat(lat),
          parseFloat(lng),
          garage.location.coordinates[1],
          garage.location.coordinates[0]
        );
      }

      // Calculate response time in hours
      const avgResponseMs = bookingStat?.avgResponseTime || 0;
      const responseTimeHours = avgResponseMs > 0 ? avgResponseMs / (1000 * 60 * 60) : 24;

      return {
        garageId: garageIdStr,
        garageName: garage.businessName,
        subscriptionTier: subscription?.tier || "free",
        isFeatured: subscription?.features?.featuredPlacement || false,
        averageRating: reviewStat?.averageRating || 0,
        totalReviews: reviewStat?.totalReviews || 0,
        responseTimeHours,
        completionRate: bookingStat
          ? bookingStat.totalBookings > 0
            ? bookingStat.completedBookings / bookingStat.totalBookings
            : 0.5
          : 0.5,
        cancellationRate: bookingStat
          ? bookingStat.totalBookings > 0
            ? bookingStat.cancelledBookings / bookingStat.totalBookings
            : 0
          : 0,
        distanceKm,
        isAvailable: true, // TODO: Check actual availability
        totalBookingsCompleted: bookingStat?.completedBookings || 0,
      };
    });

    // Filter by minimum rating
    const ratingFilteredInputs = minRating > 0
      ? rankingInputs.filter((i) => i.averageRating >= minRating)
      : rankingInputs;

    // Rank garages
    let rankedResults = rankGarages(ratingFilteredInputs);

    // Apply sorting if not relevance
    if (sortBy === "rating") {
      rankedResults.sort((a, b) => {
        const aInput = ratingFilteredInputs.find((i) => i.garageId === a.garageId);
        const bInput = ratingFilteredInputs.find((i) => i.garageId === b.garageId);
        return (bInput?.averageRating || 0) - (aInput?.averageRating || 0);
      });
    } else if (sortBy === "distance" && lat && lng) {
      rankedResults.sort((a, b) => {
        const aInput = ratingFilteredInputs.find((i) => i.garageId === a.garageId);
        const bInput = ratingFilteredInputs.find((i) => i.garageId === b.garageId);
        return (aInput?.distanceKm || 999) - (bInput?.distanceKm || 999);
      });
    }

    // Paginate
    const total = rankedResults.length;
    const totalPages = Math.ceil(total / limit);
    const paginatedResults = rankedResults.slice((page - 1) * limit, page * limit);

    // Build final response with full garage data
    const searchResults: GarageSearchResult[] = paginatedResults.map((ranked) => {
      const garage = filteredGarages.find((g) => g._id.toString() === ranked.garageId)!;
      const pricing = pricingMap.get(ranked.garageId);
      const subscription = subscriptionMap.get(ranked.garageId);
      const input = ratingFilteredInputs.find((i) => i.garageId === ranked.garageId)!;

      // Calculate price range from services
      let priceRange: { min: number; max: number } | undefined;
      if (pricing?.services?.length) {
        const allPrices = pricing.services.flatMap((s) =>
          s.prices.map((p) => p.priceFrom)
        );
        if (allPrices.length > 0) {
          priceRange = {
            min: Math.min(...allPrices) / 100,
            max: Math.max(...allPrices) / 100,
          };
        }
      }

      // Format response time
      const responseTime = formatResponseTime(input.responseTimeHours);

      return {
        _id: ranked.garageId,
        businessName: garage.businessName,
        linkedGarageName: garage.linkedGarageName || "",
        address: {
          suburb: garage.businessAddress?.suburb || "",
          state: garage.businessAddress?.state || "",
          postcode: garage.businessAddress?.postcode || "",
        },
        services: pricing?.services?.map((s) => s.category) || garage.servicesOffered || [],
        averageRating: input.averageRating,
        totalReviews: input.totalReviews,
        responseTime,
        priceRange,
        badges: ranked.badges,
        isFeatured: ranked.isFeatured,
        isPremium: subscription?.tier === "premium",
        distanceKm: input.distanceKm ? Math.round(input.distanceKm * 10) / 10 : undefined,
        score: ranked.score,
      };
    });

    return NextResponse.json({
      success: true,
      garages: searchResults,
      total,
      page,
      totalPages,
      filters: {
        service,
        vehicleType,
        minRating,
        sortBy,
      },
    });
  } catch (error) {
    logger.error("Error searching garages", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json(
      { error: "Failed to search garages" },
      { status: 500 }
    );
  }
}

// Haversine formula to calculate distance between two points
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

function formatResponseTime(hours: number): string {
  if (hours < 1) return "< 1 hour";
  if (hours < 2) return "~1 hour";
  if (hours < 4) return "2-4 hours";
  if (hours < 12) return "4-12 hours";
  if (hours < 24) return "< 1 day";
  return "> 1 day";
}
