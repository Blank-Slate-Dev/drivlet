// src/app/api/stripe/service-payment-webhook/route.ts
// Handles service payment completion
// Listens for:
// - checkout.session.completed events where type='service_payment' (redirect flow)
// - payment_intent.succeeded events where type='service_payment' (embedded flow)

import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import Stripe from 'stripe';
import { MongoClient, ObjectId } from 'mongodb';

async function updateBookingAsPaid(
  bookingId: string,
  paymentId: string,
  amount: number
) {
  const client = new MongoClient(process.env.MONGODB_URI!);

  try {
    await client.connect();
    const db = client.db();

    const result = await db.collection('bookings').findOneAndUpdate(
      { _id: new ObjectId(bookingId) },
      {
        $set: {
          servicePaymentStatus: 'paid',
          servicePaymentId: paymentId,
          currentStage: 'ready_for_return',
          overallProgress: 85,
          updatedAt: new Date(),
        },
        $push: {
          updates: {
            stage: 'service_payment_received',
            timestamp: new Date(),
            message: `Customer paid $${(amount / 100).toFixed(2)} for service. Ready for return delivery.`,
            updatedBy: 'system',
          } as never,
        },
      },
      { returnDocument: 'after' }
    );

    if (!result) {
      console.error('❌ Booking not found:', bookingId);
      return false;
    }

    console.log('✅ Booking updated:', bookingId);
    console.log('📍 New stage: ready_for_return');
    return true;
  } finally {
    await client.close();
  }
}

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

  // Handle checkout session completed (redirect flow)
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const metadata = session.metadata;

    // Only process service payments
    if (metadata?.type !== 'service_payment') {
      console.log('ℹ️ Not a service payment checkout session, skipping');
      return NextResponse.json({ received: true });
    }

    const bookingId = metadata.bookingId;
    
    if (!bookingId) {
      console.error('❌ No bookingId in checkout session metadata');
      return NextResponse.json({ error: 'No booking ID' }, { status: 400 });
    }

    console.log('💳 Service payment completed via checkout!');
    console.log('📦 Booking ID:', bookingId);
    console.log('💰 Amount:', (session.amount_total || 0) / 100, 'AUD');

    await updateBookingAsPaid(
      bookingId,
      session.payment_intent as string,
      session.amount_total || 0
    );

    return NextResponse.json({ received: true });
  }

  // Handle payment intent succeeded (embedded flow)
  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const metadata = paymentIntent.metadata;

    // Only process service payments
    if (metadata?.type !== 'service_payment') {
      console.log('ℹ️ Not a service payment intent, skipping');
      return NextResponse.json({ received: true });
    }

    const bookingId = metadata.bookingId;
    
    if (!bookingId) {
      console.error('❌ No bookingId in payment intent metadata');
      return NextResponse.json({ error: 'No booking ID' }, { status: 400 });
    }

    console.log('💳 Service payment completed via embedded!');
    console.log('📦 Booking ID:', bookingId);
    console.log('💰 Amount:', paymentIntent.amount / 100, 'AUD');

    await updateBookingAsPaid(
      bookingId,
      paymentIntent.id,
      paymentIntent.amount
    );

    return NextResponse.json({ received: true });
  }

  // For other event types
  console.log('ℹ️ Unhandled event type:', event.type);
  return NextResponse.json({ received: true });
}