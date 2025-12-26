// src/app/garages/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  MapPin,
  Star,
  Clock,
  Filter,
  ChevronDown,
  X,
  Loader2,
  Crown,
  Shield,
  Zap,
  CheckCircle,
  Navigation,
  Wrench,
} from "lucide-react";

interface GarageResult {
  _id: string;
  businessName: string;
  linkedGarageName: string;
  address: {
    suburb: string;
    state: string;
    postcode: string;
  };
  services: string[];
  averageRating: number;
  totalReviews: number;
  responseTime: string;
  priceRange?: {
    min: number;
    max: number;
  };
  badges: string[];
  isFeatured: boolean;
  isPremium: boolean;
  distanceKm?: number;
  score: number;
}

const SERVICE_OPTIONS = [
  { id: "logbook_service", label: "Logbook Service" },
  { id: "major_service", label: "Major Service" },
  { id: "minor_service", label: "Minor Service" },
  { id: "brake_service", label: "Brake Service" },
  { id: "tyre_service", label: "Tyre Service" },
  { id: "battery", label: "Battery" },
  { id: "air_conditioning", label: "Air Con" },
  { id: "diagnostics", label: "Diagnostics" },
];

const BADGE_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  premium: { label: "Premium", icon: Crown, color: "bg-purple-100 text-purple-700" },
  top_rated: { label: "Top Rated", icon: Star, color: "bg-amber-100 text-amber-700" },
  quick_responder: { label: "Quick Response", icon: Zap, color: "bg-blue-100 text-blue-700" },
  trusted: { label: "Trusted", icon: Shield, color: "bg-emerald-100 text-emerald-700" },
  reliable: { label: "Reliable", icon: CheckCircle, color: "bg-green-100 text-green-700" },
};

