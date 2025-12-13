// src/app/api/stripe/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import Stripe from 'stripe';
import { MongoClient } from 'mongodb';

// Get MongoDB client directly
const client = new MongoClient(process.env.MONGODB_URI!);

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    console.error('No stripe signature found');
    return NextResponse.json({ error: 'No signature' }, { status: 400 });
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.error('STRIPE_WEBHOOK_SECRET not configured');
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }

  let event: Stripe.Event;

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json(
      { error: 'Webhook signature verification failed' },
      { status: 400 }
    );
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      
      // Extract booking details from metadata
      const metadata = session.metadata;
      
      if (!metadata) {
        console.error('No metadata in checkout session');
        break;
      }

      try {
        await client.connect();
        const db = client.db();
        
        // Create the booking in database
        const booking = {
          // Customer info
          userName: metadata.customerName,
          userEmail: metadata.customerEmail,
          userPhone: metadata.customerPhone,
          isGuest: true,
          
          // Vehicle info
          vehicleRegistration: metadata.vehicleRegistration,
          vehicleState: metadata.vehicleState,
          
          // Service details
          serviceType: metadata.serviceType,
          pickupAddress: metadata.pickupAddress,
          pickupTime: metadata.earliestPickup,
          dropoffTime: metadata.latestDropoff,
          
          // Existing booking details (if applicable)
          hasExistingBooking: metadata.hasExistingBooking === 'true',
          garageName: metadata.garageName || null,
          existingBookingRef: metadata.existingBookingRef || null,
          
          // Payment info
          paymentStatus: 'paid',
          paymentId: session.payment_intent as string,
          paymentAmount: session.amount_total,
          stripeSessionId: session.id,
          
          // Booking status
          status: 'pending',
          currentStage: 'booking_confirmed',
          
          // Timestamps
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const result = await db.collection('bookings').insertOne(booking);
        
        console.log('Booking created successfully:', result.insertedId);
        
      } catch (dbError) {
        console.error('Failed to create booking:', dbError);
        // Still return 200 to Stripe so it doesn't retry
      } finally {
        await client.close();
      }
      
      break;
    }
    
    case 'checkout.session.expired': {
      console.log('Checkout session expired:', event.data.object.id);
      break;
    }
    
    case 'payment_intent.payment_failed': {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      console.log('Payment failed:', paymentIntent.id);
      break;
    }
    
    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}