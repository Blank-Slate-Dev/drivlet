// src/app/api/bookings/feedback/route.ts
// Post-delivery customer feedback: star rating + "how did you hear about us"
// + comments. One submission per booking. Works for completed bookings (the
// normal track endpoint 410s once a booking completes, so this validates
// credentials itself).
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Booking from "@/models/Booking";
import { isValidTrackingCodeFormat } from "@/lib/trackingCode";
import { withRateLimit, RATE_LIMITS } from "@/lib/rateLimit";

const HEAR_ABOUT_OPTIONS = [
  "Google search",
  "Facebook / Instagram",
  "Word of mouth",
  "Flyer / letterbox",
  "Repeat customer",
  "Other",
];

export async function POST(request: NextRequest) {
  const rateLimitResult = withRateLimit(request, RATE_LIMITS.auth, "booking-feedback");
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { code, email, rego, rating, hearAboutUs, comments } = body as {
    code?: string;
    email?: string;
    rego?: string;
    rating?: number;
    hearAboutUs?: string;
    comments?: string;
  };

  if (!code || !email || !rego) {
    return NextResponse.json(
      { error: "Tracking code, email, and registration are required" },
      { status: 400 }
    );
  }

  const numericRating = Number(rating);
  if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
    return NextResponse.json(
      { error: "Please choose a star rating between 1 and 5" },
      { status: 400 }
    );
  }

  const upperCode = code.toUpperCase().trim();
  if (!isValidTrackingCodeFormat(upperCode)) {
    return NextResponse.json({ error: "Invalid tracking code format" }, { status: 400 });
  }

  const cleanHearAbout =
    typeof hearAboutUs === "string" && HEAR_ABOUT_OPTIONS.includes(hearAboutUs)
      ? hearAboutUs
      : typeof hearAboutUs === "string" && hearAboutUs.trim()
        ? hearAboutUs.trim().slice(0, 100)
        : undefined;
  const cleanComments =
    typeof comments === "string" && comments.trim()
      ? comments.trim().slice(0, 2000)
      : undefined;

  try {
    await connectDB();

    const booking = await Booking.findOne({
      trackingCode: upperCode,
      userEmail: email.toLowerCase().trim(),
      vehicleRegistration: rego.toUpperCase().trim(),
    });

    if (!booking) {
      return NextResponse.json(
        { error: "No booking found. Please check your details." },
        { status: 404 }
      );
    }

    // Feedback only makes sense once the car has been delivered
    if (booking.currentStage !== "delivered" && booking.status !== "completed") {
      return NextResponse.json(
        { error: "Feedback opens once your vehicle has been delivered." },
        { status: 400 }
      );
    }

    if (booking.feedback?.rating) {
      return NextResponse.json(
        { error: "Thanks — feedback for this booking has already been submitted." },
        { status: 409 }
      );
    }

    booking.feedback = {
      rating: numericRating,
      hearAboutUs: cleanHearAbout,
      comments: cleanComments,
      submittedAt: new Date(),
    };
    booking.updates.push({
      stage: "delivered",
      timestamp: new Date(),
      message: `Customer left feedback: ${numericRating}/5 stars${cleanHearAbout ? ` · heard about us via ${cleanHearAbout}` : ""}${cleanComments ? ` — "${cleanComments.slice(0, 140)}${cleanComments.length > 140 ? "…" : ""}"` : ""}`,
      updatedBy: "customer",
    });
    await booking.save();

    return NextResponse.json({
      success: true,
      message: "Thanks for your feedback!",
    });
  } catch (error) {
    console.error("Error saving booking feedback:", error);
    return NextResponse.json(
      { error: "Failed to save feedback" },
      { status: 500 }
    );
  }
}
