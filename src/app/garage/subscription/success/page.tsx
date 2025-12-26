// src/app/garage/subscription/success/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  CheckCircle,
  Crown,
  BarChart3,
  ArrowRight,
  Sparkles,
  TrendingUp,
  Star,
  Users,
} from "lucide-react";

export default function SubscriptionSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  
  const [tier, setTier] = useState<"analytics" | "premium" | null>(null);

  useEffect(() => {
    // In a real app, you'd verify the session with Stripe
    // For now, we'll just show a generic success
    // You could fetch the subscription details from your API
    const fetchSubscription = async () => {
      try {
        const res = await fetch("/api/garage/subscription");
        const data = await res.json();
        if (data.subscription) {
          setTier(data.subscription.tier);
        }
      } catch {
        // Default to showing generic success
      }
    };

    fetchSubscription();
  }, [sessionId]);

  const isPremium = tier === "premium";

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-700 flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-lg"
      >
        <div className="rounded-2xl bg-white shadow-2xl overflow-hidden">
          {/* Header */}
          <div className={`px-6 py-8 text-center ${
            isPremium
              ? "bg-gradient-to-r from-purple-600 to-indigo-600"
              : "bg-gradient-to-r from-blue-600 to-cyan-600"
          }`}>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="mx-auto w-20 h-20 rounded-full bg-white/20 flex items-center justify-center mb-4"
            >
              <CheckCircle className="h-10 w-10 text-white" />
            </motion.div>
            <h1 className="text-2xl font-bold text-white mb-2">
              Welcome to {isPremium ? "Premium" : "Analytics"}!
            </h1>
            <p className="text-white/80">
              Your subscription is now active
            </p>
          </div>

          {/* Content */}
          <div className="px-6 py-8">
            <div className="text-center mb-8">
              <div className={`inline-flex items-center gap-2 rounded-full px-4 py-2 ${
                isPremium ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
              }`}>
                {isPremium ? (
                  <Crown className="h-5 w-5" />
                ) : (
                  <BarChart3 className="h-5 w-5" />
                )}
                <span className="font-semibold">
                  {isPremium ? "Premium Partner" : "Analytics"} Plan
                </span>
              </div>
            </div>

            {/* What's unlocked */}
            <div className="space-y-4 mb-8">
              <h3 className="font-semibold text-slate-900 text-center">
                Here&apos;s what you&apos;ve unlocked:
              </h3>
              
              <div className="grid gap-3">
                <FeatureItem
                  icon={TrendingUp}
                  title="Revenue Analytics"
                  description="Track your earnings and growth over time"
                />
                <FeatureItem
                  icon={Users}
                  title="Customer Insights"
                  description="Understand who your customers are"
                />
                {isPremium && (
                  <>
                    <FeatureItem
                      icon={Star}
                      title="Priority Ranking"
                      description="Appear higher in search results"
                    />
                    <FeatureItem
                      icon={Sparkles}
                      title="Featured Placement"
                      description="Stand out with the Premium badge"
                    />
                  </>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <Link
                href="/garage/analytics"
                className={`flex items-center justify-center gap-2 w-full rounded-lg py-3 font-semibold text-white transition ${
                  isPremium
                    ? "bg-purple-600 hover:bg-purple-500"
                    : "bg-blue-600 hover:bg-blue-500"
                }`}
              >
                View Analytics Dashboard
                <ArrowRight className="h-4 w-4" />
              </Link>
              
              <Link
                href="/garage/dashboard"
                className="flex items-center justify-center gap-2 w-full rounded-lg py-3 font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
              >
                Go to Dashboard
              </Link>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-100">
            <p className="text-sm text-slate-500 text-center">
              Questions? Contact us at{" "}
              <a href="mailto:support@drivlet.com" className="text-emerald-600 hover:underline">
                support@drivlet.com
              </a>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function FeatureItem({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg bg-slate-50 p-3">
      <div className="rounded-full bg-emerald-100 p-2">
        <Icon className="h-4 w-4 text-emerald-600" />
      </div>
      <div>
        <p className="font-medium text-slate-900">{title}</p>
        <p className="text-sm text-slate-500">{description}</p>
      </div>
    </div>
  );
}
