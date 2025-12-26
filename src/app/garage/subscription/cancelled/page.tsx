// src/app/garage/subscription/cancelled/page.tsx
"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { XCircle, ArrowRight, MessageCircle } from "lucide-react";

export default function SubscriptionCancelledPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md"
      >
        <div className="rounded-2xl bg-white shadow-xl overflow-hidden">
          <div className="px-6 py-8 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="mx-auto w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mb-6"
            >
              <XCircle className="h-10 w-10 text-slate-400" />
            </motion.div>

            <h1 className="text-2xl font-bold text-slate-900 mb-2">
              Checkout Cancelled
            </h1>
            <p className="text-slate-500 mb-6">
              No worries! Your subscription wasn&apos;t changed. You can upgrade anytime when
              you&apos;re ready.
            </p>

            <div className="space-y-3">
              <Link
                href="/garage/subscription"
                className="flex items-center justify-center gap-2 w-full rounded-lg bg-emerald-600 py-3 font-semibold text-white hover:bg-emerald-500 transition"
              >
                View Plans Again
                <ArrowRight className="h-4 w-4" />
              </Link>

              <Link
                href="/garage/dashboard"
                className="flex items-center justify-center gap-2 w-full rounded-lg py-3 font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
              >
                Return to Dashboard
              </Link>
            </div>
          </div>

          <div className="px-6 py-4 bg-slate-50 border-t border-slate-100">
            <p className="text-sm text-slate-500 text-center flex items-center justify-center gap-2">
              <MessageCircle className="h-4 w-4" />
              Questions?{" "}
              <a href="mailto:support@drivlet.com" className="text-emerald-600 hover:underline">
                Contact support
              </a>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
