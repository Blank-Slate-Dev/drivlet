// src/app/api/admin/drivers/[id]/clock/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Driver from "@/models/Driver";
import TimeEntry from "@/models/TimeEntry";
import Booking from "@/models/Booking";
import { sanitizeString } from "@/lib/validation";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET - Get driver's clock history
export async function GET(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();

    const driver = await Driver.findById(id);
    if (!driver) {
      return NextResponse.json({ error: "Driver not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20")));
    const days = parseInt(searchParams.get("days") || "30");

    // Get time entries for the specified period
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const total = await TimeEntry.countDocuments({
      driverId: id,
      clockIn: { $gte: startDate },
    });

    const entries = await TimeEntry.find({
      driverId: id,
      clockIn: { $gte: startDate },
    })
      .sort({ clockIn: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("clockOutBy", "name email")
      .lean();

    // Calculate summary stats
    const allEntries = await TimeEntry.find({
      driverId: id,
      clockIn: { $gte: startDate },
      clockOut: { $ne: null },
    });

    let totalMinutes = 0;
    let totalJobs = 0;
    for (const entry of allEntries) {
      totalMinutes += entry.durationMinutes || 0;
      totalJobs += entry.jobsCompleted || 0;
    }

    return NextResponse.json({
      driver: {
        _id: driver._id,
        firstName: driver.firstName,
        lastName: driver.lastName,
        isClockedIn: driver.isClockedIn,
        lastClockIn: driver.lastClockIn,
        lastClockOut: driver.lastClockOut,
      },
      entries,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      summary: {
        periodDays: days,
        totalSessions: allEntries.length,
        totalHours: Math.floor(totalMinutes / 60),
        totalMinutes: totalMinutes % 60,
        totalJobs,
        avgSessionMinutes: allEntries.length > 0 ? Math.floor(totalMinutes / allEntries.length) : 0,
      },
    });
  } catch (error) {
    console.error("Error fetching driver clock history:", error);
    return NextResponse.json(
      { error: "Failed to fetch clock history" },
      { status: 500 }
    );
  }
}

// POST - Force clock out a driver (admin action)
export async function POST(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { note } = body;

  try {
    await connectDB();

    const driver = await Driver.findById(id);
    if (!driver) {
      return NextResponse.json({ error: "Driver not found" }, { status: 404 });
    }

    if (!driver.isClockedIn) {
      return NextResponse.json(
        { error: "Driver is not currently clocked in" },
        { status: 400 }
      );
    }

    const now = new Date();

    // Update time entry
    const timeEntry = await TimeEntry.findById(driver.currentTimeEntryId);
    if (timeEntry) {
      timeEntry.clockOut = now;
      timeEntry.clockOutReason = "admin";
      timeEntry.clockOutBy = new mongoose.Types.ObjectId(session.user.id);
      timeEntry.clockOutNote = note ? sanitizeString(note, 500) : "Force clocked out by admin";

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
      message: `Driver ${driver.firstName} ${driver.lastName} has been clocked out`,
      clockedOutAt: now,
      durationMinutes: timeEntry?.durationMinutes || 0,
    });
  } catch (error) {
    console.error("Error force clocking out driver:", error);
    return NextResponse.json(
      { error: "Failed to clock out driver" },
      { status: 500 }
    );
  }
}
