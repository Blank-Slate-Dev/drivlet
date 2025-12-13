// src/app/api/stripe/create-payment-intent/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { stripe, DRIVLET_PRICE } from '@/lib/stripe';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const {
      customerName,
      customerEmail,
      customerPhone,
      pickupAddress,
      serviceType,
      vehicleRegistration,
      vehicleState,
      earliestPickup,
      latestDropoff,
      hasExistingBooking,
      garageName,
      existingBookingRef,
    } = body;

    // Validate required fields
    if (!customerEmail || !customerName || !pickupAddress || !vehicleRegistration) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Build description
    const serviceDesc = hasExistingBooking 
      ? `Existing Booking at ${garageName || 'garage'}`
      : serviceType || 'Standard Service';

    // Create a PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: DRIVLET_PRICE,
      currency: 'aud',
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        customerName,
        customerEmail,
        customerPhone: customerPhone || '',
        pickupAddress,
        serviceType: serviceType || '',
        vehicleRegistration,
        vehicleState,
        earliestPickup,
        latestDropoff,
        hasExistingBooking: hasExistingBooking ? 'true' : 'false',
        garageName: garageName || '',
        existingBookingRef: existingBookingRef || '',
      },
      receipt_email: customerEmail,
      description: `Drivlet - ${vehicleRegistration} (${vehicleState}) - ${serviceDesc}`,
    });

    return NextResponse.json({ 
      clientSecret: paymentIntent.client_secret,
    });
  } catch (error) {
    console.error('Payment intent error:', error);
    return NextResponse.json(
      { error: 'Failed to create payment intent' },
      { status: 500 }
    );
  }
}