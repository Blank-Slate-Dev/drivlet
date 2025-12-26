// src/app/garage/subscription/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Crown,
  BarChart3,
  Zap,
  Check,
  X,
  ArrowLeft,
  Loader2,
  CreditCard,
  Calendar,
  AlertCircle,
  Star,
  TrendingUp,
  Users,
  Shield,
  Sparkles,
} from "lucide-react";

interface Subscription {
  _id: string;
  tier: "free" | "analytics" | "premium";
  status: "active" | "past_due" | "cancelled" | "trialing";
  billingInterval: "monthly" | "yearly";
  currentPeriodEnd?: string;
  cancelAtPeriodEnd: boolean;
  features: {
    searchListing: boolean;
    acceptBookings: boolean;
    basicProfile: boolean;
    analytics: boolean;
    customerInsights: boolean;
    trendReports: boolean;
    priorityRanking: boolean;
    featuredPlacement: boolean;
    prioritySupport: boolean;
    marketingBadge: boolean;
  };
}

const TIERS = [
  {
    id: "free",
    name: "Free",
    description: "Get started with drivlet",
    monthlyPrice: 0,
    yearlyPrice: 0,
    icon: Zap,
    color: "slate",
    features: [
      { name: "Listed in search results", included: true },
      { name: "Accept drivlet bookings", included: true },
      { name: "Basic garage profile", included: true },
      { name: "Revenue analytics", included: false },
      { name: "Customer insights", included: false },
      { name: "Trend reports", included: false },
      { name: "Priority ranking", included: false },
      { name: "Featured placement", included: false },
      { name: "Priority support", included: false },
      { name: "Marketing badge", included: false },
    ],
  },
  {
    id: "analytics",
    name: "Analytics",
    description: "Understand your business",
    monthlyPrice: 79,
    yearlyPrice: 790,
    icon: BarChart3,
    color: "blue",
    popular: false,
    features: [
      { name: "Listed in search results", included: true },
      { name: "Accept drivlet bookings", included: true },
      { name: "Basic garage profile", included: true },
      { name: "Revenue analytics", included: true },
      { name: "Customer insights", included: true },
      { name: "Trend reports", included: true },
      { name: "Priority ranking", included: false },
      { name: "Featured placement", included: false },
      { name: "Priority support", included: false },
      { name: "Marketing badge", included: false },
    ],
  },
  {
    id: "premium",
    name: "Premium",
    description: "Maximize your visibility",
    monthlyPrice: 119,
    yearlyPrice: 1190,
    icon: Crown,
    color: "purple",
    popular: true,
    features: [
      { name: "Listed in search results", included: true },
      { name: "Accept drivlet bookings", included: true },
      { name: "Basic garage profile", included: true },
      { name: "Revenue analytics", included: true },
      { name: "Customer insights", included: true },
      { name: "Trend reports", included: true },
      { name: "Priority ranking", included: true },
      { name: "Featured placement", included: true },
      { name: "Priority support", included: true },
      { name: "Marketing badge", included: true },
    ],
  },
];

