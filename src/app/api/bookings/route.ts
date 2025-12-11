// src/app/api/bookings/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectDB } from "@/lib/mongodb";
import Booking from "@/models/Booking";

// GET /api/bookings - Get user's own bookings
export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }

  try {
    await connectDB();

    const bookings = await Booking.find({ userId: session.user.id })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json(bookings);
  } catch (error) {
    console.error("Error fetching bookings:", error);
    return NextResponse.json(
      { error: "Failed to fetch bookings" },
      { status: 500 }
    );
  }
}

// POST /api/bookings - Create a new booking
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }

  try {
    await connectDB();

    const data = await request.json();

    // Validate required fields
    const requiredFields = [
      "pickupTime",
      "dropoffTime",
      "pickupAddress",
      "vehicleRegistration",
      "vehicleState",
      "serviceType",
    ];

    for (const field of requiredFields) {
      if (!data[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Create booking with user info
    const booking = new Booking({
      userId: session.user.id,
      userEmail: session.user.email,
      userName: session.user.username || session.user.email,
      pickupTime: data.pickupTime,
      dropoffTime: data.dropoffTime,
      pickupAddress: data.pickupAddress,
      vehicleRegistration: data.vehicleRegistration,
      vehicleState: data.vehicleState,
      serviceType: data.serviceType,
      updates: [
        {
          stage: "booking_confirmed",
          timestamp: new Date(),
          message: "Booking has been confirmed",
          updatedBy: "system",
        },
      ],
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
