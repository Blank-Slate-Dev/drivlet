import { NextRequest, NextResponse } from "next/server";
import { requireValidOrigin } from "@/lib/validation";
import { stripe, DRIVLET_PRICE, ZONE_SURCHARGES } from "@/lib/stripe";
import { connectDB } from "@/lib/mongodb";
import BookingRequest from "@/models/BookingRequest";
import { isStripeTestModeActive } from "@/lib/stripeTestMode";

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

    // Charge the request's quoted amount (server-side source of truth — admins can
    // edit it before the customer pays). Fall back to base price + surcharge for
    // legacy requests without a stored quote.
    const surcharge = ZONE_SURCHARGES[bookingRequest.distanceZone] ?? 0;
    // NOTE (audit C-2): this guard used to be `> 0`. A 100%-off promo code
    // stores quotedAmount === 0, which is falsy under `> 0`, so the customer
    // was shown "$0.00" everywhere and then charged the full DRIVLET_PRICE.
    // `>= 0` makes a stored zero authoritative; the explicit check below then
    // refuses to charge rather than silently substituting the full price.
    const quotedAmount =
      typeof bookingRequest.quotedAmount === "number" && bookingRequest.quotedAmount >= 0
        ? bookingRequest.quotedAmount
        : DRIVLET_PRICE + surcharge;

    // Stripe cannot process an amount below its minimum charge. A fully
    // discounted request must be converted to a booking by the team rather
    // than silently re-priced. (New 100% codes are blocked at creation — see
    // src/app/api/admin/promo-codes/route.ts.)
    const STRIPE_MIN_CHARGE_CENTS = 50;
    if (quotedAmount < STRIPE_MIN_CHARGE_CENTS) {
      console.error(
        `[stripe] Refusing to charge request ${bookingRequest._id}: quoted amount ${quotedAmount}c is below the Stripe minimum. Requires manual confirmation.`
      );
      return NextResponse.json(
        {
          error:
            "This booking is fully discounted and can't be paid online. Our team will confirm it for you — please contact us on 1300 470 886.",
        },
        { status: 409 }
      );
    }

    // $1 test override — production-guarded (see src/lib/stripeTestMode.ts)
    const isTestMode = isStripeTestModeActive();
    const serverAmount = isTestMode ? 100 : quotedAmount;
    if (isTestMode) {
      console.warn(`[stripe] TEST MODE: charging $1.00 instead of $${(quotedAmount / 100).toFixed(2)} for request ${bookingRequest._id}`);
    }

    if (bookingRequest.paymentIntentId) {
      try {
        const existingPI = await stripe.paymentIntents.retrieve(bookingRequest.paymentIntentId);
        if (existingPI.status !== "succeeded" && existingPI.status !== "canceled") {
          // If the admin edited the quoted amount after this intent was created,
          // bring the intent in line so the customer is charged the current quote.
          if (existingPI.amount !== serverAmount) {
            const updatedPI = await stripe.paymentIntents.update(existingPI.id, {
              amount: serverAmount,
            });
            return NextResponse.json({
              clientSecret: updatedPI.client_secret,
              amount: serverAmount,
            });
          }
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
      description: `Drivlet transport for ${bookingRequest.vehicleRegistration}`,
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
