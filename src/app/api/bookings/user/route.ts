// src/app/api/bookings/user/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectDB } from "@/lib/mongodb";
import Booking from "@/models/Booking";

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const sortBy = searchParams.get("sortBy") || "newest";
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    await connectDB();

    // Build query - filter by user's email
    const query: Record<string, unknown> = {
      userEmail: session.user.email,
    };

    // Filter by status if provided
    if (status && status !== "all") {
      query.status = status;
    }

    // Date range filter
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        (query.createdAt as Record<string, Date>).$gte = new Date(startDate);
      }
      if (endDate) {
        (query.createdAt as Record<string, Date>).$lte = new Date(endDate);
      }
    }

    // Determine sort order
    let sortOrder: Record<string, 1 | -1> = { createdAt: -1 };
    if (sortBy === "oldest") {
      sortOrder = { createdAt: 1 };
    } else if (sortBy === "pickup") {
      sortOrder = { pickupTime: -1 };
    }

    const bookings = await Booking.find(query)
      .sort(sortOrder)
      .lean();

    // Get stats for the user
    const stats = await Booking.aggregate([
      { $match: { userEmail: session.user.email } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const statsMap: Record<string, number> = {
      pending: 0,
      in_progress: 0,
      completed: 0,
      cancelled: 0,
      total: 0,
    };

    stats.forEach((stat) => {
      statsMap[stat._id] = stat.count;
      statsMap.total += stat.count;
    });

    return NextResponse.json({
      bookings,
      stats: statsMap,
    });
  } catch (error) {
    console.error("Error fetching user bookings:", error);
    return NextResponse.json(
      { error: "Failed to fetch bookings" },
      { status: 500 }
    );
  }
}
