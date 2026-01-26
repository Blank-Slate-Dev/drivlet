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
      cancelledBookings,
      completedToday,
      completedThisWeek,
      totalUsers,
      guestBookings,
      paidBookings,
      recentBookings,
      bookingsByStage,
      todaysBookings,
      thisWeeksRevenue,
      allTimeRevenue,
    ] = await Promise.all([
      // Total bookings
      Booking.countDocuments(),

      // Pending bookings (waiting to be started)
      Booking.countDocuments({ status: "pending" }),

      // Active bookings (in progress) - FIXED: was "active", should be "in_progress"
      Booking.countDocuments({ status: "in_progress" }),

      // Completed bookings
      Booking.countDocuments({ status: "completed" }),

      // Cancelled bookings
      Booking.countDocuments({ status: "cancelled" }),

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

      // Total registered users
      User.countDocuments(),

      // Guest bookings count
      Booking.countDocuments({ isGuest: true }),

      // Paid bookings
      Booking.countDocuments({ paymentStatus: "paid" }),

      // Recent bookings (last 10)
      Booking.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .select("userName userEmail vehicleRegistration vehicleState serviceType currentStage status isGuest paymentStatus createdAt")
        .lean(),

      // Bookings by stage (excluding cancelled)
      Booking.aggregate([
        { $match: { status: { $ne: "cancelled" } } },
        { $group: { _id: "$currentStage", count: { $sum: 1 } } },
      ]),

      // Today's bookings
      Booking.countDocuments({
        createdAt: { $gte: startOfToday },
      }),

      // This week's revenue (paid bookings)
      Booking.aggregate([
        {
          $match: {
            paymentStatus: "paid",
            createdAt: { $gte: startOfWeek },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$paymentAmount" },
          },
        },
      ]),

      // Total earnings from all paid bookings (all time)
      Booking.aggregate([
        {
          $match: {
            paymentStatus: "paid",
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$paymentAmount" },
          },
        },
      ]),
    ]);

    // Transform bookings by stage into an object
    const stageStats = bookingsByStage.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {} as Record<string, number>);

    // Calculate weekly revenue
    const weeklyRevenue = thisWeeksRevenue.length > 0 ? thisWeeksRevenue[0].total : 0;

    // Calculate total earnings (all time)
    const totalEarnings = allTimeRevenue.length > 0 ? allTimeRevenue[0].total : 0;

    return NextResponse.json({
      overview: {
        totalBookings,
        pendingBookings,
        activeBookings,
        completedBookings,
        cancelledBookings,
        completedToday,
        completedThisWeek,
        totalUsers,
        guestBookings,
        paidBookings,
        todaysBookings,
        weeklyRevenue,
        totalEarnings,
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
