// src/app/api/bookings/[id]/review-info/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Booking from "@/models/Booking";
import Driver from "@/models/Driver";
import GarageReview from "@/models/GarageReview";
import DriverReview from "@/models/DriverReview";
import mongoose from "mongoose";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: bookingId } = await params;

  if (!bookingId || !mongoose.Types.ObjectId.isValid(bookingId)) {
    return NextResponse.json({ error: "Invalid booking ID" }, { status: 400 });
  }

  try {
    await connectDB();

    const booking = await Booking.findById(bookingId).lean();

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Check if garage review exists
    const existingGarageReview = await GarageReview.findOne({ bookingId }).lean();

    // Check if driver review exists
    let existingDriverReview = null;
    if (booking.assignedDriverId) {
      existingDriverReview = await DriverReview.findOne({
        bookingId,
        driverId: booking.assignedDriverId,
      }).lean();
    }

    // Get driver info if assigned
    let driverInfo = null;
    if (booking.assignedDriverId) {
      const driver = await Driver.findById(booking.assignedDriverId).lean();
      if (driver) {
        driverInfo = {
          firstName: driver.firstName,
          profilePhoto: driver.profilePhoto || null,
        };
      }
    }

    return NextResponse.json({
      booking: {
        _id: booking._id,
        userName: booking.userName,
        userEmail: booking.userEmail,
        serviceType: booking.serviceType,
        garageName: booking.garageName,
        vehicleRegistration: booking.vehicleRegistration,
        status: booking.status,
        completedAt: booking.driverCompletedAt || booking.updatedAt,
        hasReview: !!existingGarageReview,
        hasDriverReview: !!existingDriverReview,
        driver: driverInfo,
      },
    });
  } catch (error) {
    console.error("Error fetching booking review info:", error);
    return NextResponse.json(
      { error: "Failed to fetch booking information" },
      { status: 500 }
    );
  }
}
