// src/app/api/stripe/service-payment-webhook/route.ts
// Handles service payment completion
// Listens for:
// - checkout.session.completed events where type='service_payment' (redirect flow)
// - payment_intent.succeeded events where type='service_payment' (embedded flow)
// - checkout.session.completed events where type='extra_charge' (admin-requested
//   additional payments — marks the matching extraCharges entry as paid)

import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import Stripe from 'stripe';
import { MongoClient, ObjectId } from 'mongodb';
import mongoose from 'mongoose';
import { sendEmail } from '@/lib/email';
import { notifyBookingUpdate } from '@/lib/emit-booking-update';

async function updateBookingAsPaid(
  bookingId: string,
  paymentId: string,
  amount: number
) {
  if (!mongoose.Types.ObjectId.isValid(bookingId)) {
    console.error("Invalid bookingId in Stripe metadata:", bookingId);
    return false;
  }

  const client = new MongoClient(process.env.MONGODB_URI!);

  try {
    await client.connect();
    const db = client.db();

    // Always record the payment…
    let result = await db.collection('bookings').findOneAndUpdate(
      { _id: new ObjectId(bookingId) },
      {
        $set: {
          servicePaymentStatus: 'paid',
          servicePaymentId: paymentId,
          updatedAt: new Date(),
        },
        $push: {
          updates: {
            stage: 'service_payment_received',
            timestamp: new Date(),
            message: `Customer paid $${(amount / 100).toFixed(2)} for service.`,
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

    // …but only advance the stage if the booking hasn't already moved past
    // the service phase. Payment is optional (backup link) so the return leg
    // may already be underway — never regress driver_returning/delivered.
    if (['at_garage', 'service_in_progress'].includes(result.currentStage)) {
      const advanced = await db.collection('bookings').findOneAndUpdate(
        {
          _id: new ObjectId(bookingId),
          currentStage: { $in: ['at_garage', 'service_in_progress'] },
        },
        { $set: { currentStage: 'ready_for_return', overallProgress: 85 } },
        { returnDocument: 'after' }
      );
      if (advanced) result = advanced;
    }

    console.log('✅ Booking updated:', bookingId);
    console.log('📍 Stage after payment:', result.currentStage);

    // Emit SSE so the customer tracker (and any open admin views) reflect the
    // paid status immediately — without this, the tracker only learns about
    // the payment on a full page reload. Stage email/SMS suppressed (the
    // timeline update above is the customer-visible record).
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      notifyBookingUpdate(result as any, { suppressCustomerNotifications: true });
    } catch (err) {
      console.error('Failed to emit booking update after payment:', err);
    }

    return true;
  } finally {
    await client.close();
  }
}

// Mark an admin-requested extra charge as paid. Matches the extraCharges entry
// by checkoutSessionId first, falling back to the oldest pending entry for the
// booking. Sends the customer a short receipt email (non-blocking).
async function markExtraChargeAsPaid(
  bookingId: string,
  checkoutSessionId: string,
  amount: number
) {
  if (!mongoose.Types.ObjectId.isValid(bookingId)) {
    console.error('Invalid bookingId in Stripe metadata:', bookingId);
    return false;
  }

  const client = new MongoClient(process.env.MONGODB_URI!);
  const now = new Date();
  const amountDisplay = `$${(amount / 100).toFixed(2)}`;

  try {
    await client.connect();
    const db = client.db();

    const buildUpdate = () => ({
      $set: {
        'extraCharges.$.status': 'paid',
        'extraCharges.$.paidAt': now,
        updatedAt: now,
      },
      $push: {
        updates: {
          stage: 'extra_charge_paid',
          timestamp: now,
          message: `Customer paid the additional charge of ${amountDisplay}.`,
          updatedBy: 'system',
        } as never,
      },
    });

    // Match by checkout session ID first (only pending entries)
    let result = await db.collection('bookings').findOneAndUpdate(
      {
        _id: new ObjectId(bookingId),
        extraCharges: { $elemMatch: { checkoutSessionId, status: 'pending' } },
      },
      buildUpdate(),
      { returnDocument: 'after' }
    );

    // Fallback: oldest pending entry for this booking (legacy entries without a session ID)
    if (!result) {
      result = await db.collection('bookings').findOneAndUpdate(
        {
          _id: new ObjectId(bookingId),
          extraCharges: { $elemMatch: { status: 'pending' } },
        },
        buildUpdate(),
        { returnDocument: 'after' }
      );
    }

    if (!result) {
      console.error('❌ No pending extra charge found for booking:', bookingId);
      return false;
    }

    console.log('✅ Extra charge marked as paid for booking:', bookingId);

    // Short receipt email (non-blocking)
    const userEmail = result.userEmail as string | undefined;
    const userName = (result.userName as string | undefined) || userEmail;
    const vehicleRegistration = (result.vehicleRegistration as string | undefined) || '';
    const trackingCode = result.trackingCode as string | undefined;
    if (userEmail) {
      const firstName = (result.userName as string | undefined)?.split(' ')[0] || 'there';
      const reference = trackingCode || vehicleRegistration;
      sendEmail({
        to: userEmail,
        toName: userName || userEmail,
        subject: `Payment received — ${vehicleRegistration}`,
        textContent: [
          `Hi ${firstName},`,
          ``,
          `We've received your additional payment of ${amountDisplay} AUD for booking ${reference}. No further action is needed.`,
          ``,
          `Thanks,`,
          `The drivlet team`,
        ].join('\n'),
        htmlContent: [
          `<p style="color: #475569; font-size: 16px;">Hi ${firstName},</p>`,
          `<p style="color: #475569; font-size: 16px; line-height: 1.6;">We've received your additional payment of <strong>${amountDisplay} AUD</strong> for booking <strong>${reference}</strong>. No further action is needed.</p>`,
          `<p style="margin-top: 24px; color: #94a3b8; font-size: 12px;">The drivlet team</p>`,
        ].join(''),
      }).catch((err) => console.error('Failed to send extra charge receipt email:', err));
    }

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

  // Use a dedicated secret for this endpoint; fall back to shared secret for backward compat
  const webhookSecret =
    process.env.STRIPE_SERVICE_PAYMENT_WEBHOOK_SECRET ??
    process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('❌ STRIPE_SERVICE_PAYMENT_WEBHOOK_SECRET / STRIPE_WEBHOOK_SECRET not configured');
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

    // Admin-requested extra charge — mark the matching extraCharges entry as paid
    if (metadata?.type === 'extra_charge') {
      const bookingId = metadata.bookingId;

      if (!bookingId) {
        console.error('❌ No bookingId in extra charge checkout session metadata');
        return NextResponse.json({ error: 'No booking ID' }, { status: 400 });
      }

      if (!mongoose.Types.ObjectId.isValid(bookingId)) {
        console.error('Invalid bookingId in Stripe metadata:', bookingId);
        return NextResponse.json({ error: 'Invalid booking ID' }, { status: 400 });
      }

      console.log('💳 Extra charge paid via checkout!');
      console.log('📦 Booking ID:', bookingId);
      console.log('💰 Amount:', (session.amount_total || 0) / 100, 'AUD');

      await markExtraChargeAsPaid(bookingId, session.id, session.amount_total || 0);

      return NextResponse.json({ received: true });
    }

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

    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      console.error("Invalid bookingId in Stripe metadata:", bookingId);
      return NextResponse.json({ error: "Invalid booking ID" }, { status: 400 });
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

    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      console.error("Invalid bookingId in Stripe metadata:", bookingId);
      return NextResponse.json({ error: "Invalid booking ID" }, { status: 400 });
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