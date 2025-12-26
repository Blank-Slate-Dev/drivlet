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

export const dynamic = "force-dynamic";

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
  const revenueChange = prevTotal > 0 
    ? Math.round(((totalRevenue - prevTotal) / prevTotal) * 100)
    : 0;

  return {
    dailyRevenue,
    totalRevenue,
    previousPeriodRevenue: prevTotal,
    revenueChange,
    averagePerBooking: dailyRevenue.length > 0
      ? Math.round(totalRevenue / dailyRevenue.reduce((sum, d) => sum + d.count, 0))
      : 0,
  };
}

// Booking trends
async function getBookingTrends(garageId: mongoose.Types.ObjectId, periodDays: number) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - periodDays);

  const trends = await Booking.aggregate([
    {
      $match: {
        assignedGarageId: garageId,
        createdAt: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: {
          $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
        },
        total: { $sum: 1 },
        completed: {
          $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
        },
        cancelled: {
          $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] },
        },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  return trends;
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
        revenue: { $sum: { $ifNull: ["$paymentAmount", 0] } },
      },
    },
    { $sort: { count: -1 } },
  ]);

  return breakdown.map((item) => ({
    service: item._id || "Other",
    count: item.count,
    revenue: item.revenue,
  }));
}

// Customer insights
async function getCustomerInsights(garageId: mongoose.Types.ObjectId, startDate: Date) {
  const [totalCustomers, repeatCustomers, newCustomers] = await Promise.all([
    Booking.distinct("userEmail", {
      assignedGarageId: garageId,
      createdAt: { $gte: startDate },
    }),
    Booking.aggregate([
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
        },
      },
      {
        $match: {
          bookingCount: { $gt: 1 },
        },
      },
    ]),
    Booking.aggregate([
      {
        $match: {
          assignedGarageId: garageId,
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: "$userEmail",
          firstBooking: { $min: "$createdAt" },
        },
      },
      {
        $match: {
          firstBooking: { $gte: startDate },
        },
      },
    ]),
  ]);

  return {
    totalCustomers: totalCustomers.length,
    repeatCustomers: repeatCustomers.length,
    newCustomers: newCustomers.length,
    repeatRate: totalCustomers.length > 0
      ? Math.round((repeatCustomers.length / totalCustomers.length) * 100)
      : 0,
  };
}

// Comparison with previous period
async function getComparisonData(garageId: mongoose.Types.ObjectId, periodDays: number) {
  const now = new Date();
  const currentStart = new Date(now);
  currentStart.setDate(currentStart.getDate() - periodDays);

  const previousStart = new Date(currentStart);
  previousStart.setDate(previousStart.getDate() - periodDays);

  const [current, previous] = await Promise.all([
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
          completed: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
          revenue: { $sum: { $ifNull: ["$paymentAmount", 0] } },
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
          completed: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
          revenue: { $sum: { $ifNull: ["$paymentAmount", 0] } },
        },
      },
    ]),
  ]);

  const curr = current[0] || { bookings: 0, completed: 0, revenue: 0 };
  const prev = previous[0] || { bookings: 0, completed: 0, revenue: 0 };

  return {
    bookingsChange: prev.bookings > 0
      ? Math.round(((curr.bookings - prev.bookings) / prev.bookings) * 100)
      : 0,
    revenueChange: prev.revenue > 0
      ? Math.round(((curr.revenue - prev.revenue) / prev.revenue) * 100)
      : 0,
    completionRateChange: 0, // Calculate if needed
    currentPeriod: curr,
    previousPeriod: prev,
  };
}
