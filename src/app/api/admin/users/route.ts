// src/app/api/admin/users/route.ts
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import Booking from "@/models/Booking";
import { requireAdmin } from "@/lib/admin";

// GET /api/admin/users - Get all users with booking counts
export async function GET() {
  const adminCheck = await requireAdmin();
  if (!adminCheck.authorized) {
    return adminCheck.response;
  }

  try {
    await connectDB();

    // Get all users (excluding password)
    const users = await User.find({})
      .select("-password")
      .sort({ createdAt: -1 })
      .lean();

    // Get booking counts for each user
    const userIds = users.map((user) => user._id.toString());
    const bookingCounts = await Booking.aggregate([
      {
        $match: {
          userId: { $in: userIds },
        },
      },
      {
        $group: {
          _id: "$userId",
          count: { $sum: 1 },
        },
      },
    ]);

    // Create a map of userId to booking count
    const bookingCountMap: Record<string, number> = {};
    bookingCounts.forEach((item) => {
      bookingCountMap[item._id] = item.count;
    });

    // Add booking count to each user
    const usersWithBookings = users.map((user) => ({
      ...user,
      _id: user._id.toString(),
      bookingCount: bookingCountMap[user._id.toString()] || 0,
    }));

    // Calculate statistics
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    const stats = {
      totalUsers: users.length,
      activeUsers: usersWithBookings.filter((u) => u.bookingCount > 0).length,
      newThisWeek: users.filter(
        (u) => new Date(u.createdAt) >= weekAgo
      ).length,
      newToday: users.filter((u) => new Date(u.createdAt) >= today).length,
    };

    return NextResponse.json({
      users: usersWithBookings,
      stats,
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}
