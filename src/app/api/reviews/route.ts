// src/app/api/reviews/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Booking from "@/models/Booking";
import Driver from "@/models/Driver";
import GarageReview from "@/models/GarageReview";
import DriverReview from "@/models/DriverReview";
import { withRateLimit, RATE_LIMITS } from "@/lib/rateLimit";
import { sanitizeString } from "@/lib/validation";
import { logger } from "@/lib/logger";
import mongoose from "mongoose";

// Helper: Validate email format
function isValidEmail(email: string): boolean {
  if (!email || typeof email !== "string") return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

// Helper: Sanitize HTML content
function sanitizeHtml(input: string, maxLength: number = 2000): string {
  if (!input || typeof input !== "string") return "";
  let sanitized = input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, "");
  const dangerousTags = ["script", "iframe", "object", "embed", "form", "input", "button"];
  dangerousTags.forEach((tag) => {
    const regex = new RegExp(`<${tag}[^>]*>.*?</${tag}>|<${tag}[^>]*/>|<${tag}[^>]*>`, "gi");
    sanitized = sanitized.replace(regex, "");
  });
  sanitized = sanitized.replace(/javascript:/gi, "");
  sanitized = sanitized.replace(/data:/gi, "");
  return sanitized.trim().slice(0, maxLength);
}

