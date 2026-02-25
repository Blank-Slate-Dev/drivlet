// REMOVED: Payment method storage handled by Stripe directly - 2026-02-25
// SetupIntent creation for saving cards locally has been commented out.
// Stripe checkout handles payment method collection natively.
export {};

/*
// src/app/api/customer/setup-intent/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { stripe } from "@/lib/stripe";
import User from "@/models/User";

// POST /api/customer/setup-intent - Create a SetupIntent for saving a card
export async function POST() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();

    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Create or retrieve Stripe customer
    let stripeCustomerId = user.stripeCustomerId;

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.username,
        metadata: {
          userId: session.user.id,
        },
      });
      stripeCustomerId = customer.id;

      await User.findByIdAndUpdate(session.user.id, {
        $set: { stripeCustomerId },
      });
    }

    // Create a SetupIntent
    const setupIntent = await stripe.setupIntents.create({
      customer: stripeCustomerId,
      automatic_payment_methods: {
        enabled: true,
      },
    });

    return NextResponse.json({
      clientSecret: setupIntent.client_secret,
    });
  } catch (error) {
    console.error("Error creating setup intent:", error);
    return NextResponse.json(
      { error: "Failed to create setup intent" },
      { status: 500 }
    );
  }
}
*/
