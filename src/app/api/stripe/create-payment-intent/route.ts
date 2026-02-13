// src/app/api/stripe/create-payment-intent/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { stripe, DRIVLET_PRICE, ZONE_SURCHARGES, calculateTotalAmount } from '@/lib/stripe';
import { requireValidOrigin } from '@/lib/validation';
import { calculateDistance, getDistanceZone } from '@/lib/distanceZones';

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
      // Distance zone fields (sent from the frontend)
      distanceZone: clientZone,
      distanceSurcharge: clientSurcharge,
      distanceKm: clientDistanceKm,
      pickupLat,
      pickupLng,
      garageLat,
      garageLng,
    } = body;

    // Validate required fields
    if (!customerEmail || !customerName || !pickupAddress || !vehicleRegistration) {
      console.error('❌ Missing required fields:', { customerEmail, customerName, pickupAddress, vehicleRegistration });
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // ── Server-side distance & zone validation ──────────────────────────
    let verifiedZone = 'green';
    let verifiedSurcharge = 0;
    let verifiedDistanceKm = 0;

    if (
      typeof pickupLat === 'number' && pickupLat !== 0 &&
      typeof pickupLng === 'number' && pickupLng !== 0 &&
      typeof garageLat === 'number' && garageLat !== 0 &&
      typeof garageLng === 'number' && garageLng !== 0
    ) {
      // Re-calculate distance server-side to prevent price tampering
      const serverDistance = calculateDistance(pickupLat, pickupLng, garageLat, garageLng);
      const serverZoneInfo = getDistanceZone(serverDistance);

      verifiedZone = serverZoneInfo.zone;
      verifiedSurcharge = serverZoneInfo.surchargeAmount;
      verifiedDistanceKm = serverZoneInfo.distance;

      // Reject red-zone bookings (should have been blocked on the frontend)
      if (verifiedZone === 'red') {
        console.error('❌ Red-zone booking rejected:', verifiedDistanceKm, 'km');
        return NextResponse.json(
          { error: 'Your pickup address is too far from the selected garage (over 18 km). Please contact our team for assistance.' },
          { status: 400 }
        );
      }

      // Log if client and server disagree (potential tampering or rounding diff)
      if (clientZone && clientZone !== verifiedZone) {
        console.warn(
          `⚠️ Zone mismatch — client: ${clientZone} (${clientDistanceKm} km), server: ${verifiedZone} (${verifiedDistanceKm} km). Using server value.`
        );
      }
    } else {
      // No coordinates available (manual garage entry) — default to base price
      console.log('ℹ️ No coordinates provided; defaulting to green zone (no surcharge).');
    }

    // Calculate the total amount using the server-verified zone
    const totalAmount = DRIVLET_PRICE + verifiedSurcharge;
    console.log(`💰 Pricing: base=$${(DRIVLET_PRICE / 100).toFixed(2)} + surcharge=$${(verifiedSurcharge / 100).toFixed(2)} = total=$${(totalAmount / 100).toFixed(2)} (zone=${verifiedZone}, ${verifiedDistanceKm} km)`);

    // Build description
    const serviceDesc = hasExistingBooking 
      ? `Existing Booking at ${garageName || 'garage'}`
      : serviceType || 'Standard Service';

    const surchargeNote = verifiedSurcharge > 0
      ? ` (incl. $${(verifiedSurcharge / 100).toFixed(2)} distance surcharge)`
      : '';

    // Create a PaymentIntent with the zone-aware total
    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalAmount,
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
        garagePlaceId: garagePlaceId || '',
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
        // Zone metadata (server-verified values)
        distanceZone: verifiedZone,
        distanceSurcharge: String(verifiedSurcharge),
        distanceKm: String(verifiedDistanceKm),
      },
      receipt_email: customerEmail,
      description: `Drivlet - ${vehicleRegistration} (${vehicleState}) - ${serviceDesc}${surchargeNote}`,
    });

    console.log('✅ Payment intent created:', paymentIntent.id, '— amount:', totalAmount);

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
