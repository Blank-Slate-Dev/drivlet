// src/app/api/garage/update-booking-status/route.ts
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

    const { bookingId, status } = await request.json();

    if (!bookingId || !status) {
      return NextResponse.json(
        { error: "Booking ID and status are required" },
        { status: 400 }
      );
    }

    // Validate status
    const validStatuses = ["in_progress", "completed"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: "Invalid status. Must be 'in_progress' or 'completed'" },
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

    // Only approved garages can update status
    if (garage.status !== "approved") {
      return NextResponse.json(
        { error: "Garage must be approved to update booking status" },
        { status: 403 }
      );
    }

    // Find the booking
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Verify this booking belongs to this garage
    if (booking.assignedGarageId?.toString() !== garage._id.toString()) {
      return NextResponse.json(
        { error: "This booking is not assigned to your garage" },
        { status: 403 }
      );
    }

    // Validate status transitions
    if (status === "in_progress") {
      if (booking.garageStatus !== "acknowledged") {
        return NextResponse.json(
          { error: "Booking must be acknowledged before starting" },
          { status: 400 }
        );
      }
    } else if (status === "completed") {
      if (booking.status !== "in_progress") {
        return NextResponse.json(
          { error: "Booking must be in progress before completing" },
          { status: 400 }
        );
      }
    }

    // Build update object
    const now = new Date();
    const updateMessage =
      status === "in_progress"
        ? `${garage.businessName} has started the service`
        : `${garage.businessName} has completed the service`;

    const updateStage =
      status === "in_progress" ? "service_started" : "service_completed";

    await Booking.findByIdAndUpdate(bookingId, {
      $set: {
        status: status,
        garageStatus: status === "completed" ? "completed" : "in_progress",
        updatedAt: now,
        ...(status === "in_progress" && { startedAt: now }),
        ...(status === "completed" && { completedAt: now }),
      },
      $push: {
        updates: {
          stage: updateStage,
          timestamp: now,
          message: updateMessage,
          updatedBy: user._id.toString(),
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: `Booking status updated to ${status}`,
    });
  } catch (error) {
    console.error("Error updating booking status:", error);
    return NextResponse.json(
      { error: "Failed to update booking status" },
      { status: 500 }
    );
  }
}
