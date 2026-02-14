// src/app/api/driver/jobs/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Booking from "@/models/Booking";
import Driver from "@/models/Driver";
import User from "@/models/User";
import { stripe } from "@/lib/stripe";
import { sendServicePaymentEmail } from "@/lib/email";
import { sendServicePaymentSMS } from "@/lib/sms";
import { notifyBookingUpdate } from "@/lib/emit-booking-update";

// Get the app URL for Stripe redirects
function getAppUrl(): string {
  if (process.env.APP_URL) {
    return process.env.APP_URL;
  }
  if (process.env.VERCEL_ENV === 'production') {
    return 'https://drivlet.vercel.app';
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return 'http://localhost:3000';
}

// GET /api/driver/jobs - Get jobs for driver
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "driver") {
      return NextResponse.json({ error: "Not a driver" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "available";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);

    await connectDB();

    const user = await User.findById(session.user.id);
    if (!user?.driverProfile) {
      return NextResponse.json({ error: "Driver profile not found" }, { status: 404 });
    }

    const driver = await Driver.findById(user.driverProfile);
    if (!driver) {
      return NextResponse.json({ error: "Driver not found" }, { status: 404 });
    }

    if (!driver.canAcceptJobs) {
      return NextResponse.json({
        error: "You are not authorized to accept jobs. Please complete your onboarding.",
        canAcceptJobs: false,
      }, { status: 403 });
    }

    let query: Record<string, unknown> = {};
    let legType: "pickup" | "return" | null = null;

    // New leg-based status queries
    if (status === "available_pickup" || status === "available") {
      // Jobs that are pending and not assigned to any driver (pickup leg)
      query = {
        status: "pending",
        pickupDriver: { $exists: false },
        // Also check legacy field for old bookings
        assignedDriverId: { $exists: false },
        "cancellation.cancelledAt": { $exists: false },
      };
      legType = "pickup";
    } else if (status === "available_return") {
      // Jobs where pickup has been accepted (return can be claimed early)
      // Note: Starting the return is gated on pickup complete + payment received
      query = {
        "pickupDriver.driverId": { $exists: true },
        returnDriver: { $exists: false },
        status: { $ne: "completed" },
        "cancellation.cancelledAt": { $exists: false },
      };
      legType = "return";
    } else if (status === "my_pickup") {
      // This driver's active pickup jobs
      query = {
        "pickupDriver.driverId": user.driverProfile,
        "pickupDriver.completedAt": { $exists: false },
        "cancellation.cancelledAt": { $exists: false },
      };
      legType = "pickup";
    } else if (status === "my_return") {
      // This driver's active return jobs
      query = {
        "returnDriver.driverId": user.driverProfile,
        "returnDriver.completedAt": { $exists: false },
        "cancellation.cancelledAt": { $exists: false },
      };
      legType = "return";
    } else if (status === "accepted") {
      // Legacy: Jobs assigned to this driver that are pending (not started)
      // Now includes both new and legacy system
      query = {
        $or: [
          {
            "pickupDriver.driverId": user.driverProfile,
            "pickupDriver.startedAt": { $exists: false },
            "pickupDriver.completedAt": { $exists: false },
          },
          {
            "returnDriver.driverId": user.driverProfile,
            "returnDriver.startedAt": { $exists: false },
            "returnDriver.completedAt": { $exists: false },
          },
          {
            assignedDriverId: user.driverProfile,
            status: "pending",
            pickupDriver: { $exists: false },
          },
        ],
        "cancellation.cancelledAt": { $exists: false },
      };
    } else if (status === "in_progress") {
      // Jobs where this driver has started but not completed either leg
      query = {
        $or: [
          {
            "pickupDriver.driverId": user.driverProfile,
            "pickupDriver.startedAt": { $exists: true },
            "pickupDriver.completedAt": { $exists: false },
          },
          {
            "returnDriver.driverId": user.driverProfile,
            "returnDriver.startedAt": { $exists: true },
            "returnDriver.completedAt": { $exists: false },
          },
          {
            assignedDriverId: user.driverProfile,
            status: "in_progress",
            servicePaymentStatus: { $ne: "paid" },
            pickupDriver: { $exists: false },
          },
        ],
        "cancellation.cancelledAt": { $exists: false },
      };
    } else if (status === "awaiting_payment") {
      // Jobs where payment link exists but customer hasn't paid
      query = {
        $or: [
          { "pickupDriver.driverId": user.driverProfile },
          { assignedDriverId: user.driverProfile },
        ],
        servicePaymentStatus: "pending",
        servicePaymentUrl: { $exists: true, $ne: null },
        "cancellation.cancelledAt": { $exists: false },
      };
    } else if (status === "ready_for_return") {
      // Legacy: Jobs where customer has paid and car is ready to return
      // Now maps to available_return for this driver
      query = {
        "pickupDriver.completedAt": { $exists: true },
        returnDriver: { $exists: false },
        servicePaymentStatus: "paid",
        status: { $ne: "completed" },
        "cancellation.cancelledAt": { $exists: false },
      };
      legType = "return";
    }

    const skip = (page - 1) * limit;

    const [jobs, total] = await Promise.all([
      Booking.find(query)
        .sort({ pickupTime: 1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Booking.countDocuments(query),
    ]);

    // Format jobs for response
    const formattedJobs = jobs.map((job) => {
      // Calculate payout
      let payout = 25;
      if (job.isManualTransmission) payout += 5;
      const pickupHour = parseInt(job.pickupTime?.split(":")[0] || "9");
      if (pickupHour < 7 || pickupHour > 18) payout += 10;

      // Determine leg type for this job
      const driverProfileId = user.driverProfile?.toString();
      const isPickupDriver = driverProfileId && job.pickupDriver?.driverId?.toString() === driverProfileId;
      const isReturnDriver = driverProfileId && job.returnDriver?.driverId?.toString() === driverProfileId;

      let jobLegType: "pickup" | "return" = "pickup";
      if (legType) {
        jobLegType = legType;
      } else if (isReturnDriver) {
        jobLegType = "return";
      } else if (isPickupDriver) {
        jobLegType = "pickup";
      }

      // Determine current action state for this driver
      let driverState: string | null = null;
      if (jobLegType === "pickup" && job.pickupDriver) {
        if (job.pickupDriver.completedAt) driverState = "completed";
        else if (job.pickupDriver.collectedAt) driverState = "collected";
        else if (job.pickupDriver.arrivedAt) driverState = "arrived";
        else if (job.pickupDriver.startedAt) driverState = "started";
        else if (job.pickupDriver.acceptedAt) driverState = "accepted";
        else driverState = "assigned";
      } else if (jobLegType === "return" && job.returnDriver) {
        if (job.returnDriver.completedAt) driverState = "completed";
        else if (job.returnDriver.collectedAt) driverState = "collected";
        else if (job.returnDriver.arrivedAt) driverState = "arrived";
        else if (job.returnDriver.startedAt) driverState = "started";
        else if (job.returnDriver.acceptedAt) driverState = "accepted";
        else driverState = "assigned";
      }

      // Determine if return can be started (pickup complete + payment received)
      const canStartReturn = !!(
        job.pickupDriver?.completedAt &&
        job.servicePaymentStatus === "paid"
      );

      // For return jobs not yet started, provide waiting reason
      let returnWaitingReason: string | null = null;
      if (jobLegType === "return" && job.returnDriver && !job.returnDriver.startedAt) {
        if (!job.pickupDriver?.completedAt) {
          returnWaitingReason = "Waiting for pickup to complete";
        } else if (job.servicePaymentStatus !== "paid") {
          returnWaitingReason = "Waiting for customer payment";
        }
      }

      return {
        _id: job._id.toString(),
        customerName: job.userName,
        customerEmail: job.userEmail,
        customerPhone: job.guestPhone,
        vehicleRegistration: job.vehicleRegistration,
        vehicleState: job.vehicleState,
        serviceType: job.serviceType,
        pickupAddress: job.pickupAddress,
        garageName: job.garageName,
        garageAddress: job.garageAddress,
        pickupTime: job.pickupTime,
        dropoffTime: job.dropoffTime,
        isManualTransmission: job.isManualTransmission || false,
        hasExistingBooking: job.hasExistingBooking,
        status: job.status,
        currentStage: job.currentStage,
        createdAt: job.createdAt,
        payout,
        // Leg type info
        legType: jobLegType,
        driverState,
        // Return leg gating
        canStartReturn,
        returnWaitingReason,
        // Service payment info
        servicePaymentStatus: job.servicePaymentStatus || null,
        servicePaymentAmount: job.servicePaymentAmount || null,
        servicePaymentUrl: job.servicePaymentUrl || null,
        // Photo checkpoint status
        checkpointStatus: job.checkpointStatus || {
          pre_pickup: 0,
          service_dropoff: 0,
          service_pickup: 0,
          final_delivery: 0,
        },
        // Preferred area check
        isPreferredArea: driver.preferredAreas?.some((area: string) =>
          job.pickupAddress?.toLowerCase().includes(area.toLowerCase())
        ) || false,
        // Pickup/return driver info
        pickupDriver: job.pickupDriver ? {
          driverId: job.pickupDriver.driverId?.toString(),
          completedAt: job.pickupDriver.completedAt,
        } : null,
        returnDriver: job.returnDriver ? {
          driverId: job.returnDriver.driverId?.toString(),
        } : null,
      };
    });

    // Sort preferred area jobs first for available jobs
    if (status === "available" || status === "available_pickup") {
      formattedJobs.sort((a, b) => {
        if (a.isPreferredArea && !b.isPreferredArea) return -1;
        if (!a.isPreferredArea && b.isPreferredArea) return 1;
        return 0;
      });
    }

    return NextResponse.json({
      jobs: formattedJobs,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      canAcceptJobs: driver.canAcceptJobs,
      isClockedIn: driver.isClockedIn,
    });
  } catch (error) {
    console.error("Error fetching driver jobs:", error);
    return NextResponse.json(
      { error: "Failed to fetch jobs" },
      { status: 500 }
    );
  }
}

// POST /api/driver/jobs - Job actions
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "driver") {
      return NextResponse.json({ error: "Not a driver" }, { status: 403 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    const { bookingId, action, serviceAmount, leg } = body;

    if (!bookingId || !action) {
      return NextResponse.json(
        { error: "Booking ID and action are required" },
        { status: 400 }
      );
    }

    // Valid actions include both new leg-based and legacy actions
    const validActions = [
      // Pickup leg actions
      "accept_pickup",
      "decline_pickup",
      "start_pickup",
      "arrived_pickup",
      "collected",
      "dropped_at_workshop",
      // Return leg actions
      "accept_return",
      "decline_return",
      "start_return",
      "collected_from_workshop",
      "delivering",
      "delivered",
      // Legacy actions (mapped to new system)
      "accept", "decline", "start", "picked_up", "at_garage", "generate_payment", "complete",
    ];

    if (!validActions.includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    await connectDB();

    const user = await User.findById(session.user.id);
    if (!user?.driverProfile) {
      return NextResponse.json({ error: "Driver profile not found" }, { status: 404 });
    }

    const driver = await Driver.findById(user.driverProfile);
    if (!driver || !driver.canAcceptJobs) {
      return NextResponse.json(
        { error: "You are not authorized to accept jobs" },
        { status: 403 }
      );
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const now = new Date();

    // ========== ACCEPT PICKUP ==========
    if (action === "accept_pickup" || (action === "accept" && !booking.pickupDriver)) {
      // Check if driver is clocked in
      if (!driver.isClockedIn) {
        return NextResponse.json(
          { error: "You must be clocked in to accept jobs" },
          { status: 400 }
        );
      }

      // Check daily limit (counts both pickup and return legs)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const todaysJobs = await Booking.countDocuments({
        $or: [
          { "pickupDriver.driverId": user.driverProfile, "pickupDriver.assignedAt": { $gte: today, $lt: tomorrow } },
          { "returnDriver.driverId": user.driverProfile, "returnDriver.assignedAt": { $gte: today, $lt: tomorrow } },
          { assignedDriverId: user.driverProfile, createdAt: { $gte: today, $lt: tomorrow } },
        ],
        status: { $ne: "cancelled" },
      });

      if (todaysJobs >= (driver.maxJobsPerDay || 10)) {
        return NextResponse.json(
          { error: "You have reached your daily job limit" },
          { status: 400 }
        );
      }

      // Atomic update to prevent race conditions
      const result = await Booking.findOneAndUpdate(
        {
          _id: bookingId,
          pickupDriver: { $exists: false },
          assignedDriverId: { $exists: false },
          status: "pending",
        },
        {
          $set: {
            pickupDriver: {
              driverId: user.driverProfile,
              assignedAt: now,
              acceptedAt: now,
            },
            // Legacy compat
            assignedDriverId: user.driverProfile,
            driverAssignedAt: now,
            driverAcceptedAt: now,
          },
          $push: {
            updates: {
              stage: "pickup_driver_assigned",
              timestamp: now,
              message: `Pickup driver ${driver.firstName} ${driver.lastName} accepted the job.`,
              updatedBy: "driver",
            },
          },
        },
        { new: true }
      );

      if (!result) {
        return NextResponse.json(
          { error: "This job is no longer available" },
          { status: 400 }
        );
      }

      // Update driver metrics
      driver.metrics = driver.metrics || { totalJobs: 0, completedJobs: 0, cancelledJobs: 0, averageRating: 0, totalRatings: 0 };
      driver.metrics.totalJobs += 1;
      await driver.save();

      notifyBookingUpdate(result);

      return NextResponse.json({
        success: true,
        message: "Pickup job accepted successfully",
      });
    }

    // ========== ACCEPT RETURN ==========
    if (action === "accept_return") {
      if (!driver.isClockedIn) {
        return NextResponse.json(
          { error: "You must be clocked in to accept jobs" },
          { status: 400 }
        );
      }

      // Check daily limit
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const todaysJobs = await Booking.countDocuments({
        $or: [
          { "pickupDriver.driverId": user.driverProfile, "pickupDriver.assignedAt": { $gte: today, $lt: tomorrow } },
          { "returnDriver.driverId": user.driverProfile, "returnDriver.assignedAt": { $gte: today, $lt: tomorrow } },
        ],
        status: { $ne: "cancelled" },
      });

      if (todaysJobs >= (driver.maxJobsPerDay || 10)) {
        return NextResponse.json(
          { error: "You have reached your daily job limit" },
          { status: 400 }
        );
      }

      // Atomic update - only requires pickup to be accepted (driverId exists)
      // Starting the return is gated separately on pickup complete + payment
      const result = await Booking.findOneAndUpdate(
        {
          _id: bookingId,
          returnDriver: { $exists: false },
          "pickupDriver.driverId": { $exists: true },
        },
        {
          $set: {
            returnDriver: {
              driverId: user.driverProfile,
              assignedAt: now,
              acceptedAt: now,
            },
          },
          $push: {
            updates: {
              stage: "return_driver_assigned",
              timestamp: now,
              message: `Return driver ${driver.firstName} ${driver.lastName} claimed the return job.`,
              updatedBy: "driver",
            },
          },
        },
        { new: true }
      );

      if (!result) {
        return NextResponse.json(
          { error: "This return job is no longer available" },
          { status: 400 }
        );
      }

      driver.metrics = driver.metrics || { totalJobs: 0, completedJobs: 0, cancelledJobs: 0, averageRating: 0, totalRatings: 0 };
      driver.metrics.totalJobs += 1;
      await driver.save();

      notifyBookingUpdate(result);

      return NextResponse.json({
        success: true,
        message: "Return job claimed successfully. You'll be able to start once pickup is complete and customer has paid.",
      });
    }

    // ========== DECLINE PICKUP ==========
    if (action === "decline_pickup" || (action === "decline" && leg === "pickup")) {
      if (booking.pickupDriver?.driverId?.toString() === user.driverProfile.toString()) {
        booking.pickupDriver = undefined;
        // Also clear legacy fields
        booking.assignedDriverId = undefined;
        booking.driverAssignedAt = undefined;
        booking.driverAcceptedAt = undefined;

        // IMPORTANT: If a return driver has already claimed this job, clear them too
        // since the return leg depends on the pickup being done
        if (booking.returnDriver && !booking.returnDriver.startedAt) {
          booking.returnDriver = undefined;
          booking.updates.push({
            stage: "return_driver_auto_cleared",
            timestamp: now,
            message: "Return assignment cleared because pickup driver declined.",
            updatedBy: "system",
          });
        }

        booking.updates.push({
          stage: "pickup_driver_declined",
          timestamp: now,
          message: "Pickup driver declined the job.",
          updatedBy: "driver",
        });
        await booking.save();
        notifyBookingUpdate(booking);
      }
      return NextResponse.json({ success: true, message: "Pickup job declined" });
    }

    // ========== DECLINE RETURN ==========
    if (action === "decline_return" || (action === "decline" && leg === "return")) {
      if (booking.returnDriver?.driverId?.toString() === user.driverProfile.toString()) {
        booking.returnDriver = undefined;
        booking.updates.push({
          stage: "return_driver_declined",
          timestamp: now,
          message: "Return driver declined the job.",
          updatedBy: "driver",
        });
        await booking.save();
        notifyBookingUpdate(booking);
      }
      return NextResponse.json({ success: true, message: "Return job declined" });
    }

    // ========== LEGACY DECLINE (backwards compat) ==========
    if (action === "decline" && !leg) {
      // Check both pickup and return
      if (booking.pickupDriver?.driverId?.toString() === user.driverProfile.toString() && !booking.pickupDriver.completedAt) {
        booking.pickupDriver = undefined;
        booking.assignedDriverId = undefined;
        booking.driverAssignedAt = undefined;
        booking.driverAcceptedAt = undefined;
        // Clear return driver if not started
        if (booking.returnDriver && !booking.returnDriver.startedAt) {
          booking.returnDriver = undefined;
        }
      } else if (booking.returnDriver?.driverId?.toString() === user.driverProfile.toString()) {
        booking.returnDriver = undefined;
      } else if (booking.assignedDriverId?.toString() === user.driverProfile.toString()) {
        booking.assignedDriverId = undefined;
        booking.driverAssignedAt = undefined;
        booking.driverAcceptedAt = undefined;
      }
      booking.updates.push({
        stage: "driver_declined",
        timestamp: now,
        message: "Driver declined the job.",
        updatedBy: "driver",
      });
      await booking.save();
      notifyBookingUpdate(booking);
      return NextResponse.json({ success: true, message: "Job declined" });
    }

    // For remaining actions, verify driver is assigned to appropriate leg
    const isPickupDriver = booking.pickupDriver?.driverId?.toString() === user.driverProfile.toString();
    const isReturnDriver = booking.returnDriver?.driverId?.toString() === user.driverProfile.toString();
    const isLegacyDriver = booking.assignedDriverId?.toString() === user.driverProfile.toString();

    // ========== PICKUP LEG ACTIONS ==========

    // Start pickup (en route to customer)
    if (action === "start_pickup" || (action === "start" && (isPickupDriver || (isLegacyDriver && !booking.pickupDriver)))) {
      if (!isPickupDriver && !isLegacyDriver) {
        return NextResponse.json({ error: "You are not assigned to pickup" }, { status: 403 });
      }

      booking.status = "in_progress";
      booking.currentStage = "driver_en_route";
      booking.overallProgress = 28;

      if (booking.pickupDriver) {
        booking.pickupDriver.startedAt = now;
      }
      booking.driverStartedAt = now;

      booking.updates.push({
        stage: "driver_en_route",
        timestamp: now,
        message: "Driver is on the way to pick up the vehicle.",
        updatedBy: "driver",
      });
      await booking.save();
      notifyBookingUpdate(booking);

      return NextResponse.json({ success: true, message: "En route to pickup" });
    }

    // Arrived at customer (optional checkpoint)
    if (action === "arrived_pickup") {
      if (!isPickupDriver && !isLegacyDriver) {
        return NextResponse.json({ error: "You are not assigned to pickup" }, { status: 403 });
      }

      if (booking.pickupDriver) {
        booking.pickupDriver.arrivedAt = now;
      }

      booking.updates.push({
        stage: "arrived_at_customer",
        timestamp: now,
        message: "Driver has arrived at the customer location.",
        updatedBy: "driver",
      });
      await booking.save();
      notifyBookingUpdate(booking);

      return NextResponse.json({ success: true, message: "Arrived at customer" });
    }

    // Vehicle collected (picked up from customer)
    if (action === "collected" || action === "picked_up") {
      if (!isPickupDriver && !isLegacyDriver) {
        return NextResponse.json({ error: "You are not assigned to pickup" }, { status: 403 });
      }

      booking.currentStage = "car_picked_up";
      booking.overallProgress = 42;

      if (booking.pickupDriver) {
        booking.pickupDriver.collectedAt = now;
      }

      booking.updates.push({
        stage: "car_picked_up",
        timestamp: now,
        message: "Vehicle has been picked up. Heading to garage.",
        updatedBy: "driver",
      });
      await booking.save();
      notifyBookingUpdate(booking);

      return NextResponse.json({ success: true, message: "Vehicle collected" });
    }

    // Dropped at workshop (completes pickup leg)
    if (action === "dropped_at_workshop" || action === "at_garage") {
      if (!isPickupDriver && !isLegacyDriver) {
        return NextResponse.json({ error: "You are not assigned to pickup" }, { status: 403 });
      }

      booking.currentStage = "at_garage";
      booking.overallProgress = 57;

      if (booking.pickupDriver) {
        booking.pickupDriver.completedAt = now;
      }

      booking.updates.push({
        stage: "at_garage",
        timestamp: now,
        message: "Vehicle has arrived at the garage. Pickup leg complete.",
        updatedBy: "driver",
      });
      await booking.save();
      notifyBookingUpdate(booking);

      return NextResponse.json({ success: true, message: "Dropped at workshop - pickup complete" });
    }

    // ========== RETURN LEG ACTIONS ==========

    // Start return (en route to workshop for collection)
    // GATED: Requires pickup complete AND service payment received
    if (action === "start_return") {
      if (!isReturnDriver) {
        return NextResponse.json({ error: "You are not assigned to return" }, { status: 403 });
      }

      // Gate check: Pickup must be complete
      if (!booking.pickupDriver?.completedAt) {
        return NextResponse.json(
          { error: "Cannot start return yet - pickup is not complete" },
          { status: 400 }
        );
      }

      // Gate check: Service payment must be received
      if (booking.servicePaymentStatus !== "paid") {
        return NextResponse.json(
          { error: "Cannot start return yet - waiting for customer to pay for service" },
          { status: 400 }
        );
      }

      booking.currentStage = "driver_returning";
      booking.overallProgress = 86;

      if (booking.returnDriver) {
        booking.returnDriver.startedAt = now;
      }

      booking.updates.push({
        stage: "driver_returning",
        timestamp: now,
        message: "Return driver is on the way to collect the vehicle.",
        updatedBy: "driver",
      });
      await booking.save();
      notifyBookingUpdate(booking);

      return NextResponse.json({ success: true, message: "En route to workshop" });
    }

    // Collected from workshop
    if (action === "collected_from_workshop") {
      if (!isReturnDriver) {
        return NextResponse.json({ error: "You are not assigned to return" }, { status: 403 });
      }

      if (booking.returnDriver) {
        booking.returnDriver.collectedAt = now;
      }

      booking.updates.push({
        stage: "collected_from_workshop",
        timestamp: now,
        message: "Vehicle collected from workshop. Heading to customer.",
        updatedBy: "driver",
      });
      await booking.save();
      notifyBookingUpdate(booking);

      return NextResponse.json({ success: true, message: "Collected from workshop" });
    }

    // Delivering (in transit to customer)
    if (action === "delivering") {
      if (!isReturnDriver) {
        return NextResponse.json({ error: "You are not assigned to return" }, { status: 403 });
      }

      booking.updates.push({
        stage: "delivering",
        timestamp: now,
        message: "Driver is delivering the vehicle back to the customer.",
        updatedBy: "driver",
      });
      await booking.save();
      notifyBookingUpdate(booking);

      return NextResponse.json({ success: true, message: "Delivering to customer" });
    }

    // Delivered (completes return leg and booking)
    if (action === "delivered" || action === "complete") {
      // Check payment status
      if (booking.servicePaymentStatus !== "paid") {
        return NextResponse.json(
          { error: "Cannot complete - customer has not paid for service yet" },
          { status: 400 }
        );
      }

      // Must be return driver or legacy driver
      if (!isReturnDriver && !isLegacyDriver) {
        return NextResponse.json({ error: "You are not assigned to this delivery" }, { status: 403 });
      }

      booking.status = "completed";
      booking.currentStage = "delivered";
      booking.overallProgress = 100;

      if (booking.returnDriver) {
        booking.returnDriver.completedAt = now;
      }
      booking.driverCompletedAt = now;

      booking.updates.push({
        stage: "delivered",
        timestamp: now,
        message: "Vehicle has been delivered. Thanks for choosing drivlet!",
        updatedBy: "driver",
      });
      await booking.save();
      notifyBookingUpdate(booking);

      // Update driver metrics
      driver.metrics = driver.metrics || { totalJobs: 0, completedJobs: 0, cancelledJobs: 0, averageRating: 0, totalRatings: 0 };
      driver.metrics.completedJobs += 1;
      await driver.save();

      return NextResponse.json({
        success: true,
        message: "Job completed successfully",
      });
    }

    // ========== GENERATE PAYMENT LINK ==========
    if (action === "generate_payment") {
      // Can be triggered by pickup driver after workshop drop-off
      if (!isPickupDriver && !isLegacyDriver) {
        return NextResponse.json(
          { error: "Only the pickup driver can generate payment link" },
          { status: 403 }
        );
      }

      // Validate service amount
      if (!serviceAmount || typeof serviceAmount !== "number" || serviceAmount <= 0) {
        return NextResponse.json(
          { error: "Service amount is required (in cents)" },
          { status: 400 }
        );
      }

      // Validate amount is within reasonable range ($150 - $800)
      const MIN_SERVICE_AMOUNT = 15000;
      const MAX_SERVICE_AMOUNT = 80000;

      if (serviceAmount < MIN_SERVICE_AMOUNT) {
        return NextResponse.json(
          { error: "Please double check the price - it seems too low. Minimum is $150." },
          { status: 400 }
        );
      }

      if (serviceAmount > MAX_SERVICE_AMOUNT) {
        return NextResponse.json(
          { error: "Please double check the price - it seems too high. Maximum is $800." },
          { status: 400 }
        );
      }

      // Check if payment link already exists
      if (booking.servicePaymentUrl && booking.servicePaymentStatus === "pending") {
        return NextResponse.json({
          success: true,
          message: "Payment link already exists",
          paymentLink: booking.servicePaymentUrl,
          paymentAmount: booking.servicePaymentAmount,
        });
      }

      // Create Stripe Checkout Session
      const appUrl = getAppUrl();

      try {
        const checkoutSession = await stripe.checkout.sessions.create({
          payment_method_types: ['card'],
          mode: 'payment',
          customer_email: booking.userEmail,
          line_items: [
            {
              price_data: {
                currency: 'aud',
                product_data: {
                  name: `Service Payment - ${booking.vehicleRegistration}`,
                  description: `${booking.serviceType}${booking.garageName ? ` at ${booking.garageName}` : ''}`,
                },
                unit_amount: serviceAmount,
              },
              quantity: 1,
            },
          ],
          metadata: {
            bookingId: bookingId,
            type: 'service_payment',
            vehicleRegistration: booking.vehicleRegistration,
            garageName: booking.garageName || '',
          },
          success_url: `${appUrl}/payment/success?booking=${bookingId}&type=service`,
          cancel_url: `${appUrl}/payment/cancelled?booking=${bookingId}`,
        });

        // Update booking with payment link
        booking.servicePaymentAmount = serviceAmount;
        booking.servicePaymentUrl = checkoutSession.url || undefined;
        booking.servicePaymentStatus = "pending";
        booking.currentStage = "service_in_progress";
        booking.overallProgress = 72;
        booking.updates.push({
          stage: "payment_link_generated",
          timestamp: now,
          message: `Payment link generated for $${(serviceAmount / 100).toFixed(2)}. Waiting for customer payment.`,
          updatedBy: "driver",
        });
        await booking.save();
        notifyBookingUpdate(booking);

        console.log('💳 Service payment link created:', checkoutSession.url);

        // Send email notification (async)
        sendServicePaymentEmail(
          booking.userEmail,
          booking.userName,
          booking.vehicleRegistration,
          serviceAmount,
          checkoutSession.url!,
          booking.garageName
        ).then(sent => {
          if (sent) console.log('📧 Payment email sent to:', booking.userEmail);
        });

        // Send SMS notification if phone exists (async)
        const phoneNumber = booking.guestPhone;
        if (phoneNumber) {
          sendServicePaymentSMS(
            phoneNumber,
            booking.userName,
            booking.vehicleRegistration,
            serviceAmount,
            checkoutSession.url!
          ).then(sent => {
            if (sent) console.log('📱 Payment SMS sent to:', phoneNumber);
          });
        }

        return NextResponse.json({
          success: true,
          message: "Payment link generated",
          paymentLink: checkoutSession.url,
          paymentAmount: serviceAmount,
        });

      } catch (stripeError) {
        console.error('❌ Failed to create payment link:', stripeError);
        return NextResponse.json(
          { error: "Failed to create payment link" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Error processing job action:", error);
    return NextResponse.json(
      { error: "Failed to process job action" },
      { status: 500 }
    );
  }
}