export default function GarageSubscriptionPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [billingInterval, setBillingInterval] = useState<"monthly" | "yearly">("monthly");
  const [error, setError] = useState("");

  // Fetch current subscription
  const fetchSubscription = useCallback(async () => {
    try {
      const res = await fetch("/api/garage/subscription");
      const data = await res.json();

      if (res.ok && data.subscription) {
        setSubscription(data.subscription);
        setBillingInterval(data.subscription.billingInterval || "monthly");
      }
    } catch {
      setError("Failed to load subscription");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "loading") return;
    if (!session || session.user?.role !== "garage") {
      router.push("/garage/login");
      return;
    }
    fetchSubscription();
  }, [session, status, router, fetchSubscription]);

  // Handle subscription change
  const handleSubscribe = async (tierId: string) => {
    if (tierId === subscription?.tier) return;

    setProcessing(true);
    setError("");

    try {
      const res = await fetch("/api/garage/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tier: tierId,
          billingInterval,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to process subscription");
      }

      // If downgrading to free
      if (tierId === "free") {
        await fetchSubscription();
        return;
      }

      // Redirect to Stripe checkout
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setProcessing(false);
    }
  };

  // Handle cancellation
  const handleCancel = async () => {
    if (!confirm("Are you sure you want to cancel? You'll retain access until the end of your billing period.")) {
      return;
    }

    setProcessing(true);
    setError("");

    try {
      const res = await fetch("/api/garage/subscription", {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to cancel subscription");
      }

      await fetchSubscription();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  const currentTier = TIERS.find((t) => t.id === subscription?.tier) || TIERS[0];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex items-center gap-4">
          <button
            onClick={() => router.push("/garage/dashboard")}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 transition"
          >
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Subscription</h1>
            <p className="text-sm text-slate-500">Manage your plan and billing</p>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-6 flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 p-4 text-red-700">
            <AlertCircle className="h-5 w-5 shrink-0" />
            {error}
          </div>
        )}

        {/* Current Plan Summary */}
        <div className="mb-8 rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div
                className={`rounded-xl p-3 ${
                  currentTier.id === "premium"
                    ? "bg-purple-100"
                    : currentTier.id === "analytics"
                    ? "bg-blue-100"
                    : "bg-slate-100"
                }`}
              >
                <currentTier.icon
                  className={`h-6 w-6 ${
                    currentTier.id === "premium"
                      ? "text-purple-600"
                      : currentTier.id === "analytics"
                      ? "text-blue-600"
                      : "text-slate-600"
                  }`}
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-slate-900">{currentTier.name} Plan</h2>
                  {subscription?.status === "active" && (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                      Active
                    </span>
                  )}
                  {subscription?.status === "past_due" && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                      Past Due
                    </span>
                  )}
                  {subscription?.cancelAtPeriodEnd && (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                      Cancelling
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-500">{currentTier.description}</p>
              </div>
            </div>
            {subscription?.currentPeriodEnd && subscription.tier !== "free" && (
              <div className="text-right">
                <p className="text-sm text-slate-500">
                  {subscription.cancelAtPeriodEnd ? "Access until" : "Next billing date"}
                </p>
                <p className="font-medium text-slate-900">
                  {new Date(subscription.currentPeriodEnd).toLocaleDateString("en-AU", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>
            )}
          </div>

          {/* Cancel button for paid plans */}
          {subscription?.tier !== "free" && !subscription?.cancelAtPeriodEnd && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <button
                onClick={handleCancel}
                disabled={processing}
                className="text-sm text-red-600 hover:text-red-500"
              >
                Cancel subscription
              </button>
            </div>
          )}
        </div>

        {/* Billing interval toggle */}
        <div className="mb-8 flex justify-center">
          <div className="inline-flex items-center gap-3 rounded-full bg-white border border-slate-200 p-1">
            <button
              onClick={() => setBillingInterval("monthly")}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                billingInterval === "monthly"
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingInterval("yearly")}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                billingInterval === "yearly"
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Yearly
              <span className="ml-1.5 text-xs text-emerald-600">Save 2 months</span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid gap-6 lg:grid-cols-3">
          {TIERS.map((tier) => {
            const isCurrentPlan = tier.id === subscription?.tier;
            const price = billingInterval === "monthly" ? tier.monthlyPrice : tier.yearlyPrice;
            const Icon = tier.icon;

            return (
              <motion.div
                key={tier.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`relative rounded-2xl border-2 bg-white p-6 ${
                  tier.popular
                    ? "border-purple-500 shadow-lg shadow-purple-500/10"
                    : "border-slate-200"
                }`}
              >
                {/* Popular badge */}
                {tier.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-purple-600 px-3 py-1 text-xs font-semibold text-white">
                      <Sparkles className="h-3 w-3" />
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="text-center mb-6">
                  <div
                    className={`mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-xl ${
                      tier.id === "premium"
                        ? "bg-purple-100"
                        : tier.id === "analytics"
                        ? "bg-blue-100"
                        : "bg-slate-100"
                    }`}
                  >
                    <Icon
                      className={`h-7 w-7 ${
                        tier.id === "premium"
                          ? "text-purple-600"
                          : tier.id === "analytics"
                          ? "text-blue-600"
                          : "text-slate-600"
                      }`}
                    />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">{tier.name}</h3>
                  <p className="text-sm text-slate-500 mt-1">{tier.description}</p>
                  <div className="mt-4">
                    <span className="text-4xl font-bold text-slate-900">${price}</span>
                    <span className="text-slate-500">
                      /{billingInterval === "monthly" ? "mo" : "yr"}
                    </span>
                  </div>
                </div>

                {/* Features */}
                <ul className="space-y-3 mb-6">
                  {tier.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      {feature.included ? (
                        <Check className="h-5 w-5 text-emerald-500 shrink-0" />
                      ) : (
                        <X className="h-5 w-5 text-slate-300 shrink-0" />
                      )}
                      <span
                        className={`text-sm ${
                          feature.included ? "text-slate-700" : "text-slate-400"
                        }`}
                      >
                        {feature.name}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <button
                  onClick={() => handleSubscribe(tier.id)}
                  disabled={processing || isCurrentPlan}
                  className={`w-full rounded-xl py-3 text-sm font-semibold transition ${
                    isCurrentPlan
                      ? "bg-slate-100 text-slate-500 cursor-not-allowed"
                      : tier.popular
                      ? "bg-purple-600 text-white hover:bg-purple-500 shadow-lg shadow-purple-500/25"
                      : "bg-slate-900 text-white hover:bg-slate-800"
                  }`}
                >
                  {processing ? (
                    <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                  ) : isCurrentPlan ? (
                    "Current Plan"
                  ) : tier.id === "free" ? (
                    "Downgrade"
                  ) : (
                    "Upgrade"
                  )}
                </button>
              </motion.div>
            );
          })}
        </div>

        {/* Benefits Section */}
        <div className="mt-16">
          <h2 className="text-2xl font-bold text-slate-900 text-center mb-8">
            Why upgrade to Premium?
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: TrendingUp,
                title: "25% More Visibility",
                description: "Premium garages appear higher in search results",
                color: "emerald",
              },
              {
                icon: Star,
                title: "Featured Placement",
                description: "Stand out with a featured badge on your profile",
                color: "amber",
              },
              {
                icon: Users,
                title: "Customer Insights",
                description: "Understand your customers with detailed analytics",
                color: "blue",
              },
              {
                icon: Shield,
                title: "Priority Support",
                description: "Get help faster with dedicated support",
                color: "purple",
              },
            ].map((benefit, i) => (
              <div key={i} className="rounded-xl border border-slate-200 bg-white p-5 text-center">
                <div
                  className={`mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl ${
                    benefit.color === "emerald"
                      ? "bg-emerald-100"
                      : benefit.color === "amber"
                      ? "bg-amber-100"
                      : benefit.color === "blue"
                      ? "bg-blue-100"
                      : "bg-purple-100"
                  }`}
                >
                  <benefit.icon
                    className={`h-6 w-6 ${
                      benefit.color === "emerald"
                        ? "text-emerald-600"
                        : benefit.color === "amber"
                        ? "text-amber-600"
                        : benefit.color === "blue"
                        ? "text-blue-600"
                        : "text-purple-600"
                    }`}
                  />
                </div>
                <h3 className="font-semibold text-slate-900">{benefit.title}</h3>
                <p className="mt-1 text-sm text-slate-500">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-16 max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-slate-900 text-center mb-8">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            {[
              {
                q: "Can I cancel anytime?",
                a: "Yes! You can cancel your subscription at any time. You'll retain access to your current plan's features until the end of your billing period.",
              },
              {
                q: "What payment methods do you accept?",
                a: "We accept all major credit cards (Visa, Mastercard, American Express) through our secure payment processor, Stripe.",
              },
              {
                q: "Can I switch between plans?",
                a: "Absolutely. You can upgrade or downgrade your plan at any time. When upgrading, you'll be charged the prorated difference. When downgrading, the change takes effect at the end of your billing period.",
              },
              {
                q: "Is there a contract or commitment?",
                a: "No contracts. Pay monthly or yearly - choose what works best for your business.",
              },
            ].map((faq, i) => (
              <div key={i} className="rounded-xl border border-slate-200 bg-white p-5">
                <h3 className="font-semibold text-slate-900">{faq.q}</h3>
                <p className="mt-2 text-sm text-slate-600">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
