// src/app/api/bookings/track/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Booking from '@/models/Booking';
import { isValidTrackingCodeFormat } from '@/lib/trackingCode';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  // Validate input
  if (!code) {
    return NextResponse.json(
      { error: 'Tracking code is required' },
      { status: 400 }
    );
  }

  const upperCode = code.toUpperCase().trim();

  // Validate format
  if (!isValidTrackingCodeFormat(upperCode)) {
    return NextResponse.json(
      { error: 'Invalid tracking code format' },
      { status: 400 }
    );
  }

  try {
    await connectDB();

    // Find booking by tracking code
    const booking = await Booking.findOne({ trackingCode: upperCode });

    if (!booking) {
      return NextResponse.json(
        { error: 'No booking found with this tracking code' },
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
      status: booking.status,
      currentStage: booking.currentStage,
      overallProgress: booking.overallProgress,
      updates: booking.updates,
      createdAt: booking.createdAt,
      // Service payment fields (if applicable)
      servicePaymentStatus: booking.servicePaymentStatus,
      servicePaymentAmount: booking.servicePaymentAmount,
      servicePaymentUrl: booking.servicePaymentUrl,
    });

  } catch (error) {
    console.error('Error fetching booking by tracking code:', error);
    return NextResponse.json(
      { error: 'Failed to fetch booking' },
      { status: 500 }
    );
  }
}
