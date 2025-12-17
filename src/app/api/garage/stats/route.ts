// src/app/api/garage/stats/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import Garage from "@/models/Garage";
import Booking from "@/models/Booking";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "garage") {
      return NextResponse.json({ error: "Not a garage user" }, { status: 403 });
    }

    await connectDB();

    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const garage = await Garage.findOne({ userId: user._id });
    if (!garage) {
      return NextResponse.json({ error: "Garage profile not found" }, { status: 404 });
    }

    // Calculate date ranges
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Count bookings with different statuses
    // For pending: new bookings (unassigned or assigned to this garage but not accepted)
    const pendingCount = await Booking.countDocuments({
      $or: [
        { assignedGarageId: null, garageStatus: "new" },
        { assignedGarageId: { $exists: false } },
        { assignedGarageId: garage._id, garageStatus: { $in: ["new", "accepted"] } },
      ],
    });

    // Accepted bookings for this garage
    const acceptedCount = await Booking.countDocuments({
      assignedGarageId: garage._id,
      garageStatus: "accepted",
    });

    // Completed bookings this month for this garage
    const completedThisMonth = await Booking.countDocuments({
      assignedGarageId: garage._id,
      garageStatus: "completed",
      garageCompletedAt: { $gte: startOfMonth },
    });

    // Calculate total revenue from completed bookings this month
    const revenueAggregation = await Booking.aggregate([
      {
        $match: {
          assignedGarageId: garage._id,
          garageStatus: "completed",
          garageCompletedAt: { $gte: startOfMonth },
          paymentAmount: { $exists: true, $gt: 0 },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$paymentAmount" },
        },
      },
    ]);

    const totalRevenue = revenueAggregation[0]?.total || 0;

    // For now, we don't have a reviews system, so we'll return placeholder values
    // In a real implementation, you'd query a Reviews collection
    const averageRating = 0;
    const totalReviews = 0;

    return NextResponse.json({
      pendingBookings: pendingCount,
      acceptedBookings: acceptedCount,
      completedThisMonth,
      totalRevenue: totalRevenue / 100, // Convert cents to dollars
      averageRating,
      totalReviews,
    });
  } catch (error) {
    console.error("Error fetching garage stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch statistics" },
      { status: 500 }
    );
  }
}
