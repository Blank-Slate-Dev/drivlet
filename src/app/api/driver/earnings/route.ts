// src/app/api/driver/earnings/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Booking from "@/models/Booking";
import Driver from "@/models/Driver";
import User from "@/models/User";

export const dynamic = "force-dynamic";

// Helper to calculate payout for a booking
function calculatePayout(booking: {
  isManualTransmission?: boolean;
  pickupTime?: string;
}): number {
  let payout = 25; // Base rate

  if (booking.isManualTransmission) {
    payout += 5;
  }

  const pickupHour = parseInt(booking.pickupTime?.split(":")[0] || "9");
  if (pickupHour < 7 || pickupHour > 18) {
    payout += 10; // Early morning or evening premium
  }

  return payout;
}

// GET /api/driver/earnings - Get driver earnings data
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
    const period = searchParams.get("period") || "week"; // today, week, month, year, all

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

    // Calculate date ranges
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of week (Sunday)
    weekStart.setHours(0, 0, 0, 0);

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const yearStart = new Date(now.getFullYear(), 0, 1);

    // Build query based on period
    let dateFilter: { $gte?: Date; $lte?: Date } = {};
    switch (period) {
      case "today":
        dateFilter = { $gte: todayStart };
        break;
      case "week":
        dateFilter = { $gte: weekStart };
        break;
      case "month":
        dateFilter = { $gte: monthStart };
        break;
      case "year":
        dateFilter = { $gte: yearStart };
        break;
      case "all":
      default:
        dateFilter = {};
    }

    // Get completed jobs for this driver
    const completedJobsQuery: Record<string, unknown> = {
      assignedDriverId: user.driverProfile,
      status: "completed",
    };

    if (Object.keys(dateFilter).length > 0) {
      completedJobsQuery.updatedAt = dateFilter;
    }

    const completedJobs = await Booking.find(completedJobsQuery)
      .sort({ updatedAt: -1 })
      .lean();

    // Calculate earnings
    const earnings = completedJobs.map((job) => ({
      _id: job._id.toString(),
      customerName: job.userName,
      vehicleRegistration: job.vehicleRegistration,
      serviceType: job.serviceType,
      pickupAddress: job.pickupAddress,
      garageName: job.garageName,
      completedAt: job.updatedAt,
      payout: calculatePayout(job),
    }));

    const totalEarnings = earnings.reduce((sum, e) => sum + e.payout, 0);
    const totalJobs = earnings.length;

    // Get earnings by period for comparison
    const [todayEarnings, weekEarnings, monthEarnings] = await Promise.all([
      Booking.find({
        assignedDriverId: user.driverProfile,
        status: "completed",
        updatedAt: { $gte: todayStart },
      }).lean(),
      Booking.find({
        assignedDriverId: user.driverProfile,
        status: "completed",
        updatedAt: { $gte: weekStart },
      }).lean(),
      Booking.find({
        assignedDriverId: user.driverProfile,
        status: "completed",
        updatedAt: { $gte: monthStart },
      }).lean(),
    ]);

    const stats = {
      today: {
        jobs: todayEarnings.length,
        earnings: todayEarnings.reduce((sum, j) => sum + calculatePayout(j), 0),
      },
      week: {
        jobs: weekEarnings.length,
        earnings: weekEarnings.reduce((sum, j) => sum + calculatePayout(j), 0),
      },
      month: {
        jobs: monthEarnings.length,
        earnings: monthEarnings.reduce((sum, j) => sum + calculatePayout(j), 0),
      },
      allTime: {
        jobs: driver.metrics?.completedJobs || 0,
        // Would need to calculate all-time earnings from all completed jobs
      },
    };

    // Calculate daily breakdown for the selected period
    const dailyBreakdown: Record<string, { jobs: number; earnings: number }> = {};
    completedJobs.forEach((job) => {
      const date = new Date(job.updatedAt).toISOString().split("T")[0];
      if (!dailyBreakdown[date]) {
        dailyBreakdown[date] = { jobs: 0, earnings: 0 };
      }
      dailyBreakdown[date].jobs += 1;
      dailyBreakdown[date].earnings += calculatePayout(job);
    });

    // Convert to array and sort by date
    const dailyData = Object.entries(dailyBreakdown)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Get pending payouts (accepted but not yet completed)
    const pendingJobs = await Booking.find({
      assignedDriverId: user.driverProfile,
      status: { $in: ["pending", "in_progress"] },
    }).lean();

    const pendingEarnings = pendingJobs.reduce((sum, j) => sum + calculatePayout(j), 0);

    return NextResponse.json({
      period,
      totalEarnings,
      totalJobs,
      pendingEarnings,
      pendingJobs: pendingJobs.length,
      stats,
      earnings: earnings.slice(0, 50), // Latest 50 transactions
      dailyData: dailyData.slice(0, 30), // Last 30 days
      averagePerJob: totalJobs > 0 ? Math.round(totalEarnings / totalJobs) : 0,
    });
  } catch (error) {
    console.error("Error fetching driver earnings:", error);
    return NextResponse.json(
      { error: "Failed to fetch earnings" },
      { status: 500 }
    );
  }
}
