// src/app/api/stripe/create-service-payment-intent/route.ts
// Creates a PaymentIntent for embedded service payment on tracking page

import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { connectDB } from '@/lib/mongodb';
import { requireValidOrigin } from '@/lib/validation';
import Booking from '@/models/Booking';

export async function POST(request: NextRequest) {
  // CSRF protection - validate request origin
  const originCheck = requireValidOrigin(request);
  if (!originCheck.valid) {
    return NextResponse.json({ error: originCheck.error }, { status: 403 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON in request body' },
      { status: 400 }
    );
  }

  const { bookingId } = body;

  if (!bookingId) {
    return NextResponse.json(
      { error: 'Booking ID is required' },
      { status: 400 }
    );
  }

  try {
    await connectDB();

    // Find the booking
    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Check if payment is actually needed
    if (booking.servicePaymentStatus === 'paid') {
      return NextResponse.json(
        { error: 'Service payment already completed' },
        { status: 400 }
      );
    }

    if (!booking.servicePaymentAmount) {
      return NextResponse.json(
        { error: 'No service payment amount set for this booking' },
        { status: 400 }
      );
    }

    // Check if we already have a payment intent for this booking
    if (booking.servicePaymentIntentId) {
      // Retrieve existing payment intent
      try {
        const existingIntent = await stripe.paymentIntents.retrieve(
          booking.servicePaymentIntentId
        );

        // If it's still valid (not succeeded, canceled, or requires_payment_method after failure)
        if (
          existingIntent.status === 'requires_payment_method' ||
          existingIntent.status === 'requires_confirmation' ||
          existingIntent.status === 'requires_action'
        ) {
          return NextResponse.json({
            clientSecret: existingIntent.client_secret,
            amount: booking.servicePaymentAmount,
          });
        }
      } catch {
        // Intent doesn't exist or error, create new one
        console.log('Creating new payment intent for booking:', bookingId);
      }
    }

    // Create new PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: booking.servicePaymentAmount,
      currency: 'aud',
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        type: 'service_payment',
        bookingId: bookingId,
        vehicleRegistration: booking.vehicleRegistration,
        garageName: booking.garageName || '',
        customerEmail: booking.userEmail,
      },
      receipt_email: booking.userEmail,
      description: `Service payment for ${booking.vehicleRegistration}${booking.garageName ? ` at ${booking.garageName}` : ''}`,
    });

    // Save the payment intent ID to the booking
    booking.servicePaymentIntentId = paymentIntent.id;
    await booking.save();

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      amount: booking.servicePaymentAmount,
    });
  } catch (error) {
    console.error('Error creating service payment intent:', error);
    return NextResponse.json(
      { error: 'Failed to create payment' },
      { status: 500 }
    );
  }
}
