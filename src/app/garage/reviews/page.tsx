// src/app/garage/reviews/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Star,
  MessageSquare,
  ArrowLeft,
  Loader2,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Send,
  X,
  ThumbsUp,
  Filter,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

interface Review {
  _id: string;
  customerName: string;
  customerEmail: string;
  overallRating: number;
  ratingBreakdown: {
    quality: number;
    communication: number;
    timeliness: number;
    value: number;
  };
  title?: string;
  content: string;
  serviceType: string;
  isVerifiedPurchase: boolean;
  garageResponse?: {
    message: string;
    respondedAt: string;
  };
  helpfulCount: number;
  createdAt: string;
  status: "pending" | "approved" | "rejected" | "flagged";
}

interface RatingStats {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: Record<number, number>;
  categoryAverages: {
    quality: number;
    communication: number;
    timeliness: number;
    value: number;
  };
  trend: number; // Change from last period
}

export default function GarageReviewsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<RatingStats | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "responded">("all");
  const [sortBy, setSortBy] = useState<"recent" | "highest" | "lowest">("recent");

  // Response modal state
  const [respondingTo, setRespondingTo] = useState<Review | null>(null);
  const [responseText, setResponseText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchReviews = useCallback(async () => {
    try {
      const res = await fetch(`/api/garage/reviews?sortBy=${sortBy}`);
      const data = await res.json();

      if (res.ok) {
        setReviews(data.reviews || []);
        setStats(data.stats || null);
      }
    } catch {
      setError("Failed to load reviews");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [sortBy]);

  useEffect(() => {
    if (status === "loading") return;
    if (!session || session.user?.role !== "garage") {
      router.push("/garage/login");
      return;
    }
    fetchReviews();
  }, [session, status, router, fetchReviews]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchReviews();
  };

  const handleSubmitResponse = async () => {
    if (!respondingTo || !responseText.trim()) return;

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/garage/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reviewId: respondingTo._id,
          response: responseText.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to submit response");
      }

      setSuccess("Response submitted successfully!");
      setRespondingTo(null);
      setResponseText("");
      fetchReviews();

      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  // Filter reviews
  const filteredReviews = reviews.filter((review) => {
    if (filter === "pending") return !review.garageResponse;
    if (filter === "responded") return !!review.garageResponse;
    return true;
  });

  const pendingCount = reviews.filter((r) => !r.garageResponse).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/garage/dashboard")}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 transition"
            >
              <ArrowLeft className="h-4 w-4" />
              Dashboard
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Reviews</h1>
              <p className="text-sm text-slate-500">
                Manage and respond to customer feedback
              </p>
            </div>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 transition disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {/* Messages */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-6 flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 p-4 text-red-700"
            >
              <AlertCircle className="h-5 w-5 shrink-0" />
              {error}
              <button onClick={() => setError("")} className="ml-auto">
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          )}
          {success && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-6 flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 p-4 text-emerald-700"
            >
              <CheckCircle className="h-5 w-5 shrink-0" />
              {success}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stats Cards */}
        {stats && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-500">Average Rating</span>
                {stats.trend !== 0 && (
                  <span className={`flex items-center gap-1 text-xs font-medium ${
                    stats.trend > 0 ? "text-emerald-600" : "text-red-600"
                  }`}>
                    {stats.trend > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {Math.abs(stats.trend)}%
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Star className="h-6 w-6 text-amber-400 fill-amber-400" />
                <span className="text-2xl font-bold text-slate-900">{stats.averageRating}</span>
                <span className="text-slate-400">/5</span>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <span className="text-sm text-slate-500">Total Reviews</span>
              <p className="text-2xl font-bold text-slate-900 mt-2">{stats.totalReviews}</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <span className="text-sm text-slate-500">Awaiting Response</span>
              <p className="text-2xl font-bold text-slate-900 mt-2">{pendingCount}</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <span className="text-sm text-slate-500">Response Rate</span>
              <p className="text-2xl font-bold text-slate-900 mt-2">
                {stats.totalReviews > 0
                  ? Math.round(((stats.totalReviews - pendingCount) / stats.totalReviews) * 100)
                  : 0}%
              </p>
            </div>
          </div>
        )}

        {/* Rating Breakdown */}
        {stats && stats.totalReviews > 0 && (
          <div className="rounded-xl border border-slate-200 bg-white p-6 mb-8">
            <h3 className="font-semibold text-slate-900 mb-4">Rating Breakdown</h3>
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Distribution */}
              <div className="space-y-2">
                {[5, 4, 3, 2, 1].map((rating) => {
                  const count = stats.ratingDistribution[rating] || 0;
                  const pct = stats.totalReviews > 0 ? (count / stats.totalReviews) * 100 : 0;
                  return (
                    <div key={rating} className="flex items-center gap-3">
                      <span className="w-8 text-sm text-slate-600">{rating}★</span>
                      <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-400 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-10 text-sm text-slate-500 text-right">{count}</span>
                    </div>
                  );
                })}
              </div>

              {/* Category Averages */}
              <div className="space-y-3">
                <p className="text-sm font-medium text-slate-700">Category Scores</p>
                {Object.entries(stats.categoryAverages).map(([cat, val]) => (
                  <div key={cat} className="flex items-center justify-between">
                    <span className="text-sm text-slate-600 capitalize">{cat}</span>
                    <div className="flex items-center gap-2">
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`h-4 w-4 ${
                              star <= val ? "text-amber-400 fill-amber-400" : "text-slate-200"
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-sm font-medium text-slate-900 w-8">{val}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-400" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as typeof filter)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            >
              <option value="all">All reviews</option>
              <option value="pending">Awaiting response ({pendingCount})</option>
              <option value="responded">Responded</option>
            </select>
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          >
            <option value="recent">Most recent</option>
            <option value="highest">Highest rated</option>
            <option value="lowest">Lowest rated</option>
          </select>
        </div>

        {/* Reviews List */}
        {filteredReviews.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
            <MessageSquare className="mx-auto h-12 w-12 text-slate-300" />
            <h3 className="mt-4 text-lg font-medium text-slate-900">No reviews yet</h3>
            <p className="mt-2 text-slate-500">
              Customer reviews will appear here after completed bookings.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredReviews.map((review) => (
              <ReviewCard
                key={review._id}
                review={review}
                onRespond={() => {
                  setRespondingTo(review);
                  setResponseText("");
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Response Modal */}
      <AnimatePresence>
        {respondingTo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setRespondingTo(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg rounded-2xl bg-white shadow-xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                <h2 className="text-lg font-semibold text-slate-900">Respond to Review</h2>
                <button
                  onClick={() => setRespondingTo(null)}
                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-6">
                {/* Original review */}
                <div className="rounded-lg bg-slate-50 p-4 mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-slate-900">{respondingTo.customerName}</span>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`h-4 w-4 ${
                            star <= respondingTo.overallRating
                              ? "text-amber-400 fill-amber-400"
                              : "text-slate-200"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-sm text-slate-600">{respondingTo.content}</p>
                </div>

                {/* Response input */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Your Response
                  </label>
                  <textarea
                    value={responseText}
                    onChange={(e) => setResponseText(e.target.value)}
                    placeholder="Thank the customer and address their feedback..."
                    rows={4}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 resize-none"
                  />
                  <p className="mt-1 text-xs text-slate-400">
                    Your response will be publicly visible on your profile.
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
                <button
                  onClick={() => setRespondingTo(null)}
                  className="rounded-lg px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitResponse}
                  disabled={!responseText.trim() || submitting}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Submit Response
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Review Card Component
function ReviewCard({
  review,
  onRespond,
}: {
  review: Review;
  onRespond: () => void;
}) {
  const date = new Date(review.createdAt).toLocaleDateString("en-AU", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <div className="p-5">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-900">{review.customerName}</span>
              {review.isVerifiedPurchase && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                  <CheckCircle className="h-3 w-3" />
                  Verified
                </span>
              )}
              {!review.garageResponse && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                  Needs Response
                </span>
              )}
            </div>
            <p className="text-sm text-slate-500">
              {date} · {review.serviceType}
            </p>
          </div>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`h-5 w-5 ${
                  star <= review.overallRating
                    ? "text-amber-400 fill-amber-400"
                    : "text-slate-200"
                }`}
              />
            ))}
          </div>
        </div>

        {review.title && (
          <h4 className="font-medium text-slate-900 mb-1">{review.title}</h4>
        )}
        <p className="text-slate-600">{review.content}</p>

        {/* Rating breakdown */}
        <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
          <span>Quality: {review.ratingBreakdown.quality}/5</span>
          <span>Communication: {review.ratingBreakdown.communication}/5</span>
          <span>Timeliness: {review.ratingBreakdown.timeliness}/5</span>
          <span>Value: {review.ratingBreakdown.value}/5</span>
        </div>

        {/* Garage Response */}
        {review.garageResponse && (
          <div className="mt-4 rounded-lg bg-emerald-50 p-4 border-l-4 border-emerald-500">
            <p className="text-xs font-medium text-emerald-700 mb-1">Your response</p>
            <p className="text-sm text-slate-700">{review.garageResponse.message}</p>
          </div>
        )}

        {/* Actions */}
        <div className="mt-4 flex items-center justify-between pt-4 border-t border-slate-100">
          <div className="flex items-center gap-1 text-sm text-slate-400">
            <ThumbsUp className="h-4 w-4" />
            {review.helpfulCount} helpful
          </div>
          {!review.garageResponse && (
            <button
              onClick={onRespond}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700 hover:bg-emerald-100 transition"
            >
              <MessageSquare className="h-4 w-4" />
              Respond
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
