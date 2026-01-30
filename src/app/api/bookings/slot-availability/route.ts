// src/app/api/bookings/slot-availability/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Booking from '@/models/Booking';
import { MAX_BOOKINGS_PER_SLOT, PICKUP_SLOTS, DROPOFF_SLOTS } from '@/config/timeSlots';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');

    if (!dateParam) {
      return NextResponse.json(
        { error: 'Date parameter required (YYYY-MM-DD)' },
        { status: 400 }
      );
    }

    const date = new Date(dateParam);
    if (isNaN(date.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format' },
        { status: 400 }
      );
    }

    await connectDB();

    // Query bookings for the specific date (excluding cancelled bookings)
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const bookings = await Booking.find({
      serviceDate: {
        $gte: startOfDay,
        $lte: endOfDay,
      },
      status: { $ne: 'cancelled' },
    }).select('pickupTimeSlot dropoffTimeSlot').lean();

    // Count bookings per slot
    const pickupCounts: Record<string, number> = {};
    const dropoffCounts: Record<string, number> = {};

    bookings.forEach((booking) => {
      if (booking.pickupTimeSlot) {
        pickupCounts[booking.pickupTimeSlot] = (pickupCounts[booking.pickupTimeSlot] || 0) + 1;
      }
      if (booking.dropoffTimeSlot) {
        dropoffCounts[booking.dropoffTimeSlot] = (dropoffCounts[booking.dropoffTimeSlot] || 0) + 1;
      }
    });

    // Build availability response
    const pickupSlots = PICKUP_SLOTS.map(slot => ({
      slot: slot.value,
      label: slot.label,
      booked: pickupCounts[slot.value] || 0,
      available: MAX_BOOKINGS_PER_SLOT - (pickupCounts[slot.value] || 0),
      isFull: (pickupCounts[slot.value] || 0) >= MAX_BOOKINGS_PER_SLOT,
    }));

    const dropoffSlots = DROPOFF_SLOTS.map(slot => ({
      slot: slot.value,
      label: slot.label,
      booked: dropoffCounts[slot.value] || 0,
      available: MAX_BOOKINGS_PER_SLOT - (dropoffCounts[slot.value] || 0),
      isFull: (dropoffCounts[slot.value] || 0) >= MAX_BOOKINGS_PER_SLOT,
    }));

    return NextResponse.json({
      date: dateParam,
      pickupSlots,
      dropoffSlots,
    });

  } catch (error) {
    console.error('Error checking slot availability:', error);
    return NextResponse.json(
      { error: 'Failed to check slot availability' },
      { status: 500 }
    );
  }
}
