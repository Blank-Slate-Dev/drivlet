// src/app/api/bookings/[id]/review-info/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Booking from "@/models/Booking";
import Garage from "@/models/Garage";
import GarageReview from "@/models/GarageReview";
import User from "@/models/User";
import mongoose from "mongoose";
import { logger } from "@/lib/logger";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/bookings/[id]/review-info - Get booking info for review page
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid booking ID" }, { status: 400 });
    }

    // Get session - authentication required
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    await connectDB();

    const booking = await Booking.findById(id).lean();

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Authorization check - user must be the booking owner or admin
    const user = await User.findById(session.user.id).lean();
    const isAdmin = user?.role === "admin";
    const isOwner =
      booking.userId?.toString() === session.user.id ||
      booking.userEmail?.toLowerCase() === session.user.email?.toLowerCase();

    if (!isAdmin && !isOwner) {
      return NextResponse.json(
        { error: "You are not authorized to view this booking" },
        { status: 403 }
      );
    }

    // Check if booking is completed
    if (booking.status !== "completed") {
      return NextResponse.json(
        { error: "Reviews can only be submitted for completed bookings" },
        { status: 400 }
      );
    }

    // Check if review already exists
    const existingReview = await GarageReview.findOne({ bookingId: id });

    // Get garage name if assigned
    let garageName = booking.garageName;
    if (booking.assignedGarageId) {
      const garage = await Garage.findById(booking.assignedGarageId).lean();
      if (garage) {
        garageName = garage.businessName;
      }
    }

    return NextResponse.json({
      success: true,
      booking: {
        _id: booking._id,
        userName: booking.userName,
        userEmail: booking.userEmail,
        serviceType: booking.serviceType,
        garageName,
        vehicleRegistration: booking.vehicleRegistration,
        completedAt: booking.garageCompletedAt || booking.updatedAt,
        hasReview: !!existingReview,
      },
    });
  } catch (error) {
    logger.error("Error fetching booking review info", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json(
      { error: "Failed to fetch booking information" },
      { status: 500 }
    );
  }
}
