// src/app/api/bookings/[id]/confirm-service-payment/route.ts
// Confirms service payment by checking with Stripe directly
// This provides immediate feedback without waiting for webhooks

import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { connectDB } from '@/lib/mongodb';
import Booking from '@/models/Booking';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: bookingId } = await params;

  if (!bookingId) {
    return NextResponse.json(
      { error: 'Booking ID is required' },
      { status: 400 }
    );
  }

  try {
    await connectDB();

    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Already paid - return success
    if (booking.servicePaymentStatus === 'paid') {
      return NextResponse.json({
        success: true,
        alreadyPaid: true,
        booking: {
          servicePaymentStatus: 'paid',
          currentStage: booking.currentStage,
        },
      });
    }

    // No payment intent to verify
    if (!booking.servicePaymentIntentId) {
      return NextResponse.json(
        { error: 'No payment intent found for this booking' },
        { status: 400 }
      );
    }

    // Verify with Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(
      booking.servicePaymentIntentId
    );

    if (paymentIntent.status === 'succeeded') {
      // Update booking
      booking.servicePaymentStatus = 'paid';
      booking.servicePaymentId = paymentIntent.id;
      booking.currentStage = 'ready_for_return';
      booking.overallProgress = 85;
      booking.updatedAt = new Date();
      booking.updates.push({
        stage: 'service_payment_received',
        timestamp: new Date(),
        message: `Customer paid $${(paymentIntent.amount / 100).toFixed(2)} for service. Ready for return delivery.`,
        updatedBy: 'system',
      });

      await booking.save();

      console.log('✅ Payment confirmed via direct verification:', bookingId);

      return NextResponse.json({
        success: true,
        booking: {
          servicePaymentStatus: 'paid',
          currentStage: 'ready_for_return',
        },
      });
    }

    // Payment not yet succeeded
    return NextResponse.json({
      success: false,
      paymentStatus: paymentIntent.status,
    });
  } catch (error) {
    console.error('Error confirming service payment:', error);
    return NextResponse.json(
      { error: 'Failed to confirm payment' },
      { status: 500 }
    );
  }
}