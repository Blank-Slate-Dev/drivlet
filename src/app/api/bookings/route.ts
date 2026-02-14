// src/app/api/bookings/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Booking from "@/models/Booking";
import Driver from "@/models/Driver";
import mongoose from "mongoose";
import { requireValidOrigin } from "@/lib/validation";
import { sendBookingStageEmail } from "@/lib/email";
import { sendBookingConfirmationSMS } from "@/lib/sms";

// GET /api/bookings - Get user's own bookings (used by main dashboard)
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

    // Build query to find bookings by BOTH userId AND userEmail
    // This handles:
    // 1. Bookings made while logged in (have userId)
    // 2. Bookings made as guest with same email (userId: null but matching email)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const queryConditions: any[] = [];

    // Always include userId match if we have an ID
    if (session.user.id) {
      queryConditions.push({ userId: session.user.id });
    }

    // Add email matching if user has an email
    if (session.user.email) {
      queryConditions.push({ userEmail: session.user.email.toLowerCase() });
    }

    // If no conditions, return empty (shouldn't happen with valid session)
    if (queryConditions.length === 0) {
      return NextResponse.json([]);
    }

    const bookings = await Booking.find({
      $or: queryConditions,
    })
      .sort({ createdAt: -1 })
      .lean();

    // Get all unique driver IDs from bookings
    const driverIds = [
      ...new Set(
        bookings
          .filter((b) => b.assignedDriverId)
          .map((b) => b.assignedDriverId!.toString())
      ),
    ];

    // Fetch all drivers at once
    const drivers =
      driverIds.length > 0
        ? await Driver.find({
            _id: {
              $in: driverIds.map(
                (id) => new mongoose.Types.ObjectId(id)
              ),
            },
          }).lean()
        : [];

    // Create a map for quick driver lookup
    const driverMap = new Map(
      drivers.map((d) => [
        d._id.toString(),
        {
          firstName: d.firstName,
          profilePhoto: d.profilePhoto || null,
          rating: d.metrics?.averageRating || 0,
          totalRatings: d.metrics?.totalRatings || 0,
          completedJobs: d.metrics?.completedJobs || 0,
          memberSince: d.createdAt,
        },
      ])
    );

    // Attach driver info to bookings
    const bookingsWithDrivers = bookings.map((booking) => ({
      ...booking,
      driver: booking.assignedDriverId
        ? driverMap.get(booking.assignedDriverId.toString()) || null
        : null,
    }));

    return NextResponse.json(bookingsWithDrivers);
  } catch (error) {
    console.error("Error fetching bookings:", error);
    return NextResponse.json(
      { error: "Failed to fetch bookings" },
      { status: 500 }
    );
  }
}

// POST /api/bookings - Create a new booking (authenticated or guest)
export async function POST(request: NextRequest) {
  // CSRF protection - validate request origin for state-changing operation
  const originCheck = requireValidOrigin(request);
  if (!originCheck.valid) {
    return NextResponse.json(
      { error: originCheck.error },
      { status: 403 }
    );
  }

  try {
    const session = await getServerSession(authOptions);
    const data = await request.json();

    // Validate required fields
    const requiredFields = [
      "pickupTime",
      "dropoffTime",
      "pickupAddress",
      "vehicleRegistration",
      "vehicleState",
    ];

    for (const field of requiredFields) {
      if (!data[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Guest validation
    const isGuest = !session?.user;
    if (isGuest) {
      if (!data.guestName?.trim()) {
        return NextResponse.json(
          { error: "Guest name is required" },
          { status: 400 }
        );
      }
      if (!data.guestEmail?.trim()) {
        return NextResponse.json(
          { error: "Guest email is required" },
          { status: 400 }
        );
      }
      if (!data.guestPhone?.trim()) {
        return NextResponse.json(
          { error: "Guest phone is required" },
          { status: 400 }
        );
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.guestEmail)) {
        return NextResponse.json(
          { error: "Invalid email format" },
          { status: 400 }
        );
      }
    }

    // Existing booking validation
    if (data.hasExistingBooking && !data.garageName?.trim()) {
      return NextResponse.json(
        { error: "Garage name is required for existing bookings" },
        { status: 400 }
      );
    }

    await connectDB();

    // Determine service type based on existing booking
    let serviceType = data.serviceType || "Standard Service";
    if (data.hasExistingBooking) {
      serviceType = `Existing Booking - ${data.garageName}`;
    }

    // Build the initial update message
    let initialMessage = "We've received your booking request and will confirm shortly.";
    if (data.hasExistingBooking) {
      initialMessage = `We've received your pick-up request for your existing booking at ${data.garageName}.`;
    }

    // Create booking object
    const bookingData: Record<string, unknown> = {
      // User info - either from session or guest details
      userId: session?.user?.id || null,
      userEmail: session?.user?.email || data.guestEmail?.toLowerCase(),
      userName: session?.user?.username || data.guestName,
      
      // Core booking details
      pickupTime: data.pickupTime,
      dropoffTime: data.dropoffTime,
      pickupAddress: data.pickupAddress.trim(),
      vehicleRegistration: data.vehicleRegistration.trim().toUpperCase(),
      vehicleState: data.vehicleState,
      serviceType,
      
      // Status
      currentStage: "booking_confirmed",
      overallProgress: 14,
      status: "pending",
      
      // Guest specific fields
      isGuest,
      ...(isGuest && {
        guestPhone: data.guestPhone?.trim(),
      }),
      
      // Existing booking fields
      hasExistingBooking: data.hasExistingBooking || false,
      ...(data.hasExistingBooking && {
        garageName: data.garageName?.trim(),
        existingBookingRef: data.existingBookingRef?.trim() || null,
        existingBookingNotes: data.existingBookingNotes?.trim() || null,
      }),
      
      // Updates array
      updates: [
        {
          stage: "booking_confirmed",
          timestamp: new Date(),
          message: initialMessage,
          updatedBy: "system",
        },
      ],
    };

    const booking = new Booking(bookingData);
    await booking.save();

    // Send booking confirmation email (all customers, not just guests)
    sendBookingStageEmail({
      customerEmail: booking.userEmail,
      customerName: booking.userName,
      vehicleRegistration: booking.vehicleRegistration,
      currentStage: "booking_confirmed",
      trackingCode: booking.trackingCode,
      garageName: booking.garageName,
    }).then((sent) => {
      if (sent) console.log("📧 Booking confirmation email sent to:", booking.userEmail);
    });

    // Send confirmation SMS to guests with phone numbers
    if (isGuest && data.guestPhone) {
      const appUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const trackingUrl = booking.trackingCode
        ? `${appUrl}/track?code=${booking.trackingCode}`
        : `${appUrl}/track`;

      sendBookingConfirmationSMS(
        data.guestPhone,
        booking.userName,
        booking.vehicleRegistration,
        booking.pickupTime,
        trackingUrl
      ).then((sent) => {
        if (sent) console.log("📱 Booking confirmation SMS sent to:", data.guestPhone);
      });
    }

    return NextResponse.json(
      {
        success: true,
        bookingId: booking._id,
        message: data.hasExistingBooking 
          ? "Pick-up request received. We'll confirm and contact you shortly."
          : "Booking request received. We'll confirm availability and get back to you.",
        booking,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating booking:", error);
    return NextResponse.json(
      { error: "Failed to create booking" },
      { status: 500 }
    );
  }
}
