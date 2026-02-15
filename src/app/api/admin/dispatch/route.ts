// src/app/api/admin/dispatch/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { connectDB } from "@/lib/mongodb";
import Booking from "@/models/Booking";
import Driver from "@/models/Driver";
import { notifyBookingUpdate } from "@/lib/emit-booking-update";

// GET /api/admin/dispatch - Fetch dispatch board data
export async function GET() {
  try {
    const auth = await requireAdmin();
    if (!auth.authorized) return auth.response;

    await connectDB();

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [
      unassignedPickups,
      unassignedReturns,
      availableDrivers,
      todaysDispatched,
    ] = await Promise.all([
      // Unassigned pickups: pending, no driver assigned
      Booking.find({
        status: "pending",
        assignedDriverId: { $exists: false },
        "cancellation.cancelledAt": { $exists: false },
      })
        .sort({ pickupTime: 1, createdAt: -1 })
        .limit(50)
        .lean(),

      // Unassigned returns: has pickup driver, no return driver, not completed
      Booking.find({
        assignedDriverId: { $exists: true },
        returnDriverId: { $exists: false },
        status: { $ne: "completed" },
        "cancellation.cancelledAt": { $exists: false },
      })
        .sort({ updatedAt: -1 })
        .limit(50)
        .lean(),

      // Available drivers: approved, active, can accept jobs
      Driver.find({
        status: "approved",
        onboardingStatus: "active",
        canAcceptJobs: true,
        isActive: true,
      })
        .select(
          "firstName lastName phone preferredAreas maxJobsPerDay shiftPreference isClockedIn metrics"
        )
        .lean(),

      // Today's dispatched bookings
      Booking.find({
        $or: [
          { assignedDriverId: { $exists: true } },
          { returnDriverId: { $exists: true } },
        ],
        "cancellation.cancelledAt": { $exists: false },
        status: { $ne: "completed" },
        updatedAt: { $gte: today },
      })
        .sort({ updatedAt: -1 })
        .limit(50)
        .lean(),
    ]);

    // Count today's jobs per driver for limit checking
    const driverJobCounts: Record<string, number> = {};
    const allDispatched = await Booking.find({
      $or: [
        { assignedDriverId: { $exists: true } },
        { returnDriverId: { $exists: true } },
      ],
      "cancellation.cancelledAt": { $exists: false },
      createdAt: { $gte: today, $lt: tomorrow },
    })
      .select("assignedDriverId returnDriverId")
      .lean();

    for (const b of allDispatched) {
      if (b.assignedDriverId) {
        const id = b.assignedDriverId.toString();
        driverJobCounts[id] = (driverJobCounts[id] || 0) + 1;
      }
      if (b.returnDriverId) {
        const id = b.returnDriverId.toString();
        driverJobCounts[id] = (driverJobCounts[id] || 0) + 1;
      }
    }

    // Format bookings
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const formatBooking = (b: any) => ({
      _id: b._id.toString(),
      customerName: b.userName,
      customerEmail: b.userEmail,
      customerPhone: b.guestPhone,
      vehicleRegistration: b.vehicleRegistration,
      vehicleState: b.vehicleState,
      serviceType: b.serviceType,
      pickupAddress: b.pickupAddress,
      garageName: b.garageName,
      garageAddress: b.garageAddress,
      pickupTime: b.pickupTime,
      dropoffTime: b.dropoffTime,
      pickupTimeSlot: b.pickupTimeSlot,
      dropoffTimeSlot: b.dropoffTimeSlot,
      isManualTransmission: b.isManualTransmission || false,
      status: b.status,
      currentStage: b.currentStage,
      createdAt: b.createdAt,
      assignedDriverId: b.assignedDriverId?.toString() || null,
      returnDriverId: b.returnDriverId?.toString() || null,
      servicePaymentStatus: b.servicePaymentStatus || null,
      pickupDriverState: b.pickupDriver
        ? b.pickupDriver.completedAt
          ? "completed"
          : b.pickupDriver.collectedAt
            ? "collected"
            : b.pickupDriver.arrivedAt
              ? "arrived"
              : b.pickupDriver.startedAt
                ? "started"
                : "assigned"
        : null,
      returnDriverState: b.returnDriver
        ? b.returnDriver.completedAt
          ? "completed"
          : b.returnDriver.arrivedAt
            ? "delivering"
            : b.returnDriver.collectedAt
              ? "collected"
              : b.returnDriver.startedAt
                ? "started"
                : "assigned"
        : null,
    });

    // Format drivers
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const formatDriver = (d: any) => ({
      _id: d._id.toString(),
      firstName: d.firstName,
      lastName: d.lastName,
      phone: d.phone,
      preferredAreas: d.preferredAreas || [],
      maxJobsPerDay: d.maxJobsPerDay || 10,
      shiftPreference: d.shiftPreference || "full_day",
      isClockedIn: d.isClockedIn || false,
      todaysJobCount: driverJobCounts[d._id.toString()] || 0,
      completedJobs: d.metrics?.completedJobs || 0,
    });

    return NextResponse.json({
      unassignedPickups: unassignedPickups.map(formatBooking),
      unassignedReturns: unassignedReturns.map(formatBooking),
      availableDrivers: availableDrivers.map(formatDriver),
      todaysDispatched: todaysDispatched.map(formatBooking),
    });
  } catch (error) {
    console.error("Error fetching dispatch data:", error);
    return NextResponse.json(
      { error: "Failed to fetch dispatch data" },
      { status: 500 }
    );
  }
}

