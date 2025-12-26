// src/app/api/garage/acknowledge-booking/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import Garage from "@/models/Garage";
import Booking from "@/models/Booking";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "garage") {
      return NextResponse.json({ error: "Not a garage user" }, { status: 403 });
    }

    const { bookingId } = await request.json();

    if (!bookingId) {
      return NextResponse.json(
        { error: "Booking ID is required" },
        { status: 400 }
      );
    }

    await connectDB();

    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const garage = await Garage.findOne({ userId: user._id });
    if (!garage) {
      return NextResponse.json(
        { error: "Garage profile not found" },
        { status: 404 }
      );
    }

    // Only approved garages can acknowledge
    if (garage.status !== "approved") {
      return NextResponse.json(
        { error: "Garage must be approved to acknowledge bookings" },
        { status: 403 }
      );
    }

    // Find the booking
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Verify this booking belongs to this garage
    const linkedPlaceId = garage.linkedGaragePlaceId || "";
    const linkedGarageName = garage.linkedGarageName || "";

    const isAssigned =
      booking.assignedGarageId?.toString() === garage._id.toString();
    const matchesPlaceId =
      linkedPlaceId && booking.garagePlaceId === linkedPlaceId;
    const matchesName =
      linkedGarageName &&
      booking.garageName?.toLowerCase().includes(linkedGarageName.toLowerCase());

    if (!isAssigned && !matchesPlaceId && !matchesName) {
      return NextResponse.json(
        { error: "This booking is not assigned to your garage" },
        { status: 403 }
      );
    }

    // Update booking to acknowledged status
    const now = new Date();
    await Booking.findByIdAndUpdate(bookingId, {
      $set: {
        garageStatus: "acknowledged",
        assignedGarageId: garage._id, // Ensure it's assigned
        assignedAt: booking.assignedAt || now,
        updatedAt: now,
      },
      $push: {
        updates: {
          stage: "garage_acknowledged",
          timestamp: now,
          message: `${garage.businessName} has acknowledged this booking`,
          updatedBy: user._id.toString(),
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Booking acknowledged successfully",
    });
  } catch (error) {
    console.error("Error acknowledging booking:", error);
    return NextResponse.json(
      { error: "Failed to acknowledge booking" },
      { status: 500 }
    );
  }
}
