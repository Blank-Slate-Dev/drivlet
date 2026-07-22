import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { MongoClient, ObjectId } from "mongodb";
import { generateUniqueTrackingCode } from "@/lib/trackingCode";
import { sendBookingStageEmail } from "@/lib/email";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  typescript: true,
});

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_REQUEST_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("STRIPE_REQUEST_WEBHOOK_SECRET not configured");
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Request webhook signature verification failed:", message);
    return NextResponse.json({ error: "Webhook signature verification failed" }, { status: 400 });
  }

  if (event.type !== "payment_intent.succeeded") {
    return NextResponse.json({ received: true });
  }

  const paymentIntent = event.data.object as Stripe.PaymentIntent;
  const metadata = paymentIntent.metadata;

  if (metadata.type !== "request_payment") {
    return NextResponse.json({ received: true });
  }

  const bookingRequestId = metadata.bookingRequestId;
  if (!bookingRequestId) {
    console.error("request-payment-webhook: missing bookingRequestId in metadata");
    return NextResponse.json({ received: true });
  }

  console.log("💳 request-payment-webhook: processing", paymentIntent.id, "for request", bookingRequestId);

  const client = new MongoClient(process.env.MONGODB_URI!);

  try {
    await client.connect();
    const db = client.db();

    const requestDoc = await db.collection("bookingrequests").findOne({
      _id: new ObjectId(bookingRequestId),
    });

    if (!requestDoc) {
      console.error("request-payment-webhook: BookingRequest not found:", bookingRequestId);
      return NextResponse.json({ received: true });
    }

    // Idempotency: already paid or already converted
    if (requestDoc.status === "paid" || requestDoc.convertedBookingId) {
      console.log("request-payment-webhook: already processed, skipping", bookingRequestId);
      return NextResponse.json({ received: true });
    }

    // Idempotency: check if a booking already exists for this paymentIntentId
    const existingBooking = await db.collection("bookings").findOne({
      paymentId: paymentIntent.id,
    });
    if (existingBooking) {
      console.log("request-payment-webhook: booking already exists for PI", paymentIntent.id);
      await db.collection("bookingrequests").updateOne(
        { _id: new ObjectId(bookingRequestId) },
        {
          $set: {
            status: "paid",
            convertedBookingId: existingBooking._id,
            paymentIntentId: paymentIntent.id,
            updatedAt: new Date(),
          },
        }
      );
      return NextResponse.json({ received: true });
    }

    const trackingCode = await generateUniqueTrackingCode();

    const hasExisting = !!requestDoc.hasExistingBooking;
    const isManual = !!requestDoc.isManualTransmission;

    const flags = [];
    if (isManual) {
      flags.push({
        type: "manual_transmission",
        reason: "Customer selected manual transmission - requires manual-capable driver",
        createdAt: new Date(),
      });
    }

    const isGuestBooking = requestDoc.isGuest !== false;
    const customerUserId = (!isGuestBooking && requestDoc.userId)
      ? new ObjectId(requestDoc.userId.toString())
      : null;

    const now = new Date();

    const bookingData = {
      userId: customerUserId,
      userName: requestDoc.userName,
      userEmail: requestDoc.userEmail,
      isGuest: isGuestBooking,
      guestPhone: requestDoc.customerPhone || null,
      vehicleRegistration: requestDoc.vehicleRegistration,
      vehicleState: requestDoc.vehicleState || "NSW",
      vehicleYear: requestDoc.vehicleYear || null,
      vehicleModel: requestDoc.vehicleModel || null,
      serviceType: hasExisting
        ? `Existing Booking - ${requestDoc.garageName}`
        : (requestDoc.serviceType || "Standard Service"),
      serviceDate: requestDoc.serviceDate ? new Date(requestDoc.serviceDate) : new Date(),
      pickupAddress: requestDoc.pickupAddress,
      pickupTime: requestDoc.earliestPickup || null,
      dropoffTime: requestDoc.latestDropoff || null,
      pickupTimeSlot: requestDoc.pickupTimeSlot || null,
      dropoffTimeSlot: requestDoc.dropoffTimeSlot || null,
      estimatedServiceDuration: requestDoc.estimatedServiceDuration || null,
      trackingCode,
      hasExistingBooking: hasExisting,
      garageName: requestDoc.garageName || null,
      garageAddress: requestDoc.garageAddress || null,
      garagePlaceId: requestDoc.garagePlaceId || null,
      existingBookingRef: requestDoc.existingBookingRef || null,
      existingBookingNotes: null,
      transmissionType: requestDoc.transmissionType || "automatic",
      isManualTransmission: isManual,
      selectedServices: requestDoc.selectedServices || [],
      primaryServiceCategory: requestDoc.primaryServiceCategory || null,
      serviceNotes: requestDoc.serviceNotes || "",
      flags,
      paymentStatus: "paid",
      paymentId: paymentIntent.id,
      paymentAmount: paymentIntent.amount,
      // Promo code carried over from the request (visible in admin)
      promoCode: requestDoc.promoCode || undefined,
      promoPercentOff: requestDoc.promoPercentOff || undefined,
      promoDiscountAmount: requestDoc.promoDiscountAmount || undefined,
      status: "pending",
      currentStage: "booking_confirmed",
      overallProgress: 14,
      updates: [{
        stage: "booking_confirmed",
        timestamp: now,
        message: hasExisting
          ? `We've received your pick-up request for your existing booking at ${requestDoc.garageName}.`
          : "We've received your booking request and will confirm shortly.",
        updatedBy: "system",
      }],
      createdAt: now,
      updatedAt: now,
    };

    // Atomic upsert keyed on paymentId to prevent race conditions
    const result = await db.collection("bookings").findOneAndUpdate(
      { paymentId: paymentIntent.id },
      { $setOnInsert: bookingData },
      { upsert: true, returnDocument: "after" }
    );

    const booking = result;
    const wasInserted = booking?.createdAt?.getTime() === now.getTime();

    if (!wasInserted) {
      console.log("request-payment-webhook: booking already existed (race condition):", booking?._id);
    } else {
      console.log("request-payment-webhook: booking created:", booking?._id, "tracking:", trackingCode);
    }

    // Point the redeemed promo code at the real booking (admin audit trail)
    if (requestDoc.promoCode && booking?._id) {
      await db.collection("promocodes").updateOne(
        { code: requestDoc.promoCode, status: "used" },
        {
          $set: {
            usedByBookingId: booking._id,
            usedByReference: booking.trackingCode || trackingCode,
          },
        }
      ).catch((err: unknown) => console.error("Failed to link promo to booking:", err));
    }

    // Update the BookingRequest
    await db.collection("bookingrequests").updateOne(
      { _id: new ObjectId(bookingRequestId) },
      {
        $set: {
          status: "paid",
          convertedBookingId: booking?._id,
          paymentIntentId: paymentIntent.id,
          updatedAt: now,
        },
      }
    );

    // Auto-assign to matching garage
    if (requestDoc.garagePlaceId) {
      const matchingGarage = await db.collection("garages").findOne({
        linkedGaragePlaceId: requestDoc.garagePlaceId,
        status: "approved",
      });

      if (matchingGarage) {
        await db.collection("bookings").updateOne(
          { _id: booking?._id },
          {
            $set: {
              assignedGarageId: matchingGarage._id,
              assignedAt: new Date(),
              garageNotifiedAt: new Date(),
            },
            $push: {
              updates: {
                stage: "garage_assigned",
                timestamp: new Date(),
                message: `Booking automatically assigned to ${matchingGarage.businessName}`,
                updatedBy: "system",
              } as never,
            },
          }
        );

        await db.collection("garagenotifications").insertOne({
          garageId: matchingGarage._id,
          bookingId: booking?._id,
          type: "new_booking",
          title: "New Booking Assignment",
          message: `New booking for ${requestDoc.vehicleRegistration} - ${bookingData.serviceType}. Customer: ${requestDoc.userName}`,
          isRead: false,
          metadata: {
            vehicleRegistration: requestDoc.vehicleRegistration,
            serviceType: bookingData.serviceType,
            customerName: requestDoc.userName,
            urgency: isManual ? "urgent" : "normal",
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    } else if (requestDoc.garageName) {
      const approvedGarages = await db.collection("garages").find({ status: "approved" }).toArray();
      const normalizedName = requestDoc.garageName.toLowerCase();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- raw MongoClient documents have no typed schema
      const matchingGarage = approvedGarages.find((g: any) => {
        const linked = (g.linkedGarageName || "").toLowerCase();
        return linked && (normalizedName.includes(linked) || linked.includes(normalizedName));
      });

      if (matchingGarage) {
        await db.collection("bookings").updateOne(
          { _id: booking?._id },
          {
            $set: {
              assignedGarageId: matchingGarage._id,
              assignedAt: new Date(),
              garageNotifiedAt: new Date(),
            },
            $push: {
              updates: {
                stage: "garage_assigned",
                timestamp: new Date(),
                message: `Booking automatically assigned to ${matchingGarage.businessName}`,
                updatedBy: "system",
              } as never,
            },
          }
        );

        await db.collection("garagenotifications").insertOne({
          garageId: matchingGarage._id,
          bookingId: booking?._id,
          type: "new_booking",
          title: "New Booking Assignment",
          message: `New booking for ${requestDoc.vehicleRegistration} - ${bookingData.serviceType}. Customer: ${requestDoc.userName}`,
          isRead: false,
          metadata: {
            vehicleRegistration: requestDoc.vehicleRegistration,
            serviceType: bookingData.serviceType,
            customerName: requestDoc.userName,
            urgency: isManual ? "urgent" : "normal",
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    }

    // Send confirmation email directly (non-blocking)
    sendBookingStageEmail({
      customerEmail: requestDoc.userEmail,
      customerName: requestDoc.userName,
      vehicleRegistration: requestDoc.vehicleRegistration,
      currentStage: "booking_confirmed",
      trackingCode,
      garageName: requestDoc.garageName ?? undefined,
      serviceType: requestDoc.serviceType,
      serviceDate: requestDoc.serviceDate,
      pickupTime: requestDoc.pickupTimeSlot,
      dropoffTime: requestDoc.dropoffTimeSlot,
      pickupAddress: requestDoc.pickupAddress,
    }).then((sent) => {
      if (sent) console.log("request-payment-webhook: confirmation email sent to:", requestDoc.userEmail);
      else console.warn("request-payment-webhook: confirmation email failed for:", requestDoc.userEmail);
    }).catch((err) => {
      console.error("request-payment-webhook: confirmation email error:", err);
    });

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("request-payment-webhook: error processing payment:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  } finally {
    await client.close();
  }
}
