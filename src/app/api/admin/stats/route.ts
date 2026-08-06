// src/app/api/admin/stats/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Booking from "@/models/Booking";
import User from "@/models/User";
import Driver from "@/models/Driver";
import { requireAdmin } from "@/lib/admin";

// Dashboard time ranges (2026-08-07 redesign). "week" = last 7 days,
// "month" = calendar month to date, "year" = calendar year to date.
// The previous period is the same length immediately before, for deltas.
type RangeKey = "week" | "month" | "year";

function resolveRange(key: RangeKey, now: Date) {
  if (key === "week") {
    const start = new Date(now);
    start.setDate(now.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    const prevStart = new Date(start);
    prevStart.setDate(start.getDate() - 7);
    return { start, prevStart, prevEnd: start };
  }
  if (key === "year") {
    const start = new Date(now.getFullYear(), 0, 1);
    const prevStart = new Date(now.getFullYear() - 1, 0, 1);
    return { start, prevStart, prevEnd: start };
  }
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return { start, prevStart, prevEnd: start };
}

// GET /api/admin/stats?range=week|month|year - Get dashboard statistics
export async function GET(request: NextRequest) {
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

    const rangeParam = request.nextUrl.searchParams.get("range");
    const rangeKey: RangeKey =
      rangeParam === "week" || rangeParam === "year" ? rangeParam : "month";
    const { start: rangeStart, prevStart, prevEnd } = resolveRange(rangeKey, now);
    // Chart buckets: daily for week/month, monthly for year
    const bucketFormat = rangeKey === "year" ? "%Y-%m" : "%Y-%m-%d";

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

      // Recent bookings (last 10) — paymentAmount added for the dashboard
      // transactions card (2026-08-07)
      Booking.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .select("userName userEmail vehicleRegistration vehicleState serviceType currentStage status isGuest paymentStatus paymentAmount createdAt")
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

    // ── Range block for the dashboard widgets (2026-08-07 redesign) ──
    // Separate Promise.all so the original response shape stays untouched
    // for any other consumer.
    const revenueIfPaid = {
      $cond: [{ $eq: ["$paymentStatus", "paid"] }, "$paymentAmount", 0],
    };
    const [
      rangeAgg,
      prevAgg,
      seriesAgg,
      rangeCompletionAgg,
      driversOnShift,
    ] = await Promise.all([
      Booking.aggregate([
        { $match: { createdAt: { $gte: rangeStart } } },
        {
          $group: {
            _id: null,
            bookings: { $sum: 1 },
            revenue: { $sum: revenueIfPaid },
          },
        },
      ]),
      Booking.aggregate([
        { $match: { createdAt: { $gte: prevStart, $lt: prevEnd } } },
        {
          $group: {
            _id: null,
            bookings: { $sum: 1 },
            revenue: { $sum: revenueIfPaid },
          },
        },
      ]),
      Booking.aggregate([
        { $match: { createdAt: { $gte: rangeStart } } },
        {
          $group: {
            _id: {
              $dateToString: {
                format: bucketFormat,
                date: "$createdAt",
                timezone: "Australia/Sydney",
              },
            },
            bookings: { $sum: 1 },
            revenue: { $sum: revenueIfPaid },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Booking.aggregate([
        {
          $match: {
            createdAt: { $gte: rangeStart },
            status: { $ne: "cancelled" },
          },
        },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ]),
      Driver.countDocuments({ isClockedIn: true }),
    ]);

    const rangeTotals = rangeAgg[0] || { bookings: 0, revenue: 0 };
    const prevTotals = prevAgg[0] || { bookings: 0, revenue: 0 };
    const completionCounts = rangeCompletionAgg.reduce(
      (acc, item) => {
        acc.total += item.count;
        if (item._id === "completed") acc.completed += item.count;
        return acc;
      },
      { completed: 0, total: 0 }
    );

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
      // Range block for the dashboard widgets (2026-08-07)
      range: {
        key: rangeKey,
        bookings: rangeTotals.bookings,
        revenue: rangeTotals.revenue,
        prevBookings: prevTotals.bookings,
        prevRevenue: prevTotals.revenue,
        series: seriesAgg.map((s) => ({
          bucket: s._id as string,
          bookings: s.bookings as number,
          revenue: s.revenue as number,
        })),
        completed: completionCounts.completed,
        completionTotal: completionCounts.total,
        driversOnShift,
      },
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch statistics" },
      { status: 500 }
    );
  }
}
