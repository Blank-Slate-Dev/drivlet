// src/app/garages/[id]/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Star,
  MapPin,
  Clock,
  Phone,
  Globe,
  Shield,
  Zap,
  Crown,
  CheckCircle,
  Car,
  Calendar,
  ChevronDown,
  ChevronUp,
  Loader2,
  MessageSquare,
  ThumbsUp,
  Award,
  Wrench,
} from "lucide-react";

interface PriceEntry {
  vehicleCategory: string;
  vehicleCategoryLabel: string;
  priceFrom: number;
  priceTo?: number;
  estimatedHours: number;
  notes?: string;
}

interface ServiceOffering {
  id: string;
  name: string;
  category: string;
  categoryLabel: string;
  description?: string;
  prices: PriceEntry[];
  includesPickup: boolean;
  averageRating?: number;
  completedCount: number;
}

interface Review {
  id: string;
  customerName: string;
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
}

interface GarageProfile {
  id: string;
  businessName: string;
  linkedGarageName: string;
  tradingName?: string;
  address: {
    suburb: string;
    state: string;
    postcode: string;
  };
  location?: {
    lat: number;
    lng: number;
  };
  yearsInOperation?: number;
  operatingHours?: Record<string, { open: string; close: string; closed: boolean }>;
  appointmentPolicy?: string;
  services: ServiceOffering[];
  vehicleTypes: string[];
  acceptsElectric: boolean;
  acceptsHybrid: boolean;
  acceptsDiesel: boolean;
  drivletEnabled: boolean;
  drivletRadius: number;
  leadTimeHours: number;
  ratings: {
    averageRating: number;
    totalReviews: number;
    ratingDistribution: Record<number, number>;
    categoryAverages: {
      quality: number;
      communication: number;
      timeliness: number;
      value: number;
    };
  };
  reviews: Review[];
  stats: {
    totalBookings: number;
    completedBookings: number;
    completionRate: number;
    avgResponseTime: string;
  };
  badges: string[];
  isPremium: boolean;
  isAnalytics: boolean;
  certifications: string[];
}

const BADGE_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  premium: { label: "Premium Partner", icon: Crown, color: "text-purple-700", bg: "bg-purple-100" },
  top_rated: { label: "Top Rated", icon: Star, color: "text-amber-700", bg: "bg-amber-100" },
  quick_responder: { label: "Quick Responder", icon: Zap, color: "text-blue-700", bg: "bg-blue-100" },
  trusted: { label: "Highly Trusted", icon: Shield, color: "text-emerald-700", bg: "bg-emerald-100" },
  reliable: { label: "Reliable", icon: CheckCircle, color: "text-green-700", bg: "bg-green-100" },
};

const DAY_NAMES = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

