// src/app/api/stripe/service-payment-webhook/route.ts
// Handles service payment completion
// Listens for checkout.session.completed events where type='service_payment'

import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import Stripe from 'stripe';
import { MongoClient, ObjectId } from 'mongodb';

export async function POST(request: NextRequest) {
  console.log('🔔 Service payment webhook received!');

  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    console.error('❌ No stripe signature found');
    return NextResponse.json({ error: 'No signature' }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  if (!webhookSecret) {
    console.error('❌ STRIPE_WEBHOOK_SECRET not configured');
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    console.log('✅ Webhook signature verified');
    console.log('📋 Event type:', event.type);
  } catch (err) {
    console.error('❌ Webhook signature verification failed:', err);
    return NextResponse.json(
      { error: 'Webhook signature verification failed' },
      { status: 400 }
    );
  }

  // Handle checkout session completed for service payments
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const metadata = session.metadata;

    // Only process service payments
    if (metadata?.type !== 'service_payment') {
      console.log('ℹ️ Not a service payment, skipping');
      return NextResponse.json({ received: true });
    }

    const bookingId = metadata.bookingId;
    
    if (!bookingId) {
      console.error('❌ No bookingId in metadata');
      return NextResponse.json({ error: 'No booking ID' }, { status: 400 });
    }

    console.log('💳 Service payment completed!');
    console.log('📦 Booking ID:', bookingId);
    console.log('💰 Amount:', (session.amount_total || 0) / 100, 'AUD');
    console.log('🔧 Garage:', metadata.garageName || 'N/A');

    const client = new MongoClient(process.env.MONGODB_URI!);

    try {
      await client.connect();
      const db = client.db();

      // Update the booking to mark service as paid
      const result = await db.collection('bookings').findOneAndUpdate(
        { _id: new ObjectId(bookingId) },
        {
          $set: {
            servicePaymentStatus: 'paid',
            servicePaymentId: session.payment_intent as string,
            currentStage: 'ready_for_return',
            overallProgress: 85,
            updatedAt: new Date(),
          },
          $push: {
            updates: {
              stage: 'service_payment_received',
              timestamp: new Date(),
              message: `Customer paid $${((session.amount_total || 0) / 100).toFixed(2)} for service. Ready for return delivery.`,
              updatedBy: 'system',
            } as never,
          },
        },
        { returnDocument: 'after' }
      );

      if (result) {
        console.log('✅ Booking updated - service payment marked as paid');
        console.log('🚗 Ready for driver to return vehicle');
      } else {
        console.error('❌ Booking not found:', bookingId);
      }

    } catch (dbError) {
      console.error('❌ Database error:', dbError);
    } finally {
      await client.close();
    }
  }

  return NextResponse.json({ received: true });
}