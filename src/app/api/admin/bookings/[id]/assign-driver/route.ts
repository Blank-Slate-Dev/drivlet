// src/app/api/admin/bookings/[id]/assign-driver/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { connectDB } from "@/lib/mongodb";
import Booking from "@/models/Booking";
import Driver from "@/models/Driver";
import { requireValidOrigin } from "@/lib/validation";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/admin/bookings/[id]/assign-driver - Assign a driver to a leg
export async function POST(request: NextRequest, { params }: RouteParams) {
  const adminCheck = await requireAdmin();
  if (!adminCheck.authorized) return adminCheck.response;

  const originCheck = requireValidOrigin(request);
  if (!originCheck.valid) {
    return NextResponse.json({ error: originCheck.error }, { status: 403 });
  }

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

    // Return leg: match the dispatch board's rules — a pickup driver must be
    // assigned first, nothing more. The old gates here (pickup completed AND
    // service payment received) blocked every modal return-assignment once
    // payment became optional (backup link only, 2026-07-17); the driver app
    // itself holds the return until pickup completes. Bug fixed 2026-07-29.
    if (leg === "return") {
      if (!booking.assignedDriverId && !booking.pickupDriver) {
        return NextResponse.json(
          { error: "Assign a pickup driver before assigning the return driver" },
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

    // CRITICAL for the return leg: the driver app, dispatch board, tracking
    // and undo all key on returnDriverId — without it the assigned driver
    // never sees the job (missing here until 2026-07-29).
    if (leg === "return") {
      updateData.returnDriverId = driver._id;
    }

    await Booking.findByIdAndUpdate(id, {
      $set: updateData,
      $push: {
        updates: {
          stage: `${leg}_driver_assigned`,
          timestamp: now,
          message: `Admin assigned ${driver.firstName} ${driver.lastName} as ${leg} driver.`,
          // MUST never be undefined: $push skips validation, and an updates
          // entry missing required fields breaks every later booking.save()
          // (drivers get "Failed to process job action"). Bug fixed 2026-07-24.
          updatedBy: adminCheck.session?.user?.id || "admin",
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

  const originCheckDel = requireValidOrigin(request);
  if (!originCheckDel.valid) {
    return NextResponse.json({ error: originCheckDel.error }, { status: 403 });
  }

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

    // Mirror of the assign fix (2026-07-29): returnDriverId must be cleared
    // too, or the unassigned driver keeps seeing the job in their app.
    if (leg === "return") {
      unsetData.returnDriverId = 1;
    }

    await Booking.findByIdAndUpdate(id, {
      $unset: unsetData,
      $push: {
        updates: {
          stage: `${leg}_driver_unassigned`,
          timestamp: now,
          message: `Admin unassigned ${leg} driver.`,
          // MUST never be undefined: $push skips validation, and an updates
          // entry missing required fields breaks every later booking.save()
          // (drivers get "Failed to process job action"). Bug fixed 2026-07-24.
          updatedBy: adminCheck.session?.user?.id || "admin",
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
