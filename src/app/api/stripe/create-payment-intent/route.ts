// src/app/api/stripe/create-payment-intent/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { stripe, DRIVLET_PRICE, ZONE_SURCHARGES, calculateTotalAmount } from '@/lib/stripe';
import { requireValidOrigin } from '@/lib/validation';
import { isStripeTestModeActive } from '@/lib/stripeTestMode';
import { calculateDistance, getDistanceZone } from '@/lib/distanceZones';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(request: NextRequest) {
  // RETIRED FOR LAUNCH (2026-08-02): the direct pay-then-book pipeline let
  // callers pay and receive a confirmed booking that skipped admin review,
  // slot capacity and policy consent. The live flow is BookingRequest →
  // approval → /pay/[token] → request-payment-webhook. Preserved for
  // reference; flip the env flag only with explicit approval.
  if (process.env.ENABLE_LEGACY_DIRECT_BOOKING !== "true") {
    return NextResponse.json(
      { error: "This payment method has been retired. Please book at drivlet.com.au/booking." },
      { status: 410 }
    );
  }

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

    // Check if the customer is logged in (for userId/isGuest metadata)
    const session = await getServerSession(authOptions);
    const isGuest = !session?.user?.id;
    const userId = session?.user?.id || '';
    console.log('🔍 SESSION DEBUG:', {
      hasSession: !!session,
      userId: userId || 'NO_ID',
      email: session?.user?.email || 'NO_EMAIL',
      isGuest,
    });

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
    // $1 test override — production-guarded (see src/lib/stripeTestMode.ts)
    const isTestMode = isStripeTestModeActive();
    const totalAmount = isTestMode ? 100 : DRIVLET_PRICE + verifiedSurcharge;
    if (isTestMode) {
      console.warn('⚠️⚠️⚠️ STRIPE TEST MODE ACTIVE — charging $1.00 instead of real price ⚠️⚠️⚠️');
    }
    console.log(`💰 Pricing: base=$${(DRIVLET_PRICE / 100).toFixed(2)} + surcharge=$${(verifiedSurcharge / 100).toFixed(2)} = total=$${(totalAmount / 100).toFixed(2)} (zone=${verifiedZone}, ${verifiedDistanceKm} km)${isTestMode ? ' [TEST MODE]' : ''}`);

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
        userId: userId,
        isGuest: isGuest ? 'true' : 'false',
        ...(isTestMode && { testMode: 'true' }),
      },
      receipt_email: customerEmail,
      description: `Drivlet - ${vehicleRegistration} (${vehicleState}) - ${serviceDesc}${surchargeNote}`,
    });

    console.log('✅ Payment intent created:', paymentIntent.id, '— amount:', totalAmount);

    console.log('🔍 METADATA DEBUG:', {
      userId: paymentIntent.metadata.userId,
      isGuest: paymentIntent.metadata.isGuest,
    });

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
