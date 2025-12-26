// src/app/api/garage/bookings/[id]/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import Garage from "@/models/Garage";
import Booking from "@/models/Booking";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET - Fetch single booking details
export async function GET(request: Request, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await context.params;

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "garage") {
      return NextResponse.json({ error: "Not a garage user" }, { status: 403 });
    }

    await connectDB();

    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const garage = await Garage.findOne({ userId: user._id });
    if (!garage) {
      return NextResponse.json({ error: "Garage profile not found" }, { status: 404 });
    }

    const booking = await Booking.findById(id);
    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Check if this booking is accessible to this garage
    // (either assigned to them or unassigned/new)
    const isAssigned = booking.assignedGarageId?.toString() === garage._id.toString();
    const isNew = !booking.assignedGarageId || booking.garageStatus === "new";

    if (!isAssigned && !isNew) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    return NextResponse.json({ booking });
  } catch (error) {
    console.error("Error fetching booking:", error);
    return NextResponse.json(
      { error: "Failed to fetch booking" },
      { status: 500 }
    );
  }
}

// PATCH - Update booking status (accept/decline)
export async function PATCH(request: Request, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await context.params;

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "garage") {
      return NextResponse.json({ error: "Not a garage user" }, { status: 403 });
    }

    const body = await request.json();
    const { action, notes } = body;

    if (!action || !["accept", "decline", "complete", "start"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Must be 'accept', 'decline', 'start', or 'complete'" },
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
      return NextResponse.json({ error: "Garage profile not found" }, { status: 404 });
    }

    // Only approved garages can take actions
    if (garage.status !== "approved") {
      return NextResponse.json(
        { error: "Your garage must be approved to take actions on bookings" },
        { status: 403 }
      );
    }

    const booking = await Booking.findById(id);
    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Check permissions based on action
    const isAssigned = booking.assignedGarageId?.toString() === garage._id.toString();
    const isNew = !booking.assignedGarageId || booking.garageStatus === "new";

    // Define valid state transitions
    interface UpdateData {
      garageStatus?: string;
      assignedGarageId?: string;
      garageNotes?: string;
      garageAcceptedAt?: Date;
      garageCompletedAt?: Date;
      status?: string;
      currentStage?: string;
    }

    const updateData: UpdateData = {};

    switch (action) {
      case "accept":
        // Can only accept new/unassigned bookings
        if (!isNew && !isAssigned) {
          return NextResponse.json(
            { error: "This booking is already assigned to another garage" },
            { status: 400 }
          );
        }
        if (booking.garageStatus === "accepted" && isAssigned) {
          return NextResponse.json(
            { error: "You have already accepted this booking" },
            { status: 400 }
          );
        }
        updateData.garageStatus = "accepted";
        updateData.assignedGarageId = garage._id.toString();
        updateData.garageAcceptedAt = new Date();
        if (notes) updateData.garageNotes = notes;
        break;

      case "decline":
        // Can decline if new or if it's assigned to them
        if (!isNew && !isAssigned) {
          return NextResponse.json(
            { error: "You cannot decline a booking assigned to another garage" },
            { status: 400 }
          );
        }
        updateData.garageStatus = "declined";
        // If was assigned to this garage, unassign
        if (isAssigned) {
          updateData.assignedGarageId = undefined;
        }
        if (notes) updateData.garageNotes = notes;
        break;

      case "start":
        // Can only start if accepted and assigned to this garage
        if (!isAssigned) {
          return NextResponse.json(
            { error: "You can only start work on bookings assigned to you" },
            { status: 400 }
          );
        }
        if (booking.garageStatus !== "accepted") {
          return NextResponse.json(
            { error: "You must accept the booking before starting work" },
            { status: 400 }
          );
        }
        updateData.garageStatus = "in_progress";
        updateData.status = "in_progress";
        updateData.currentStage = "service_in_progress";
        if (notes) updateData.garageNotes = notes;
        break;

      case "complete":
        // Can only complete if in_progress and assigned to this garage
        if (!isAssigned) {
          return NextResponse.json(
            { error: "You can only complete bookings assigned to you" },
            { status: 400 }
          );
        }
        if (booking.garageStatus !== "in_progress") {
          return NextResponse.json(
            { error: "Booking must be in progress to mark as complete" },
            { status: 400 }
          );
        }
        updateData.garageStatus = "completed";
        updateData.garageCompletedAt = new Date();
        if (notes) updateData.garageNotes = notes;
        break;
    }

    // Add update to booking history
    const update = {
      stage: `garage_${action}`,
      timestamp: new Date(),
      message: `Booking ${action}ed by ${garage.businessName}`,
      updatedBy: garage.businessName,
    };

    const updatedBooking = await Booking.findByIdAndUpdate(
      id,
      {
        $set: updateData,
        $push: { updates: update },
      },
      { new: true }
    );

    return NextResponse.json({
      message: `Booking ${action}ed successfully`,
      booking: updatedBooking,
    });
  } catch (error) {
    console.error("Error updating booking:", error);
    return NextResponse.json(
      { error: "Failed to update booking" },
      { status: 500 }
    );
  }
}
