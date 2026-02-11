// src/app/api/cron/auto-clockout/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Driver from "@/models/Driver";
import TimeEntry from "@/models/TimeEntry";
import Booking from "@/models/Booking";

// Maximum clock-in duration before auto-clockout (12 hours)
const MAX_CLOCK_IN_HOURS = 12;

// GET - Auto clock out drivers who have been clocked in for too long
// This endpoint is called by Vercel Cron
export async function GET(request: NextRequest) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();

    const now = new Date();
    const maxClockInTime = new Date(now.getTime() - MAX_CLOCK_IN_HOURS * 60 * 60 * 1000);

    // Find all drivers who have been clocked in for longer than MAX_CLOCK_IN_HOURS
    const overdueDrivers = await Driver.find({
      isClockedIn: true,
      lastClockIn: { $lt: maxClockInTime },
    });

    const results = [];

    for (const driver of overdueDrivers) {
      try {
        // Update time entry
        const timeEntry = await TimeEntry.findById(driver.currentTimeEntryId);
        if (timeEntry) {
          timeEntry.clockOut = now;
          timeEntry.clockOutReason = "auto";
          timeEntry.clockOutNote = `Auto clocked out after ${MAX_CLOCK_IN_HOURS} hours`;

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

        results.push({
          driverId: driver._id,
          name: `${driver.firstName} ${driver.lastName}`,
          clockedInAt: driver.lastClockIn,
          durationMinutes: timeEntry?.durationMinutes || 0,
          status: "clocked_out",
        });
      } catch (error) {
        console.error(`Error auto-clocking out driver ${driver._id}:`, error);
        results.push({
          driverId: driver._id,
          name: `${driver.firstName} ${driver.lastName}`,
          status: "error",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return NextResponse.json({
      success: true,
      processedAt: now.toISOString(),
      maxClockInHours: MAX_CLOCK_IN_HOURS,
      driversProcessed: results.length,
      results,
    });
  } catch (error) {
    console.error("Error in auto-clockout cron:", error);
    return NextResponse.json(
      { error: "Failed to process auto-clockout" },
      { status: 500 }
    );
  }
}
