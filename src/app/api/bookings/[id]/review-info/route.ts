// src/app/api/bookings/[id]/review-info/route.ts
// Locked down 2026-08-02 (pre-launch audit LB-6): previously public — any
// valid booking ObjectId returned the customer's name, email and rego.
// Now requires a session (admin or the booking owner) or, for guests,
// matching email + rego query params; userEmail removed from the response.
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { withRateLimit, RATE_LIMITS } from "@/lib/rateLimit";
import Booking from "@/models/Booking";
import Driver from "@/models/Driver";
import GarageReview from "@/models/GarageReview";
import DriverReview from "@/models/DriverReview";
import mongoose from "mongoose";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: bookingId } = await params;

  if (!bookingId || !mongoose.Types.ObjectId.isValid(bookingId)) {
    return NextResponse.json({ error: "Invalid booking ID" }, { status: 400 });
  }

  const rateLimit = await withRateLimit(request, RATE_LIMITS.read, "review-info");
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 }
    );
  }

  try {
    await connectDB();

    const booking = await Booking.findById(bookingId).lean();

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Authorisation: admin, the booking owner, or a guest proving the same
    // email + rego combination the tracker uses
    const session = await getServerSession(authOptions);
    let authorised = false;

    if (session?.user?.id) {
      authorised =
        session.user.role === "admin" ||
        booking.userId?.toString() === session.user.id ||
        (!!session.user.email &&
          booking.userEmail?.toLowerCase() === session.user.email.toLowerCase());
    } else {
      const guestEmail = request.nextUrl.searchParams.get("email");
      const guestRego = request.nextUrl.searchParams.get("rego");
      if (guestEmail && guestRego) {
        authorised =
          booking.userEmail?.toLowerCase() === guestEmail.toLowerCase().trim() &&
          booking.vehicleRegistration?.toUpperCase() ===
            guestRego.toUpperCase().trim();
      }
    }

    if (!authorised) {
      return NextResponse.json(
        { error: "Please sign in or use the review link from your delivery email." },
        { status: 403 }
      );
    }

    // Check if garage review exists
    const existingGarageReview = await GarageReview.findOne({ bookingId }).lean();

    // Check if driver review exists
    let existingDriverReview = null;
    if (booking.assignedDriverId) {
      existingDriverReview = await DriverReview.findOne({
        bookingId,
        driverId: booking.assignedDriverId,
      }).lean();
    }

    // Get driver info if assigned
    let driverInfo = null;
    if (booking.assignedDriverId) {
      const driver = await Driver.findById(booking.assignedDriverId).lean();
      if (driver) {
        driverInfo = {
          firstName: driver.firstName,
          profilePhoto: driver.profilePhoto || null,
        };
      }
    }

    return NextResponse.json({
      booking: {
        _id: booking._id,
        userName: booking.userName,
        // userEmail intentionally omitted (LB-6)
        serviceType: booking.serviceType,
        garageName: booking.garageName,
        vehicleRegistration: booking.vehicleRegistration,
        status: booking.status,
        completedAt: booking.driverCompletedAt || booking.updatedAt,
        hasReview: !!existingGarageReview,
        hasDriverReview: !!existingDriverReview,
        driver: driverInfo,
      },
    });
  } catch (error) {
    console.error("Error fetching booking review info:", error);
    return NextResponse.json(
      { error: "Failed to fetch booking information" },
      { status: 500 }
    );
  }
}
