// src/app/quotes/track/page.tsx
"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Car,
  Clock,
  MapPin,
  CheckCircle2,
  Loader2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Mail,
  MessageSquare,
  Building2,
  Calendar,
  Shield,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Wrench,
  XCircle,
  FileText,
  Check,
  RefreshCw,
} from "lucide-react";

// Types
type QuoteRequestStatus = "open" | "quoted" | "accepted" | "expired" | "cancelled";
type QuoteStatus = "pending" | "accepted" | "declined" | "expired";

interface Quote {
  _id: string;
  garageName: string;
  garageAddress: string;
  quotedAmount: number;
  estimatedDuration: string;
  includedServices: string[];
  additionalNotes?: string;
  warrantyOffered?: string;
  availableFrom: string;
  validUntil: string;
  status: QuoteStatus;
  createdAt: string;
}

interface QuoteRequest {
  _id: string;
  trackingCode: string;
  vehicleRegistration: string;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleYear?: number;
  serviceCategory: string;
  serviceDescription: string;
  urgency: string;
  preferredDate?: string;
  locationAddress: string;
  status: QuoteRequestStatus;
  quotesReceived: number;
  acceptedQuoteId?: string;
  expiresAt: string;
  createdAt: string;
  isExpiredOrCancelled?: boolean;
}

const STATUS_CONFIG: Record<
  QuoteRequestStatus,
  { label: string; icon: React.ElementType; color: string; bgColor: string }
> = {
  open: {
    label: "Open - Awaiting Quotes",
    icon: Clock,
    color: "text-blue-600",
    bgColor: "bg-blue-100",
  },
  quoted: {
    label: "Quotes Received",
    icon: MessageSquare,
    color: "text-emerald-600",
    bgColor: "bg-emerald-100",
  },
  accepted: {
    label: "Quote Accepted",
    icon: CheckCircle2,
    color: "text-green-600",
    bgColor: "bg-green-100",
  },
  expired: {
    label: "Expired",
    icon: XCircle,
    color: "text-slate-500",
    bgColor: "bg-slate-100",
  },
  cancelled: {
    label: "Cancelled",
    icon: XCircle,
    color: "text-red-600",
    bgColor: "bg-red-100",
  },
};

const URGENCY_LABELS: Record<string, string> = {
  immediate: "Urgent - ASAP",
  this_week: "Within a week",
  flexible: "Flexible timing",
};

const CATEGORY_LABELS: Record<string, string> = {
  mechanical: "Mechanical",
  electrical: "Electrical",
  bodywork: "Bodywork",
  tyres: "Tyres & Wheels",
  servicing: "Servicing",
  other: "Other",
};

