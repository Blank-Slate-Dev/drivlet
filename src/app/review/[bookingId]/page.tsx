// src/app/review/[bookingId]/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  Star,
  ArrowLeft,
  Loader2,
  CheckCircle,
  AlertCircle,
  Send,
  Wrench,
  MessageSquare,
} from "lucide-react";

interface BookingInfo {
  _id: string;
  userName: string;
  userEmail: string;
  serviceType: string;
  garageName?: string;
  vehicleRegistration: string;
  completedAt?: string;
  hasReview: boolean;
}

interface RatingCategory {
  key: "quality" | "communication" | "timeliness" | "value";
  label: string;
  description: string;
}

const RATING_CATEGORIES: RatingCategory[] = [
  {
    key: "quality",
    label: "Quality of Work",
    description: "Was the service performed to a high standard?",
  },
  {
    key: "communication",
    label: "Communication",
    description: "Were you kept informed throughout?",
  },
  {
    key: "timeliness",
    label: "Timeliness",
    description: "Was the service completed on time?",
  },
  {
    key: "value",
    label: "Value for Money",
    description: "Was the service worth the price?",
  },
];

export default function ReviewPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const bookingId = params.bookingId as string;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [booking, setBooking] = useState<BookingInfo | null>(null);

  // Form state
  const [overallRating, setOverallRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [categoryRatings, setCategoryRatings] = useState({
    quality: 0,
    communication: 0,
    timeliness: 0,
    value: 0,
  });
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  // Guest fields (when not logged in)
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");

  // Fetch booking info
  const fetchBooking = useCallback(async () => {
    try {
      const res = await fetch(`/api/bookings/${bookingId}/review-info`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Booking not found");
        return;
      }

      if (data.booking.hasReview) {
        setError("A review has already been submitted for this booking.");
        return;
      }

      setBooking(data.booking);
    } catch {
      setError("Failed to load booking information");
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    fetchBooking();
  }, [fetchBooking]);

  // Auto-calculate overall from categories
  useEffect(() => {
    const values = Object.values(categoryRatings);
    const filled = values.filter((v) => v > 0);
    if (filled.length === 4) {
      const avg = filled.reduce((a, b) => a + b, 0) / filled.length;
      setOverallRating(Math.round(avg));
    }
  }, [categoryRatings]);

  const handleSubmit = async () => {
    // Validation
    if (overallRating === 0) {
      setError("Please provide an overall rating");
      return;
    }

    const missingCategories = RATING_CATEGORIES.filter(
      (cat) => categoryRatings[cat.key] === 0
    );
    if (missingCategories.length > 0) {
      setError(`Please rate: ${missingCategories.map((c) => c.label).join(", ")}`);
      return;
    }

    if (content.trim().length < 10) {
      setError("Please write at least 10 characters in your review");
      return;
    }

    // Guest validation
    if (!session?.user) {
      if (!guestName.trim()) {
        setError("Please enter your name");
        return;
      }
      if (!guestEmail.trim() || !guestEmail.includes("@")) {
        setError("Please enter a valid email address");
        return;
      }
    }

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId,
          overallRating,
          ratingBreakdown: categoryRatings,
          title: title.trim() || undefined,
          content: content.trim(),
          ...(session?.user
            ? {}
            : {
                name: guestName.trim(),
                email: guestEmail.trim().toLowerCase(),
              }),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to submit review");
      }

      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  // Error state
  if (error && !booking) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-400" />
          <h1 className="mt-4 text-xl font-semibold text-slate-900">Unable to load review</h1>
          <p className="mt-2 text-slate-500">{error}</p>
          <Link
            href="/"
            className="mt-6 inline-flex items-center gap-2 text-emerald-600 hover:text-emerald-500"
          >
            <ArrowLeft className="h-4 w-4" />
            Return home
          </Link>
        </div>
      </div>
    );
  }

  // Success state
  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-700 flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden"
        >
          <div className="px-6 py-8 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="mx-auto w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mb-6"
            >
              <CheckCircle className="h-10 w-10 text-emerald-600" />
            </motion.div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Thank you!</h1>
            <p className="text-slate-500 mb-6">
              Your review has been submitted and will be published after moderation.
            </p>
            <div className="flex items-center justify-center gap-1 mb-6">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`h-8 w-8 ${
                    star <= overallRating
                      ? "text-amber-400 fill-amber-400"
                      : "text-slate-200"
                  }`}
                />
              ))}
            </div>
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 w-full rounded-lg bg-emerald-600 py-3 font-semibold text-white hover:bg-emerald-500 transition"
            >
              Return Home
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
        <div className="mx-auto max-w-3xl px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <div className="relative h-10 w-32">
                <Image src="/logo.png" alt="drivlet" fill className="object-contain" priority />
              </div>
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-8">
        {/* Booking Info */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 mb-8">
          <div className="flex items-start gap-4">
            <div className="rounded-full bg-emerald-100 p-3">
              <Wrench className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900">
                Review your service at {booking?.garageName || "the garage"}
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                {booking?.serviceType} · {booking?.vehicleRegistration}
              </p>
            </div>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-6 flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 p-4 text-red-700">
            <AlertCircle className="h-5 w-5 shrink-0" />
            {error}
          </div>
        )}

        {/* Review Form */}
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-emerald-600" />
              Write Your Review
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Help other customers by sharing your experience
            </p>
          </div>

          <div className="p-6 space-y-8">
            {/* Overall Rating */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-3">
                Overall Rating *
              </label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => setOverallRating(star)}
                    className="p-1 transition-transform hover:scale-110"
                  >
                    <Star
                      className={`h-10 w-10 transition-colors ${
                        star <= (hoverRating || overallRating)
                          ? "text-amber-400 fill-amber-400"
                          : "text-slate-200"
                      }`}
                    />
                  </button>
                ))}
                <span className="ml-3 text-lg font-medium text-slate-900">
                  {overallRating > 0 ? `${overallRating}/5` : ""}
                </span>
              </div>
            </div>

            {/* Category Ratings */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-4">
                Rate each category *
              </label>
              <div className="space-y-4">
                {RATING_CATEGORIES.map((category) => (
                  <div
                    key={category.key}
                    className="flex items-center justify-between gap-4 py-3 border-b border-slate-100 last:border-0"
                  >
                    <div>
                      <p className="font-medium text-slate-900">{category.label}</p>
                      <p className="text-sm text-slate-500">{category.description}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() =>
                            setCategoryRatings((prev) => ({
                              ...prev,
                              [category.key]: star,
                            }))
                          }
                          className="p-0.5"
                        >
                          <Star
                            className={`h-6 w-6 transition-colors ${
                              star <= categoryRatings[category.key]
                                ? "text-amber-400 fill-amber-400"
                                : "text-slate-200 hover:text-amber-200"
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Review Title (optional)
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Summarize your experience"
                maxLength={100}
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {/* Content */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Your Review *
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Tell others about your experience..."
                rows={5}
                maxLength={2000}
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 resize-none"
              />
              <p className="mt-1 text-xs text-slate-400">
                {content.length}/2000 characters (minimum 10)
              </p>
            </div>

            {/* Guest fields */}
            {!session?.user && (
              <div className="rounded-lg bg-slate-50 p-4 space-y-4">
                <p className="text-sm font-medium text-slate-700">Your Details</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm text-slate-600 mb-1">Name *</label>
                    <input
                      type="text"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      placeholder="Your name"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-600 mb-1">Email *</label>
                    <input
                      type="email"
                      value={guestEmail}
                      onChange={(e) => setGuestEmail(e.target.value)}
                      placeholder="your@email.com"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>
                <p className="text-xs text-slate-500">
                  Must match the email used for your booking.
                </p>
              </div>
            )}
          </div>

          {/* Submit */}
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-100">
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 py-3 font-semibold text-white hover:bg-emerald-500 transition disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
              Submit Review
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
