// src/app/api/driver/clock/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Driver from "@/models/Driver";
import TimeEntry from "@/models/TimeEntry";
import Booking from "@/models/Booking";

// GET - Get current clock status
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "driver") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();

    const driver = await Driver.findOne({ userId: session.user.id });
    if (!driver) {
      return NextResponse.json({ error: "Driver not found" }, { status: 404 });
    }

    // Get today's stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Count jobs completed today
    const jobsCompletedToday = await Booking.countDocuments({
      driverId: driver._id,
      status: "completed",
      updatedAt: { $gte: today, $lt: tomorrow },
    });

    // Get today's time entries
    const todayEntries = await TimeEntry.find({
      driverId: driver._id,
      clockIn: { $gte: today },
    }).sort({ clockIn: -1 });

    // Calculate total hours today
    let totalMinutesToday = 0;
    for (const entry of todayEntries) {
      if (entry.durationMinutes) {
        totalMinutesToday += entry.durationMinutes;
      } else if (entry.clockIn && !entry.clockOut) {
        // Active session - calculate elapsed time
        totalMinutesToday += Math.floor(
          (Date.now() - entry.clockIn.getTime()) / (1000 * 60)
        );
      }
    }

    return NextResponse.json({
      isClockedIn: driver.isClockedIn,
      lastClockIn: driver.lastClockIn,
      lastClockOut: driver.lastClockOut,
      currentTimeEntryId: driver.currentTimeEntryId,
      canAcceptJobs: driver.canAcceptJobs,
      onboardingStatus: driver.onboardingStatus,
      todaySummary: {
        hoursWorked: Math.floor(totalMinutesToday / 60),
        minutesWorked: totalMinutesToday % 60,
        jobsCompleted: jobsCompletedToday,
      },
    });
  } catch (error) {
    console.error("Error fetching clock status:", error);
    return NextResponse.json(
      { error: "Failed to fetch clock status" },
      { status: 500 }
    );
  }
}

// POST - Clock in or out
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "driver") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { action } = body;

  if (!action || !["clock_in", "clock_out"].includes(action)) {
    return NextResponse.json(
      { error: "Invalid action. Must be 'clock_in' or 'clock_out'" },
      { status: 400 }
    );
  }

  try {
    await connectDB();

    const driver = await Driver.findOne({ userId: session.user.id });
    if (!driver) {
      return NextResponse.json({ error: "Driver not found" }, { status: 404 });
    }

    // Check if driver can work (approved, active onboarding, etc.)
    if (driver.status !== "approved") {
      return NextResponse.json(
        { error: "Driver must be approved to clock in" },
        { status: 403 }
      );
    }

    if (driver.onboardingStatus !== "active") {
      return NextResponse.json(
        { error: "Driver must complete onboarding to clock in" },
        { status: 403 }
      );
    }

    if (!driver.canAcceptJobs) {
      return NextResponse.json(
        { error: "Driver is not eligible to accept jobs" },
        { status: 403 }
      );
    }

    const now = new Date();

    if (action === "clock_in") {
      // Prevent double clock-in
      if (driver.isClockedIn) {
        return NextResponse.json(
          { error: "Already clocked in" },
          { status: 400 }
        );
      }

      // Create new time entry
      const timeEntry = new TimeEntry({
        driverId: driver._id,
        userId: session.user.id,
        clockIn: now,
        jobsCompleted: 0,
      });
      await timeEntry.save();

      // Update driver
      driver.isClockedIn = true;
      driver.lastClockIn = now;
      driver.currentTimeEntryId = timeEntry._id;
      await driver.save();

      return NextResponse.json({
        success: true,
        action: "clock_in",
        clockedInAt: now,
        timeEntryId: timeEntry._id,
      });
    } else {
      // clock_out
      if (!driver.isClockedIn) {
        return NextResponse.json(
          { error: "Not currently clocked in" },
          { status: 400 }
        );
      }

      // Check for active jobs
      const activeJob = await Booking.findOne({
        driverId: driver._id,
        status: { $in: ["accepted", "in_progress"] },
      });

      if (activeJob) {
        return NextResponse.json(
          { error: "Cannot clock out with an active job. Please complete or reassign the job first." },
          { status: 400 }
        );
      }

      // Update time entry
      const timeEntry = await TimeEntry.findById(driver.currentTimeEntryId);
      if (timeEntry) {
        timeEntry.clockOut = now;
        timeEntry.clockOutReason = "manual";

        // Calculate duration
        const durationMs = now.getTime() - timeEntry.clockIn.getTime();
        timeEntry.durationMinutes = Math.floor(durationMs / (1000 * 60));

        // Count jobs completed during this shift
        const jobsInShift = await Booking.countDocuments({
          driverId: driver._id,
          status: "completed",
          updatedAt: { $gte: timeEntry.clockIn, $lte: now },
        });
        timeEntry.jobsCompleted = jobsInShift;

        await timeEntry.save();
      }

      // Update driver
      driver.isClockedIn = false;
      driver.lastClockOut = now;
      driver.currentTimeEntryId = undefined;
      await driver.save();

      return NextResponse.json({
        success: true,
        action: "clock_out",
        clockedOutAt: now,
        durationMinutes: timeEntry?.durationMinutes || 0,
        jobsCompleted: timeEntry?.jobsCompleted || 0,
      });
    }
  } catch (error) {
    console.error("Error processing clock action:", error);
    return NextResponse.json(
      { error: "Failed to process clock action" },
      { status: 500 }
    );
  }
}
