// src/app/api/stripe/create-checkout-session/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { stripe, DRIVLET_PRICE } from '@/lib/stripe';

// Get the app URL
function getAppUrl(): string {
  // Use APP_URL env var if set, otherwise use production URL
  if (process.env.APP_URL) {
    return process.env.APP_URL;
  }
  
  // Check if we're in production (Vercel sets this)
  if (process.env.VERCEL_ENV === 'production') {
    return 'https://drivlet.vercel.app';
  }
  
  // For preview deployments, use the deployment URL
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  
  // Fallback for local development
  return 'http://localhost:3000';
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const {
      // Customer info
      customerName,
      customerEmail,
      customerPhone,
      // Booking details
      pickupAddress,
      serviceType,
      vehicleRegistration,
      vehicleState,
      earliestPickup,
      latestDropoff,
      // Existing booking details
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

    // Get the base URL for redirects
    const appUrl = getAppUrl();

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer_email: customerEmail,
      line_items: [
        {
          price_data: {
            currency: 'aud',
            product_data: {
              name: 'Drivlet Car Service Pickup & Delivery',
              description: `Vehicle: ${vehicleRegistration} (${vehicleState}) - ${serviceDesc}`,
            },
            unit_amount: DRIVLET_PRICE,
          },
          quantity: 1,
        },
      ],
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
      success_url: `${appUrl}/booking/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/booking/cancelled`,
    });

    return NextResponse.json({ 
      sessionId: session.id,
      url: session.url 
    });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
