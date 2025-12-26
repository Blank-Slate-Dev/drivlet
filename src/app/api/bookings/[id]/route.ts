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

    // Check authorization - user can access if:
    // 1. Booking userId matches their session ID, OR
    // 2. Booking userEmail matches their session email (for guest bookings)
    const bookingData = booking as { userId?: unknown; userEmail?: string };

    const matchesUserId = bookingData.userId &&
      String(bookingData.userId) === session.user.id;

    const matchesEmail = session.user.email &&
      bookingData.userEmail?.toLowerCase() === session.user.email.toLowerCase();

    // Users can only see their own bookings (admins can see all via admin API)
    if (!matchesUserId && !matchesEmail) {
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
