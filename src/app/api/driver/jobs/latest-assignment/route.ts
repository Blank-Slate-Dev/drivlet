// src/app/api/driver/jobs/latest-assignment/route.ts
// Lightweight poll target for the driver layout: returns the timestamp of the
// most recent job assignment for this driver (either leg, active bookings).
// The layout compares it to the locally-stored "jobs last seen" time to show
// a notification dot on the Jobs tab.
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Booking from "@/models/Booking";
import User from "@/models/User";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role !== "driver") {
      return NextResponse.json({ error: "Not a driver" }, { status: 403 });
    }

    await connectDB();

    const user = await User.findById(session.user.id).select("driverProfile");
    if (!user?.driverProfile) {
      return NextResponse.json({ latestAssignedAt: null });
    }
    const profileId = user.driverProfile;

    const bookings = await Booking.find({
      status: { $nin: ["completed", "cancelled"] },
      "cancellation.cancelledAt": { $exists: false },
      $or: [{ assignedDriverId: profileId }, { returnDriverId: profileId }],
    })
      .select("assignedDriverId returnDriverId pickupDriver.assignedAt returnDriver.assignedAt")
      .sort({ updatedAt: -1 })
      .limit(100)
      .lean();

    let latest = 0;
    const profileStr = profileId.toString();
    for (const b of bookings) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const job = b as any;
      if (job.assignedDriverId?.toString() === profileStr && job.pickupDriver?.assignedAt) {
        latest = Math.max(latest, new Date(job.pickupDriver.assignedAt).getTime());
      }
      if (job.returnDriverId?.toString() === profileStr && job.returnDriver?.assignedAt) {
        latest = Math.max(latest, new Date(job.returnDriver.assignedAt).getTime());
      }
    }

    return NextResponse.json({
      latestAssignedAt: latest > 0 ? new Date(latest).toISOString() : null,
    });
  } catch (error) {
    console.error("Error fetching latest assignment:", error);
    return NextResponse.json({ latestAssignedAt: null });
  }
}
