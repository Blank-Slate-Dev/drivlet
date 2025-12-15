// src/app/api/bookings/create-after-payment/route.ts
// This endpoint saves a booking after successful Stripe payment
// It's a fallback in case the webhook isn't working

import { NextRequest, NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';
import { stripe } from '@/lib/stripe';

export async function POST(request: NextRequest) {
  console.log('📥 Create booking after payment request received');

  try {
    const body = await request.json();
    const { paymentIntentId } = body;

    if (!paymentIntentId) {
      console.error('❌ No paymentIntentId provided');
      return NextResponse.json(
        { error: 'Payment intent ID is required' },
        { status: 400 }
      );
    }

    console.log('🔍 Verifying payment intent:', paymentIntentId);

    // Verify the payment intent with Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== 'succeeded') {
      console.error('❌ Payment not completed. Status:', paymentIntent.status);
      return NextResponse.json(
        { error: 'Payment has not been completed' },
        { status: 400 }
      );
    }

    console.log('✅ Payment verified. Status:', paymentIntent.status);

    const metadata = paymentIntent.metadata;

    if (!metadata || !metadata.customerEmail) {
      console.error('❌ No metadata in payment intent');
      return NextResponse.json(
        { error: 'No booking metadata found' },
        { status: 400 }
      );
    }

    console.log('📦 Metadata:', metadata);

    // Check if booking already exists (from webhook)
    const client = new MongoClient(process.env.MONGODB_URI!);

    try {
      await client.connect();
      const db = client.db();

      // Check for existing booking with this payment ID
      const existingBooking = await db.collection('bookings').findOne({
        paymentId: paymentIntentId
      });

      if (existingBooking) {
        console.log('ℹ️ Booking already exists:', existingBooking._id);
        return NextResponse.json({
          success: true,
          message: 'Booking already exists',
          bookingId: existingBooking._id,
        });
      }

      // Create new booking
      const hasExisting = metadata.hasExistingBooking === 'true';
      const isManual = metadata.isManualTransmission === 'true';
      const transmissionType = metadata.transmissionType || 'automatic';

      // Build flags array
      const flags = [];
      if (isManual) {
        flags.push({
          type: 'manual_transmission',
          reason: 'Customer selected manual transmission - requires manual-capable driver',
          createdAt: new Date(),
        });
      }

      const booking = {
        userId: null,
        userName: metadata.customerName,
        userEmail: metadata.customerEmail,
        isGuest: true,
        guestPhone: metadata.customerPhone || null,
        vehicleRegistration: metadata.vehicleRegistration,
        vehicleState: metadata.vehicleState,
        serviceType: hasExisting
          ? `Existing Booking - ${metadata.garageName}`
          : (metadata.serviceType || 'Standard Service'),
        pickupAddress: metadata.pickupAddress,
        pickupTime: metadata.earliestPickup,
        dropoffTime: metadata.latestDropoff,
        hasExistingBooking: hasExisting,
        garageName: metadata.garageName || null,
        existingBookingRef: metadata.existingBookingRef || null,
        existingBookingNotes: null,
        transmissionType,
        isManualTransmission: isManual,
        flags,
        paymentStatus: 'paid',
        paymentId: paymentIntentId,
        paymentAmount: paymentIntent.amount,
        status: 'pending',
        currentStage: 'booking_confirmed',
        overallProgress: 14,
        updates: [{
          stage: 'booking_confirmed',
          timestamp: new Date(),
          message: hasExisting
            ? `We've received your pick-up request for your existing booking at ${metadata.garageName}.`
            : 'We\'ve received your booking request and will confirm shortly.',
          updatedBy: 'system',
        }],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      console.log('📝 Creating booking...');
      const result = await db.collection('bookings').insertOne(booking);

      console.log('✅✅✅ BOOKING CREATED SUCCESSFULLY!');
      console.log('🆔 Booking ID:', result.insertedId);

      return NextResponse.json({
        success: true,
        message: 'Booking created successfully',
        bookingId: result.insertedId,
      });

    } finally {
      await client.close();
    }

  } catch (error) {
    console.error('❌ Error creating booking:', error);
    return NextResponse.json(
      { error: 'Failed to create booking' },
      { status: 500 }
    );
  }
}
