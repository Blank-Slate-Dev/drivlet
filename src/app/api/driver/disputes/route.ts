// src/app/api/driver/disputes/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import PaymentDispute from "@/models/PaymentDispute";
import User from "@/models/User";
import Booking from "@/models/Booking";

export const dynamic = "force-dynamic";

// GET /api/driver/disputes - Get driver's own disputes
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "driver") {
      return NextResponse.json({ error: "Not a driver" }, { status: 403 });
    }

    await connectDB();

    const user = await User.findById(session.user.id);
    if (!user?.driverProfile) {
      return NextResponse.json(
        { error: "Driver profile not found" },
        { status: 404 }
      );
    }

    const disputes = await PaymentDispute.find({ driverId: user.driverProfile })
      .sort({ createdAt: -1 })
      .populate("bookingId", "vehicleRegistration garageName")
      .lean();

    return NextResponse.json({ disputes });
  } catch (error) {
    console.error("Error fetching driver disputes:", error);
    return NextResponse.json(
      { error: "Failed to fetch disputes" },
      { status: 500 }
    );
  }
}

// POST /api/driver/disputes - Create a new dispute
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "driver") {
      return NextResponse.json({ error: "Not a driver" }, { status: 403 });
    }

    await connectDB();

    const user = await User.findById(session.user.id);
    if (!user?.driverProfile) {
      return NextResponse.json(
        { error: "Driver profile not found" },
        { status: 404 }
      );
    }

    // Check open dispute limit (max 5)
    const openCount = await PaymentDispute.countDocuments({
      driverId: user.driverProfile,
      status: { $in: ["open", "under_review"] },
    });

    if (openCount >= 5) {
      return NextResponse.json(
        {
          error:
            "You have reached the maximum of 5 open disputes. Please wait for existing disputes to be resolved.",
        },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { type, description, bookingId, expectedAmount, actualAmount } = body;

    // Validate required fields
    if (!type || !description) {
      return NextResponse.json(
        { error: "Type and description are required" },
        { status: 400 }
      );
    }

    const validTypes = [
      "missing_payment",
      "incorrect_amount",
      "late_payment",
      "other",
    ];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: "Invalid dispute type" },
        { status: 400 }
      );
    }

    if (description.length > 1000) {
      return NextResponse.json(
        { error: "Description must be under 1000 characters" },
        { status: 400 }
      );
    }

    // Validate bookingId if provided
    if (bookingId) {
      const booking = await Booking.findById(bookingId);
      if (!booking) {
        return NextResponse.json(
          { error: "Booking not found" },
          { status: 404 }
        );
      }
      // Verify the driver is assigned to this booking
      const driverIdStr = user.driverProfile.toString();
      if (
        booking.assignedDriverId?.toString() !== driverIdStr &&
        booking.returnDriverId?.toString() !== driverIdStr
      ) {
        return NextResponse.json(
          { error: "You are not assigned to this booking" },
          { status: 403 }
        );
      }
    }

    const dispute = await PaymentDispute.create({
      driverId: user.driverProfile,
      bookingId: bookingId || undefined,
      type,
      description,
      expectedAmount: expectedAmount || undefined,
      actualAmount: actualAmount || undefined,
      status: "open",
    });

    return NextResponse.json({ dispute }, { status: 201 });
  } catch (error) {
    console.error("Error creating dispute:", error);
    return NextResponse.json(
      { error: "Failed to create dispute" },
      { status: 500 }
    );
  }
}
