// src/app/api/driver/history/route.ts
// Driver job history — served PER LEG so the History page can show pickups
// and returns (drop-offs) in separate tabs. Includes assigned/in-progress
// legs as well as completed and cancelled ones.
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Booking from "@/models/Booking";
import Driver from "@/models/Driver";
import User from "@/models/User";

export const dynamic = "force-dynamic";

type Leg = "pickup" | "return";
type LegStatus = "assigned" | "in_progress" | "completed" | "cancelled";

// Helper to calculate payout for a booking (same formula as the jobs API)
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

// Derive the status of ONE leg of a booking for this driver.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function deriveLegStatus(job: any, leg: Leg): LegStatus {
  if (job.status === "cancelled") return "cancelled";
  const legState = leg === "pickup" ? job.pickupDriver : job.returnDriver;
  if (legState?.completedAt) return "completed";
  if (legState?.startedAt) return "in_progress";
  return "assigned";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatLegJob(job: any, leg: Leg): Record<string, unknown> {
  const legStatus = deriveLegStatus(job, leg);
  const legState = leg === "pickup" ? job.pickupDriver : job.returnDriver;
  return {
    _id: job._id.toString(),
    leg,
    legStatus,
    customerName: job.userName,
    vehicleRegistration: job.vehicleRegistration,
    vehicleState: job.vehicleState,
    vehicleModel: job.vehicleModel || null,
    vehicleYear: job.vehicleYear || null,
    serviceType: job.serviceType,
    pickupAddress: job.pickupAddress,
    garageName: job.garageName || null,
    garageAddress: job.garageAddress || null,
    pickupTime: job.pickupTime,
    dropoffTime: job.dropoffTime,
    serviceDate: job.serviceDate || null,
    trackingCode: job.trackingCode || null,
    isManualTransmission: job.isManualTransmission || false,
    createdAt: job.createdAt,
    startedAt: legState?.startedAt || null,
    completedAt: legState?.completedAt || null,
    cancelledAt: job.cancellation?.cancelledAt || null,
    cancellationReason: job.cancellation?.reason || null,
    payout: legStatus === "completed" ? calculatePayout(job) : 0,
    updates: job.updates?.slice(-5) || [],
  };
}

// GET /api/driver/history?leg=pickup|return&status=all|assigned|in_progress|completed|cancelled&sortBy=recent|oldest&page=N
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
    const leg: Leg = searchParams.get("leg") === "return" ? "return" : "pickup";
    const status = searchParams.get("status") || "all";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);
    const sortBy = searchParams.get("sortBy") || "recent";

    await connectDB();

    const user = await User.findById(session.user.id);
    if (!user?.driverProfile) {
      return NextResponse.json({ error: "Driver profile not found" }, { status: 404 });
    }

    const driver = await Driver.findById(user.driverProfile);
    if (!driver) {
      return NextResponse.json({ error: "Driver not found" }, { status: 404 });
    }

    const profileId = user.driverProfile;
    const legField = leg === "pickup" ? "assignedDriverId" : "returnDriverId";
    const legPrefix = leg === "pickup" ? "pickupDriver" : "returnDriver";

    // Build the leg-status filter
    const query: Record<string, unknown> = { [legField]: profileId };
    if (status === "cancelled") {
      query.status = "cancelled";
    } else if (status === "completed") {
      query.status = { $ne: "cancelled" };
      query[`${legPrefix}.completedAt`] = { $exists: true };
    } else if (status === "in_progress") {
      query.status = { $ne: "cancelled" };
      query[`${legPrefix}.startedAt`] = { $exists: true };
      query[`${legPrefix}.completedAt`] = { $exists: false };
    } else if (status === "assigned") {
      query.status = { $ne: "cancelled" };
      query[`${legPrefix}.startedAt`] = { $exists: false };
      query[`${legPrefix}.completedAt`] = { $exists: false };
    }
    // status === "all" → no extra filter: every booking this driver is/was on

    const skip = (page - 1) * limit;
    const sortOrder = sortBy === "oldest" ? 1 : -1;

    const [jobs, total, pickupCount, returnCount] = await Promise.all([
      Booking.find(query)
        .sort({ updatedAt: sortOrder })
        .skip(skip)
        .limit(limit)
        .lean(),
      Booking.countDocuments(query),
      Booking.countDocuments({ assignedDriverId: profileId }),
      Booking.countDocuments({ returnDriverId: profileId }),
    ]);

    const formattedJobs = jobs.map((job) => formatLegJob(job, leg));

    // ── Stats (across BOTH legs, each booking counted once) ──
    const [involved, completedPickups, completedReturns] = await Promise.all([
      Booking.find({
        $or: [{ assignedDriverId: profileId }, { returnDriverId: profileId }],
      })
        .select(
          "status isManualTransmission pickupTime assignedDriverId returnDriverId pickupDriver.completedAt pickupDriver.startedAt returnDriver.completedAt returnDriver.startedAt"
        )
        .lean(),
      Booking.countDocuments({
        assignedDriverId: profileId,
        "pickupDriver.completedAt": { $exists: true },
        status: { $ne: "cancelled" },
      }),
      Booking.countDocuments({
        returnDriverId: profileId,
        "returnDriver.completedAt": { $exists: true },
        status: { $ne: "cancelled" },
      }),
    ]);

    let totalEarnings = 0;
    let activeAssigned = 0;
    let cancelledCount = 0;
    for (const b of involved) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const job = b as any;
      const isPickup = job.assignedDriverId?.toString() === profileId.toString();
      const isReturn = job.returnDriverId?.toString() === profileId.toString();
      if (job.status === "cancelled") {
        cancelledCount += 1;
        continue;
      }
      const pickupDone = isPickup && job.pickupDriver?.completedAt;
      const returnDone = isReturn && job.returnDriver?.completedAt;
      // Earnings: count each completed leg's booking payout once per booking
      // (matches previous behaviour where a full job earned one payout).
      if (pickupDone || returnDone) totalEarnings += calculatePayout(job);
      const pickupOpen = isPickup && !job.pickupDriver?.completedAt;
      const returnOpen = isReturn && !job.returnDriver?.completedAt;
      if (pickupOpen || returnOpen) activeAssigned += 1;
    }

    const totalLegsCompleted = completedPickups + completedReturns;
    const totalLegsFinished = totalLegsCompleted + cancelledCount;

    return NextResponse.json({
      jobs: formattedJobs,
      total,
      page,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      counts: {
        pickup: pickupCount,
        return: returnCount,
      },
      stats: {
        completedPickups,
        completedReturns,
        activeAssigned,
        cancelled: cancelledCount,
        totalEarnings,
        completionRate:
          totalLegsFinished > 0
            ? Math.round((totalLegsCompleted / totalLegsFinished) * 100)
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