export default function GarageProfilePage() {
  const params = useParams();
  const router = useRouter();
  const garageId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<GarageProfile | null>(null);
  const [expandedService, setExpandedService] = useState<string | null>(null);
  const [showAllReviews, setShowAllReviews] = useState(false);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch(`/api/garages/${garageId}`);
      const data = await res.json();

      if (res.ok && data.profile) {
        setProfile(data.profile);
      } else {
        router.push("/garages");
      }
    } catch {
      router.push("/garages");
    } finally {
      setLoading(false);
    }
  }, [garageId, router]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  const displayedReviews = showAllReviews ? profile.reviews : profile.reviews.slice(0, 3);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.back()}
                className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
              <Link href="/" className="flex items-center gap-2">
                <div className="relative h-10 w-32">
                  <Image src="/logo.png" alt="drivlet" fill className="object-contain" priority />
                </div>
              </Link>
            </div>
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 transition"
            >
              Book a service
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            <div>
              {/* Badges */}
              {profile.badges.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {profile.badges.map((badge) => {
                    const config = BADGE_CONFIG[badge];
                    if (!config) return null;
                    const Icon = config.icon;
                    return (
                      <span
                        key={badge}
                        className={`inline-flex items-center gap-1.5 rounded-full ${config.bg} ${config.color} px-3 py-1 text-sm font-medium`}
                      >
                        <Icon className="h-4 w-4" />
                        {config.label}
                      </span>
                    );
                  })}
                </div>
              )}

              <h1 className="text-3xl sm:text-4xl font-bold">{profile.businessName}</h1>
              {profile.linkedGarageName && profile.linkedGarageName !== profile.businessName && (
                <p className="mt-1 text-lg text-slate-300">{profile.linkedGarageName}</p>
              )}

              <div className="mt-4 flex flex-wrap items-center gap-4 text-slate-300">
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-5 w-5" />
                  <span>
                    {profile.address.suburb}, {profile.address.state} {profile.address.postcode}
                  </span>
                </div>
                {profile.yearsInOperation && (
                  <div className="flex items-center gap-1.5">
                    <Award className="h-5 w-5" />
                    <span>{profile.yearsInOperation}+ years</span>
                  </div>
                )}
              </div>
            </div>

            {/* Rating summary */}
            <div className="flex items-center gap-6 rounded-2xl bg-white/10 backdrop-blur p-6">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <Star className="h-8 w-8 text-amber-400 fill-amber-400" />
                  <span className="text-4xl font-bold">{profile.ratings.averageRating || "—"}</span>
                </div>
                <p className="text-sm text-slate-300 mt-1">
                  {profile.ratings.totalReviews} review{profile.ratings.totalReviews !== 1 ? "s" : ""}
                </p>
              </div>
              <div className="border-l border-white/20 pl-6 space-y-1">
                <div className="flex items-center justify-between gap-4 text-sm">
                  <span className="text-slate-300">Response</span>
                  <span className="font-medium">{profile.stats.avgResponseTime}</span>
                </div>
                <div className="flex items-center justify-between gap-4 text-sm">
                  <span className="text-slate-300">Completion</span>
                  <span className="font-medium">{profile.stats.completionRate}%</span>
                </div>
                <div className="flex items-center justify-between gap-4 text-sm">
                  <span className="text-slate-300">Jobs done</span>
                  <span className="font-medium">{profile.stats.completedBookings}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Left Column - Services & Reviews */}
          <div className="lg:col-span-2 space-y-8">
            {/* Services */}
            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Wrench className="h-5 w-5 text-emerald-600" />
                Services & Pricing
              </h2>

              {profile.services.length > 0 ? (
                <div className="space-y-3">
                  {profile.services.map((service) => (
                    <div
                      key={service.id}
                      className="rounded-xl border border-slate-200 bg-white overflow-hidden"
                    >
                      <button
                        onClick={() =>
                          setExpandedService(expandedService === service.id ? null : service.id)
                        }
                        className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50 transition"
                      >
                        <div>
                          <h3 className="font-semibold text-slate-900">{service.name}</h3>
                          <p className="text-sm text-slate-500">{service.categoryLabel}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          {service.prices.length > 0 && (
                            <span className="text-sm font-medium text-emerald-600">
                              From ${Math.min(...service.prices.map((p) => p.priceFrom))}
                            </span>
                          )}
                          {expandedService === service.id ? (
                            <ChevronUp className="h-5 w-5 text-slate-400" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-slate-400" />
                          )}
                        </div>
                      </button>

                      {expandedService === service.id && (
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: "auto" }}
                          className="border-t border-slate-100 bg-slate-50 overflow-hidden"
                        >
                          <div className="p-4">
                            {service.description && (
                              <p className="text-sm text-slate-600 mb-4">{service.description}</p>
                            )}

                            {service.prices.length > 0 && (
                              <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="text-left text-xs font-medium text-slate-500 uppercase">
                                      <th className="pb-2">Vehicle Type</th>
                                      <th className="pb-2">Price</th>
                                      <th className="pb-2">Est. Time</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {service.prices.map((price, i) => (
                                      <tr key={i}>
                                        <td className="py-2 font-medium text-slate-900">
                                          {price.vehicleCategoryLabel}
                                        </td>
                                        <td className="py-2 text-emerald-600 font-semibold">
                                          ${price.priceFrom}
                                          {price.priceTo && ` - $${price.priceTo}`}
                                        </td>
                                        <td className="py-2 text-slate-500">
                                          {price.estimatedHours}h
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}

                            {service.includesPickup && (
                              <div className="mt-3 flex items-center gap-2 text-sm text-emerald-600">
                                <Car className="h-4 w-4" />
                                Available for drivlet pickup
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
                  <p className="text-slate-500">No services published yet.</p>
                </div>
              )}
            </section>

            {/* Reviews */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-emerald-600" />
                  Customer Reviews
                </h2>
                {profile.reviews.length > 3 && (
                  <button
                    onClick={() => setShowAllReviews(!showAllReviews)}
                    className="text-sm font-medium text-emerald-600 hover:text-emerald-500"
                  >
                    {showAllReviews ? "Show less" : `View all ${profile.reviews.length}`}
                  </button>
                )}
              </div>

              {profile.reviews.length > 0 ? (
                <div className="space-y-4">
                  {displayedReviews.map((review) => (
                    <ReviewCard key={review.id} review={review} />
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
                  <Star className="mx-auto h-10 w-10 text-slate-300" />
                  <p className="mt-2 text-slate-500">No reviews yet.</p>
                </div>
              )}
            </section>
          </div>

          {/* Right Column - Info Cards */}
          <div className="space-y-6">
            {/* Book CTA */}
            {profile.drivletEnabled && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6">
                <h3 className="font-semibold text-emerald-900 mb-2">Book with drivlet</h3>
                <p className="text-sm text-emerald-700 mb-4">
                  We&apos;ll pick up your car and deliver it to this garage for servicing.
                </p>
                <Link
                  href="/"
                  className="block w-full rounded-lg bg-emerald-600 py-3 text-center text-sm font-semibold text-white hover:bg-emerald-500 transition"
                >
                  Book Now - $119
                </Link>
                <p className="mt-2 text-xs text-emerald-600 text-center">
                  Pickup within {profile.drivletRadius}km
                </p>
              </div>
            )}

            {/* Opening Hours */}
            {profile.operatingHours && (
              <div className="rounded-xl border border-slate-200 bg-white p-6">
                <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <Clock className="h-5 w-5 text-slate-600" />
                  Opening Hours
                </h3>
                <div className="space-y-2 text-sm">
                  {DAY_NAMES.map((day) => {
                    const hours = profile.operatingHours?.[day];
                    const isToday = new Date().toLocaleDateString("en-US", { weekday: "long" }).toLowerCase() === day;
                    return (
                      <div
                        key={day}
                        className={`flex justify-between ${isToday ? "font-medium text-emerald-600" : "text-slate-600"}`}
                      >
                        <span className="capitalize">{day}</span>
                        <span>
                          {hours?.closed ? "Closed" : `${hours?.open || "—"} - ${hours?.close || "—"}`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Vehicle Types */}
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Car className="h-5 w-5 text-slate-600" />
                Vehicles Accepted
              </h3>
              <div className="flex flex-wrap gap-2">
                {profile.vehicleTypes.map((type) => (
                  <span
                    key={type}
                    className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600 capitalize"
                  >
                    {type}
                  </span>
                ))}
                {profile.acceptsElectric && (
                  <span className="rounded-full bg-green-100 px-3 py-1 text-sm text-green-700">
                    Electric
                  </span>
                )}
                {profile.acceptsHybrid && (
                  <span className="rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-700">
                    Hybrid
                  </span>
                )}
                {profile.acceptsDiesel && (
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-sm text-amber-700">
                    Diesel
                  </span>
                )}
              </div>
            </div>

            {/* Rating Breakdown */}
            {profile.ratings.totalReviews > 0 && (
              <div className="rounded-xl border border-slate-200 bg-white p-6">
                <h3 className="font-semibold text-slate-900 mb-4">Rating Breakdown</h3>

                {/* Distribution */}
                <div className="space-y-2 mb-6">
                  {[5, 4, 3, 2, 1].map((rating) => {
                    const count = profile.ratings.ratingDistribution[rating] || 0;
                    const pct = profile.ratings.totalReviews > 0
                      ? (count / profile.ratings.totalReviews) * 100
                      : 0;
                    return (
                      <div key={rating} className="flex items-center gap-2">
                        <span className="w-3 text-sm text-slate-500">{rating}</span>
                        <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-amber-400 rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="w-6 text-xs text-slate-400">{count}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Category averages */}
                <div className="space-y-2 pt-4 border-t border-slate-100">
                  {Object.entries(profile.ratings.categoryAverages).map(([cat, val]) => (
                    <div key={cat} className="flex justify-between text-sm">
                      <span className="text-slate-600 capitalize">{cat}</span>
                      <span className="font-medium text-slate-900">{val}/5</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Certifications */}
            {profile.certifications.length > 0 && (
              <div className="rounded-xl border border-slate-200 bg-white p-6">
                <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <Shield className="h-5 w-5 text-slate-600" />
                  Certifications
                </h3>
                <ul className="space-y-2">
                  {profile.certifications.map((cert, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-slate-600">
                      <CheckCircle className="h-4 w-4 text-emerald-500" />
                      {cert}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Review Card Component
function ReviewCard({ review }: { review: Review }) {
  const date = new Date(review.createdAt).toLocaleDateString("en-AU", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
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
          </div>
          <p className="text-sm text-slate-500">{date} · {review.serviceType}</p>
        </div>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              className={`h-4 w-4 ${
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
      <p className="text-slate-600 text-sm">{review.content}</p>

      {/* Garage Response */}
      {review.garageResponse && (
        <div className="mt-4 rounded-lg bg-slate-50 p-4 border-l-4 border-emerald-500">
          <p className="text-xs font-medium text-slate-500 mb-1">Response from garage</p>
          <p className="text-sm text-slate-700">{review.garageResponse.message}</p>
        </div>
      )}

      {/* Helpful */}
      {review.helpfulCount > 0 && (
        <div className="mt-3 flex items-center gap-1 text-xs text-slate-400">
          <ThumbsUp className="h-3.5 w-3.5" />
          {review.helpfulCount} found this helpful
        </div>
      )}
    </div>
  );
}
