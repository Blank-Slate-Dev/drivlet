// src/app/feedback/page.tsx
// Standalone post-delivery feedback page, linked from the delivery email.
// The tracker 410s once a booking completes, so this page verifies the same
// three credentials (tracking code + email + rego) and submits directly.
"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Star, Loader2 } from "lucide-react";
import BookingFeedbackForm from "@/components/BookingFeedbackForm";

function FeedbackPageInner() {
  const searchParams = useSearchParams();
  const [code, setCode] = useState(searchParams.get("code") || "");
  const [email, setEmail] = useState("");
  const [rego, setRego] = useState("");
  const [ready, setReady] = useState(false);

  const canContinue = code.trim() && email.trim() && rego.trim();

  return (
    <main className="min-h-screen bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-700 px-4 py-10">
      <div className="mx-auto max-w-md">
        <div className="mb-6 text-center text-white">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white/15">
            <Star className="h-6 w-6 fill-amber-300 text-amber-300" />
          </div>
          <h1 className="mt-3 text-2xl font-bold">How was your Drivlet experience?</h1>
          <p className="mt-1 text-sm text-emerald-100">
            Two quick questions — it takes less than a minute.
          </p>
        </div>

        {!ready ? (
          <div className="rounded-2xl bg-white p-5 shadow-xl">
            <p className="text-sm text-slate-500">
              First, confirm your booking details (they&apos;re in your delivery
              email):
            </p>
            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Tracking code
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="e.g. 64S0NZ"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 font-mono text-sm uppercase text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Email used for the booking
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Vehicle registration
                </label>
                <input
                  type="text"
                  value={rego}
                  onChange={(e) => setRego(e.target.value.toUpperCase())}
                  placeholder="e.g. ABC123"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 font-mono text-sm uppercase text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
              <button
                onClick={() => setReady(true)}
                disabled={!canContinue}
                className="mt-1 w-full rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50"
              >
                Continue
              </button>
            </div>
          </div>
        ) : (
          <BookingFeedbackForm
            code={code.trim()}
            email={email.trim()}
            rego={rego.trim()}
          />
        )}

        <p className="mt-6 text-center">
          <Link href="/" className="text-sm text-emerald-100 underline underline-offset-2 hover:text-white">
            Back to drivlet.com.au
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function FeedbackPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-700">
          <Loader2 className="h-8 w-8 animate-spin text-white" />
        </main>
      }
    >
      <FeedbackPageInner />
    </Suspense>
  );
}
