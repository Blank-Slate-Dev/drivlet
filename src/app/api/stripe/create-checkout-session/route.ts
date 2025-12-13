// src/app/api/stripe/create-checkout-session/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { stripe, DRIVLET_PRICE } from '@/lib/stripe';

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
      // Optional: existing booking reference
      existingBookingRef,
      existingGarage,
    } = body;

    // Validate required fields
    if (!customerEmail || !customerName || !pickupAddress || !vehicleRegistration) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

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
              description: `Vehicle: ${vehicleRegistration} (${vehicleState}) - ${serviceType === 'existing_booking' ? 'Existing Booking' : 'Standard Pickup'}`,
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
        serviceType,
        vehicleRegistration,
        vehicleState,
        earliestPickup,
        latestDropoff,
        existingBookingRef: existingBookingRef || '',
        existingGarage: existingGarage || '',
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/booking/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/booking/cancelled`,
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