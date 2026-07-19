// src/components/BookingFeedbackForm.tsx
// Post-delivery feedback card: star rating + "how did you hear about us" +
// comments. Used inline on the tracker (post-delivery state) and on the
// standalone /feedback page (linked from the delivery email).
"use client";

import { useState } from "react";
import { Star, Loader2, CheckCircle2, AlertCircle, Send } from "lucide-react";

const HEAR_ABOUT_OPTIONS = [
  "Google search",
  "Facebook / Instagram",
  "Word of mouth",
  "Flyer / letterbox",
  "Repeat customer",
  "Other",
];

interface BookingFeedbackFormProps {
  code: string;
  email: string;
  rego: string;
  onSuccess?: () => void;
}

export default function BookingFeedbackForm({
  code,
  email,
  rego,
  onSuccess,
}: BookingFeedbackFormProps) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [hearAboutUs, setHearAboutUs] = useState("");
  const [comments, setComments] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const handleSubmit = async () => {
    if (rating < 1) {
      setError("Please choose a star rating first");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/bookings/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, email, rego, rating, hearAboutUs, comments }),
      });
      const data = await res.json();
      if (!res.ok) {
        // Already-submitted still counts as done for the customer
        if (res.status === 409) {
          setDone(true);
          onSuccess?.();
          return;
        }
        throw new Error(data.error || "Failed to submit feedback");
      }
      setDone(true);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit feedback");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
        <p className="mt-3 font-semibold text-emerald-800">Thanks for your feedback!</p>
        <p className="mt-1 text-sm text-emerald-600">
          It helps us make Drivlet better for everyone.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <h3 className="font-semibold text-slate-900">How did we do?</h3>
      <p className="mt-1 text-sm text-slate-500">
        Your car&apos;s back home — we&apos;d love a quick word on how it went.
      </p>

      {/* Stars */}
      <div className="mt-4 flex items-center gap-1.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
            onMouseEnter={() => setHoverRating(star)}
            onMouseLeave={() => setHoverRating(0)}
            disabled={submitting}
            aria-label={`${star} star${star > 1 ? "s" : ""}`}
            className="p-1 transition active:scale-90"
          >
            <Star
              className={`h-8 w-8 transition ${
                star <= (hoverRating || rating)
                  ? "fill-amber-400 text-amber-400"
                  : "text-slate-300"
              }`}
            />
          </button>
        ))}
        {rating > 0 && (
          <span className="ml-2 text-sm font-medium text-slate-600">{rating}/5</span>
        )}
      </div>

      {/* How did you hear about us */}
      <div className="mt-4">
        <label className="mb-1 block text-sm font-medium text-slate-700">
          How did you hear about us?
        </label>
        <select
          value={hearAboutUs}
          onChange={(e) => setHearAboutUs(e.target.value)}
          disabled={submitting}
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50"
        >
          <option value="">Select an option…</option>
          {HEAR_ABOUT_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>

      {/* Comments */}
      <div className="mt-4">
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Anything else? <span className="font-normal text-slate-400">(optional)</span>
        </label>
        <textarea
          rows={3}
          value={comments}
          onChange={(e) => setComments(e.target.value)}
          disabled={submitting}
          placeholder="What went well, what we could do better…"
          className="w-full resize-none rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50"
        />
      </div>

      {error && (
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="mt-4 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50"
      >
        {submitting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Send className="h-4 w-4" />
        )}
        Send feedback
      </button>
    </div>
  );
}
