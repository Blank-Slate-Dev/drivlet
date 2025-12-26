// src/app/api/bookings/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Booking from "@/models/Booking";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/bookings/[id] - Get a specific booking (user can only see their own)
export async function GET(request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);

  if (!session?.user || !session.user.id) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }

  try {
    await connectDB();
    const { id } = await params;

    const booking = await Booking.findById(id).lean();

    if (!booking) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    // Make sure booking has a userId before comparing
    const bookingWithUser = booking as { userId?: unknown };

    if (!bookingWithUser.userId) {
      return NextResponse.json(
        { error: "Booking has no associated user" },
        { status: 500 }
      );
    }

    const bookingUserId = String(bookingWithUser.userId);

    // Users can only see their own bookings (admins can see all via admin API)
    if (bookingUserId !== session.user.id) {
      return NextResponse.json(
        { error: "Not authorized to view this booking" },
        { status: 403 }
      );
    }

    return NextResponse.json(booking);
  } catch (error) {
    console.error("Error fetching booking:", error);
    return NextResponse.json(
      { error: "Failed to fetch booking" },
      { status: 500 }
    );
  }
}
