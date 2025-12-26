// src/app/api/garage/analytics/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Garage from "@/models/Garage";
import Booking from "@/models/Booking";
import GarageReview, { calculateGarageRatingStats } from "@/models/GarageReview";
import GarageSubscription from "@/models/GarageSubscription";
import { logger } from "@/lib/logger";
import mongoose from "mongoose";

// Force dynamic rendering - this route uses headers via getServerSession
export const dynamic = 'force-dynamic';

// GET /api/garage/analytics - Get analytics data
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "garage") {
      return NextResponse.json({ error: "Not a garage user" }, { status: 403 });
    }

    await connectDB();

    const garage = await Garage.findOne({ userId: session.user.id });
    if (!garage) {
      return NextResponse.json({ error: "Garage not found" }, { status: 404 });
    }

    // Check subscription - analytics requires analytics or premium tier
    const subscription = await GarageSubscription.findOne({ garageId: garage._id });
    const hasAnalyticsAccess = subscription?.features?.analytics || false;

    // Get query params for date range
    const { searchParams } = new URL(request.url);
    const periodDays = parseInt(searchParams.get("period") || "30");
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);

    // Basic stats (available to all tiers)
    const basicStats = await getBasicStats(garage._id, startDate);

    // If no analytics access, return basic stats only
    if (!hasAnalyticsAccess) {
      return NextResponse.json({
        success: true,
        hasAnalyticsAccess: false,
        basicStats,
        message: "Upgrade to Analytics or Premium for detailed insights",
      });
    }

    // Full analytics for paid tiers
    const [
      revenueData,
      bookingTrends,
      serviceBreakdown,
      ratingStats,
      customerInsights,
      comparisonData,
    ] = await Promise.all([
      getRevenueAnalytics(garage._id, periodDays),
      getBookingTrends(garage._id, periodDays),
      getServiceBreakdown(garage._id, startDate),
      calculateGarageRatingStats(garage._id),
      getCustomerInsights(garage._id, startDate),
      getComparisonData(garage._id, periodDays),
    ]);

    return NextResponse.json({
      success: true,
      hasAnalyticsAccess: true,
      basicStats,
      revenueData,
      bookingTrends,
      serviceBreakdown,
      ratingStats,
      customerInsights,
      comparisonData,
      period: periodDays,
    });
  } catch (error) {
    logger.error("Error fetching analytics", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}

// Basic stats available to all tiers
async function getBasicStats(garageId: mongoose.Types.ObjectId, startDate: Date) {
  const [totalBookings, completedBookings, pendingBookings, totalReviews] = await Promise.all([
    Booking.countDocuments({
      assignedGarageId: garageId,
      createdAt: { $gte: startDate },
    }),
    Booking.countDocuments({
      assignedGarageId: garageId,
      status: "completed",
      createdAt: { $gte: startDate },
    }),
    Booking.countDocuments({
      assignedGarageId: garageId,
      status: "pending",
    }),
    GarageReview.countDocuments({
      garageId,
      status: "approved",
    }),
  ]);

  // Get average rating
  const ratingAgg = await GarageReview.aggregate([
    { $match: { garageId, status: "approved" } },
    { $group: { _id: null, avgRating: { $avg: "$overallRating" } } },
  ]);

  return {
    totalBookings,
    completedBookings,
    pendingBookings,
    totalReviews,
    averageRating: ratingAgg[0]?.avgRating ? Math.round(ratingAgg[0].avgRating * 10) / 10 : 0,
    completionRate: totalBookings > 0 ? Math.round((completedBookings / totalBookings) * 100) : 0,
  };
}

// Revenue analytics (paid tiers only)
async function getRevenueAnalytics(garageId: mongoose.Types.ObjectId, periodDays: number) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - periodDays);

  // Daily revenue for chart
  const dailyRevenue = await Booking.aggregate([
    {
      $match: {
        assignedGarageId: garageId,
        status: "completed",
        createdAt: { $gte: startDate },
        paymentAmount: { $exists: true, $gt: 0 },
      },
    },
    {
      $group: {
        _id: {
          $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
        },
        revenue: { $sum: "$paymentAmount" },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  // Total revenue this period
  const totalRevenue = dailyRevenue.reduce((sum, day) => sum + day.revenue, 0);

  // Previous period for comparison
  const prevStartDate = new Date(startDate);
  prevStartDate.setDate(prevStartDate.getDate() - periodDays);

  const prevPeriodRevenue = await Booking.aggregate([
    {
      $match: {
        assignedGarageId: garageId,
        status: "completed",
        createdAt: { $gte: prevStartDate, $lt: startDate },
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

  const prevTotal = prevPeriodRevenue[0]?.total || 0;
  const revenueChange = prevTotal > 0 ? ((totalRevenue - prevTotal) / prevTotal) * 100 : 0;

  return {
    dailyRevenue: dailyRevenue.map((d) => ({
      date: d._id,
      revenue: d.revenue / 100, // Convert cents to dollars
      bookings: d.count,
    })),
    totalRevenue: totalRevenue / 100,
    previousPeriodRevenue: prevTotal / 100,
    revenueChange: Math.round(revenueChange * 10) / 10,
    averageBookingValue: dailyRevenue.length > 0
      ? Math.round(totalRevenue / dailyRevenue.reduce((sum, d) => sum + d.count, 0) / 100)
      : 0,
  };
}

// Booking trends over time
async function getBookingTrends(garageId: mongoose.Types.ObjectId, periodDays: number) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - periodDays);

  const dailyBookings = await Booking.aggregate([
    {
      $match: {
        assignedGarageId: garageId,
        createdAt: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          status: "$status",
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { "_id.date": 1 } },
  ]);

  // Transform into chart-friendly format
  const dateMap = new Map<string, { completed: number; pending: number; cancelled: number }>();

  dailyBookings.forEach((item) => {
    const date = item._id.date;
    if (!dateMap.has(date)) {
      dateMap.set(date, { completed: 0, pending: 0, cancelled: 0 });
    }
    const entry = dateMap.get(date)!;
    if (item._id.status === "completed") entry.completed = item.count;
    else if (item._id.status === "pending" || item._id.status === "in_progress") entry.pending += item.count;
    else if (item._id.status === "cancelled") entry.cancelled = item.count;
  });

  return Array.from(dateMap.entries()).map(([date, counts]) => ({
    date,
    ...counts,
    total: counts.completed + counts.pending + counts.cancelled,
  }));
}

// Service breakdown
async function getServiceBreakdown(garageId: mongoose.Types.ObjectId, startDate: Date) {
  const breakdown = await Booking.aggregate([
    {
      $match: {
        assignedGarageId: garageId,
        createdAt: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: "$serviceType",
        count: { $sum: 1 },
        revenue: { $sum: "$paymentAmount" },
        completed: {
          $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
        },
      },
    },
    { $sort: { count: -1 } },
  ]);

  return breakdown.map((item) => ({
    service: item._id || "Other",
    count: item.count,
    revenue: (item.revenue || 0) / 100,
    completionRate: item.count > 0 ? Math.round((item.completed / item.count) * 100) : 0,
  }));
}

// Customer insights
async function getCustomerInsights(garageId: mongoose.Types.ObjectId, startDate: Date) {
  // New vs returning customers
  const customerStats = await Booking.aggregate([
    {
      $match: {
        assignedGarageId: garageId,
        createdAt: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: "$userEmail",
        bookingCount: { $sum: 1 },
        firstBooking: { $min: "$createdAt" },
        lastBooking: { $max: "$createdAt" },
        totalSpent: { $sum: "$paymentAmount" },
      },
    },
  ]);

  const newCustomers = customerStats.filter((c) => c.bookingCount === 1).length;
  const returningCustomers = customerStats.filter((c) => c.bookingCount > 1).length;
  const totalCustomers = customerStats.length;

  // Top customers by spend
  const topCustomers = customerStats
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, 5)
    .map((c) => ({
      email: c._id.substring(0, 3) + "***@***", // Anonymize
      bookings: c.bookingCount,
      totalSpent: c.totalSpent / 100,
    }));

  return {
    totalCustomers,
    newCustomers,
    returningCustomers,
    returnRate: totalCustomers > 0 ? Math.round((returningCustomers / totalCustomers) * 100) : 0,
    topCustomers,
  };
}

// Comparison with previous period
async function getComparisonData(garageId: mongoose.Types.ObjectId, periodDays: number) {
  const currentStart = new Date();
  currentStart.setDate(currentStart.getDate() - periodDays);

  const previousStart = new Date(currentStart);
  previousStart.setDate(previousStart.getDate() - periodDays);

  const [currentPeriod, previousPeriod] = await Promise.all([
    Booking.aggregate([
      {
        $match: {
          assignedGarageId: garageId,
          createdAt: { $gte: currentStart },
        },
      },
      {
        $group: {
          _id: null,
          bookings: { $sum: 1 },
          revenue: { $sum: "$paymentAmount" },
          completed: {
            $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
          },
        },
      },
    ]),
    Booking.aggregate([
      {
        $match: {
          assignedGarageId: garageId,
          createdAt: { $gte: previousStart, $lt: currentStart },
        },
      },
      {
        $group: {
          _id: null,
          bookings: { $sum: 1 },
          revenue: { $sum: "$paymentAmount" },
          completed: {
            $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
          },
        },
      },
    ]),
  ]);

  const current = currentPeriod[0] || { bookings: 0, revenue: 0, completed: 0 };
  const previous = previousPeriod[0] || { bookings: 0, revenue: 0, completed: 0 };

  const calcChange = (curr: number, prev: number) =>
    prev > 0 ? Math.round(((curr - prev) / prev) * 100) : curr > 0 ? 100 : 0;

  return {
    bookings: {
      current: current.bookings,
      previous: previous.bookings,
      change: calcChange(current.bookings, previous.bookings),
    },
    revenue: {
      current: current.revenue / 100,
      previous: previous.revenue / 100,
      change: calcChange(current.revenue, previous.revenue),
    },
    completionRate: {
      current: current.bookings > 0 ? Math.round((current.completed / current.bookings) * 100) : 0,
      previous: previous.bookings > 0 ? Math.round((previous.completed / previous.bookings) * 100) : 0,
      change: 0, // Calculate if needed
    },
  };
}
