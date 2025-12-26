// src/app/api/driver/jobs/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Booking from "@/models/Booking";
import Driver from "@/models/Driver";
import User from "@/models/User";
import mongoose from "mongoose";

// GET /api/driver/jobs - Get available jobs for driver
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
    const status = searchParams.get("status") || "available"; // available, accepted, in_progress
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);

    await connectDB();

    // Get the driver profile
    const user = await User.findById(session.user.id);
    if (!user?.driverProfile) {
      return NextResponse.json({ error: "Driver profile not found" }, { status: 404 });
    }

    const driver = await Driver.findById(user.driverProfile);
    if (!driver) {
      return NextResponse.json({ error: "Driver not found" }, { status: 404 });
    }

    // Check if driver can accept jobs
    if (!driver.canAcceptJobs) {
      return NextResponse.json({
        error: "You are not authorized to accept jobs. Please complete your onboarding.",
        canAcceptJobs: false,
      }, { status: 403 });
    }

    let query: Record<string, unknown> = {};

    if (status === "available") {
      // Jobs that are pending and not assigned to any driver
      query = {
        status: "pending",
        assignedDriverId: { $exists: false },
        "cancellation.cancelledAt": { $exists: false },
      };

      // Filter by driver's preferred areas if they have any
      if (driver.preferredAreas && driver.preferredAreas.length > 0) {
        // Create regex patterns for suburb matching
        const areaPatterns = driver.preferredAreas.map(
          (area: string) => new RegExp(area, "i")
        );
        query.$or = [
          { pickupAddress: { $in: areaPatterns } },
          // Also include jobs even if not in preferred areas (they can still see them)
        ];
        // Actually, let's show all jobs but we'll sort preferred ones first
        delete query.$or;
      }

      // Check for manual transmission capability
      if (!driver.license?.class || driver.license.class === "C") {
        // Standard license, might need to filter manual transmission
        // For now, show all but flag manual jobs
      }
    } else if (status === "accepted") {
      // Jobs assigned to this driver that are pending
      query = {
        assignedDriverId: user.driverProfile,
        status: "pending",
        "cancellation.cancelledAt": { $exists: false },
      };
    } else if (status === "in_progress") {
      // Jobs assigned to this driver that are in progress
      query = {
        assignedDriverId: user.driverProfile,
        status: "in_progress",
        "cancellation.cancelledAt": { $exists: false },
      };
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

    // Calculate payout for each job (e.g., $25-40 per pickup/delivery)
    const jobsWithPayout = jobs.map((job) => {
      // Base payout calculation
      let payout = 25; // Base rate
      
      // Add for manual transmission
      if (job.isManualTransmission) {
        payout += 5;
      }
      
      // Add for longer distances (would need actual distance calculation)
      // For now, estimate based on time window
      const pickupHour = parseInt(job.pickupTime?.split(":")[0] || "9");
      if (pickupHour < 7 || pickupHour > 18) {
        payout += 10; // Early morning or evening premium
      }

      return {
        _id: job._id.toString(),
        customerName: job.userName,
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
        // Check if this is in driver's preferred area
        isPreferredArea: driver.preferredAreas?.some((area: string) =>
          job.pickupAddress?.toLowerCase().includes(area.toLowerCase())
        ) || false,
      };
    });

    // Sort to show preferred area jobs first for available jobs
    if (status === "available") {
      jobsWithPayout.sort((a, b) => {
        if (a.isPreferredArea && !b.isPreferredArea) return -1;
        if (!a.isPreferredArea && b.isPreferredArea) return 1;
        return 0;
      });
    }

    return NextResponse.json({
      jobs: jobsWithPayout,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      canAcceptJobs: driver.canAcceptJobs,
    });
  } catch (error) {
    console.error("Error fetching driver jobs:", error);
    return NextResponse.json(
      { error: "Failed to fetch jobs" },
      { status: 500 }
    );
  }
}

