// src/app/api/bookings/track/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Booking from "@/models/Booking";

// GET /api/bookings/track - Track booking by email and vehicle registration
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email");
  const registration = searchParams.get("registration");

  if (!email || !registration) {
    return NextResponse.json(
      { error: "Email and vehicle registration are required" },
      { status: 400 }
    );
  }

  try {
    await connectDB();

    // Find booking by email and registration (case insensitive)
    const booking = await Booking.findOne({
      userEmail: { $regex: new RegExp(`^${email}$`, "i") },
      vehicleRegistration: { $regex: new RegExp(`^${registration}$`, "i") },
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

    // Return sanitized booking data (no sensitive info)
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

// POST /api/bookings/track - Alternative method with body
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, registration } = body;

    if (!email || !registration) {
      return NextResponse.json(
        { error: "Email and vehicle registration are required" },
        { status: 400 }
      );
    }

    await connectDB();

    // Find the most recent booking by email and registration
    const booking = await Booking.findOne({
      userEmail: { $regex: new RegExp(`^${email}$`, "i") },
      vehicleRegistration: { $regex: new RegExp(`^${registration}$`, "i") },
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
