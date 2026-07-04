// src/app/api/bookings/slot-availability/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Booking from '@/models/Booking';
import BookingRequest from '@/models/BookingRequest';
import { MAX_BOOKINGS_PER_SLOT, PICKUP_SLOTS, DROPOFF_SLOTS } from '@/config/timeSlots';
import { withRateLimit, RATE_LIMITS } from '@/lib/rateLimit';

// A slot is held by a live booking OR by a request the admin has approved and is
// awaiting payment on. Pending (unreviewed) and rejected/expired requests do NOT hold
// a slot. Once a request is paid it converts to a booking (status paid/converted) and
// only the booking counts — so those statuses are excluded here to avoid double-counting.
const SLOT_HOLDING_REQUEST_STATUSES = ["approved", "payment_link_sent", "accepted_awaiting_payment"];

// Force dynamic rendering - this route uses request.url for query params
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const rateLimit = withRateLimit(request, RATE_LIMITS.read, "slot-availability");
  if (!rateLimit.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

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

    // Query live bookings AND approved/awaiting-payment requests for the same day, in parallel.
    const [bookings, holdingRequests] = await Promise.all([
      Booking.find({
        serviceDate: { $gte: startOfDay, $lte: endOfDay },
        status: { $ne: 'cancelled' },
      }).select('pickupTimeSlot dropoffTimeSlot').lean(),
      BookingRequest.find({
        serviceDate: { $gte: startOfDay, $lte: endOfDay },
        status: { $in: SLOT_HOLDING_REQUEST_STATUSES },
      }).select('pickupTimeSlot dropoffTimeSlot').lean(),
    ]);

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

    // Merge in approved/awaiting-payment requests — they hold a slot until paid or rejected.
    holdingRequests.forEach((req) => {
      if (req.pickupTimeSlot) {
        pickupCounts[req.pickupTimeSlot] = (pickupCounts[req.pickupTimeSlot] || 0) + 1;
      }
      if (req.dropoffTimeSlot) {
        dropoffCounts[req.dropoffTimeSlot] = (dropoffCounts[req.dropoffTimeSlot] || 0) + 1;
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
