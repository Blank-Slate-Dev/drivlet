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

    // Count legs this driver completed today.
    //
    // audit B-11: this used to query `driverId`, which is NOT a path on the
    // Booking schema (the real fields are `assignedDriverId` / `returnDriverId`),
    // so it always matched zero and the dashboard's "jobs completed" was
    // permanently 0. We now count the driver's OWN completed legs via the leg
    // timestamps rather than the booking's overall status — a pickup driver
    // finishing their leg should count immediately, not only once someone else
    // completes the return.
    const jobsCompletedToday = await Booking.countDocuments({
      $or: [
        {
          assignedDriverId: driver._id,
          "pickupDriver.completedAt": { $gte: today, $lt: tomorrow },
        },
        {
          returnDriverId: driver._id,
          "returnDriver.completedAt": { $gte: today, $lt: tomorrow },
        },
      ],
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

      // Atomically update driver — only if still not clocked in (prevents race condition)
      const updated = await Driver.findOneAndUpdate(
        { _id: driver._id, isClockedIn: false },
        { $set: { isClockedIn: true, lastClockIn: now, currentTimeEntryId: timeEntry._id } },
        { new: true }
      );
      if (!updated) {
        // Race: another request clocked in first — clean up orphaned time entry
        try {
          await TimeEntry.findByIdAndDelete(timeEntry._id);
        } catch (cleanupErr) {
          console.error("Failed to clean up orphaned TimeEntry:", timeEntry._id, cleanupErr);
        }
        return NextResponse.json({ error: "Already clocked in" }, { status: 400 });
      }

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

      // Check for active jobs.
      //
      // audit B-11: this used to query `driverId` (not a schema path) and
      // `status: "accepted"` (not in the status enum), so it always returned
      // null — the "can't clock out with an active job" guard was dead code
      // that every clock-out passed. Now: a leg this driver has STARTED but
      // not finished, on a booking that is still running.
      const activeJob = await Booking.findOne({
        status: "in_progress",
        $or: [
          {
            assignedDriverId: driver._id,
            "pickupDriver.startedAt": { $exists: true },
            "pickupDriver.completedAt": { $exists: false },
          },
          {
            returnDriverId: driver._id,
            "returnDriver.startedAt": { $exists: true },
            "returnDriver.completedAt": { $exists: false },
          },
        ],
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

        // Count legs this driver completed during this shift (audit B-11 —
        // see the note above; `driverId` never matched, so every TimeEntry
        // recorded jobsCompleted: 0 and payroll evidence was empty).
        const jobsInShift = await Booking.countDocuments({
          $or: [
            {
              assignedDriverId: driver._id,
              "pickupDriver.completedAt": { $gte: timeEntry.clockIn, $lte: now },
            },
            {
              returnDriverId: driver._id,
              "returnDriver.completedAt": { $gte: timeEntry.clockIn, $lte: now },
            },
          ],
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
