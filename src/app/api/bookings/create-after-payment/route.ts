// src/app/api/bookings/create-after-payment/route.ts
// This endpoint saves a booking after successful Stripe payment
// It's a fallback in case the webhook isn't working

import { NextRequest, NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';
import { stripe } from '@/lib/stripe';
import { generateUniqueTrackingCode } from '@/lib/trackingCode';

export async function POST(request: NextRequest) {
  console.log('📥 Create booking after payment request received');

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON in request body' },
      { status: 400 }
    );
  }

  try {
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

    // Create booking atomically to prevent race conditions with webhook
    const client = new MongoClient(process.env.MONGODB_URI!);

    try {
      await client.connect();
      const db = client.db();

      // Prepare booking data
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

      // Generate unique tracking code
      console.log('🔑 Generating tracking code...');
      const trackingCode = await generateUniqueTrackingCode();
      console.log('✅ Tracking code generated:', trackingCode);

      const bookingData = {
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
        pickupTimeSlot: metadata.pickupTimeSlot || null,
        dropoffTimeSlot: metadata.dropoffTimeSlot || null,
        estimatedServiceDuration: metadata.estimatedServiceDuration ? parseInt(metadata.estimatedServiceDuration) : null,
        trackingCode,
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

      console.log('📝 Creating booking atomically with paymentId:', paymentIntentId);

      // Use findOneAndUpdate with upsert to atomically create or find existing booking
      // This prevents race conditions between webhook and this fallback endpoint
      const result = await db.collection('bookings').findOneAndUpdate(
        { paymentId: paymentIntentId },
        { $setOnInsert: bookingData },
        {
          upsert: true,
          returnDocument: 'after',
        }
      );

      const booking = result;
      const wasInserted = booking?.createdAt?.getTime() === bookingData.createdAt.getTime();

      if (!wasInserted) {
        console.log('ℹ️ Booking already exists (from webhook):', booking?._id);
        return NextResponse.json({
          success: true,
          message: 'Booking already exists',
          bookingId: booking?._id,
        });
      }

      console.log('✅✅✅ BOOKING CREATED SUCCESSFULLY!');
      console.log('🆔 Booking ID:', booking?._id);

      return NextResponse.json({
        success: true,
        message: 'Booking created successfully',
        bookingId: booking?._id,
        trackingCode,
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
