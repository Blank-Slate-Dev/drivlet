// src/app/api/garage/reviews/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Garage from "@/models/Garage";
import GarageReview, { calculateGarageRatingStats } from "@/models/GarageReview";
import { sanitizeString } from "@/lib/validation";
import { logger } from "@/lib/logger";
import mongoose from "mongoose";

// GET /api/garage/reviews - Get reviews for the garage
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "garage") {
      return NextResponse.json({ error: "Not a garage user" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const sortBy = searchParams.get("sortBy") || "recent";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);

    await connectDB();

    const garage = await Garage.findOne({ userId: session.user.id });
    if (!garage) {
      return NextResponse.json({ error: "Garage not found" }, { status: 404 });
    }

    // Determine sort order
    let sortOrder: Record<string, 1 | -1> = { createdAt: -1 };
    if (sortBy === "highest") sortOrder = { overallRating: -1, createdAt: -1 };
    else if (sortBy === "lowest") sortOrder = { overallRating: 1, createdAt: -1 };

    // Get reviews (approved ones for display, plus pending for garage to see)
    const [reviews, total, stats] = await Promise.all([
      GarageReview.find({
        garageId: garage._id,
        status: { $in: ["approved", "pending"] },
      })
        .sort(sortOrder)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      GarageReview.countDocuments({
        garageId: garage._id,
        status: { $in: ["approved", "pending"] },
      }),
      calculateGarageRatingStats(garage._id),
    ]);

    // Calculate trend (compare to previous period)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const [currentPeriodStats, previousPeriodStats] = await Promise.all([
      GarageReview.aggregate([
        {
          $match: {
            garageId: garage._id,
            status: "approved",
            createdAt: { $gte: thirtyDaysAgo },
          },
        },
        {
          $group: {
            _id: null,
            avgRating: { $avg: "$overallRating" },
          },
        },
      ]),
      GarageReview.aggregate([
        {
          $match: {
            garageId: garage._id,
            status: "approved",
            createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo },
          },
        },
        {
          $group: {
            _id: null,
            avgRating: { $avg: "$overallRating" },
          },
        },
      ]),
    ]);

    const currentAvg = currentPeriodStats[0]?.avgRating || 0;
    const previousAvg = previousPeriodStats[0]?.avgRating || 0;
    const trend = previousAvg > 0 ? Math.round(((currentAvg - previousAvg) / previousAvg) * 100) : 0;

    return NextResponse.json({
      success: true,
      reviews,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      stats: stats ? { ...stats, trend } : null,
    });
  } catch (error) {
    logger.error("Error fetching garage reviews", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json(
      { error: "Failed to fetch reviews" },
      { status: 500 }
    );
  }
}

// POST /api/garage/reviews - Respond to a review
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "garage") {
      return NextResponse.json({ error: "Not a garage user" }, { status: 403 });
    }

    const body = await request.json();
    const { reviewId, response } = body;

    if (!reviewId || !mongoose.Types.ObjectId.isValid(reviewId)) {
      return NextResponse.json({ error: "Valid review ID is required" }, { status: 400 });
    }

    if (!response || response.trim().length < 10) {
      return NextResponse.json(
        { error: "Response must be at least 10 characters" },
        { status: 400 }
      );
    }

    if (response.length > 1000) {
      return NextResponse.json(
        { error: "Response cannot exceed 1000 characters" },
        { status: 400 }
      );
    }

    await connectDB();

    const garage = await Garage.findOne({ userId: session.user.id });
    if (!garage) {
      return NextResponse.json({ error: "Garage not found" }, { status: 404 });
    }

    // Find the review and verify it belongs to this garage
    const review = await GarageReview.findOne({
      _id: reviewId,
      garageId: garage._id,
    });

    if (!review) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }

    if (review.garageResponse) {
      return NextResponse.json(
        { error: "This review has already been responded to" },
        { status: 400 }
      );
    }

    // Add the response
    review.garageResponse = {
      message: sanitizeString(response.trim()).slice(0, 1000),
      respondedAt: new Date(),
      respondedBy: new mongoose.Types.ObjectId(session.user.id),
    };

    await review.save();

    logger.info("Garage responded to review", {
      garageId: garage._id,
      reviewId: review._id,
    });

    return NextResponse.json({
      success: true,
      message: "Response submitted successfully",
    });
  } catch (error) {
    logger.error("Error responding to review", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json(
      { error: "Failed to submit response" },
      { status: 500 }
    );
  }
}
