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
    // Handle embedded payment flow (PaymentIntent)
    case 'payment_intent.succeeded': {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const metadata = paymentIntent.metadata;
      
      if (!metadata || !metadata.customerEmail) {
        console.log('PaymentIntent without booking metadata, skipping');
        break;
      }

      try {
        await client.connect();
        const db = client.db();
        
        const hasExisting = metadata.hasExistingBooking === 'true';
        const booking = {
          userId: null, // Guest booking
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
          paymentStatus: 'paid',
          paymentId: paymentIntent.id,
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

        const result = await db.collection('bookings').insertOne(booking);
        console.log('Booking created from PaymentIntent:', result.insertedId);
        
      } catch (dbError) {
        console.error('Failed to create booking:', dbError);
      } finally {
        await client.close();
      }
      
      break;
    }

    // Handle hosted checkout flow (CheckoutSession) - keep for backwards compatibility
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const metadata = session.metadata;
      
      if (!metadata) {
        console.error('No metadata in checkout session');
        break;
      }

      try {
        await client.connect();
        const db = client.db();
        
        const hasExistingSession = metadata.hasExistingBooking === 'true';
        const booking = {
          userId: null, // Guest booking
          userName: metadata.customerName,
          userEmail: metadata.customerEmail,
          isGuest: true,
          guestPhone: metadata.customerPhone || null,
          vehicleRegistration: metadata.vehicleRegistration,
          vehicleState: metadata.vehicleState,
          serviceType: hasExistingSession
            ? `Existing Booking - ${metadata.garageName}`
            : (metadata.serviceType || 'Standard Service'),
          pickupAddress: metadata.pickupAddress,
          pickupTime: metadata.earliestPickup,
          dropoffTime: metadata.latestDropoff,
          hasExistingBooking: hasExistingSession,
          garageName: metadata.garageName || null,
          existingBookingRef: metadata.existingBookingRef || null,
          existingBookingNotes: null,
          paymentStatus: 'paid',
          paymentId: session.payment_intent as string,
          paymentAmount: session.amount_total,
          stripeSessionId: session.id,
          status: 'pending',
          currentStage: 'booking_confirmed',
          overallProgress: 14,
          updates: [{
            stage: 'booking_confirmed',
            timestamp: new Date(),
            message: hasExistingSession
              ? `We've received your pick-up request for your existing booking at ${metadata.garageName}.`
              : 'We\'ve received your booking request and will confirm shortly.',
            updatedBy: 'system',
          }],
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const result = await db.collection('bookings').insertOne(booking);
        console.log('Booking created from CheckoutSession:', result.insertedId);
        
      } catch (dbError) {
        console.error('Failed to create booking:', dbError);
      } finally {
        await client.close();
      }
      
      break;
    }
    
    case 'payment_intent.payment_failed': {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      console.log('Payment failed:', paymentIntent.id, paymentIntent.last_payment_error?.message);
      break;
    }
    
    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}