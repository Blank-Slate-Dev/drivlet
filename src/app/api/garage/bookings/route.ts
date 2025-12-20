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
    // Fetch bookings that:
    // 1. Are assigned to this garage, OR
    // 2. Are new (no garage assigned) and match this garage's linked business
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: Record<string, any> = {};

    // Get garage's linked business for matching
    const linkedPlaceId = garage.linkedGaragePlaceId || "";
    const linkedGarageName = garage.linkedGarageName || "";

    // Build the garage matching condition
    // Match by placeId (exact) OR garageName (fallback for older bookings)
    const garageMatchCondition = linkedPlaceId
      ? {
          $or: [
            { garagePlaceId: linkedPlaceId },
            // Fallback: match by name if placeId not available on booking
            { garagePlaceId: { $exists: false }, garageName: { $regex: new RegExp(`^${linkedGarageName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, "i") } },
            { garagePlaceId: null, garageName: { $regex: new RegExp(`^${linkedGarageName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, "i") } },
            { garagePlaceId: "", garageName: { $regex: new RegExp(`^${linkedGarageName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, "i") } },
          ],
        }
      : linkedGarageName
      ? { garageName: { $regex: new RegExp(`^${linkedGarageName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, "i") } }
      : null;

    if (status && status !== "all") {
      // When filtering by status
      if (status === "new") {
        // For new bookings, only show those matching this garage's linked business
        if (!garageMatchCondition) {
          // No linked garage, return empty
          return NextResponse.json({ bookings: [], total: 0, limit, offset });
        }
        query.$and = [
          { garageStatus: "new" },
          {
            $or: [
              { assignedGarageId: null },
              { assignedGarageId: { $exists: false } },
            ],
          },
          garageMatchCondition,
        ];
      } else {
        // For other statuses (accepted, in_progress, completed, declined)
        // Only show bookings assigned to this garage
        query.assignedGarageId = garage._id;
        query.garageStatus = status;
      }
    } else {
      // Show all: bookings assigned to this garage OR new bookings for this garage
      if (!garageMatchCondition) {
        // Only show assigned bookings if no linked garage
        query.assignedGarageId = garage._id;
      } else {
        const newBookingsForGarage: Record<string, unknown> = {
          $and: [
            { garageStatus: { $in: ["new", undefined] } },
            {
              $or: [
                { assignedGarageId: null },
                { assignedGarageId: { $exists: false } },
              ],
            },
            garageMatchCondition,
          ],
        };

        query.$or = [
          { assignedGarageId: garage._id },
          newBookingsForGarage,
        ];
      }
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
