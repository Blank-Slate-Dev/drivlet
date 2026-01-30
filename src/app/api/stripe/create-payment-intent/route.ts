// src/app/api/stripe/create-payment-intent/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { stripe, DRIVLET_PRICE } from '@/lib/stripe';
import { requireValidOrigin } from '@/lib/validation';

export async function POST(request: NextRequest) {
  // CSRF protection - validate request origin for payment operations
  const originCheck = requireValidOrigin(request);
  if (!originCheck.valid) {
    return NextResponse.json(
      { error: originCheck.error },
      { status: 403 }
    );
  }

  console.log('📤 Creating payment intent...');

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
    console.log('📦 Received booking data:', JSON.stringify(body, null, 2));

    const {
      customerName,
      customerEmail,
      customerPhone,
      pickupAddress,
      serviceType,
      serviceDate,
      vehicleRegistration,
      vehicleState,
      earliestPickup,
      latestDropoff,
      hasExistingBooking,
      garageName,
      garageAddress,
      garagePlaceId,
      existingBookingRef,
      transmissionType,
      isManualTransmission,
      selectedServices,
      primaryServiceCategory,
      serviceNotes,
      pickupTimeSlot,
      dropoffTimeSlot,
      estimatedServiceDuration,
      vehicleYear,
      vehicleModel,
      vehicleColor,
    } = body;

    // Validate required fields
    if (!customerEmail || !customerName || !pickupAddress || !vehicleRegistration) {
      console.error('❌ Missing required fields:', { customerEmail, customerName, pickupAddress, vehicleRegistration });
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
        serviceDate: serviceDate || '',
        vehicleRegistration,
        vehicleState,
        earliestPickup,
        latestDropoff,
        hasExistingBooking: hasExistingBooking ? 'true' : 'false',
        garageName: garageName || '',
        garageAddress: garageAddress || '',
        garagePlaceId: garagePlaceId || '', // Google Places ID for garage matching
        existingBookingRef: existingBookingRef || '',
        transmissionType: transmissionType || 'automatic',
        isManualTransmission: isManualTransmission ? 'true' : 'false',
        selectedServices: selectedServices || '[]',
        primaryServiceCategory: primaryServiceCategory || '',
        serviceNotes: serviceNotes || '',
        pickupTimeSlot: pickupTimeSlot || '',
        dropoffTimeSlot: dropoffTimeSlot || '',
        estimatedServiceDuration: estimatedServiceDuration ? String(estimatedServiceDuration) : '',
        vehicleYear: vehicleYear || '',
        vehicleModel: vehicleModel || '',
        vehicleColor: vehicleColor || '',
      },
      receipt_email: customerEmail,
      description: `Drivlet - ${vehicleRegistration} (${vehicleState}) - ${serviceDesc}`,
    });

    console.log('✅ Payment intent created:', paymentIntent.id);
    console.log('📋 Metadata attached:', paymentIntent.metadata);

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error) {
    console.error('❌ Payment intent error:', error);
    return NextResponse.json(
      { error: 'Failed to create payment intent' },
      { status: 500 }
    );
  }
}
