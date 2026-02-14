// src/app/api/admin/bookings/[id]/assign-driver/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { connectDB } from "@/lib/mongodb";
import Booking from "@/models/Booking";
import Driver from "@/models/Driver";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/admin/bookings/[id]/assign-driver - Assign a driver to a leg
export async function POST(request: NextRequest, { params }: RouteParams) {
  const adminCheck = await requireAdmin();
  if (!adminCheck.authorized) return adminCheck.response;

  try {
    const { id } = await params;
    const { driverId, leg } = await request.json();

    if (!driverId || !leg) {
      return NextResponse.json(
        { error: "Driver ID and leg are required" },
        { status: 400 }
      );
    }

    if (leg !== "pickup" && leg !== "return") {
      return NextResponse.json(
        { error: "Leg must be 'pickup' or 'return'" },
        { status: 400 }
      );
    }

    await connectDB();

    const booking = await Booking.findById(id);
    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const driver = await Driver.findById(driverId);
    if (!driver) {
      return NextResponse.json({ error: "Driver not found" }, { status: 404 });
    }

    // Verify driver can accept jobs
    if (!driver.canAcceptJobs) {
      return NextResponse.json(
        { error: "This driver cannot accept jobs. Check their onboarding status." },
        { status: 400 }
      );
    }

    const now = new Date();
    const fieldPath = leg === "return" ? "returnDriver" : "pickupDriver";

    // For return leg, check if pickup is complete and payment received
    if (leg === "return") {
      if (!booking.pickupDriver?.completedAt) {
        return NextResponse.json(
          { error: "Cannot assign return driver before pickup is complete" },
          { status: 400 }
        );
      }
      if (booking.servicePaymentStatus !== "paid") {
        return NextResponse.json(
          { error: "Cannot assign return driver before service payment is received" },
          { status: 400 }
        );
      }
    }

    // Check if leg already has a driver
    const existingDriver = leg === "return" ? booking.returnDriver : booking.pickupDriver;
    if (existingDriver) {
      return NextResponse.json(
        { error: `${leg === "return" ? "Return" : "Pickup"} driver is already assigned. Unassign first.` },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {
      [fieldPath]: {
        driverId: driver._id,
        assignedAt: now,
        acceptedAt: now, // Admin-assigned = auto-accepted
      },
    };

    // For pickup leg, also set legacy fields for backwards compatibility
    if (leg === "pickup") {
      updateData.assignedDriverId = driver._id;
      updateData.driverAssignedAt = now;
      updateData.driverAcceptedAt = now;
    }

    await Booking.findByIdAndUpdate(id, {
      $set: updateData,
      $push: {
        updates: {
          stage: `${leg}_driver_assigned`,
          timestamp: now,
          message: `Admin assigned ${driver.firstName} ${driver.lastName} as ${leg} driver.`,
          updatedBy: adminCheck.session?.user?.id,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: `${leg === "return" ? "Return" : "Pickup"} driver assigned successfully`,
      driver: {
        _id: driver._id,
        firstName: driver.firstName,
        lastName: driver.lastName,
      },
    });
  } catch (error) {
    console.error("Error assigning driver:", error);
    return NextResponse.json(
      { error: "Failed to assign driver" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/bookings/[id]/assign-driver - Unassign a driver from a leg
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const adminCheck = await requireAdmin();
  if (!adminCheck.authorized) return adminCheck.response;

  try {
    const { id } = await params;
    const { leg } = await request.json();

    if (!leg) {
      return NextResponse.json(
        { error: "Leg is required" },
        { status: 400 }
      );
    }

    if (leg !== "pickup" && leg !== "return") {
      return NextResponse.json(
        { error: "Leg must be 'pickup' or 'return'" },
        { status: 400 }
      );
    }

    await connectDB();

    const booking = await Booking.findById(id);
    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const fieldPath = leg === "return" ? "returnDriver" : "pickupDriver";
    const existingDriver = leg === "return" ? booking.returnDriver : booking.pickupDriver;

    if (!existingDriver) {
      return NextResponse.json(
        { error: `No ${leg} driver assigned` },
        { status: 400 }
      );
    }

    // Don't allow unassigning if leg is already in progress or completed
    if (existingDriver.startedAt) {
      return NextResponse.json(
        { error: `Cannot unassign ${leg} driver after leg has started` },
        { status: 400 }
      );
    }

    const now = new Date();
    const unsetData: Record<string, number> = {
      [fieldPath]: 1,
    };

    // For pickup leg, also clear legacy fields
    if (leg === "pickup") {
      unsetData.assignedDriverId = 1;
      unsetData.driverAssignedAt = 1;
      unsetData.driverAcceptedAt = 1;
    }

    await Booking.findByIdAndUpdate(id, {
      $unset: unsetData,
      $push: {
        updates: {
          stage: `${leg}_driver_unassigned`,
          timestamp: now,
          message: `Admin unassigned ${leg} driver.`,
          updatedBy: adminCheck.session?.user?.id,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: `${leg === "return" ? "Return" : "Pickup"} driver unassigned successfully`,
    });
  } catch (error) {
    console.error("Error unassigning driver:", error);
    return NextResponse.json(
      { error: "Failed to unassign driver" },
      { status: 500 }
    );
  }
}
