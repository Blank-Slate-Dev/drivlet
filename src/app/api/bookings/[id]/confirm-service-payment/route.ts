// src/app/api/bookings/[id]/confirm-service-payment/route.ts
// Confirms service payment by checking with Stripe directly
// This provides immediate feedback without waiting for webhooks

import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { connectDB } from '@/lib/mongodb';
import Booking from '@/models/Booking';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { withRateLimit, RATE_LIMITS } from '@/lib/rateLimit';
import { markServicePaymentPaid } from '@/lib/servicePayment';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Rate limit to prevent enumeration
  const rateLimit = withRateLimit(request, RATE_LIMITS.api, "confirm-service-payment");
  if (!rateLimit.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const { id: bookingId } = await params;

  if (!bookingId) {
    return NextResponse.json(
      { error: 'Booking ID is required' },
      { status: 400 }
    );
  }

  try {
    await connectDB();

    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Ownership check gates DETAILED responses. Unauthenticated callers
    // (guests landing on /payment/success after paying the driver-generated
    // Checkout link) are still allowed to TRIGGER verification — the answer
    // comes from Stripe's records, nothing sensitive is returned, and the
    // endpoint is rate-limited.
    const session = await getServerSession(authOptions);
    const isOwner =
      session?.user?.role === "admin" ||
      (session?.user?.id && booking.userId?.toString() === session.user.id) ||
      (session?.user?.email && booking.userEmail?.toLowerCase() === session.user.email.toLowerCase());
    void isOwner; // response shape below is minimal either way

    // Already paid - return success
    if (booking.servicePaymentStatus === 'paid') {
      return NextResponse.json({
        success: true,
        alreadyPaid: true,
        booking: {
          servicePaymentStatus: 'paid',
          currentStage: booking.currentStage,
        },
      });
    }

    // Resolve a PaymentIntent to verify: prefer the stored PI id; fall back
    // to looking it up via the Checkout session (Checkout creates the PI
    // lazily, so the id is often unknown at link-generation time).
    let paymentIntentId = booking.servicePaymentIntentId || null;
    if (!paymentIntentId && booking.servicePaymentSessionId) {
      try {
        const checkoutSession = await stripe.checkout.sessions.retrieve(
          booking.servicePaymentSessionId
        );
        paymentIntentId =
          typeof checkoutSession.payment_intent === 'string'
            ? checkoutSession.payment_intent
            : checkoutSession.payment_intent?.id || null;
      } catch (err) {
        console.error('Failed to retrieve checkout session for verification:', err);
      }
    }

    if (!paymentIntentId) {
      return NextResponse.json(
        { error: 'No payment found to verify for this booking yet' },
        { status: 400 }
      );
    }

    // Verify with Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status === 'succeeded') {
      // Shared marker: idempotent, guards stage regression, sets the payment
      // method, and broadcasts SSE — same path as the webhooks.
      await markServicePaymentPaid({
        bookingId,
        paymentId: paymentIntent.id,
        amount: paymentIntent.amount,
      });

      console.log('✅ Payment confirmed via direct verification:', bookingId);

      return NextResponse.json({
        success: true,
        booking: {
          servicePaymentStatus: 'paid',
        },
      });
    }

    // Payment not yet succeeded
    return NextResponse.json({
      success: false,
      paymentStatus: paymentIntent.status,
    });
  } catch (error) {
    console.error('Error confirming service payment:', error);
    return NextResponse.json(
      { error: 'Failed to confirm payment' },
      { status: 500 }
    );
  }
}