// src/app/api/bookings/track/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Booking from "@/models/Booking";
import { withRateLimit, RATE_LIMITS } from "@/lib/rateLimit";

// POST /api/bookings/track - Track booking by email and vehicle registration
export async function POST(request: NextRequest) {
  // Apply rate limiting - prevent enumeration attacks
  const rateLimit = withRateLimit(request, RATE_LIMITS.form, "track");
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil(rateLimit.resetIn / 1000)),
        },
      }
    );
  }

  try {
    const body = await request.json();
    const { email, registration } = body;

    if (!email || !registration) {
      return NextResponse.json(
        { error: "Email and vehicle registration are required" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Validate registration format (basic alphanumeric, 2-10 chars)
    const regClean = registration.trim().toUpperCase();
    if (!/^[A-Z0-9]{2,10}$/.test(regClean)) {
      return NextResponse.json(
        { error: "Invalid vehicle registration format" },
        { status: 400 }
      );
    }

    await connectDB();

    // SECURITY FIX: Use exact string matching instead of regex
    // This prevents NoSQL injection and ReDoS attacks
    const booking = await Booking.findOne({
      userEmail: email.toLowerCase().trim(),
      vehicleRegistration: regClean,
    })
      .sort({ createdAt: -1 })
      .select("-__v")
      .lean();

    if (!booking) {
      return NextResponse.json(
        { error: "No booking found with this email and registration" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      booking: {
        _id: booking._id,
        vehicleRegistration: booking.vehicleRegistration,
        vehicleState: booking.vehicleState,
        serviceType: booking.serviceType,
        pickupAddress: booking.pickupAddress,
        pickupTime: booking.pickupTime,
        dropoffTime: booking.dropoffTime,
        currentStage: booking.currentStage,
        overallProgress: booking.overallProgress,
        status: booking.status,
        hasExistingBooking: booking.hasExistingBooking,
        garageName: booking.garageName,
        paymentStatus: booking.paymentStatus,
        updates: booking.updates,
        createdAt: booking.createdAt,
        updatedAt: booking.updatedAt,
      },
    });
  } catch (error) {
    console.error("Error fetching booking:", error);
    return NextResponse.json(
      { error: "Failed to fetch booking" },
      { status: 500 }
    );
  }
}