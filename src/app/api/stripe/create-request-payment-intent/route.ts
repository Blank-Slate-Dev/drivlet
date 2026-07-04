import { NextRequest, NextResponse } from "next/server";
import { requireValidOrigin } from "@/lib/validation";
import { stripe, DRIVLET_PRICE, ZONE_SURCHARGES } from "@/lib/stripe";
import { connectDB } from "@/lib/mongodb";
import BookingRequest from "@/models/BookingRequest";

const isTestMode = process.env.STRIPE_TEST_MODE === "true";

export async function POST(request: NextRequest) {
  const originCheck = requireValidOrigin(request);
  if (!originCheck.valid) {
    return NextResponse.json({ error: originCheck.error }, { status: 403 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { token } = body;
  if (!token || typeof token !== "string") {
    return NextResponse.json({ error: "Missing payment token" }, { status: 400 });
  }

  try {
    await connectDB();

    const bookingRequest = await BookingRequest.findOne({ paymentToken: token });
    if (!bookingRequest) {
      return NextResponse.json({ error: "Invalid payment link" }, { status: 404 });
    }

    // Hard block against paying twice on the same reference — never create a second
    // PaymentIntent once the request is paid/converted.
    if (bookingRequest.status === "paid" || bookingRequest.convertedBookingId) {
      return NextResponse.json({ error: "This booking has already been paid." }, { status: 409 });
    }

    if (!["approved", "payment_link_sent"].includes(bookingRequest.status)) {
      return NextResponse.json({ error: "This payment link is no longer valid" }, { status: 400 });
    }

    const surcharge = ZONE_SURCHARGES[bookingRequest.distanceZone] ?? 0;
    const serverAmount = isTestMode ? 100 : DRIVLET_PRICE + surcharge;

    if (bookingRequest.paymentIntentId) {
      try {
        const existingPI = await stripe.paymentIntents.retrieve(bookingRequest.paymentIntentId);
        if (existingPI.status !== "succeeded" && existingPI.status !== "canceled") {
          return NextResponse.json({
            clientSecret: existingPI.client_secret,
            amount: serverAmount,
          });
        }
      } catch {
        // PaymentIntent not found or invalid — create a new one
      }
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: serverAmount,
      currency: "aud",
      automatic_payment_methods: { enabled: true },
      receipt_email: bookingRequest.userEmail,
      description: `Drivlet transport — ${bookingRequest.vehicleRegistration}`,
      metadata: {
        type: "request_payment",
        bookingRequestId: bookingRequest._id.toString(),
        paymentToken: token,
      },
    });

    bookingRequest.paymentIntentId = paymentIntent.id;
    await bookingRequest.save();

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      amount: serverAmount,
    });
  } catch (error) {
    console.error("Failed to create request payment intent:", error);
    return NextResponse.json({ error: "Failed to create payment" }, { status: 500 });
  }
}
