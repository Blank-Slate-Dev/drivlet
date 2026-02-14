// src/app/api/bookings/track/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Booking from '@/models/Booking';
import Driver from '@/models/Driver';
import { isValidTrackingCodeFormat } from '@/lib/trackingCode';
import { withRateLimit, RATE_LIMITS } from '@/lib/rateLimit';

export async function GET(request: NextRequest) {
  // Rate limiting to prevent brute force attacks on tracking code guessing
  // This endpoint requires 3 matching fields, making it a target for enumeration
  const rateLimitResult = withRateLimit(request, RATE_LIMITS.auth, 'booking-track');
  if (!rateLimitResult.success) {
    return NextResponse.json(
      {
        error: 'Too many requests. Please try again later.',
        retryAfter: Math.ceil(rateLimitResult.resetIn / 1000),
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil(rateLimitResult.resetIn / 1000)),
        },
      }
    );
  }

  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const email = searchParams.get('email');
  const rego = searchParams.get('rego');

  // Validate all inputs are present
  if (!code || !email || !rego) {
    return NextResponse.json(
      { error: 'Tracking code, email, and registration number are all required' },
      { status: 400 }
    );
  }

  const upperCode = code.toUpperCase().trim();
  const upperRego = rego.toUpperCase().trim();
  const lowerEmail = email.toLowerCase().trim();

  // Validate tracking code format
  if (!isValidTrackingCodeFormat(upperCode)) {
    return NextResponse.json(
      { error: 'Invalid tracking code format' },
      { status: 400 }
    );
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(lowerEmail)) {
    return NextResponse.json(
      { error: 'Invalid email format' },
      { status: 400 }
    );
  }

  // Basic rego validation (alphanumeric, 1-10 chars)
  const regoRegex = /^[A-Z0-9]{1,10}$/;
  if (!regoRegex.test(upperRego)) {
    return NextResponse.json(
      { error: 'Invalid registration number format' },
      { status: 400 }
    );
  }

  try {
    await connectDB();

    // Find booking matching ALL THREE criteria
    const booking = await Booking.findOne({
      trackingCode: upperCode,
      userEmail: lowerEmail,
      vehicleRegistration: upperRego
    });

    if (!booking) {
      // Generic error to prevent information leakage
      // Don't reveal which field was wrong
      return NextResponse.json(
        { error: 'No booking found. Please check your tracking code, email, and registration number.' },
        { status: 404 }
      );
    }

    // Check if booking is completed or cancelled
    if (booking.status === 'completed') {
      return NextResponse.json(
        {
          error: 'This booking has been completed. Your tracking code is no longer active.',
          isExpired: true,
          completedAt: booking.updatedAt
        },
        { status: 410 } // 410 Gone - resource no longer available
      );
    }

    if (booking.status === 'cancelled') {
      return NextResponse.json(
        {
          error: 'This booking was cancelled. Your tracking code is no longer active.',
          isExpired: true,
          isCancelled: true
        },
        { status: 410 }
      );
    }

    // Get driver info based on current stage
    // Determine which driver to show based on the booking stage
    let activeDriverId = null;
    const stage = booking.currentStage;

    // Pickup-related stages show pickup driver
    if (['driver_en_route', 'car_picked_up', 'at_garage', 'service_in_progress'].includes(stage)) {
      activeDriverId = booking.pickupDriver?.driverId;
    }
    // Return-related stages show return driver
    else if (['driver_returning', 'delivered'].includes(stage)) {
      activeDriverId = booking.returnDriver?.driverId;
    }
    // Fallback to legacy field or pickup driver
    activeDriverId = activeDriverId || booking.assignedDriverId || booking.pickupDriver?.driverId;

    let driverInfo = null;
    if (activeDriverId) {
      const driver = await Driver.findById(activeDriverId).lean();
      if (driver) {
        driverInfo = {
          firstName: driver.firstName,
          profilePhoto: driver.profilePhoto || null,
          rating: driver.metrics?.averageRating || 0,
          totalRatings: driver.metrics?.totalRatings || 0,
          completedJobs: driver.metrics?.completedJobs || 0,
          memberSince: driver.createdAt,
        };
      }
    }

    // Return booking data (sanitized - don't expose sensitive fields)
    return NextResponse.json({
      _id: booking._id,
      vehicleRegistration: booking.vehicleRegistration,
      vehicleState: booking.vehicleState,
      pickupAddress: booking.pickupAddress,
      pickupTime: booking.pickupTime,
      dropoffTime: booking.dropoffTime,
      garageName: booking.garageName,
      garageAddress: booking.garageAddress,
      serviceType: booking.serviceType,
      serviceDate: booking.serviceDate,
      status: booking.status,
      currentStage: booking.currentStage,
      overallProgress: booking.overallProgress,
      updates: booking.updates,
      createdAt: booking.createdAt,
      // Service payment fields (if applicable)
      servicePaymentStatus: booking.servicePaymentStatus,
      servicePaymentAmount: booking.servicePaymentAmount,
      servicePaymentUrl: booking.servicePaymentUrl,
      // Driver info (if assigned)
      driver: driverInfo,
    });

  } catch (error) {
    console.error('Error fetching booking by tracking code:', error);
    return NextResponse.json(
      { error: 'Failed to fetch booking' },
      { status: 500 }
    );
  }
}
