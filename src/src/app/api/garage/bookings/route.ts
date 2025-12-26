// src/app/api/garage/bookings/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import Garage from "@/models/Garage";
import Booking from "@/models/Booking";

export const dynamic = "force-dynamic";

// GET - Fetch acknowledged bookings for the garage (not new/incoming)
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
      return NextResponse.json({
        success: true,
        bookings: [],
        counts: { all: 0, acknowledged: 0, inProgress: 0, completed: 0 },
        garageName: garage.businessName,
      });
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get("status"); // 'acknowledged', 'in_progress', 'completed'

    // Base query - only show acknowledged bookings (not new/incoming)
    // These are bookings assigned to this garage with garageStatus != 'new'
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const baseQuery: Record<string, any> = {
      assignedGarageId: garage._id,
      garageStatus: { $nin: ["new", null] },
    };

    // Build specific query based on filter
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query: Record<string, any> = { ...baseQuery };

    if (statusFilter === "acknowledged") {
      // Acknowledged but not started yet
      query.garageStatus = "acknowledged";
      query.status = "pending";
    } else if (statusFilter === "in_progress") {
      query.status = "in_progress";
    } else if (statusFilter === "completed") {
      query.status = "completed";
    }
    // 'all' or no filter - use baseQuery (everything except new)

    const bookings = await Booking.find(query)
      .sort({ createdAt: -1 })
      .lean();

    // Get counts for tabs
    const counts = {
      all: await Booking.countDocuments({
        assignedGarageId: garage._id,
        garageStatus: { $nin: ["new", null] },
      }),
      acknowledged: await Booking.countDocuments({
        assignedGarageId: garage._id,
        garageStatus: "acknowledged",
        status: "pending",
      }),
      inProgress: await Booking.countDocuments({
        assignedGarageId: garage._id,
        status: "in_progress",
      }),
      completed: await Booking.countDocuments({
        assignedGarageId: garage._id,
        status: "completed",
      }),
    };

    return NextResponse.json({
      success: true,
      bookings,
      counts,
      garageName: garage.businessName,
    });
  } catch (error) {
    console.error("Error fetching garage bookings:", error);
    return NextResponse.json(
      { error: "Failed to fetch bookings" },
      { status: 500 }
    );
  }
}