export default function GaragesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [garages, setGarages] = useState<GarageResult[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filter states
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [suburb, setSuburb] = useState(searchParams.get("suburb") || "");
  const [state, setState] = useState(searchParams.get("state") || "");
  const [service, setService] = useState(searchParams.get("service") || "");
  const [minRating, setMinRating] = useState(parseFloat(searchParams.get("minRating") || "0"));
  const [sortBy, setSortBy] = useState(searchParams.get("sortBy") || "relevance");
  const [showFilters, setShowFilters] = useState(false);

  // User location
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);

  // Fetch garages
  const fetchGarages = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set("q", searchQuery);
      if (suburb) params.set("suburb", suburb);
      if (state) params.set("state", state);
      if (service) params.set("service", service);
      if (minRating > 0) params.set("minRating", minRating.toString());
      if (sortBy) params.set("sortBy", sortBy);
      params.set("page", page.toString());
      params.set("limit", "12");

      if (userLocation) {
        params.set("lat", userLocation.lat.toString());
        params.set("lng", userLocation.lng.toString());
      }

      const res = await fetch(`/api/garages/search?${params.toString()}`);
      const data = await res.json();

      if (res.ok) {
        setGarages(data.garages || []);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
      }
    } catch (error) {
      console.error("Failed to fetch garages:", error);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, suburb, state, service, minRating, sortBy, page, userLocation]);

  useEffect(() => {
    fetchGarages();
  }, [fetchGarages]);

  // Get user location
  const getUserLocation = () => {
    if (!navigator.geolocation) return;
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setLocationLoading(false);
      },
      () => {
        setLocationLoading(false);
      }
    );
  };

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchGarages();
  };

  // Clear filters
  const clearFilters = () => {
    setSearchQuery("");
    setSuburb("");
    setState("");
    setService("");
    setMinRating(0);
    setSortBy("relevance");
    setPage(1);
  };

  const hasActiveFilters = searchQuery || suburb || state || service || minRating > 0;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-2 shrink-0">
              <div className="relative h-10 w-32">
                <Image src="/logo.png" alt="drivlet" fill className="object-contain" priority />
              </div>
            </Link>
            <div className="flex items-center gap-3">
              <Link
                href="/track"
                className="text-sm font-medium text-slate-600 hover:text-emerald-600 transition hidden sm:block"
              >
                Track my service
              </Link>
              <Link
                href="/garage/login"
                className="text-sm font-medium text-slate-600 hover:text-emerald-600 transition hidden sm:block"
              >
                Partner login
              </Link>
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 transition"
              >
                Book a service
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="bg-gradient-to-br from-emerald-700 via-emerald-600 to-teal-600 text-white">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <h1 className="text-3xl sm:text-4xl font-bold mb-3">Find trusted mechanics near you</h1>
            <p className="text-emerald-100 text-lg">
              Compare prices, read reviews, and book with confidence. All garages offer transparent,
              fixed pricing.
            </p>
          </div>

          {/* Search Form */}
          <form onSubmit={handleSearch} className="mt-8">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by garage name or service..."
                  className="w-full rounded-xl border-0 bg-white py-4 pl-12 pr-4 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-400"
                />
              </div>
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input
                  type="text"
                  value={suburb}
                  onChange={(e) => setSuburb(e.target.value)}
                  placeholder="Suburb or postcode"
                  className="w-full sm:w-48 rounded-xl border-0 bg-white py-4 pl-12 pr-4 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-400"
                />
              </div>
              <button
                type="submit"
                className="rounded-xl bg-slate-900 px-8 py-4 font-semibold text-white hover:bg-slate-800 transition"
              >
                Search
              </button>
            </div>

            {/* Quick Filters */}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur px-4 py-2 text-sm font-medium hover:bg-white/20 transition"
              >
                <Filter className="h-4 w-4" />
                Filters
                {hasActiveFilters && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-400 text-xs text-emerald-900">
                    !
                  </span>
                )}
              </button>

              {!userLocation && (
                <button
                  type="button"
                  onClick={getUserLocation}
                  disabled={locationLoading}
                  className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur px-4 py-2 text-sm font-medium hover:bg-white/20 transition disabled:opacity-50"
                >
                  {locationLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Navigation className="h-4 w-4" />
                  )}
                  Use my location
                </button>
              )}

              {userLocation && (
                <span className="inline-flex items-center gap-2 rounded-full bg-emerald-400/20 px-4 py-2 text-sm">
                  <Navigation className="h-4 w-4" />
                  Location enabled
                  <button
                    type="button"
                    onClick={() => setUserLocation(null)}
                    className="hover:text-white/80"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </span>
              )}

              {/* Quick service filters */}
              {SERVICE_OPTIONS.slice(0, 4).map((svc) => (
                <button
                  key={svc.id}
                  type="button"
                  onClick={() => setService(service === svc.id ? "" : svc.id)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    service === svc.id
                      ? "bg-white text-emerald-700"
                      : "bg-white/10 backdrop-blur hover:bg-white/20"
                  }`}
                >
                  {svc.label}
                </button>
              ))}
            </div>
          </form>
        </div>
      </div>

      {/* Filters Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-white border-b border-slate-200 overflow-hidden"
          >
            <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {/* State */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">State</label>
                  <select
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="">All states</option>
                    <option value="NSW">New South Wales</option>
                    <option value="VIC">Victoria</option>
                    <option value="QLD">Queensland</option>
                    <option value="WA">Western Australia</option>
                    <option value="SA">South Australia</option>
                    <option value="TAS">Tasmania</option>
                    <option value="NT">Northern Territory</option>
                    <option value="ACT">ACT</option>
                  </select>
                </div>

                {/* Service */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Service</label>
                  <select
                    value={service}
                    onChange={(e) => setService(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="">All services</option>
                    {SERVICE_OPTIONS.map((svc) => (
                      <option key={svc.id} value={svc.id}>
                        {svc.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Min Rating */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Minimum Rating
                  </label>
                  <select
                    value={minRating}
                    onChange={(e) => setMinRating(parseFloat(e.target.value))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value={0}>Any rating</option>
                    <option value={3}>3+ stars</option>
                    <option value={4}>4+ stars</option>
                    <option value={4.5}>4.5+ stars</option>
                  </select>
                </div>

                {/* Sort */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Sort by</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="relevance">Relevance</option>
                    <option value="rating">Highest rated</option>
                    <option value="distance">Nearest</option>
                  </select>
                </div>
              </div>

              <div className="mt-4 flex justify-between items-center">
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-sm text-slate-500 hover:text-slate-700"
                >
                  Clear all filters
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowFilters(false);
                    setPage(1);
                    fetchGarages();
                  }}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Results count */}
        <div className="mb-6 flex items-center justify-between">
          <p className="text-sm text-slate-500">
            {loading ? "Searching..." : `${total} garage${total !== 1 ? "s" : ""} found`}
          </p>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-1 text-sm text-emerald-600 hover:text-emerald-500"
            >
              <X className="h-4 w-4" />
              Clear filters
            </button>
          )}
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
          </div>
        )}

        {/* No results */}
        {!loading && garages.length === 0 && (
          <div className="text-center py-16">
            <Wrench className="mx-auto h-12 w-12 text-slate-300" />
            <h3 className="mt-4 text-lg font-medium text-slate-900">No garages found</h3>
            <p className="mt-2 text-slate-500">
              Try adjusting your filters or search in a different area.
            </p>
            <button
              onClick={clearFilters}
              className="mt-4 text-emerald-600 hover:text-emerald-500 font-medium"
            >
              Clear all filters
            </button>
          </div>
        )}

        {/* Results grid */}
        {!loading && garages.length > 0 && (
          <>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {garages.map((garage, index) => (
                <GarageCard key={garage._id} garage={garage} index={index} />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="px-4 py-2 text-sm text-slate-500">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Garage Card Component
function GarageCard({ garage, index }: { garage: GarageResult; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Link
        href={`/garages/${garage._id}`}
        className="group block rounded-xl border border-slate-200 bg-white overflow-hidden hover:shadow-lg hover:border-emerald-200 transition-all"
      >
        {/* Featured banner */}
        {garage.isFeatured && (
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-1.5 text-center">
            <span className="text-xs font-semibold text-white flex items-center justify-center gap-1">
              <Crown className="h-3.5 w-3.5" />
              Featured Partner
            </span>
          </div>
        )}

        <div className="p-5">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="min-w-0">
              <h3 className="font-semibold text-slate-900 group-hover:text-emerald-600 transition truncate">
                {garage.businessName}
              </h3>
              {garage.linkedGarageName && garage.linkedGarageName !== garage.businessName && (
                <p className="text-sm text-slate-500 truncate">{garage.linkedGarageName}</p>
              )}
            </div>
            {garage.averageRating > 0 && (
              <div className="flex items-center gap-1 shrink-0">
                <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
                <span className="font-semibold text-slate-900">{garage.averageRating}</span>
                <span className="text-sm text-slate-400">({garage.totalReviews})</span>
              </div>
            )}
          </div>

          {/* Location */}
          <div className="flex items-center gap-1.5 text-sm text-slate-500 mb-3">
            <MapPin className="h-4 w-4 shrink-0" />
            <span className="truncate">
              {garage.address.suburb}, {garage.address.state}
            </span>
            {garage.distanceKm && (
              <span className="shrink-0 text-emerald-600 font-medium">
                · {garage.distanceKm}km
              </span>
            )}
          </div>

          {/* Badges */}
          {garage.badges.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {garage.badges.slice(0, 3).map((badge) => {
                const config = BADGE_CONFIG[badge];
                if (!config) return null;
                const Icon = config.icon;
                return (
                  <span
                    key={badge}
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${config.color}`}
                  >
                    <Icon className="h-3 w-3" />
                    {config.label}
                  </span>
                );
              })}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <div className="flex items-center gap-1.5 text-sm text-slate-500">
              <Clock className="h-4 w-4" />
              <span>{garage.responseTime}</span>
            </div>
            {garage.priceRange && (
              <span className="text-sm font-medium text-slate-900">
                ${garage.priceRange.min} - ${garage.priceRange.max}
              </span>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
