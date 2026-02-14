// src/app/api/admin/bookings/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Booking from "@/models/Booking";
import Driver from "@/models/Driver";
import { requireAdmin } from "@/lib/admin";
import { notifyBookingUpdate } from "@/lib/emit-booking-update";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Stage progression with exact progress percentages
const STAGE_PROGRESS: Record<string, number> = {
  booking_confirmed: 14,
  driver_en_route: 28,
  car_picked_up: 42,
  at_garage: 57,
  service_in_progress: 72,
  driver_returning: 86,
  delivered: 100,
};

const STAGES = Object.keys(STAGE_PROGRESS);

// Default stage messages shown to customers
const STAGE_MESSAGES: Record<string, string> = {
  booking_confirmed: "We've locked in your pick-up and service details.",
  driver_en_route: "Your driver is on the way to collect your vehicle.",
  car_picked_up: "Your car has been picked up and is heading to the garage.",
  at_garage: "Your vehicle has arrived at the service centre.",
  service_in_progress: "Your car is being serviced by our expert mechanics.",
  driver_returning: "Service complete! Your driver is bringing your car back.",
  delivered: "Your car has been delivered. Thanks for choosing drivlet!",
};

function getStageIndex(stage: string): number {
  return STAGES.indexOf(stage);
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

    const booking = await Booking.findById(id)
      .populate("userId", "mobile")
      .lean();

    if (!booking) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    // Collect driver IDs
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const b = booking as any;
    const driverIds: string[] = [];
    if (b.pickupDriver?.driverId) {
      driverIds.push(b.pickupDriver.driverId.toString());
    }
    if (b.returnDriver?.driverId) {
      driverIds.push(b.returnDriver.driverId.toString());
    }
    if (b.assignedDriverId) {
      driverIds.push(b.assignedDriverId.toString());
    }

    // Fetch drivers
    const driverMap = new Map<string, { firstName: string; lastName: string }>();
    if (driverIds.length > 0) {
      const drivers = await Driver.find({ _id: { $in: driverIds } })
        .select("firstName lastName")
        .lean();
      drivers.forEach((driver) => {
        driverMap.set(driver._id.toString(), {
          firstName: driver.firstName,
          lastName: driver.lastName,
        });
      });
    }

    // Get driver names
    const pickupDriverId = b.pickupDriver?.driverId?.toString();
    const returnDriverId = b.returnDriver?.driverId?.toString();
    const legacyDriverId = b.assignedDriverId?.toString();

    const pickupDriverInfo = pickupDriverId ? driverMap.get(pickupDriverId) : null;
    const returnDriverInfo = returnDriverId ? driverMap.get(returnDriverId) : null;
    const legacyDriverInfo = legacyDriverId ? driverMap.get(legacyDriverId) : null;

    // Transform user info
    const userDoc = b.userId;
    const isPopulated = userDoc && typeof userDoc === "object" && "_id" in userDoc;
    const userMobile = isPopulated ? userDoc.mobile : undefined;
    const userId = isPopulated
      ? userDoc._id?.toString()
      : userDoc?.toString() || null;

    return NextResponse.json({
      ...booking,
      userId,
      userMobile,
      pickupDriverName: pickupDriverInfo
        ? `${pickupDriverInfo.firstName} ${pickupDriverInfo.lastName}`
        : null,
      returnDriverName: returnDriverInfo
        ? `${returnDriverInfo.firstName} ${returnDriverInfo.lastName}`
        : null,
      assignedDriverName: legacyDriverInfo
        ? `${legacyDriverInfo.firstName} ${legacyDriverInfo.lastName}`
        : pickupDriverInfo
        ? `${pickupDriverInfo.firstName} ${pickupDriverInfo.lastName}`
        : null,
    });
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

    const booking = await Booking.findById(id);

    if (!booking) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    // If updating stage, validate and calculate progress
    if (data.currentStage && data.currentStage !== booking.currentStage) {
      const newStageIndex = getStageIndex(data.currentStage);
      const currentStageIndex = getStageIndex(booking.currentStage);

      if (newStageIndex === -1) {
        return NextResponse.json(
          { error: "Invalid stage" },
          { status: 400 }
        );
      }

      // Check for backwards progression (unless explicitly allowed)
      if (newStageIndex < currentStageIndex && !data.allowBackwardsProgression) {
        return NextResponse.json(
          {
            error: "Cannot move to an earlier stage. Set allowBackwardsProgression: true to override.",
            currentStage: booking.currentStage,
            attemptedStage: data.currentStage
          },
          { status: 400 }
        );
      }

      booking.currentStage = data.currentStage;
      booking.overallProgress = STAGE_PROGRESS[data.currentStage];

      // Add update entry
      booking.updates.push({
        stage: data.currentStage,
        timestamp: new Date(),
        message: data.message || STAGE_MESSAGES[data.currentStage] || `Stage updated to ${data.currentStage}`,
        updatedBy: adminCheck.session.user.email || "admin",
      });

      // Auto-update status based on stage
      if (data.currentStage === "delivered") {
        booking.status = "completed";
      } else if (newStageIndex > 0) {
        booking.status = "in_progress";
      }
    }

    // Update other fields
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
    
    // Notify connected clients of the update
    notifyBookingUpdate(booking);

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
    if (data.currentStage && data.currentStage !== booking.currentStage) {
      const newStageIndex = getStageIndex(data.currentStage);
      const currentStageIndex = getStageIndex(booking.currentStage);

      if (newStageIndex === -1) {
        return NextResponse.json(
          { error: "Invalid stage" },
          { status: 400 }
        );
      }

      // Check for backwards progression (unless explicitly allowed)
      if (newStageIndex < currentStageIndex && !data.allowBackwardsProgression) {
        return NextResponse.json(
          {
            error: "Cannot move to an earlier stage",
            currentStage: booking.currentStage,
            currentStageIndex,
            attemptedStage: data.currentStage,
            attemptedStageIndex: newStageIndex,
            hint: "Set allowBackwardsProgression: true to override"
          },
          { status: 400 }
        );
      }

      // Update currentStage and calculate progress
      booking.currentStage = data.currentStage;
      booking.overallProgress = STAGE_PROGRESS[data.currentStage];

      // Add update entry with custom or default message
      const updateMessage = data.message || STAGE_MESSAGES[data.currentStage] || `Stage updated to ${data.currentStage}`;

      booking.updates.push({
        stage: data.currentStage,
        timestamp: new Date(),
        message: updateMessage,
        updatedBy: adminCheck.session.user.email || "admin",
      });

      // Auto-update status based on stage
      if (data.currentStage === "delivered") {
        booking.status = "completed";
      } else if (newStageIndex > 0 && booking.status === "pending") {
        booking.status = "in_progress";
      }
    }

    // Update status if provided (with validation)
    if (data.status !== undefined && data.status !== booking.status) {
      const validStatuses = ["pending", "in_progress", "completed", "cancelled"];
      if (!validStatuses.includes(data.status)) {
        return NextResponse.json(
          { error: "Invalid status. Must be: pending, in_progress, completed, or cancelled" },
          { status: 400 }
        );
      }

      // Add status change to updates if changing to cancelled or completed
      if (data.status === "cancelled" || data.status === "completed") {
        const statusMessage = data.status === "cancelled"
          ? (data.message || "Booking has been cancelled")
          : (data.message || "Booking has been marked as completed");

        booking.updates.push({
          stage: booking.currentStage,
          timestamp: new Date(),
          message: statusMessage,
          updatedBy: adminCheck.session.user.email || "admin",
        });
      }

      booking.status = data.status;
    }

    // Update other fields if provided
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
    
    // Notify connected clients of the update
    notifyBookingUpdate(booking);

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
