// src/app/api/admin/bookings/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Booking, { JourneyStage } from "@/models/Booking";
import { requireAdmin } from "@/lib/admin";

interface RouteParams {
  params: Promise<{ id: string }>;
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
        lastUpdatedBy: adminCheck.session?.user.id,
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
      const stages: JourneyStage[] = [
        "Booking Confirmed",
        "Driver En Route To You",
        "Car Picked Up",
        "At Garage",
        "Service In Progress",
        "Driver En Route Back",
        "Delivered",
      ];

      const stageIndex = stages.indexOf(data.currentStage);
      if (stageIndex === -1) {
        return NextResponse.json(
          { error: "Invalid stage" },
          { status: 400 }
        );
      }

      // Update currentStage
      booking.currentStage = data.currentStage;

      // Calculate and update progress
      booking.overallProgress = Math.round(((stageIndex + 1) / stages.length) * 100);

      // Update journey events
      booking.journeyEvents = booking.journeyEvents.map((event, index) => ({
        ...event,
        completed: index <= stageIndex,
        timestamp: index <= stageIndex && !event.timestamp ? new Date() : event.timestamp,
      }));

      // Update status based on stage
      if (data.currentStage === "Delivered") {
        booking.status = "completed";
      } else if (stageIndex > 0) {
        booking.status = "active";
      }
    }

    // Update other fields if provided
    if (data.statusMessage !== undefined) {
      booking.statusMessage = data.statusMessage;
    }

    if (data.adminNotes !== undefined) {
      booking.adminNotes = data.adminNotes;
    }

    if (data.etaToGarage !== undefined) {
      booking.etaToGarage = data.etaToGarage ? new Date(data.etaToGarage) : undefined;
    }

    if (data.etaReturn !== undefined) {
      booking.etaReturn = data.etaReturn ? new Date(data.etaReturn) : undefined;
    }

    if (data.garageName !== undefined) {
      booking.garageName = data.garageName;
    }

    if (data.garageAddress !== undefined) {
      booking.garageAddress = data.garageAddress;
    }

    if (data.status !== undefined) {
      booking.status = data.status;
    }

    // Update event notes if provided
    if (data.eventNotes && typeof data.eventNotes === "object") {
      for (const [stage, notes] of Object.entries(data.eventNotes)) {
        const eventIndex = booking.journeyEvents.findIndex(e => e.stage === stage);
        if (eventIndex !== -1) {
          booking.journeyEvents[eventIndex].notes = notes as string;
        }
      }
    }

    booking.lastUpdatedBy = adminCheck.session?.user.id;
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
