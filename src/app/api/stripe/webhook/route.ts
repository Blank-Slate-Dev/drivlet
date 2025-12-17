// src/app/api/stripe/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import Stripe from 'stripe';
import { MongoClient } from 'mongodb';

export async function POST(request: NextRequest) {
  console.log('🔔 Webhook received!');

  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  console.log('📝 Signature:', signature ? 'Present' : 'Missing');

  if (!signature) {
    console.error('❌ No stripe signature found');
    return NextResponse.json({ error: 'No signature' }, { status: 400 });
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.error('❌ STRIPE_WEBHOOK_SECRET not configured');
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
    console.log('✅ Webhook signature verified');
    console.log('📋 Event type:', event.type);
  } catch (err) {
    console.error('❌ Webhook signature verification failed:', err);
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

      console.log('💳 payment_intent.succeeded received');
      console.log('📦 Payment Intent ID:', paymentIntent.id);
      console.log('📦 Metadata:', JSON.stringify(metadata, null, 2));

      if (!metadata || !metadata.customerEmail) {
        console.log('⚠️ PaymentIntent without booking metadata, skipping');
        break;
      }

      console.log('📧 Customer:', metadata.customerEmail, '-', metadata.customerName);
      console.log('🚗 Vehicle:', metadata.vehicleRegistration, '(' + metadata.vehicleState + ')');
      console.log('💰 Amount:', paymentIntent.amount / 100, 'AUD');

      // Create a new client for this request
      const client = new MongoClient(process.env.MONGODB_URI!);

      try {
        console.log('🔌 Connecting to MongoDB...');
        await client.connect();
        console.log('✅ MongoDB connected');

        const db = client.db();
        console.log('📊 Database:', db.databaseName);

        // Check for duplicate booking (already created by fallback endpoint)
        const existingBooking = await db.collection('bookings').findOne({
          paymentId: paymentIntent.id
        });

        if (existingBooking) {
          console.log('ℹ️ Booking already exists (from fallback):', existingBooking._id);
          break;
        }

        const hasExisting = metadata.hasExistingBooking === 'true';
        const isManual = metadata.isManualTransmission === 'true';
        const transmissionType = metadata.transmissionType || 'automatic';

        // Parse selected services
        let selectedServices = [];
        try {
          selectedServices = JSON.parse(metadata.selectedServices || '[]');
        } catch {
          console.log('⚠️ Could not parse selectedServices, using empty array');
        }
        const primaryServiceCategory = metadata.primaryServiceCategory || null;
        const serviceNotes = metadata.serviceNotes || '';

        // Build flags array
        const flags = [];
        if (isManual) {
          flags.push({
            type: 'manual_transmission',
            reason: 'Customer selected manual transmission - requires manual-capable driver',
            createdAt: new Date(),
          });
        }

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
          transmissionType,
          isManualTransmission: isManual,
          selectedServices,
          primaryServiceCategory,
          serviceNotes,
          flags,
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

        console.log('📝 Creating booking with data:', JSON.stringify(booking, null, 2));

        const result = await db.collection('bookings').insertOne(booking);

        console.log('✅✅✅ BOOKING SAVED SUCCESSFULLY!');
        console.log('🆔 Booking ID:', result.insertedId);
        console.log('📋 Summary:', {
          customer: metadata.customerEmail,
          vehicle: metadata.vehicleRegistration,
          paymentId: paymentIntent.id,
          amount: paymentIntent.amount / 100 + ' AUD'
        });

      } catch (dbError) {
        console.error('❌❌❌ ERROR SAVING BOOKING:', dbError);
        if (dbError instanceof Error) {
          console.error('Error name:', dbError.name);
          console.error('Error message:', dbError.message);
          console.error('Error stack:', dbError.stack);
        }
      } finally {
        await client.close();
        console.log('🔌 MongoDB connection closed');
      }

      break;
    }

    // Handle hosted checkout flow (CheckoutSession) - keep for backwards compatibility
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const metadata = session.metadata;

      console.log('💳 checkout.session.completed received');
      console.log('📦 Session ID:', session.id);
      console.log('📦 Metadata:', JSON.stringify(metadata, null, 2));

      if (!metadata) {
        console.error('⚠️ No metadata in checkout session');
        break;
      }

      // Create a new client for this request
      const client = new MongoClient(process.env.MONGODB_URI!);

      try {
        console.log('🔌 Connecting to MongoDB...');
        await client.connect();
        console.log('✅ MongoDB connected');

        const db = client.db();

        // Check for duplicate booking
        const paymentIntentId = session.payment_intent as string;
        const existingBooking = await db.collection('bookings').findOne({
          paymentId: paymentIntentId
        });

        if (existingBooking) {
          console.log('ℹ️ Booking already exists (from fallback):', existingBooking._id);
          break;
        }

        const hasExistingSession = metadata.hasExistingBooking === 'true';
        const isManualSession = metadata.isManualTransmission === 'true';
        const transmissionTypeSession = metadata.transmissionType || 'automatic';

        // Parse selected services
        let selectedServicesSession = [];
        try {
          selectedServicesSession = JSON.parse(metadata.selectedServices || '[]');
        } catch {
          console.log('⚠️ Could not parse selectedServices in session, using empty array');
        }
        const primaryServiceCategorySession = metadata.primaryServiceCategory || null;
        const serviceNotesSession = metadata.serviceNotes || '';

        // Build flags array
        const flagsSession = [];
        if (isManualSession) {
          flagsSession.push({
            type: 'manual_transmission',
            reason: 'Customer selected manual transmission - requires manual-capable driver',
            createdAt: new Date(),
          });
        }

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
          transmissionType: transmissionTypeSession,
          isManualTransmission: isManualSession,
          selectedServices: selectedServicesSession,
          primaryServiceCategory: primaryServiceCategorySession,
          serviceNotes: serviceNotesSession,
          flags: flagsSession,
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

        console.log('📝 Creating booking from checkout session...');
        const result = await db.collection('bookings').insertOne(booking);

        console.log('✅✅✅ BOOKING SAVED FROM CHECKOUT SESSION!');
        console.log('🆔 Booking ID:', result.insertedId);

      } catch (dbError) {
        console.error('❌❌❌ ERROR SAVING BOOKING:', dbError);
        if (dbError instanceof Error) {
          console.error('Error name:', dbError.name);
          console.error('Error message:', dbError.message);
        }
      } finally {
        await client.close();
        console.log('🔌 MongoDB connection closed');
      }

      break;
    }

    case 'payment_intent.payment_failed': {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      console.log('❌ Payment failed:', paymentIntent.id);
      console.log('❌ Error:', paymentIntent.last_payment_error?.message);
      break;
    }

    default:
      console.log(`ℹ️ Unhandled event type: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}
