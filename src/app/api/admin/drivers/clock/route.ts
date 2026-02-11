// src/app/api/admin/drivers/clock/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Driver from "@/models/Driver";

// GET - List all currently clocked-in drivers
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "clocked_in";

    let filter = {};
    if (status === "clocked_in") {
      filter = { isClockedIn: true };
    } else if (status === "clocked_out") {
      filter = { isClockedIn: false };
    }
    // status === "all" returns all drivers

    const drivers = await Driver.find(filter)
      .select(
        "firstName lastName isClockedIn lastClockIn lastClockOut status onboardingStatus canAcceptJobs isActive"
      )
      .sort({ lastClockIn: -1 })
      .lean();

    // Calculate elapsed time for clocked-in drivers
    const driversWithElapsed = drivers.map((driver) => {
      let elapsedMinutes = 0;
      if (driver.isClockedIn && driver.lastClockIn) {
        elapsedMinutes = Math.floor(
          (Date.now() - new Date(driver.lastClockIn).getTime()) / (1000 * 60)
        );
      }
      return {
        ...driver,
        elapsedMinutes,
        elapsedFormatted: driver.isClockedIn
          ? `${Math.floor(elapsedMinutes / 60)}h ${elapsedMinutes % 60}m`
          : null,
      };
    });

    // Get counts
    const clockedInCount = await Driver.countDocuments({ isClockedIn: true });
    const clockedOutCount = await Driver.countDocuments({ isClockedIn: false });

    return NextResponse.json({
      drivers: driversWithElapsed,
      stats: {
        clockedIn: clockedInCount,
        clockedOut: clockedOutCount,
      },
    });
  } catch (error) {
    console.error("Error fetching clocked-in drivers:", error);
    return NextResponse.json(
      { error: "Failed to fetch clocked-in drivers" },
      { status: 500 }
    );
  }
}
