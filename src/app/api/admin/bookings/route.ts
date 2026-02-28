// src/app/api/admin/bookings/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Booking from "@/models/Booking";
import Driver from "@/models/Driver";
import { requireAdmin } from "@/lib/admin";

// GET /api/admin/bookings - Get all bookings with filtering and pagination
export async function GET(request: NextRequest) {
  const adminCheck = await requireAdmin();
  if (!adminCheck.authorized) {
    return adminCheck.response;
  }

  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const stage = searchParams.get("stage");
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") === "asc" ? 1 : -1;

    // Build query
    const query: Record<string, unknown> = {};

    if (status && status !== "all") {
      query.status = status;
    }

    if (stage && stage !== "all") {
      query.currentStage = stage;
    }

    if (search) {
      // Escape special regex characters to prevent ReDoS
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      query.$or = [
        { userName: { $regex: escapedSearch, $options: "i" } },
        { userEmail: { $regex: escapedSearch, $options: "i" } },
        { vehicleRegistration: { $regex: escapedSearch, $options: "i" } },
        { serviceType: { $regex: escapedSearch, $options: "i" } },
      ];
    }

    // Execute query with pagination
    const skip = (page - 1) * limit;
    const [bookings, total] = await Promise.all([
      Booking.find(query)
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(limit)
        .populate("userId", "mobile") // Populate user's mobile for registered users
        .lean(),
      Booking.countDocuments(query),
    ]);

    // Collect all unique driver IDs from pickupDriver and returnDriver
    const driverIds = new Set<string>();
    bookings.forEach((booking) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const b = booking as any;
      if (b.pickupDriver?.driverId) {
        driverIds.add(b.pickupDriver.driverId.toString());
      }
      if (b.returnDriver?.driverId) {
        driverIds.add(b.returnDriver.driverId.toString());
      }
      // Also check legacy assignedDriverId
      if (b.assignedDriverId) {
        driverIds.add(b.assignedDriverId.toString());
      }
    });

    // Fetch all drivers in a single query
    const driverMap = new Map<string, { firstName: string; lastName: string }>();
    if (driverIds.size > 0) {
      const drivers = await Driver.find({ _id: { $in: Array.from(driverIds) } })
        .select("firstName lastName")
        .lean();
      drivers.forEach((driver) => {
        driverMap.set(driver._id.toString(), {
          firstName: driver.firstName,
          lastName: driver.lastName,
        });
      });
    }

    // Transform bookings to include userMobile and driver names
    const bookingsWithDetails = bookings.map((booking) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const b = booking as any;
      const userDoc = b.userId;
      const isPopulated = userDoc && typeof userDoc === "object" && "_id" in userDoc;
      const userMobile = isPopulated ? userDoc.mobile : undefined;
      const userId = isPopulated
        ? userDoc._id?.toString()
        : userDoc?.toString() || null;

      // Get driver names
      const pickupDriverId = b.pickupDriver?.driverId?.toString();
      const returnDriverId = b.returnDriver?.driverId?.toString();
      const legacyDriverId = b.assignedDriverId?.toString();

      const pickupDriverInfo = pickupDriverId ? driverMap.get(pickupDriverId) : null;
      const returnDriverInfo = returnDriverId ? driverMap.get(returnDriverId) : null;
      const legacyDriverInfo = legacyDriverId ? driverMap.get(legacyDriverId) : null;

      return {
        ...booking,
        userId,
        userMobile,
        // Pickup driver details
        pickupDriverName: pickupDriverInfo
          ? `${pickupDriverInfo.firstName} ${pickupDriverInfo.lastName}`
          : null,
        // Return driver details
        returnDriverName: returnDriverInfo
          ? `${returnDriverInfo.firstName} ${returnDriverInfo.lastName}`
          : null,
        // Legacy driver name (for backwards compatibility)
        assignedDriverName: legacyDriverInfo
          ? `${legacyDriverInfo.firstName} ${legacyDriverInfo.lastName}`
          : pickupDriverInfo
          ? `${pickupDriverInfo.firstName} ${pickupDriverInfo.lastName}`
          : null,
      };
    });

    return NextResponse.json({
      bookings: bookingsWithDetails,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching bookings:", error);
    return NextResponse.json(
      { error: "Failed to fetch bookings" },
      { status: 500 }
    );
  }
}

// POST /api/admin/bookings - Create a new booking (admin can create for users)
export async function POST(request: NextRequest) {
  const adminCheck = await requireAdmin();
  if (!adminCheck.authorized) {
    return adminCheck.response;
  }

  try {
    await connectDB();

    const data = await request.json();

    const booking = new Booking({
      ...data,
      lastUpdatedBy: adminCheck.session?.user.id,
    });

    await booking.save();

    return NextResponse.json(booking, { status: 201 });
  } catch (error) {
    console.error("Error creating booking:", error);
    return NextResponse.json(
      { error: "Failed to create booking" },
      { status: 500 }
    );
  }
}