// POST /api/reviews - Submit a new review (garage or driver)
export async function POST(request: NextRequest) {
  // Rate limit review submissions
  const rateLimit = withRateLimit(request, RATE_LIMITS.form, "review-submit");
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rateLimit.resetIn / 1000)) } }
    );
  }

  try {
    const session = await getServerSession(authOptions);
    const body = await request.json();

    const {
      bookingId,
      type = "garage", // "garage" or "driver"
      overallRating,
      ratingBreakdown,
      title,
      content,
      // For guest reviews
      email,
      name,
    } = body;

    // Validate required fields
    if (!bookingId || !mongoose.Types.ObjectId.isValid(bookingId)) {
      return NextResponse.json({ error: "Valid booking ID is required" }, { status: 400 });
    }

    if (!overallRating || overallRating < 1 || overallRating > 5) {
      return NextResponse.json({ error: "Rating must be between 1 and 5" }, { status: 400 });
    }

    if (!ratingBreakdown) {
      return NextResponse.json({ error: "Rating breakdown is required" }, { status: 400 });
    }

    if (!content || content.trim().length < 10) {
      return NextResponse.json(
        { error: "Review content must be at least 10 characters" },
        { status: 400 }
      );
    }

    await connectDB();

    // Get the booking
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Verify the booking is completed
    if (booking.status !== "completed") {
      return NextResponse.json(
        { error: "Reviews can only be submitted for completed bookings" },
        { status: 400 }
      );
    }

    // Verify the user owns this booking
    let customerEmail: string;
    let customerName: string;
    let customerId: mongoose.Types.ObjectId | undefined;

    if (session?.user) {
      // Authenticated user
      if (booking.userId?.toString() !== session.user.id && booking.userEmail !== session.user.email) {
        return NextResponse.json({ error: "You cannot review this booking" }, { status: 403 });
      }
      customerEmail = session.user.email || booking.userEmail;
      customerName = session.user.username || booking.userName;
      customerId = new mongoose.Types.ObjectId(session.user.id);
    } else {
      // Guest review - verify email matches booking
      if (!email || !isValidEmail(email)) {
        return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
      }
      if (email.toLowerCase() !== booking.userEmail.toLowerCase()) {
        return NextResponse.json({ error: "Email does not match booking" }, { status: 403 });
      }
      if (!name || name.trim().length < 2) {
        return NextResponse.json({ error: "Name is required" }, { status: 400 });
      }
      customerEmail = email.toLowerCase();
      customerName = sanitizeString(name, 100);
    }

    // Handle based on review type
    if (type === "driver") {
      // Driver review validation
      const { professionalism, punctuality, communication, vehicleCare } = ratingBreakdown;
      if (
        !professionalism || professionalism < 1 || professionalism > 5 ||
        !punctuality || punctuality < 1 || punctuality > 5 ||
        !communication || communication < 1 || communication > 5 ||
        !vehicleCare || vehicleCare < 1 || vehicleCare > 5
      ) {
        return NextResponse.json(
          { error: "All rating categories must be between 1 and 5" },
          { status: 400 }
        );
      }

      // Verify driver exists for this booking
      if (!booking.assignedDriverId) {
        return NextResponse.json(
          { error: "No driver assigned to this booking" },
          { status: 400 }
        );
      }

      // Check if driver review already exists
      const existingDriverReview = await DriverReview.findOne({
        bookingId,
        driverId: booking.assignedDriverId,
      });
      if (existingDriverReview) {
        return NextResponse.json(
          { error: "A driver review has already been submitted for this booking" },
          { status: 400 }
        );
      }

      // Create driver review
      const driverReview = await DriverReview.create({
        driverId: booking.assignedDriverId,
        bookingId: booking._id,
        customerId,
        customerEmail,
        customerName,
        overallRating: Math.round(overallRating),
        ratingBreakdown: {
          professionalism: Math.round(professionalism),
          punctuality: Math.round(punctuality),
          communication: Math.round(communication),
          vehicleCare: Math.round(vehicleCare),
        },
        content: sanitizeHtml(content, 1000),
        isVerifiedPurchase: true,
        status: "approved", // Auto-approve driver reviews
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Update driver metrics
      const driver = await Driver.findById(booking.assignedDriverId);
      if (driver) {
        const metrics = driver.metrics || {
          totalJobs: 0,
          completedJobs: 0,
          cancelledJobs: 0,
          averageRating: 0,
          totalRatings: 0,
        };

        const newTotalRatings = metrics.totalRatings + 1;
        const newAverageRating =
          (metrics.averageRating * metrics.totalRatings + overallRating) / newTotalRatings;

        driver.metrics = {
          ...metrics,
          averageRating: Math.round(newAverageRating * 10) / 10,
          totalRatings: newTotalRatings,
        };

        await driver.save();
      }

      logger.info("Driver review submitted", {
        reviewId: driverReview._id,
        driverId: booking.assignedDriverId,
        rating: overallRating,
      });

      return NextResponse.json({
        success: true,
        message: "Driver review submitted successfully.",
        reviewId: driverReview._id,
      });
    } else {
      // Garage review validation
      const { quality, communication, timeliness, value } = ratingBreakdown;
      if (
        !quality || quality < 1 || quality > 5 ||
        !communication || communication < 1 || communication > 5 ||
        !timeliness || timeliness < 1 || timeliness > 5 ||
        !value || value < 1 || value > 5
      ) {
        return NextResponse.json(
          { error: "All rating categories must be between 1 and 5" },
          { status: 400 }
        );
      }

      // Check if garage review already exists
      const existingReview = await GarageReview.findOne({ bookingId });
      if (existingReview) {
        return NextResponse.json(
          { error: "A garage review has already been submitted for this booking" },
          { status: 400 }
        );
      }

      // Verify garage exists
      if (!booking.assignedGarageId) {
        return NextResponse.json(
          { error: "No garage assigned to this booking" },
          { status: 400 }
        );
      }

      // Create the garage review
      const review = await GarageReview.create({
        garageId: booking.assignedGarageId,
        bookingId: booking._id,
        customerId,
        customerEmail,
        customerName,
        overallRating: Math.round(overallRating),
        ratingBreakdown: {
          quality: Math.round(quality),
          communication: Math.round(communication),
          timeliness: Math.round(timeliness),
          value: Math.round(value),
        },
        title: title ? sanitizeString(title, 100) : undefined,
        content: sanitizeHtml(content, 2000),
        serviceType: booking.serviceType,
        vehicleType: booking.vehicleState,
        isVerifiedPurchase: true,
        status: "pending", // Garage reviews need moderation
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      logger.info("Garage review submitted", {
        reviewId: review._id,
        garageId: booking.assignedGarageId,
        rating: overallRating,
      });

      return NextResponse.json({
        success: true,
        message: "Review submitted successfully. It will be visible after moderation.",
        reviewId: review._id,
      });
    }
  } catch (error) {
    logger.error("Error submitting review", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json(
      { error: "Failed to submit review" },
      { status: 500 }
    );
  }
}

// GET /api/reviews - Get reviews for a garage or driver
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const garageId = searchParams.get("garageId");
    const driverId = searchParams.get("driverId");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 50);
    const sortBy = searchParams.get("sortBy") || "recent";

    if (!garageId && !driverId) {
      return NextResponse.json({ error: "garageId or driverId is required" }, { status: 400 });
    }

    await connectDB();

    if (driverId) {
      // Get driver reviews
      if (!mongoose.Types.ObjectId.isValid(driverId)) {
        return NextResponse.json({ error: "Invalid driver ID" }, { status: 400 });
      }

      const query = {
        driverId: new mongoose.Types.ObjectId(driverId),
        status: "approved",
      };

      let sortOrder: Record<string, 1 | -1> = { createdAt: -1 };
      if (sortBy === "highest") sortOrder = { overallRating: -1, createdAt: -1 };
      else if (sortBy === "lowest") sortOrder = { overallRating: 1, createdAt: -1 };

      const [reviews, total] = await Promise.all([
        DriverReview.find(query)
          .sort(sortOrder)
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),
        DriverReview.countDocuments(query),
      ]);

      const formattedReviews = reviews.map((review) => ({
        id: review._id,
        customerName: review.customerName,
        overallRating: review.overallRating,
        ratingBreakdown: review.ratingBreakdown,
        content: review.content,
        isVerifiedPurchase: review.isVerifiedPurchase,
        createdAt: review.createdAt,
      }));

      return NextResponse.json({
        success: true,
        reviews: formattedReviews,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      });
    } else {
      // Get garage reviews (existing logic)
      if (!mongoose.Types.ObjectId.isValid(garageId!)) {
        return NextResponse.json({ error: "Invalid garage ID" }, { status: 400 });
      }

      const query = {
        garageId: new mongoose.Types.ObjectId(garageId!),
        status: "approved",
      };

      let sortOrder: Record<string, 1 | -1> = { createdAt: -1 };
      if (sortBy === "highest") sortOrder = { overallRating: -1, createdAt: -1 };
      else if (sortBy === "lowest") sortOrder = { overallRating: 1, createdAt: -1 };
      else if (sortBy === "helpful") sortOrder = { helpfulCount: -1, createdAt: -1 };

      const [reviews, total] = await Promise.all([
        GarageReview.find(query)
          .sort(sortOrder)
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),
        GarageReview.countDocuments(query),
      ]);

      const formattedReviews = reviews.map((review) => ({
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

      return NextResponse.json({
        success: true,
        reviews: formattedReviews,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      });
    }
  } catch (error) {
    logger.error("Error fetching reviews", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json(
      { error: "Failed to fetch reviews" },
      { status: 500 }
    );
  }
}
