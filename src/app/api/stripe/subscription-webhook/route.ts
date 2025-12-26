// src/app/api/stripe/subscription-webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import Stripe from "stripe";
import { connectDB } from "@/lib/mongodb";
import GarageSubscription, {
  SubscriptionTier,
  TIER_FEATURES,
  TIER_PRICES,
} from "@/models/GarageSubscription";
import { logger } from "@/lib/logger";

// Map Stripe price IDs to tiers (configure these in your env)
function getTierFromPriceId(priceId: string): SubscriptionTier {
  const analyticsMonthly = process.env.STRIPE_ANALYTICS_MONTHLY_PRICE_ID;
  const analyticsYearly = process.env.STRIPE_ANALYTICS_YEARLY_PRICE_ID;
  const premiumMonthly = process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID;
  const premiumYearly = process.env.STRIPE_PREMIUM_YEARLY_PRICE_ID;

  if (priceId === analyticsMonthly || priceId === analyticsYearly) return "analytics";
  if (priceId === premiumMonthly || priceId === premiumYearly) return "premium";
  return "free";
}

function getBillingInterval(priceId: string): "monthly" | "yearly" {
  const yearlyIds = [
    process.env.STRIPE_ANALYTICS_YEARLY_PRICE_ID,
    process.env.STRIPE_PREMIUM_YEARLY_PRICE_ID,
  ];
  return yearlyIds.includes(priceId) ? "yearly" : "monthly";
}

export async function POST(request: NextRequest) {
  logger.info("Subscription webhook received");

  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    logger.error("No stripe signature found");
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_SUBSCRIPTION_WEBHOOK_SECRET;
  if (!webhookSecret) {
    logger.error("STRIPE_SUBSCRIPTION_WEBHOOK_SECRET not configured");
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    logger.info("Webhook signature verified", { eventType: event.type });
  } catch (err) {
    logger.error("Webhook signature verification failed", { error: err });
    return NextResponse.json(
      { error: "Webhook signature verification failed" },
      { status: 400 }
    );
  }

  await connectDB();

  switch (event.type) {
    case "customer.subscription.created": {
      const subscription = event.data.object as Stripe.Subscription;
      await handleSubscriptionCreated(subscription);
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      await handleSubscriptionUpdated(subscription);
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      await handleSubscriptionDeleted(subscription);
      break;
    }

    case "invoice.payment_succeeded": {
      const invoice = event.data.object as Stripe.Invoice;
      await handlePaymentSucceeded(invoice);
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      await handlePaymentFailed(invoice);
      break;
    }

    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode === "subscription") {
        await handleCheckoutCompleted(session);
      }
      break;
    }

    default:
      logger.info("Unhandled event type", { eventType: event.type });
  }

  return NextResponse.json({ received: true });
}

async function handleSubscriptionCreated(stripeSubscription: Stripe.Subscription) {
  const customerId = stripeSubscription.customer as string;
  const subscriptionId = stripeSubscription.id;
  const priceId = stripeSubscription.items.data[0]?.price.id || "";
  const tier = getTierFromPriceId(priceId);
  const billingInterval = getBillingInterval(priceId);

  logger.info("Subscription created", { customerId, subscriptionId, tier });

  // Find garage subscription by Stripe customer ID
  const garageSubscription = await GarageSubscription.findOne({ stripeCustomerId: customerId });

  if (!garageSubscription) {
    logger.warn("No garage subscription found for customer", { customerId });
    return;
  }

  const previousTier = garageSubscription.tier;

  // Update subscription
  garageSubscription.stripeSubscriptionId = subscriptionId;
  garageSubscription.stripePriceId = priceId;
  garageSubscription.tier = tier;
  garageSubscription.status = stripeSubscription.status === "active" ? "active" : "trialing";
  garageSubscription.billingInterval = billingInterval;
  garageSubscription.currentPeriodStart = new Date((stripeSubscription as any).current_period_start * 1000);
  garageSubscription.currentPeriodEnd = new Date((stripeSubscription as any).current_period_end * 1000);
  garageSubscription.features = TIER_FEATURES[tier];
  garageSubscription.monthlyPrice = TIER_PRICES[tier].monthly;
  garageSubscription.yearlyPrice = TIER_PRICES[tier].yearly;

  // Add event
  garageSubscription.events.push({
    type: "created",
    fromTier: previousTier,
    toTier: tier,
    timestamp: new Date(),
    stripeEventId: subscriptionId,
  });

  await garageSubscription.save();
  logger.info("Garage subscription updated", { garageId: garageSubscription.garageId, tier });
}

