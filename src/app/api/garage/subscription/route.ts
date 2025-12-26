// src/app/api/garage/subscription/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Garage from "@/models/Garage";
import GarageSubscription, {
  SubscriptionTier,
  TIER_PRICES,
  TIER_FEATURES,
} from "@/models/GarageSubscription";
import { stripe } from "@/lib/stripe";
import { logger } from "@/lib/logger";

// Stripe price IDs (you'll need to create these in Stripe Dashboard)
const STRIPE_PRICE_IDS: Record<SubscriptionTier, { monthly: string; yearly: string }> = {
  free: { monthly: "", yearly: "" },
  analytics: {
    monthly: process.env.STRIPE_ANALYTICS_MONTHLY_PRICE_ID || "",
    yearly: process.env.STRIPE_ANALYTICS_YEARLY_PRICE_ID || "",
  },
  premium: {
    monthly: process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID || "",
    yearly: process.env.STRIPE_PREMIUM_YEARLY_PRICE_ID || "",
  },
};

// GET /api/garage/subscription - Get current subscription
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "garage") {
      return NextResponse.json({ error: "Not a garage user" }, { status: 403 });
    }

    await connectDB();

    const garage = await Garage.findOne({ userId: session.user.id });
    if (!garage) {
      return NextResponse.json({ error: "Garage not found" }, { status: 404 });
    }

    // Get or create subscription
    let subscription = await GarageSubscription.findOne({ garageId: garage._id });

    if (!subscription) {
      subscription = await GarageSubscription.create({
        garageId: garage._id,
        userId: session.user.id,
        tier: "free",
        status: "active",
        billingInterval: "monthly",
        features: TIER_FEATURES.free,
      });
    }

    return NextResponse.json({
      success: true,
      subscription,
      pricing: TIER_PRICES,
    });
  } catch (error) {
    logger.error("Error fetching subscription", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json(
      { error: "Failed to fetch subscription" },
      { status: 500 }
    );
  }
}

// POST /api/garage/subscription - Create or upgrade subscription
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "garage") {
      return NextResponse.json({ error: "Not a garage user" }, { status: 403 });
    }

    const body = await request.json();
    const { tier, billingInterval = "monthly" } = body;

    if (!tier || !["free", "analytics", "premium"].includes(tier)) {
      return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
    }

    await connectDB();

    const garage = await Garage.findOne({ userId: session.user.id });
    if (!garage) {
      return NextResponse.json({ error: "Garage not found" }, { status: 404 });
    }

    let subscription = await GarageSubscription.findOne({ garageId: garage._id });

    // If downgrading to free, cancel Stripe subscription
    if (tier === "free") {
      if (subscription?.stripeSubscriptionId) {
        await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
          cancel_at_period_end: true,
        });

        subscription.cancelAtPeriodEnd = true;
        subscription.events.push({
          type: "cancelled",
          fromTier: subscription.tier,
          toTier: "free",
          timestamp: new Date(),
          notes: "User requested downgrade to free",
        });
        await subscription.save();
      }

      return NextResponse.json({
        success: true,
        message: "Subscription will be cancelled at end of billing period",
        subscription,
      });
    }

    // Get or create Stripe customer
    let stripeCustomerId = subscription?.stripeCustomerId;

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: session.user.email || "",
        name: garage.businessName,
        metadata: {
          garageId: garage._id.toString(),
          userId: session.user.id,
        },
      });
      stripeCustomerId = customer.id;
    }

    // Get the price ID for the selected tier and interval
    const priceId = STRIPE_PRICE_IDS[tier as SubscriptionTier][billingInterval as "monthly" | "yearly"];

    if (!priceId) {
      return NextResponse.json(
        { error: "Price not configured for this tier" },
        { status: 400 }
      );
    }

    // Create Stripe checkout session for subscription
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.APP_URL || "https://drivlet.vercel.app"}/garage/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.APP_URL || "https://drivlet.vercel.app"}/garage/subscription/cancelled`,
      metadata: {
        garageId: garage._id.toString(),
        userId: session.user.id,
        tier,
        billingInterval,
      },
      subscription_data: {
        metadata: {
          garageId: garage._id.toString(),
          tier,
        },
      },
    });

    // Update subscription with Stripe customer ID
    if (!subscription) {
      subscription = await GarageSubscription.create({
        garageId: garage._id,
        userId: session.user.id,
        tier: "free",
        status: "active",
        stripeCustomerId,
      });
    } else {
      subscription.stripeCustomerId = stripeCustomerId;
      await subscription.save();
    }

    return NextResponse.json({
      success: true,
      checkoutUrl: checkoutSession.url,
    });
  } catch (error) {
    logger.error("Error creating subscription", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json(
      { error: "Failed to create subscription" },
      { status: 500 }
    );
  }
}

// DELETE /api/garage/subscription - Cancel subscription
export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "garage") {
      return NextResponse.json({ error: "Not a garage user" }, { status: 403 });
    }

    await connectDB();

    const garage = await Garage.findOne({ userId: session.user.id });
    if (!garage) {
      return NextResponse.json({ error: "Garage not found" }, { status: 404 });
    }

    const subscription = await GarageSubscription.findOne({ garageId: garage._id });

    if (!subscription) {
      return NextResponse.json({ error: "No subscription found" }, { status: 404 });
    }

    if (subscription.stripeSubscriptionId) {
      // Cancel at end of period instead of immediately
      await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
        cancel_at_period_end: true,
      });

      subscription.cancelAtPeriodEnd = true;
      subscription.events.push({
        type: "cancelled",
        fromTier: subscription.tier,
        timestamp: new Date(),
        notes: "User requested cancellation",
      });
      await subscription.save();
    }

    return NextResponse.json({
      success: true,
      message: "Subscription will be cancelled at end of billing period",
      subscription,
    });
  } catch (error) {
    logger.error("Error cancelling subscription", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json(
      { error: "Failed to cancel subscription" },
      { status: 500 }
    );
  }
}
