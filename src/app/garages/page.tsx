// src/app/garages/page.tsx
"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  MapPin,
  Star,
  Filter,
  ChevronDown,
  Loader2,
  Navigation,
  Clock,
  Shield,
  Zap,
  Crown,
  CheckCircle,
  X,
} from "lucide-react";

interface GarageResult {
  id: string;
  businessName: string;
  suburb: string;
  state: string;
  postcode: string;
  averageRating: number;
  totalReviews: number;
  responseTime: string;
  priceRange: string;
  badges: string[];
  isFeatured: boolean;
  isPremium: boolean;
  distanceKm?: number;
  score: number;
}

interface SearchFilters {
  query: string;
  suburb: string;
  state: string;
  service: string;
  minRating: string;
  sortBy: string;
  lat?: number;
  lng?: number;
}

const BADGE_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  premium: { label: "Premium", icon: Crown, color: "bg-purple-100 text-purple-700" },
  top_rated: { label: "Top Rated", icon: Star, color: "bg-amber-100 text-amber-700" },
  quick_responder: { label: "Fast Response", icon: Zap, color: "bg-blue-100 text-blue-700" },
  trusted: { label: "Trusted", icon: Shield, color: "bg-emerald-100 text-emerald-700" },
  reliable: { label: "Reliable", icon: CheckCircle, color: "bg-green-100 text-green-700" },
};

const STATES = ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "NT", "ACT"];

const SERVICES = [
  { value: "", label: "All Services" },
  { value: "logbook", label: "Logbook Service" },
  { value: "major", label: "Major Service" },
  { value: "minor", label: "Minor Service" },
  { value: "brake", label: "Brake Service" },
  { value: "tyre", label: "Tyre Service" },
  { value: "battery", label: "Battery" },
  { value: "aircon", label: "Air Conditioning" },
  { value: "diagnostics", label: "Diagnostics" },
  { value: "roadworthy", label: "Roadworthy Certificate" },
];

function GarageSearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<GarageResult[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);

  const [filters, setFilters] = useState<SearchFilters>({
    query: searchParams.get("q") || "",
    suburb: searchParams.get("suburb") || "",
    state: searchParams.get("state") || "",
    service: searchParams.get("service") || "",
    minRating: searchParams.get("minRating") || "",
    sortBy: searchParams.get("sortBy") || "relevance",
  });

  const fetchGarages = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.query) params.set("q", filters.query);
      if (filters.suburb) params.set("suburb", filters.suburb);
      if (filters.state) params.set("state", filters.state);
      if (filters.service) params.set("service", filters.service);
      if (filters.minRating) params.set("minRating", filters.minRating);
      if (filters.sortBy) params.set("sortBy", filters.sortBy);
      if (filters.lat) params.set("lat", filters.lat.toString());
      if (filters.lng) params.set("lng", filters.lng.toString());
      params.set("page", page.toString());

      const res = await fetch(`/api/garages/search?${params.toString()}`);
      const data = await res.json();

      if (res.ok) {
        setResults(data.garages || []);
        setTotalResults(data.total || 0);
        setTotalPages(data.totalPages || 1);
      }
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    fetchGarages();
  }, [fetchGarages]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchGarages();
  };

  const handleFilterChange = (key: keyof SearchFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const applyFilters = () => {
    setPage(1);
    setShowFilters(false);
    fetchGarages();
  };

  const clearFilters = () => {
    setFilters({
      query: "",
      suburb: "",
      state: "",
      service: "",
      minRating: "",
      sortBy: "relevance",
    });
    setPage(1);
  };

  const getMyLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFilters((prev) => ({
          ...prev,
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        }));
        setGettingLocation(false);
      },
      () => {
        alert("Unable to get your location");
        setGettingLocation(false);
      }
    );
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="relative h-10 w-32">
                <Image src="/logo.png" alt="drivlet" fill className="object-contain" priority />
              </div>
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 transition"
            >
              Book a service
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Search */}
      <div className="bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-700 text-white">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-center mb-2">
            Find Trusted Mechanics
          </h1>
          <p className="text-emerald-100 text-center mb-8">
            Browse our network of verified partner garages
          </p>

          <form onSubmit={handleSearch} className="max-w-3xl mx-auto">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by garage name..."
                  value={filters.query}
                  onChange={(e) => handleFilterChange("query", e.target.value)}
                  className="w-full rounded-xl border-0 py-4 pl-12 pr-4 text-slate-900 shadow-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="relative flex-1">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Suburb or postcode..."
                  value={filters.suburb}
                  onChange={(e) => handleFilterChange("suburb", e.target.value)}
                  className="w-full rounded-xl border-0 py-4 pl-12 pr-4 text-slate-900 shadow-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="rounded-xl bg-amber-500 px-8 py-4 font-semibold text-white shadow-lg hover:bg-amber-400 transition disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Search"}
              </button>
            </div>
          </form>

          <div className="flex justify-center mt-4">
            <button
              onClick={getMyLocation}
              disabled={gettingLocation}
              className="inline-flex items-center gap-2 text-sm text-emerald-200 hover:text-white transition"
            >
              {gettingLocation ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Navigation className="h-4 w-4" />
              )}
              Use my location
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Filters Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <Filter className="h-4 w-4" />
              Filters
              <ChevronDown className={`h-4 w-4 transition ${showFilters ? "rotate-180" : ""}`} />
            </button>

            {/* Quick service filters */}
            <div className="hidden sm:flex gap-2">
              {SERVICES.slice(1, 5).map((service) => (
                <button
                  key={service.value}
                  onClick={() => {
                    handleFilterChange("service", service.value);
                    fetchGarages();
                  }}
                  className={`rounded-full px-3 py-1.5 text-sm transition ${
                    filters.service === service.value
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {service.label}
                </button>
              ))}
            </div>

            {filters.lat && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1.5 text-sm text-blue-700">
                <Navigation className="h-3.5 w-3.5" />
                Near me
                <button
                  onClick={() => setFilters((prev) => ({ ...prev, lat: undefined, lng: undefined }))}
                  className="ml-1 hover:text-blue-900"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            )}
          </div>

          <p className="text-sm text-slate-500">
            {totalResults} garage{totalResults !== 1 ? "s" : ""} found
          </p>
        </div>

        {/* Expandable Filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="rounded-xl border border-slate-200 bg-white p-6 mb-6">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">State</label>
                    <select
                      value={filters.state}
                      onChange={(e) => handleFilterChange("state", e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    >
                      <option value="">All States</option>
                      {STATES.map((state) => (
                        <option key={state} value={state}>{state}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Service</label>
                    <select
                      value={filters.service}
                      onChange={(e) => handleFilterChange("service", e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    >
                      {SERVICES.map((service) => (
                        <option key={service.value} value={service.value}>{service.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Min Rating</label>
                    <select
                      value={filters.minRating}
                      onChange={(e) => handleFilterChange("minRating", e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    >
                      <option value="">Any Rating</option>
                      <option value="4.5">4.5+ Stars</option>
                      <option value="4">4+ Stars</option>
                      <option value="3.5">3.5+ Stars</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Sort By</label>
                    <select
                      value={filters.sortBy}
                      onChange={(e) => handleFilterChange("sortBy", e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    >
                      <option value="relevance">Relevance</option>
                      <option value="rating">Highest Rated</option>
                      <option value="distance">Nearest</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-slate-100">
                  <button
                    onClick={clearFilters}
                    className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900"
                  >
                    Clear All
                  </button>
                  <button
                    onClick={applyFilters}
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
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-12">
            <MapPin className="mx-auto h-12 w-12 text-slate-300" />
            <h3 className="mt-4 text-lg font-medium text-slate-900">No garages found</h3>
            <p className="mt-2 text-slate-500">Try adjusting your search or filters</p>
            <button
              onClick={clearFilters}
              className="mt-4 text-emerald-600 hover:text-emerald-500 font-medium"
            >
              Clear all filters
            </button>
          </div>
        ) : (
          <>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {results.map((garage) => (
                <GarageCard key={garage.id} garage={garage} />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-8">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="flex items-center px-4 text-sm text-slate-600">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium disabled:opacity-50"
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

function GarageCard({ garage }: { garage: GarageResult }) {
  return (
    <Link href={`/garages/${garage.id}`}>
      <motion.div
        whileHover={{ y: -4 }}
        className="rounded-xl border border-slate-200 bg-white overflow-hidden hover:shadow-lg transition-shadow"
      >
        {garage.isFeatured && (
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-1.5 text-center">
            <span className="text-xs font-semibold text-white">Featured Partner</span>
          </div>
        )}
        <div className="p-5">
          <div className="flex items-start justify-between gap-3 mb-3">
            <h3 className="font-semibold text-slate-900 line-clamp-1">{garage.businessName}</h3>
            {garage.averageRating > 0 && (
              <div className="flex items-center gap-1 shrink-0">
                <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
                <span className="font-medium text-slate-900">{garage.averageRating}</span>
                <span className="text-slate-400 text-sm">({garage.totalReviews})</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-sm text-slate-500 mb-3">
            <MapPin className="h-4 w-4" />
            <span>
              {garage.suburb}, {garage.state}
            </span>
            {garage.distanceKm && (
              <span className="text-emerald-600 font-medium">· {garage.distanceKm}km</span>
            )}
          </div>

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

          <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-sm">
            <div className="flex items-center gap-1 text-slate-500">
              <Clock className="h-4 w-4" />
              {garage.responseTime}
            </div>
            {garage.priceRange && (
              <span className="font-medium text-emerald-600">{garage.priceRange}</span>
            )}
          </div>
        </div>
      </motion.div>
    </Link>
  );
}

// Main export with Suspense boundary
export default function GaragesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    }>
      <GarageSearchContent />
    </Suspense>
  );
}