// POST /api/driver/jobs - Accept or decline a job
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

    const { bookingId, action } = body;

    if (!bookingId || !action) {
      return NextResponse.json(
        { error: "Booking ID and action are required" },
        { status: 400 }
      );
    }

    if (!["accept", "decline", "start", "complete"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    await connectDB();

    // Get driver profile
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

    if (action === "accept") {
      // Check driver's daily job limit first (before atomic operation)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const todaysJobs = await Booking.countDocuments({
        assignedDriverId: user.driverProfile,
        createdAt: { $gte: today, $lt: tomorrow },
        status: { $ne: "cancelled" },
      });

      if (todaysJobs >= driver.maxJobsPerDay) {
        return NextResponse.json(
          { error: `You have reached your daily limit of ${driver.maxJobsPerDay} jobs` },
          { status: 400 }
        );
      }

      // Use atomic findOneAndUpdate to prevent race condition
      // Only update if assignedDriverId is not set (null, undefined, or doesn't exist)
      const now = new Date();
      const updatedBooking = await Booking.findOneAndUpdate(
        {
          _id: bookingId,
          $or: [
            { assignedDriverId: { $exists: false } },
            { assignedDriverId: null },
          ],
          status: "pending",
          "cancellation.cancelledAt": { $exists: false },
        },
        {
          $set: {
            assignedDriverId: user.driverProfile,
            driverAssignedAt: now,
            driverAcceptedAt: now,
          },
          $push: {
            updates: {
              stage: "driver_assigned",
              timestamp: now,
              message: `Driver ${driver.firstName} ${driver.lastName} has accepted this job.`,
              updatedBy: "driver",
            },
          },
        },
        { new: true }
      );

      // If no document was updated, another driver got there first
      if (!updatedBooking) {
        return NextResponse.json(
          { error: "This job has already been assigned to another driver" },
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

      return NextResponse.json({
        success: true,
        message: "Job accepted successfully",
        booking: {
          _id: updatedBooking._id.toString(),
          status: updatedBooking.status,
        },
      });
    } else if (action === "decline") {
      // If this driver was assigned, remove them
      if (booking.assignedDriverId?.toString() === user.driverProfile.toString()) {
        booking.assignedDriverId = undefined;
        booking.driverAssignedAt = undefined;
        booking.updates.push({
          stage: "driver_unassigned",
          timestamp: new Date(),
          message: "Driver declined this job.",
          updatedBy: "driver",
        });
        await booking.save();
      }

      return NextResponse.json({
        success: true,
        message: "Job declined",
      });
    } else if (action === "start") {
      // Start the job (pickup)
      if (booking.assignedDriverId?.toString() !== user.driverProfile.toString()) {
        return NextResponse.json(
          { error: "You are not assigned to this job" },
          { status: 403 }
        );
      }

      booking.status = "in_progress";
      booking.currentStage = "driver_en_route";
      booking.overallProgress = 28;
      booking.updates.push({
        stage: "driver_en_route",
        timestamp: new Date(),
        message: "Driver is on the way to pick up the vehicle.",
        updatedBy: "driver",
      });

      await booking.save();

      return NextResponse.json({
        success: true,
        message: "Job started",
        booking: {
          _id: booking._id.toString(),
          status: booking.status,
          currentStage: booking.currentStage,
        },
      });
    } else if (action === "complete") {
      // Complete the job (delivery done)
      if (booking.assignedDriverId?.toString() !== user.driverProfile.toString()) {
        return NextResponse.json(
          { error: "You are not assigned to this job" },
          { status: 403 }
        );
      }

      booking.status = "completed";
      booking.currentStage = "delivered";
      booking.overallProgress = 100;
      booking.updates.push({
        stage: "delivered",
        timestamp: new Date(),
        message: "Vehicle has been delivered back to the customer.",
        updatedBy: "driver",
      });

      await booking.save();

      // Update driver metrics
      driver.metrics = driver.metrics || {
        totalJobs: 0,
        completedJobs: 0,
        cancelledJobs: 0,
        averageRating: 0,
        totalRatings: 0,
      };
      driver.metrics.completedJobs += 1;
      await driver.save();

      return NextResponse.json({
        success: true,
        message: "Job completed successfully",
        booking: {
          _id: booking._id.toString(),
          status: booking.status,
        },
      });
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
