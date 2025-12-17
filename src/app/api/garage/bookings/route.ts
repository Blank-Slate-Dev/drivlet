// src/app/api/garage/bookings/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import Garage from "@/models/Garage";
import Booking from "@/models/Booking";

// GET - Fetch bookings for the garage
export async function GET(request: Request) {
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

    // Only show bookings to approved garages
    if (garage.status !== "approved") {
      return NextResponse.json({ bookings: [] });
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Build query
    // For now, fetch bookings that:
    // 1. Are assigned to this garage, OR
    // 2. Are new (no garage assigned) and within service area
    // Since we don't have geolocation for bookings yet, we'll show all new bookings
    // to approved garages
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: Record<string, any> = {};

    if (status && status !== "all") {
      query.garageStatus = status;
    } else {
      // Show bookings assigned to this garage OR new bookings
      query.$or = [
        { assignedGarageId: garage._id.toString() },
        { assignedGarageId: null, garageStatus: "new" },
        { assignedGarageId: { $exists: false }, garageStatus: { $in: ["new", undefined] } },
      ];
    }

    const bookings = await Booking.find(query)
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .lean();

    const total = await Booking.countDocuments(query);

    return NextResponse.json({
      bookings,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Error fetching garage bookings:", error);
    return NextResponse.json(
      { error: "Failed to fetch bookings" },
      { status: 500 }
    );
  }
}
