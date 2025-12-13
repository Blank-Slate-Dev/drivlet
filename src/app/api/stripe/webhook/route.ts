// src/app/api/stripe/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import Stripe from 'stripe';
import clientPromise from '@/lib/mongodb';

// Disable body parsing - Stripe needs raw body for signature verification
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    console.error('No stripe signature found');
    return NextResponse.json({ error: 'No signature' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
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
        const client = await clientPromise;
        const db = client.db();
        
        // Create the booking in database
        const booking = {
          // Customer info
          userName: metadata.customerName,
          userEmail: metadata.customerEmail,
          userPhone: metadata.customerPhone,
          isGuest: true, // For now, treating all as guest bookings
          
          // Vehicle info
          vehicleRegistration: metadata.vehicleRegistration,
          vehicleState: metadata.vehicleState,
          
          // Service details
          serviceType: metadata.serviceType,
          pickupAddress: metadata.pickupAddress,
          earliestPickup: metadata.earliestPickup,
          latestDropoff: metadata.latestDropoff,
          
          // Existing booking details (if applicable)
          existingBookingRef: metadata.existingBookingRef || null,
          existingGarage: metadata.existingGarage || null,
          
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
        
        // TODO: Send confirmation email to customer
        // await sendBookingConfirmationEmail(booking);
        
      } catch (dbError) {
        console.error('Failed to create booking:', dbError);
        // Still return 200 to Stripe so it doesn't retry
        // Log the error for manual intervention
      }
      
      break;
    }
    
    case 'checkout.session.expired': {
      // Payment was not completed in time
      console.log('Checkout session expired:', event.data.object.id);
      break;
    }
    
    case 'payment_intent.payment_failed': {
      // Payment failed
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      console.log('Payment failed:', paymentIntent.id);
      break;
    }
    
    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}