// src/app/api/admin/stats/route.ts
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Booking from "@/models/Booking";
import User from "@/models/User";
import { requireAdmin } from "@/lib/admin";

// GET /api/admin/stats - Get dashboard statistics
export async function GET() {
  const adminCheck = await requireAdmin();
  if (!adminCheck.authorized) {
    return adminCheck.response;
  }

  try {
    await connectDB();

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const [
      totalBookings,
      pendingBookings,
      activeBookings,
      completedBookings,
      completedToday,
      completedThisWeek,
      totalUsers,
      recentBookings,
      bookingsByStage,
    ] = await Promise.all([
      // Total bookings
      Booking.countDocuments(),

      // Pending bookings
      Booking.countDocuments({ status: "pending" }),

      // Active bookings (in progress)
      Booking.countDocuments({ status: "active" }),

      // Completed bookings
      Booking.countDocuments({ status: "completed" }),

      // Completed today
      Booking.countDocuments({
        status: "completed",
        updatedAt: { $gte: startOfToday },
      }),

      // Completed this week
      Booking.countDocuments({
        status: "completed",
        updatedAt: { $gte: startOfWeek },
      }),

      // Total users
      User.countDocuments(),

      // Recent bookings (last 10)
      Booking.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .select("userName userEmail vehicle serviceType currentStage status createdAt")
        .lean(),

      // Bookings by stage
      Booking.aggregate([
        { $match: { status: { $ne: "cancelled" } } },
        { $group: { _id: "$currentStage", count: { $sum: 1 } } },
      ]),
    ]);

    // Transform bookings by stage into an object
    const stageStats = bookingsByStage.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({
      overview: {
        totalBookings,
        pendingBookings,
        activeBookings,
        completedBookings,
        completedToday,
        completedThisWeek,
        totalUsers,
      },
      stageStats,
      recentBookings,
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch statistics" },
      { status: 500 }
    );
  }
}
