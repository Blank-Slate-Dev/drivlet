// src/app/api/stripe/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import Stripe from 'stripe';
import { MongoClient, ObjectId } from 'mongodb';
import { generateUniqueTrackingCode } from '@/lib/trackingCode';

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

        // Generate unique tracking code
        console.log('🔑 Generating tracking code...');
        const trackingCode = await generateUniqueTrackingCode();
        console.log('✅ Tracking code generated:', trackingCode);

        const bookingData = {
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
          trackingCode,
          hasExistingBooking: hasExisting,
          garageName: metadata.garageName || null,
          garageAddress: metadata.garageAddress || null,
          garagePlaceId: metadata.garagePlaceId || null, // Google Places ID for garage matching
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

        console.log('📝 Creating booking atomically with paymentId:', paymentIntent.id);

        // Use findOneAndUpdate with upsert to atomically create or find existing booking
        // This prevents race conditions between webhook and fallback endpoint
        const result = await db.collection('bookings').findOneAndUpdate(
          { paymentId: paymentIntent.id },
          { $setOnInsert: bookingData },
          {
            upsert: true,
            returnDocument: 'after',
          }
        );

        const booking = result;
        const wasInserted = booking?.createdAt?.getTime() === bookingData.createdAt.getTime();

        if (!wasInserted) {
          console.log('ℹ️ Booking already exists (from fallback):', booking?._id);
          break;
        }

        console.log('✅✅✅ BOOKING SAVED SUCCESSFULLY!');
        console.log('🆔 Booking ID:', booking?._id);
        console.log('📋 Summary:', {
          customer: metadata.customerEmail,
          vehicle: metadata.vehicleRegistration,
          paymentId: paymentIntent.id,
          amount: paymentIntent.amount / 100 + ' AUD'
        });

        const bookingId = booking?._id;

        // Auto-assign to matching garage if garagePlaceId exists
        if (metadata.garagePlaceId) {
          console.log('🔍 Looking for matching garage with placeId:', metadata.garagePlaceId);

          const matchingGarage = await db.collection('garages').findOne({
            linkedGaragePlaceId: metadata.garagePlaceId,
            status: 'approved'
          });

          if (matchingGarage) {
            console.log('✅ Found matching garage:', matchingGarage.businessName);

            // Update booking with garage assignment
            await db.collection('bookings').updateOne(
              { _id: bookingId },
              {
                $set: {
                  assignedGarageId: matchingGarage._id,
                  assignedAt: new Date(),
                  garageNotifiedAt: new Date(),
                },
                $push: {
                  updates: {
                    stage: 'garage_assigned',
                    timestamp: new Date(),
                    message: `Booking automatically assigned to ${matchingGarage.businessName}`,
                    updatedBy: 'system',
                  } as never
                }
              }
            );

            // Create notification for the garage
            await db.collection('garagenotifications').insertOne({
              garageId: matchingGarage._id,
              bookingId: bookingId,
              type: 'new_booking',
              title: 'New Booking Assignment',
              message: `New booking for ${metadata.vehicleRegistration} - ${bookingData.serviceType}. Customer: ${metadata.customerName}`,
              isRead: false,
              metadata: {
                vehicleRegistration: metadata.vehicleRegistration,
                serviceType: bookingData.serviceType,
                pickupTime: new Date(metadata.earliestPickup),
                customerName: metadata.customerName,
                urgency: isManual ? 'urgent' : 'normal',
              },
              createdAt: new Date(),
              updatedAt: new Date(),
            });

            console.log('📧 Notification created for garage:', matchingGarage.businessName);
          } else {
            console.log('⚠️ No matching approved garage found for placeId:', metadata.garagePlaceId);
          }
        } else if (metadata.garageName) {
          // Fallback: Try to match by garage name (partial match)
          console.log('🔍 Looking for matching garage by name:', metadata.garageName);

          // Get all approved garages and check for partial name match
          const approvedGarages = await db.collection('garages').find({ status: 'approved' }).toArray();
          const normalizedBookingName = metadata.garageName.toLowerCase();
          const matchingGarage = approvedGarages.find(g => {
            const linkedName = (g.linkedGarageName || '').toLowerCase();
            // Match if booking name contains linked name or vice versa
            return linkedName && (normalizedBookingName.includes(linkedName) || linkedName.includes(normalizedBookingName));
          });

          if (matchingGarage) {
            console.log('✅ Found matching garage by name:', matchingGarage.businessName);

            // Update booking with garage assignment
            await db.collection('bookings').updateOne(
              { _id: bookingId },
              {
                $set: {
                  assignedGarageId: matchingGarage._id,
                  assignedAt: new Date(),
                  garageNotifiedAt: new Date(),
                },
                $push: {
                  updates: {
                    stage: 'garage_assigned',
                    timestamp: new Date(),
                    message: `Booking automatically assigned to ${matchingGarage.businessName}`,
                    updatedBy: 'system',
                  } as never
                }
              }
            );

            // Create notification for the garage
            await db.collection('garagenotifications').insertOne({
              garageId: matchingGarage._id,
              bookingId: bookingId,
              type: 'new_booking',
              title: 'New Booking Assignment',
              message: `New booking for ${metadata.vehicleRegistration} - ${bookingData.serviceType}. Customer: ${metadata.customerName}`,
              isRead: false,
              metadata: {
                vehicleRegistration: metadata.vehicleRegistration,
                serviceType: bookingData.serviceType,
                pickupTime: new Date(metadata.earliestPickup),
                customerName: metadata.customerName,
                urgency: isManual ? 'urgent' : 'normal',
              },
              createdAt: new Date(),
              updatedAt: new Date(),
            });

            console.log('📧 Notification created for garage:', matchingGarage.businessName);
          } else {
            console.log('⚠️ No matching approved garage found for name:', metadata.garageName);
          }
        }

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

        const paymentIntentId = session.payment_intent as string;
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

        const sessionBookingData = {
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
          garageAddress: metadata.garageAddress || null,
          garagePlaceId: metadata.garagePlaceId || null, // Google Places ID for garage matching
          existingBookingRef: metadata.existingBookingRef || null,
          existingBookingNotes: null,
          transmissionType: transmissionTypeSession,
          isManualTransmission: isManualSession,
          selectedServices: selectedServicesSession,
          primaryServiceCategory: primaryServiceCategorySession,
          serviceNotes: serviceNotesSession,
          flags: flagsSession,
          paymentStatus: 'paid',
          paymentId: paymentIntentId,
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

        console.log('📝 Creating booking atomically from checkout session with paymentId:', paymentIntentId);

        // Use findOneAndUpdate with upsert to atomically create or find existing booking
        // This prevents race conditions between webhook and fallback endpoint
        const sessionResult = await db.collection('bookings').findOneAndUpdate(
          { paymentId: paymentIntentId },
          { $setOnInsert: sessionBookingData },
          {
            upsert: true,
            returnDocument: 'after',
          }
        );

        const sessionBooking = sessionResult;
        const sessionWasInserted = sessionBooking?.createdAt?.getTime() === sessionBookingData.createdAt.getTime();

        if (!sessionWasInserted) {
          console.log('ℹ️ Booking already exists (from fallback):', sessionBooking?._id);
          break;
        }

        const sessionBookingId = sessionBooking?._id;

        console.log('✅✅✅ BOOKING SAVED FROM CHECKOUT SESSION!');
        console.log('🆔 Booking ID:', sessionBookingId);

        // Auto-assign to matching garage if garagePlaceId exists
        if (metadata.garagePlaceId) {
          console.log('🔍 Looking for matching garage with placeId:', metadata.garagePlaceId);

          const matchingGarage = await db.collection('garages').findOne({
            linkedGaragePlaceId: metadata.garagePlaceId,
            status: 'approved'
          });

          if (matchingGarage) {
            console.log('✅ Found matching garage:', matchingGarage.businessName);

            // Update booking with garage assignment
            await db.collection('bookings').updateOne(
              { _id: sessionBookingId },
              {
                $set: {
                  assignedGarageId: matchingGarage._id,
                  assignedAt: new Date(),
                  garageNotifiedAt: new Date(),
                },
                $push: {
                  updates: {
                    stage: 'garage_assigned',
                    timestamp: new Date(),
                    message: `Booking automatically assigned to ${matchingGarage.businessName}`,
                    updatedBy: 'system',
                  } as never
                }
              }
            );

            // Create notification for the garage
            await db.collection('garagenotifications').insertOne({
              garageId: matchingGarage._id,
              bookingId: sessionBookingId,
              type: 'new_booking',
              title: 'New Booking Assignment',
              message: `New booking for ${metadata.vehicleRegistration} - ${sessionBookingData.serviceType}. Customer: ${metadata.customerName}`,
              isRead: false,
              metadata: {
                vehicleRegistration: metadata.vehicleRegistration,
                serviceType: sessionBookingData.serviceType,
                pickupTime: new Date(metadata.earliestPickup),
                customerName: metadata.customerName,
                urgency: isManualSession ? 'urgent' : 'normal',
              },
              createdAt: new Date(),
              updatedAt: new Date(),
            });

            console.log('📧 Notification created for garage:', matchingGarage.businessName);
          } else {
            console.log('⚠️ No matching approved garage found for placeId:', metadata.garagePlaceId);
          }
        } else if (metadata.garageName) {
          // Fallback: Try to match by garage name (partial match)
          console.log('🔍 Looking for matching garage by name:', metadata.garageName);

          // Get all approved garages and check for partial name match
          const approvedGarages = await db.collection('garages').find({ status: 'approved' }).toArray();
          const normalizedBookingName = metadata.garageName.toLowerCase();
          const matchingGarage = approvedGarages.find(g => {
            const linkedName = (g.linkedGarageName || '').toLowerCase();
            // Match if booking name contains linked name or vice versa
            return linkedName && (normalizedBookingName.includes(linkedName) || linkedName.includes(normalizedBookingName));
          });

          if (matchingGarage) {
            console.log('✅ Found matching garage by name:', matchingGarage.businessName);

            // Update booking with garage assignment
            await db.collection('bookings').updateOne(
              { _id: sessionBookingId },
              {
                $set: {
                  assignedGarageId: matchingGarage._id,
                  assignedAt: new Date(),
                  garageNotifiedAt: new Date(),
                },
                $push: {
                  updates: {
                    stage: 'garage_assigned',
                    timestamp: new Date(),
                    message: `Booking automatically assigned to ${matchingGarage.businessName}`,
                    updatedBy: 'system',
                  } as never
                }
              }
            );

            // Create notification for the garage
            await db.collection('garagenotifications').insertOne({
              garageId: matchingGarage._id,
              bookingId: sessionBookingId,
              type: 'new_booking',
              title: 'New Booking Assignment',
              message: `New booking for ${metadata.vehicleRegistration} - ${sessionBookingData.serviceType}. Customer: ${metadata.customerName}`,
              isRead: false,
              metadata: {
                vehicleRegistration: metadata.vehicleRegistration,
                serviceType: sessionBookingData.serviceType,
                pickupTime: new Date(metadata.earliestPickup),
                customerName: metadata.customerName,
                urgency: isManualSession ? 'urgent' : 'normal',
              },
              createdAt: new Date(),
              updatedAt: new Date(),
            });

            console.log('📧 Notification created for garage:', matchingGarage.businessName);
          } else {
            console.log('⚠️ No matching approved garage found for name:', metadata.garageName);
          }
        }

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