// POST /api/admin/dispatch - Assign driver to booking
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.authorized) return auth.response;

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    const { bookingId, driverId, leg } = body;

    if (!bookingId || !driverId || !leg) {
      return NextResponse.json(
        { error: "bookingId, driverId, and leg are required" },
        { status: 400 }
      );
    }

    if (leg !== "pickup" && leg !== "return") {
      return NextResponse.json(
        { error: "leg must be 'pickup' or 'return'" },
        { status: 400 }
      );
    }

    await connectDB();

    // Verify driver exists and is eligible
    const driver = await Driver.findById(driverId);
    if (!driver) {
      return NextResponse.json({ error: "Driver not found" }, { status: 404 });
    }
    if (!driver.canAcceptJobs || !driver.isActive) {
      return NextResponse.json(
        { error: "Driver is not eligible for jobs" },
        { status: 400 }
      );
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    const now = new Date();

    if (leg === "pickup") {
      // Check not already assigned
      if (booking.assignedDriverId) {
        return NextResponse.json(
          { error: "Pickup driver already assigned" },
          { status: 400 }
        );
      }

      // Atomic update
      const result = await Booking.findOneAndUpdate(
        {
          _id: bookingId,
          assignedDriverId: { $exists: false },
        },
        {
          $set: {
            assignedDriverId: driverId,
            driverAssignedAt: now,
            driverAcceptedAt: now,
            pickupDriver: {
              driverId: driverId,
              assignedAt: now,
            },
          },
          $push: {
            updates: {
              stage: "pickup_driver_dispatched",
              timestamp: now,
              message: `Pickup driver ${driver.firstName} ${driver.lastName} assigned by admin.`,
              updatedBy: "admin",
            },
          },
        },
        { new: true }
      );

      if (!result) {
        return NextResponse.json(
          { error: "Failed to assign - booking may have been updated" },
          { status: 400 }
        );
      }

      // Update driver metrics
      driver.metrics = driver.metrics || {
        totalJobs: 0,
        completedJobs: 0,
        cancelledJobs: 0,
        averageRating: 0,
        totalRatings: 0,
      };
      driver.metrics.totalJobs += 1;
      await driver.save();

      notifyBookingUpdate(result);

      return NextResponse.json({
        success: true,
        message: `Pickup assigned to ${driver.firstName} ${driver.lastName}`,
      });
    }

    if (leg === "return") {
      // Must have a pickup driver first
      if (!booking.assignedDriverId) {
        return NextResponse.json(
          { error: "Cannot assign return - no pickup driver assigned yet" },
          { status: 400 }
        );
      }

      // Check not already assigned
      if (booking.returnDriverId) {
        return NextResponse.json(
          { error: "Return driver already assigned" },
          { status: 400 }
        );
      }

      const result = await Booking.findOneAndUpdate(
        {
          _id: bookingId,
          returnDriverId: { $exists: false },
          assignedDriverId: { $exists: true },
        },
        {
          $set: {
            returnDriverId: driverId,
            returnDriver: {
              driverId: driverId,
              assignedAt: now,
            },
          },
          $push: {
            updates: {
              stage: "return_driver_dispatched",
              timestamp: now,
              message: `Return driver ${driver.firstName} ${driver.lastName} assigned by admin.`,
              updatedBy: "admin",
            },
          },
        },
        { new: true }
      );

      if (!result) {
        return NextResponse.json(
          { error: "Failed to assign - booking may have been updated" },
          { status: 400 }
        );
      }

      driver.metrics = driver.metrics || {
        totalJobs: 0,
        completedJobs: 0,
        cancelledJobs: 0,
        averageRating: 0,
        totalRatings: 0,
      };
      driver.metrics.totalJobs += 1;
      await driver.save();

      notifyBookingUpdate(result);

      return NextResponse.json({
        success: true,
        message: `Return assigned to ${driver.firstName} ${driver.lastName}`,
      });
    }

    return NextResponse.json({ error: "Invalid leg type" }, { status: 400 });
  } catch (error) {
    console.error("Error dispatching driver:", error);
    return NextResponse.json(
      { error: "Failed to dispatch driver" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/dispatch - Unassign driver from booking
export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.authorized) return auth.response;

    const { searchParams } = new URL(request.url);
    const bookingId = searchParams.get("bookingId");
    const leg = searchParams.get("leg");

    if (!bookingId || !leg) {
      return NextResponse.json(
        { error: "bookingId and leg are required" },
        { status: 400 }
      );
    }

    if (leg !== "pickup" && leg !== "return") {
      return NextResponse.json(
        { error: "leg must be 'pickup' or 'return'" },
        { status: 400 }
      );
    }

    await connectDB();

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    const now = new Date();

    if (leg === "pickup") {
      // Block if pickup is already in progress (startedAt exists)
      if (booking.pickupDriver?.startedAt) {
        return NextResponse.json(
          { error: "Cannot unassign - pickup is already in progress" },
          { status: 400 }
        );
      }

      // If return driver assigned and not started, clear them too
      if (booking.returnDriverId && !booking.returnDriver?.startedAt) {
        booking.returnDriverId = undefined;
        booking.returnDriver = undefined;
        booking.updates.push({
          stage: "return_driver_auto_cleared",
          timestamp: now,
          message:
            "Return assignment cleared because pickup driver was unassigned.",
          updatedBy: "admin",
        });
      }

      booking.assignedDriverId = undefined;
      booking.driverAssignedAt = undefined;
      booking.driverAcceptedAt = undefined;
      booking.pickupDriver = undefined;

      booking.updates.push({
        stage: "pickup_driver_unassigned",
        timestamp: now,
        message: "Pickup driver unassigned by admin.",
        updatedBy: "admin",
      });

      await booking.save();
      notifyBookingUpdate(booking);

      return NextResponse.json({
        success: true,
        message: "Pickup driver unassigned",
      });
    }

    if (leg === "return") {
      // Block if return is already in progress
      if (booking.returnDriver?.startedAt) {
        return NextResponse.json(
          { error: "Cannot unassign - return is already in progress" },
          { status: 400 }
        );
      }

      booking.returnDriverId = undefined;
      booking.returnDriver = undefined;

      booking.updates.push({
        stage: "return_driver_unassigned",
        timestamp: now,
        message: "Return driver unassigned by admin.",
        updatedBy: "admin",
      });

      await booking.save();
      notifyBookingUpdate(booking);

      return NextResponse.json({
        success: true,
        message: "Return driver unassigned",
      });
    }

    return NextResponse.json({ error: "Invalid leg type" }, { status: 400 });
  } catch (error) {
    console.error("Error unassigning driver:", error);
    return NextResponse.json(
      { error: "Failed to unassign driver" },
      { status: 500 }
    );
  }
}