function QuoteTrackingContent() {
  const searchParams = useSearchParams();
  const [trackingCode, setTrackingCode] = useState(searchParams.get("code") || "");
  const [email, setEmail] = useState(searchParams.get("email") || "");
  const [quoteRequest, setQuoteRequest] = useState<QuoteRequest | null>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [expandedQuote, setExpandedQuote] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Field-specific validation errors
  const [fieldErrors, setFieldErrors] = useState<{
    trackingCode?: string;
    email?: string;
  }>({});

  // Load saved credentials on mount and auto-search
  useEffect(() => {
    const loadQuoteRequest = async () => {
      // Priority: URL params > localStorage
      const codeParam = searchParams.get("code");
      const emailParam = searchParams.get("email");

      // If both URL params are present, auto-search
      if (codeParam && codeParam.length === 8 && emailParam) {
        setTrackingCode(codeParam.toUpperCase());
        setEmail(emailParam);
        // Save to localStorage for persistence
        localStorage.setItem("drivlet_quote_track_code", codeParam.toUpperCase());
        localStorage.setItem("drivlet_quote_track_email", emailParam);
        await handleSearch(codeParam, emailParam);
      } else {
        // Try to load from localStorage
        const savedCode = localStorage.getItem("drivlet_quote_track_code");
        const savedEmail = localStorage.getItem("drivlet_quote_track_email");

        if (savedCode && savedCode.length === 8 && savedEmail) {
          setTrackingCode(savedCode);
          setEmail(savedEmail);
          await handleSearch(savedCode, savedEmail);
        } else {
          // Pre-fill any available params
          if (codeParam) setTrackingCode(codeParam.toUpperCase());
          if (emailParam) setEmail(emailParam);
        }
      }
      setInitialLoading(false);
    };

    loadQuoteRequest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Client-side validation
  const validateForm = (): boolean => {
    const errors: typeof fieldErrors = {};
    let isValid = true;

    // Validate tracking code (8 characters for quote requests)
    if (!trackingCode || trackingCode.length !== 8) {
      errors.trackingCode = "Please enter a valid 8-character tracking code";
      isValid = false;
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      errors.email = "Email address is required";
      isValid = false;
    } else if (!emailRegex.test(email)) {
      errors.email = "Please enter a valid email address";
      isValid = false;
    }

    setFieldErrors(errors);
    return isValid;
  };

  const handleSearch = async (code?: string, emailParam?: string, isRefresh = false) => {
    const codeToSearch = code || trackingCode;
    const emailToSearch = emailParam || email;

    // Clear previous errors
    setFieldErrors({});
    setError("");

    // If called without params (from form submit), validate
    if (!code && !validateForm()) {
      return;
    }

    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setHasSearched(true);

    try {
      const params = new URLSearchParams({
        code: codeToSearch.toUpperCase().trim(),
        email: emailToSearch.toLowerCase().trim(),
      });
      const response = await fetch(`/api/quotes/track?${params.toString()}`);
      const data = await response.json();

      if (response.ok) {
        setQuoteRequest(data.quoteRequest);
        setQuotes(data.quotes);
        // Save credentials for refresh persistence
        localStorage.setItem("drivlet_quote_track_code", codeToSearch.toUpperCase());
        localStorage.setItem("drivlet_quote_track_email", emailToSearch.toLowerCase().trim());
      } else {
        setError(data.error || "Quote request not found");
        setQuoteRequest(null);
        setQuotes([]);
      }
    } catch {
      setError("Failed to search. Please try again.");
      setQuoteRequest(null);
      setQuotes([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch();
  };

  const handleTrackAnother = () => {
    setQuoteRequest(null);
    setQuotes([]);
    setHasSearched(false);
    setTrackingCode("");
    setEmail("");
    setFieldErrors({});
    setExpandedQuote(null);
    // Clear saved credentials
    localStorage.removeItem("drivlet_quote_track_code");
    localStorage.removeItem("drivlet_quote_track_email");
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-AU", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
    }).format(amount);
  };

  const getDaysUntilExpiry = (expiresAt: string) => {
    const expiry = new Date(expiresAt);
    const now = new Date();
    const days = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return days;
  };

  // Show loading during initial auto-search
  if (initialLoading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-700 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-white mx-auto" />
          <p className="text-white/80 mt-3">Loading your quote request...</p>
        </div>
      </main>
    );
  }

  const acceptedQuote = quotes.find((q) => q.status === "accepted");
  const pendingQuotes = quotes.filter((q) => q.status === "pending");

  return (
    <main className="min-h-screen bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-700 relative">
      {/* Subtle pattern overlay */}
      <div className="absolute inset-0 z-0 opacity-10">
        <div
          className="h-full w-full"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="relative h-12 w-40 sm:h-14 sm:w-48">
              <Image
                src="/logo.png"
                alt="drivlet"
                fill
                className="object-contain brightness-0 invert"
                priority
              />
            </div>
          </Link>
          <div className="flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-sm px-4 py-2 border border-white/20">
            <FileText className="h-5 w-5 text-emerald-300" />
            <span className="text-sm font-medium text-white">Track Quotes</span>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="relative z-10 flex min-h-[calc(100vh-80px)] items-start justify-center px-4 py-8 pb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-2xl"
        >
          {/* Main Card */}
          <div className="rounded-3xl border border-white/20 bg-white/95 backdrop-blur-sm p-6 sm:p-8 shadow-2xl">
            {/* Title */}
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
                Track Your Quote Request
              </h1>
              <p className="text-slate-600 mt-2">
                Enter your details to view quotes from local garages
              </p>
            </div>

            <AnimatePresence mode="wait">
              {/* Search Form */}
              {!quoteRequest ? (
                <motion.div
                  key="search"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Error Display */}
                    {error && (
                      <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-200">
                        <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-red-800">{error}</p>
                        </div>
                      </div>
                    )}

                    {/* Tracking Code Input */}
                    <div>
                      <label htmlFor="trackingCode" className="block text-sm font-medium text-slate-700 mb-2">
                        Tracking Code
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          id="trackingCode"
                          value={trackingCode}
                          onChange={(e) => {
                            setTrackingCode(e.target.value.toUpperCase().slice(0, 8));
                            if (fieldErrors.trackingCode) {
                              setFieldErrors((prev) => ({ ...prev, trackingCode: undefined }));
                            }
                          }}
                          className={`w-full rounded-xl border px-4 py-3 text-center text-xl font-mono tracking-[0.3em] text-slate-900 placeholder:text-slate-300 placeholder:tracking-normal focus:ring-2 transition ${
                            fieldErrors.trackingCode
                              ? "border-red-300 focus:border-red-500 focus:ring-red-500/20"
                              : "border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20"
                          }`}
                          placeholder="ABCD1234"
                          autoComplete="off"
                          autoFocus
                          aria-invalid={!!fieldErrors.trackingCode}
                          aria-describedby={fieldErrors.trackingCode ? "trackingCode-error" : "trackingCode-help"}
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                          {trackingCode.length}/8
                        </div>
                      </div>
                      {fieldErrors.trackingCode ? (
                        <p id="trackingCode-error" className="mt-2 text-xs text-red-600 text-center">
                          {fieldErrors.trackingCode}
                        </p>
                      ) : (
                        <p id="trackingCode-help" className="mt-2 text-xs text-slate-500 text-center">
                          Your tracking code was shown after submitting your quote request
                          {/* TODO: Update this text when email is configured to mention checking their email */}
                        </p>
                      )}
                    </div>

                    {/* Email Input */}
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
                        Email Address
                      </label>
                      <div className="relative">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2">
                          <Mail className="h-5 w-5 text-slate-400" />
                        </div>
                        <input
                          type="email"
                          id="email"
                          value={email}
                          onChange={(e) => {
                            setEmail(e.target.value);
                            if (fieldErrors.email) {
                              setFieldErrors((prev) => ({ ...prev, email: undefined }));
                            }
                          }}
                          className={`w-full rounded-xl border pl-10 pr-4 py-3 text-slate-900 placeholder:text-slate-400 focus:ring-2 transition ${
                            fieldErrors.email
                              ? "border-red-300 focus:border-red-500 focus:ring-red-500/20"
                              : "border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20"
                          }`}
                          placeholder="Enter your email address"
                          autoComplete="email"
                          aria-invalid={!!fieldErrors.email}
                          aria-describedby={fieldErrors.email ? "email-error" : "email-help"}
                        />
                      </div>
                      {fieldErrors.email ? (
                        <p id="email-error" className="mt-2 text-xs text-red-600">
                          {fieldErrors.email}
                        </p>
                      ) : (
                        <p id="email-help" className="mt-2 text-xs text-slate-500">
                          The email address used when requesting quotes
                        </p>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="group w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/25 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          Searching...
                        </>
                      ) : (
                        <>
                          <Search className="h-5 w-5" />
                          View My Quotes
                          <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
                        </>
                      )}
                    </button>

                    {/* Help Links */}
                    <div className="pt-4 border-t border-slate-100 space-y-2">
                      <p className="text-xs text-slate-500 text-center">
                        Don&apos;t have a tracking code?{" "}
                        <Link href="/quotes/request" className="text-emerald-600 hover:underline">
                          Request a quote
                        </Link>
                      </p>
                      <p className="text-xs text-slate-500 text-center">
                        Have an account?{" "}
                        <Link href="/quotes" className="text-emerald-600 hover:underline">
                          Sign in to view all quotes
                        </Link>
                      </p>
                    </div>
                  </form>
                </motion.div>
              ) : (
                /* Results View */
                <motion.div
                  key="result"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  {/* Header with status and refresh */}
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-lg font-bold text-slate-900">
                          {quoteRequest.vehicleRegistration}
                        </h2>
                        {(() => {
                          const statusConfig = STATUS_CONFIG[quoteRequest.status];
                          const StatusIcon = statusConfig.icon;
                          return (
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig.bgColor} ${statusConfig.color}`}
                            >
                              <StatusIcon className="h-3 w-3" />
                              {statusConfig.label}
                            </span>
                          );
                        })()}
                      </div>
                      {quoteRequest.vehicleMake && (
                        <p className="text-sm text-slate-600 mt-1">
                          {quoteRequest.vehicleYear} {quoteRequest.vehicleMake} {quoteRequest.vehicleModel}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleSearch(trackingCode, email, true)}
                      disabled={refreshing}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition disabled:opacity-50"
                    >
                      <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                      Refresh
                    </button>
                  </div>

                  {/* Request Details Summary */}
                  <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Wrench className="h-4 w-4 text-slate-400" />
                      <span>
                        {CATEGORY_LABELS[quoteRequest.serviceCategory] || quoteRequest.serviceCategory}
                      </span>
                    </div>
                    <p className="text-sm text-slate-700">{quoteRequest.serviceDescription}</p>
                    <div className="flex flex-wrap gap-4 text-sm text-slate-500 pt-2 border-t border-slate-200">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {quoteRequest.locationAddress}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {URGENCY_LABELS[quoteRequest.urgency]}
                      </span>
                    </div>
                    {quoteRequest.status === "open" && (
                      <div className="flex items-center gap-2 text-xs text-amber-600 pt-2">
                        <Clock className="h-3.5 w-3.5" />
                        <span>
                          {getDaysUntilExpiry(quoteRequest.expiresAt) > 0
                            ? `Expires in ${getDaysUntilExpiry(quoteRequest.expiresAt)} days`
                            : "Expiring today"}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Quotes Section */}
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">
                      {acceptedQuote
                        ? "Accepted Quote"
                        : quotes.length > 0
                        ? `Quotes Received (${quotes.length})`
                        : "Quotes"}
                    </h3>

                    {quotes.length === 0 ? (
                      <div className="bg-slate-50 rounded-xl p-8 text-center">
                        <MessageSquare className="h-12 w-12 text-slate-300 mx-auto" />
                        <h4 className="mt-4 font-semibold text-slate-900">No quotes yet</h4>
                        <p className="mt-1 text-sm text-slate-600">
                          Local garages are reviewing your request. Check back soon!
                        </p>
                        {/* TODO: Add note about email notifications when configured */}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* Accepted Quote */}
                        {acceptedQuote && (
                          <div className="bg-green-50 rounded-xl border-2 border-green-200 p-5">
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-3">
                                <div className="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center">
                                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                                </div>
                                <div>
                                  <h4 className="font-semibold text-slate-900">{acceptedQuote.garageName}</h4>
                                  <p className="text-sm text-slate-600">{acceptedQuote.garageAddress}</p>
                                  <span className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                    <Check className="h-3 w-3" />
                                    Accepted
                                  </span>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-2xl font-bold text-green-600">
                                  {formatCurrency(acceptedQuote.quotedAmount)}
                                </p>
                                <p className="text-sm text-slate-600">{acceptedQuote.estimatedDuration}</p>
                              </div>
                            </div>
                            <div className="mt-4 pt-4 border-t border-green-200">
                              <p className="text-sm text-slate-600 mb-2">
                                <strong>Included services:</strong>
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {acceptedQuote.includedServices.map((service, idx) => (
                                  <span
                                    key={idx}
                                    className="inline-block px-2 py-0.5 rounded bg-green-100 text-green-800 text-xs"
                                  >
                                    {service}
                                  </span>
                                ))}
                              </div>
                              {acceptedQuote.warrantyOffered && (
                                <p className="mt-3 text-sm text-slate-600">
                                  <Shield className="h-4 w-4 inline mr-1 text-green-600" />
                                  <strong>Warranty:</strong> {acceptedQuote.warrantyOffered}
                                </p>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Pending Quotes */}
                        {pendingQuotes.map((quote) => {
                          const isExpanded = expandedQuote === quote._id;

                          return (
                            <div
                              key={quote._id}
                              className="bg-white rounded-xl border border-slate-200 overflow-hidden"
                            >
                              <div className="p-5">
                                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                                  <div className="flex items-start gap-3">
                                    <div className="h-12 w-12 rounded-lg bg-slate-100 flex items-center justify-center">
                                      <Building2 className="h-6 w-6 text-slate-600" />
                                    </div>
                                    <div>
                                      <h4 className="font-semibold text-slate-900">{quote.garageName}</h4>
                                      <p className="text-sm text-slate-600">{quote.garageAddress}</p>
                                      <div className="flex items-center gap-3 mt-2 text-sm text-slate-500">
                                        <span className="flex items-center gap-1">
                                          <Calendar className="h-4 w-4" />
                                          Available from {formatDate(quote.availableFrom)}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-2xl font-bold text-emerald-600">
                                      {formatCurrency(quote.quotedAmount)}
                                    </p>
                                    <p className="text-sm text-slate-600">Est. {quote.estimatedDuration}</p>
                                  </div>
                                </div>

                                {/* Expand/collapse for more details */}
                                <button
                                  onClick={() => setExpandedQuote(isExpanded ? null : quote._id)}
                                  className="mt-4 flex items-center gap-1 text-sm text-emerald-600 hover:text-emerald-700"
                                >
                                  {isExpanded ? "Show less" : "Show details"}
                                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                </button>

                                <AnimatePresence>
                                  {isExpanded && (
                                    <motion.div
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: "auto", opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      transition={{ duration: 0.2 }}
                                      className="overflow-hidden"
                                    >
                                      <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
                                        <div>
                                          <p className="text-sm font-medium text-slate-700 mb-1">Included Services:</p>
                                          <div className="flex flex-wrap gap-1">
                                            {quote.includedServices.map((service, idx) => (
                                              <span
                                                key={idx}
                                                className="inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-xs"
                                              >
                                                {service}
                                              </span>
                                            ))}
                                          </div>
                                        </div>

                                        {quote.warrantyOffered && (
                                          <p className="text-sm text-slate-600">
                                            <Shield className="h-4 w-4 inline mr-1 text-emerald-600" />
                                            <strong>Warranty:</strong> {quote.warrantyOffered}
                                          </p>
                                        )}

                                        {quote.additionalNotes && (
                                          <div>
                                            <p className="text-sm font-medium text-slate-700">Additional Notes:</p>
                                            <p className="text-sm text-slate-600">{quote.additionalNotes}</p>
                                          </div>
                                        )}

                                        <p className="text-xs text-slate-500">
                                          Quote valid until {formatDate(quote.validUntil)}
                                        </p>
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>

                              {/* Accept button - only show for non-accepted requests */}
                              {quoteRequest.status !== "accepted" &&
                                quoteRequest.status !== "expired" &&
                                quoteRequest.status !== "cancelled" && (
                                  <div className="px-5 py-3 bg-slate-50 border-t border-slate-100">
                                    <p className="text-sm text-slate-600 text-center">
                                      <Link
                                        href="/login"
                                        className="text-emerald-600 hover:underline font-medium"
                                      >
                                        Sign in
                                      </Link>{" "}
                                      or{" "}
                                      <Link
                                        href="/register"
                                        className="text-emerald-600 hover:underline font-medium"
                                      >
                                        create an account
                                      </Link>{" "}
                                      to accept this quote
                                    </p>
                                  </div>
                                )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Track Another Button */}
                  <button
                    onClick={handleTrackAnother}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 hover:border-emerald-300 transition"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Track Another Quote Request
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* No Results */}
            {hasSearched && !quoteRequest && !loading && !error && (
              <div className="text-center py-8">
                <FileText className="mx-auto h-12 w-12 text-slate-300" />
                <h3 className="mt-4 font-semibold text-slate-900">No quote request found</h3>
                <p className="mt-1 text-sm text-slate-500">Please check your details and try again</p>
              </div>
            )}
          </div>

          {/* Back to home link */}
          <div className="mt-6 text-center">
            <Link href="/" className="inline-flex items-center gap-2 text-sm text-white/80 hover:text-white transition">
              <ArrowRight className="h-4 w-4 rotate-180" />
              Back to home
            </Link>
          </div>
        </motion.div>
      </div>
    </main>
  );
}

export default function QuoteTrackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-700">
          <Loader2 className="h-8 w-8 animate-spin text-white" />
        </div>
      }
    >
      <QuoteTrackingContent />
    </Suspense>
  );
}
