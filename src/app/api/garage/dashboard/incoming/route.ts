// src/app/api/garage/dashboard/incoming/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import Garage from "@/models/Garage";
import Booking from "@/models/Booking";

// Force dynamic rendering - this route uses headers via getServerSession
export const dynamic = 'force-dynamic';

export async function GET() {
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

    // Only approved garages can see bookings
    if (garage.status !== "approved") {
      return NextResponse.json({
        success: true,
        bookings: [],
        count: 0,
        garageName: garage.businessName,
      });
    }

    // Get linked garage info for matching
    const linkedPlaceId = garage.linkedGaragePlaceId || "";
    const linkedGarageName = garage.linkedGarageName || "";
    const escapedName = linkedGarageName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    // Build query for NEW bookings only (not yet acknowledged)
    // Match by: assignedGarageId OR (garagePlaceId/garageName match AND no assignment)
    const query = {
      $and: [
        {
          $or: [
            // Already assigned to this garage
            { assignedGarageId: garage._id },
            // OR matches by placeId (not yet assigned)
            ...(linkedPlaceId
              ? [
                  {
                    garagePlaceId: linkedPlaceId,
                    $or: [
                      { assignedGarageId: null },
                      { assignedGarageId: { $exists: false } },
                    ],
                  },
                ]
              : []),
            // OR matches by name (not yet assigned)
            ...(linkedGarageName
              ? [
                  {
                    garageName: { $regex: new RegExp(escapedName, "i") },
                    $or: [
                      { assignedGarageId: null },
                      { assignedGarageId: { $exists: false } },
                    ],
                  },
                ]
              : []),
          ],
        },
        // Only NEW status (not acknowledged yet)
        {
          $or: [
            { garageStatus: "new" },
            { garageStatus: { $exists: false } },
            { garageStatus: null },
          ],
        },
        // Not cancelled
        { status: { $nin: ["cancelled"] } },
      ],
    };

    const bookings = await Booking.find(query)
      .sort({ createdAt: -1 })
      .lean();

    // Auto-mark as viewed (but not acknowledged)
    const unviewedIds = bookings
      .filter((b) => !b.garageViewedAt)
      .map((b) => b._id);

    if (unviewedIds.length > 0) {
      await Booking.updateMany(
        { _id: { $in: unviewedIds } },
        { $set: { garageViewedAt: new Date() } }
      );
    }

    return NextResponse.json({
      success: true,
      bookings,
      count: bookings.length,
      garageName: garage.businessName,
    });
  } catch (error) {
    console.error("Error fetching incoming bookings:", error);
    return NextResponse.json(
      { error: "Failed to fetch incoming bookings" },
      { status: 500 }
    );
  }
}
