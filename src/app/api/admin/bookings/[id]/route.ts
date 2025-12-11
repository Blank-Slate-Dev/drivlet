// src/app/api/admin/bookings/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Booking from "@/models/Booking";
import { requireAdmin } from "@/lib/admin";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Stage progression for progress calculation
const STAGES = [
  "booking_confirmed",
  "driver_en_route",
  "car_picked_up",
  "at_garage",
  "service_in_progress",
  "driver_returning",
  "delivered",
];

function calculateProgress(stage: string): number {
  const stageIndex = STAGES.indexOf(stage);
  if (stageIndex === -1) return 14;
  return Math.round(((stageIndex + 1) / STAGES.length) * 100);
}

// GET /api/admin/bookings/[id] - Get single booking
export async function GET(request: NextRequest, { params }: RouteParams) {
  const adminCheck = await requireAdmin();
  if (!adminCheck.authorized) {
    return adminCheck.response;
  }

  try {
    await connectDB();
    const { id } = await params;

    const booking = await Booking.findById(id).lean();

    if (!booking) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(booking);
  } catch (error) {
    console.error("Error fetching booking:", error);
    return NextResponse.json(
      { error: "Failed to fetch booking" },
      { status: 500 }
    );
  }
}

// PUT /api/admin/bookings/[id] - Update entire booking
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const adminCheck = await requireAdmin();
  if (!adminCheck.authorized) {
    return adminCheck.response;
  }

  try {
    await connectDB();
    const { id } = await params;
    const data = await request.json();

    const booking = await Booking.findByIdAndUpdate(
      id,
      {
        ...data,
        updatedAt: new Date(),
      },
      { new: true, runValidators: true }
    );

    if (!booking) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(booking);
  } catch (error) {
    console.error("Error updating booking:", error);
    return NextResponse.json(
      { error: "Failed to update booking" },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/bookings/[id] - Partial update (for progress updates)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const adminCheck = await requireAdmin();
  if (!adminCheck.authorized) {
    return adminCheck.response;
  }

  try {
    await connectDB();
    const { id } = await params;
    const data = await request.json();

    const booking = await Booking.findById(id);

    if (!booking) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    // Handle stage update with automatic progress calculation
    if (data.currentStage) {
      const stageIndex = STAGES.indexOf(data.currentStage);
      if (stageIndex === -1) {
        return NextResponse.json(
          { error: "Invalid stage" },
          { status: 400 }
        );
      }

      // Update currentStage and calculate progress
      booking.currentStage = data.currentStage;
      booking.overallProgress = calculateProgress(data.currentStage);

      // Add update entry
      booking.updates.push({
        stage: data.currentStage,
        timestamp: new Date(),
        message: data.message || `Stage updated to ${data.currentStage}`,
        updatedBy: adminCheck.session?.user.email || "admin",
      });

      // Update status based on stage
      if (data.currentStage === "delivered") {
        booking.status = "completed";
      } else if (stageIndex > 0) {
        booking.status = "in_progress";
      }
    }

    // Update other fields if provided
    if (data.status !== undefined) {
      booking.status = data.status;
    }

    if (data.pickupTime !== undefined) {
      booking.pickupTime = data.pickupTime;
    }

    if (data.dropoffTime !== undefined) {
      booking.dropoffTime = data.dropoffTime;
    }

    if (data.pickupAddress !== undefined) {
      booking.pickupAddress = data.pickupAddress;
    }

    if (data.serviceType !== undefined) {
      booking.serviceType = data.serviceType;
    }

    booking.updatedAt = new Date();
    await booking.save();

    return NextResponse.json(booking);
  } catch (error) {
    console.error("Error updating booking:", error);
    return NextResponse.json(
      { error: "Failed to update booking" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/bookings/[id] - Delete booking
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const adminCheck = await requireAdmin();
  if (!adminCheck.authorized) {
    return adminCheck.response;
  }

  try {
    await connectDB();
    const { id } = await params;

    const booking = await Booking.findByIdAndDelete(id);

    if (!booking) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Booking deleted successfully" });
  } catch (error) {
    console.error("Error deleting booking:", error);
    return NextResponse.json(
      { error: "Failed to delete booking" },
      { status: 500 }
    );
  }
}
