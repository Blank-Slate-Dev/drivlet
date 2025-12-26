// src/app/api/driver/history/route.ts
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
  let payout = 25;
  if (booking.isManualTransmission) payout += 5;
  const pickupHour = parseInt(booking.pickupTime?.split(":")[0] || "9");
  if (pickupHour < 7 || pickupHour > 18) payout += 10;
  return payout;
}

// GET /api/driver/history - Get driver's job history
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
    const status = searchParams.get("status") || "all"; // all, completed, cancelled
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);
    const sortBy = searchParams.get("sortBy") || "recent"; // recent, oldest

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

    // Build query
    const query: Record<string, unknown> = {
      assignedDriverId: user.driverProfile,
    };

    if (status === "completed") {
      query.status = "completed";
    } else if (status === "cancelled") {
      query.status = "cancelled";
    } else {
      // All history - completed and cancelled
      query.status = { $in: ["completed", "cancelled"] };
    }

    const skip = (page - 1) * limit;
    const sortOrder = sortBy === "oldest" ? 1 : -1;

    const [jobs, total, completedCount, cancelledCount] = await Promise.all([
      Booking.find(query)
        .sort({ updatedAt: sortOrder })
        .skip(skip)
        .limit(limit)
        .lean(),
      Booking.countDocuments(query),
      Booking.countDocuments({
        assignedDriverId: user.driverProfile,
        status: "completed",
      }),
      Booking.countDocuments({
        assignedDriverId: user.driverProfile,
        status: "cancelled",
      }),
    ]);

    // Format jobs for response
    const formattedJobs = jobs.map((job) => ({
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
      status: job.status,
      currentStage: job.currentStage,
      isManualTransmission: job.isManualTransmission || false,
      hasExistingBooking: job.hasExistingBooking,
      createdAt: job.createdAt,
      completedAt: job.status === "completed" ? job.updatedAt : null,
      cancelledAt: job.cancellation?.cancelledAt || null,
      cancellationReason: job.cancellation?.reason || null,
      payout: job.status === "completed" ? calculatePayout(job) : 0,
      // Include timeline updates
      updates: job.updates?.slice(-5) || [], // Last 5 updates
    }));

    // Calculate stats
    const totalEarnings = formattedJobs
      .filter((j) => j.status === "completed")
      .reduce((sum, j) => sum + j.payout, 0);

    return NextResponse.json({
      jobs: formattedJobs,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      stats: {
        completed: completedCount,
        cancelled: cancelledCount,
        totalEarnings,
        completionRate:
          completedCount + cancelledCount > 0
            ? Math.round((completedCount / (completedCount + cancelledCount)) * 100)
            : 100,
      },
      driverMetrics: {
        totalJobs: driver.metrics?.totalJobs || 0,
        completedJobs: driver.metrics?.completedJobs || 0,
        averageRating: driver.metrics?.averageRating || 0,
        totalRatings: driver.metrics?.totalRatings || 0,
      },
    });
  } catch (error) {
    console.error("Error fetching driver history:", error);
    return NextResponse.json(
      { error: "Failed to fetch history" },
      { status: 500 }
    );
  }
}