async function handleSubscriptionUpdated(stripeSubscription: Stripe.Subscription) {
  const subscriptionId = stripeSubscription.id;
  const priceId = stripeSubscription.items.data[0]?.price.id || "";
  const tier = getTierFromPriceId(priceId);
  const billingInterval = getBillingInterval(priceId);

  logger.info("Subscription updated", { subscriptionId, tier });

  const garageSubscription = await GarageSubscription.findOne({
    stripeSubscriptionId: subscriptionId,
  });

  if (!garageSubscription) {
    logger.warn("No garage subscription found", { subscriptionId });
    return;
  }

  const previousTier = garageSubscription.tier;
  const isUpgrade = getTierValue(tier) > getTierValue(previousTier);
  const isDowngrade = getTierValue(tier) < getTierValue(previousTier);

  // Update subscription
  garageSubscription.stripePriceId = priceId;
  garageSubscription.tier = tier;
  garageSubscription.status = stripeSubscription.status === "active" ? "active" : 
    stripeSubscription.status === "past_due" ? "past_due" : "active";
  garageSubscription.billingInterval = billingInterval;
  garageSubscription.currentPeriodStart = new Date((stripeSubscription as any).current_period_start * 1000);
  garageSubscription.currentPeriodEnd = new Date((stripeSubscription as any).current_period_end * 1000);
  garageSubscription.cancelAtPeriodEnd = stripeSubscription.cancel_at_period_end;
  garageSubscription.features = TIER_FEATURES[tier];

  // Add event if tier changed
  if (previousTier !== tier) {
    garageSubscription.events.push({
      type: isUpgrade ? "upgraded" : isDowngrade ? "downgraded" : "renewed",
      fromTier: previousTier,
      toTier: tier,
      timestamp: new Date(),
      stripeEventId: subscriptionId,
    });
  }

  await garageSubscription.save();
  logger.info("Garage subscription updated", { garageId: garageSubscription.garageId, tier });
}

async function handleSubscriptionDeleted(stripeSubscription: Stripe.Subscription) {
  const subscriptionId = stripeSubscription.id;

  logger.info("Subscription deleted", { subscriptionId });

  const garageSubscription = await GarageSubscription.findOne({
    stripeSubscriptionId: subscriptionId,
  });

  if (!garageSubscription) {
    logger.warn("No garage subscription found", { subscriptionId });
    return;
  }

  const previousTier = garageSubscription.tier;

  // Downgrade to free
  garageSubscription.tier = "free";
  garageSubscription.status = "cancelled";
  garageSubscription.stripeSubscriptionId = undefined;
  garageSubscription.stripePriceId = undefined;
  garageSubscription.cancelledAt = new Date();
  garageSubscription.features = TIER_FEATURES.free;
  garageSubscription.monthlyPrice = 0;
  garageSubscription.yearlyPrice = 0;

  garageSubscription.events.push({
    type: "cancelled",
    fromTier: previousTier,
    toTier: "free",
    timestamp: new Date(),
    stripeEventId: subscriptionId,
  });

  await garageSubscription.save();
  logger.info("Subscription cancelled, downgraded to free", {
    garageId: garageSubscription.garageId,
  });
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const subscriptionId = (invoice as any).subscription as string;

  if (!subscriptionId) return;

  logger.info("Payment succeeded", { subscriptionId, amount: invoice.amount_paid });

  const garageSubscription = await GarageSubscription.findOne({
    stripeSubscriptionId: subscriptionId,
  });

  if (!garageSubscription) return;

  garageSubscription.status = "active";
  garageSubscription.events.push({
    type: "payment_succeeded",
    amount: invoice.amount_paid,
    timestamp: new Date(),
    stripeEventId: invoice.id,
  });

  await garageSubscription.save();
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const subscriptionId = (invoice as any).subscription as string;

  if (!subscriptionId) return;

  logger.warn("Payment failed", { subscriptionId });

  const garageSubscription = await GarageSubscription.findOne({
    stripeSubscriptionId: subscriptionId,
  });

  if (!garageSubscription) return;

  garageSubscription.status = "past_due";
  garageSubscription.events.push({
    type: "payment_failed",
    timestamp: new Date(),
    stripeEventId: invoice.id,
    notes: invoice.last_finalization_error?.message,
  });

  await garageSubscription.save();
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const { garageId, tier } = session.metadata || {};

  if (!garageId || !tier) {
    logger.warn("Checkout session missing metadata", { sessionId: session.id });
    return;
  }

  logger.info("Checkout completed", { garageId, tier });

  // The subscription.created event will handle the actual update
  // This is just for logging/tracking
}

function getTierValue(tier: SubscriptionTier): number {
  const values: Record<SubscriptionTier, number> = {
    free: 0,
    analytics: 1,
    premium: 2,
  };
  return values[tier];
}
