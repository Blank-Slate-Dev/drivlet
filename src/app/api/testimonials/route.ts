// src/app/api/testimonials/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Testimonial from "@/models/Testimonial";
import { withRateLimit, RATE_LIMITS } from "@/lib/rateLimit";
import { sanitizeString } from "@/lib/validation";

// GET - Public: fetch displayed testimonials
export async function GET(request: NextRequest) {
  const rateLimit = withRateLimit(request, RATE_LIMITS.read, "testimonials-get");
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rateLimit.resetIn / 1000)) } }
    );
  }

  try {
    await connectDB();

    const testimonials = await Testimonial.find({
      isDisplayed: true,
      isApproved: true,
    })
      .sort({ createdAt: -1 })
      .select("customerName customerLocation rating review vehicleType serviceType createdAt")
      .lean();

    return NextResponse.json({ testimonials });
  } catch (error) {
    console.error("Error fetching testimonials:", error);
    return NextResponse.json(
      { error: "Failed to fetch testimonials" },
      { status: 500 }
    );
  }
}

// POST - Public: user submits a testimonial
export async function POST(request: NextRequest) {
  const rateLimit = withRateLimit(request, RATE_LIMITS.form, "testimonials-post");
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rateLimit.resetIn / 1000)) } }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const { customerName, customerLocation, rating, review, vehicleType, serviceType } = body;

    if (!customerName || !rating || !review) {
      return NextResponse.json(
        { error: "Name, rating, and review are required" },
        { status: 400 }
      );
    }

    if (typeof customerName !== "string" || customerName.length > 100) {
      return NextResponse.json({ error: "Name cannot exceed 100 characters" }, { status: 400 });
    }

    const parsedRating = Number(rating);
    if (!Number.isInteger(parsedRating) || parsedRating < 1 || parsedRating > 5) {
      return NextResponse.json({ error: "Rating must be between 1 and 5" }, { status: 400 });
    }

    if (typeof review !== "string" || review.length > 500) {
      return NextResponse.json({ error: "Review cannot exceed 500 characters" }, { status: 400 });
    }

    if (customerLocation && (typeof customerLocation !== "string" || customerLocation.length > 100)) {
      return NextResponse.json({ error: "Location cannot exceed 100 characters" }, { status: 400 });
    }

    if (vehicleType && (typeof vehicleType !== "string" || vehicleType.length > 50)) {
      return NextResponse.json({ error: "Vehicle type cannot exceed 50 characters" }, { status: 400 });
    }

    if (serviceType && (typeof serviceType !== "string" || serviceType.length > 100)) {
      return NextResponse.json({ error: "Service type cannot exceed 100 characters" }, { status: 400 });
    }

    await connectDB();

    const testimonial = new Testimonial({
      customerName: sanitizeString(customerName, 100),
      customerLocation: customerLocation ? sanitizeString(customerLocation, 100) : undefined,
      rating: parsedRating,
      review: sanitizeString(review, 500),
      vehicleType: vehicleType ? sanitizeString(vehicleType, 50) : undefined,
      serviceType: serviceType ? sanitizeString(serviceType, 100) : undefined,
      source: "user_submitted",
      isApproved: false,
      isDisplayed: false,
    });

    await testimonial.save();

    return NextResponse.json(
      { success: true, message: "Testimonial submitted for review" },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error submitting testimonial:", error);
    return NextResponse.json(
      { error: "Failed to submit testimonial" },
      { status: 500 }
    );
  }
}
