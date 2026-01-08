// src/app/quotes/[id]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Car,
  Calendar,
  MapPin,
  Clock,
  CheckCircle,
  XCircle,
  MessageSquare,
  Loader2,
  AlertCircle,
  Building2,
  DollarSign,
  Shield,
  Star,
  Phone,
  ChevronDown,
  ChevronUp,
  Check,
  Wrench,
} from 'lucide-react';

type QuoteRequestStatus = 'open' | 'quoted' | 'accepted' | 'expired' | 'cancelled';
type QuoteStatus = 'pending' | 'accepted' | 'declined' | 'expired';

interface Quote {
  _id: string;
  garageId: string;
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
  vehicleRegistration: string;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleYear?: number;
  vehicleVin?: string;
  serviceCategory: string;
  serviceDescription: string;
  selectedServices: string[];
  urgency: 'immediate' | 'this_week' | 'flexible';
  locationAddress: string;
  additionalNotes?: string;
  status: QuoteRequestStatus;
  quotesReceived: number;
  expiresAt: string;
  createdAt: string;
}

const STATUS_CONFIG: Record<
  QuoteRequestStatus,
  { label: string; icon: React.ElementType; color: string; bgColor: string }
> = {
  open: {
    label: 'Open',
    icon: Clock,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
  },
  quoted: {
    label: 'Quotes Received',
    icon: MessageSquare,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-100',
  },
  accepted: {
    label: 'Accepted',
    icon: CheckCircle,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
  },
  expired: {
    label: 'Expired',
    icon: XCircle,
    color: 'text-slate-500',
    bgColor: 'bg-slate-100',
  },
  cancelled: {
    label: 'Cancelled',
    icon: XCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-100',
  },
};

const URGENCY_LABELS: Record<string, string> = {
  immediate: 'Urgent - ASAP',
  this_week: 'Within a week',
  flexible: 'Flexible timing',
};

const CATEGORY_LABELS: Record<string, string> = {
  mechanical: 'Mechanical',
  electrical: 'Electrical',
  bodywork: 'Bodywork',
  tyres: 'Tyres & Wheels',
  servicing: 'Servicing',
  other: 'Other',
};

export default function QuoteRequestDetailPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const params = useParams();
  const requestId = params.id as string;

  const [quoteRequest, setQuoteRequest] = useState<QuoteRequest | null>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedQuote, setExpandedQuote] = useState<string | null>(null);
  const [acceptingQuote, setAcceptingQuote] = useState<string | null>(null);
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [selectedQuoteForAccept, setSelectedQuoteForAccept] = useState<Quote | null>(null);

  useEffect(() => {
    if (sessionStatus === 'unauthenticated') {
      router.push(`/auth/signin?callbackUrl=/quotes/${requestId}`);
    }
  }, [sessionStatus, router, requestId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch quote request details
      const requestResponse = await fetch(`/api/quotes/request?id=${requestId}`);
      const requestData = await requestResponse.json();

      if (!requestResponse.ok) {
        throw new Error(requestData.error || 'Failed to fetch quote request');
      }

      setQuoteRequest(requestData.quoteRequest);

      // Fetch quotes for this request
      const quotesResponse = await fetch(`/api/quotes/request/${requestId}/quotes`);
      const quotesData = await quotesResponse.json();

      if (quotesResponse.ok) {
        setQuotes(quotesData.quotes);
      }

      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user && requestId) {
      fetchData();
    }
  }, [session, requestId]);

  const handleAcceptQuote = async () => {
    if (!selectedQuoteForAccept) return;

    setAcceptingQuote(selectedQuoteForAccept._id);
    try {
      const response = await fetch('/api/quotes/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quoteId: selectedQuoteForAccept._id,
          quoteRequestId: requestId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to accept quote');
      }

      // Refresh data
      await fetchData();
      setShowAcceptModal(false);
      setSelectedQuoteForAccept(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept quote');
    } finally {
      setAcceptingQuote(null);
    }
  };

  const openAcceptModal = (quote: Quote) => {
    setSelectedQuoteForAccept(quote);
    setShowAcceptModal(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
    }).format(amount);
  };

  if (sessionStatus === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600 mx-auto" />
          <p className="mt-2 text-slate-600">Loading quote request...</p>
        </div>
      </div>
    );
  }

  if (!session || !quoteRequest) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-slate-400 mx-auto" />
          <h2 className="mt-4 text-lg font-semibold text-slate-900">
            Quote request not found
          </h2>
          <p className="mt-1 text-slate-600">
            This request may have been deleted or you don&apos;t have access to it.
          </p>
          <Link
            href="/quotes"
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to My Quotes
          </Link>
        </div>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[quoteRequest.status];
  const StatusIcon = statusConfig.icon;
  const acceptedQuote = quotes.find((q) => q.status === 'accepted');
  const pendingQuotes = quotes.filter((q) => q.status === 'pending');

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
          <Link
            href="/quotes"
            className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to My Quotes
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-slate-900">
                  {quoteRequest.vehicleRegistration}
                </h1>
                <span
                  className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${statusConfig.bgColor} ${statusConfig.color}`}
                >
                  <StatusIcon className="h-4 w-4" />
                  {statusConfig.label}
                </span>
              </div>
              {quoteRequest.vehicleMake && (
                <p className="mt-1 text-slate-600">
                  {quoteRequest.vehicleYear} {quoteRequest.vehicleMake}{' '}
                  {quoteRequest.vehicleModel}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-red-800">Error</p>
              <p className="text-sm text-red-600">{error}</p>
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left column: Request details */}
          <div className="lg:col-span-1 space-y-6">
            {/* Vehicle info card */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2 mb-4">
                <Car className="h-5 w-5 text-slate-600" />
                Vehicle Details
              </h3>
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="text-slate-500">Registration</dt>
                  <dd className="font-medium text-slate-900">
                    {quoteRequest.vehicleRegistration}
                  </dd>
                </div>
                {quoteRequest.vehicleMake && (
                  <div>
                    <dt className="text-slate-500">Vehicle</dt>
                    <dd className="font-medium text-slate-900">
                      {quoteRequest.vehicleYear} {quoteRequest.vehicleMake}{' '}
                      {quoteRequest.vehicleModel}
                    </dd>
                  </div>
                )}
                {quoteRequest.vehicleVin && (
                  <div>
                    <dt className="text-slate-500">VIN</dt>
                    <dd className="font-mono text-slate-900 text-xs">
                      {quoteRequest.vehicleVin}
                    </dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Service info card */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2 mb-4">
                <Wrench className="h-5 w-5 text-slate-600" />
                Service Request
              </h3>
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="text-slate-500">Category</dt>
                  <dd className="font-medium text-slate-900">
                    {CATEGORY_LABELS[quoteRequest.serviceCategory] ||
                      quoteRequest.serviceCategory}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Description</dt>
                  <dd className="text-slate-900">{quoteRequest.serviceDescription}</dd>
                </div>
                {quoteRequest.selectedServices &&
                  quoteRequest.selectedServices.length > 0 && (
                    <div>
                      <dt className="text-slate-500 mb-1">Selected Services</dt>
                      <dd className="flex flex-wrap gap-1">
                        {quoteRequest.selectedServices.map((service, idx) => (
                          <span
                            key={idx}
                            className="inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-xs"
                          >
                            {service}
                          </span>
                        ))}
                      </dd>
                    </div>
                  )}
                {quoteRequest.additionalNotes && (
                  <div>
                    <dt className="text-slate-500">Notes</dt>
                    <dd className="text-slate-900">{quoteRequest.additionalNotes}</dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Meta info card */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <dl className="space-y-3 text-sm">
                <div className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 text-slate-400" />
                  <div>
                    <dt className="text-slate-500">Location</dt>
                    <dd className="font-medium text-slate-900">
                      {quoteRequest.locationAddress}
                    </dd>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-slate-400" />
                  <div>
                    <dt className="text-slate-500">Urgency</dt>
                    <dd className="font-medium text-slate-900">
                      {URGENCY_LABELS[quoteRequest.urgency]}
                    </dd>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-slate-400" />
                  <div>
                    <dt className="text-slate-500">Requested</dt>
                    <dd className="font-medium text-slate-900">
                      {formatDate(quoteRequest.createdAt)}
                    </dd>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-slate-400" />
                  <div>
                    <dt className="text-slate-500">Expires</dt>
                    <dd className="font-medium text-slate-900">
                      {formatDate(quoteRequest.expiresAt)}
                    </dd>
                  </div>
                </div>
              </dl>
            </div>
          </div>

          {/* Right column: Quotes */}
          <div className="lg:col-span-2">
            <h2 className="text-xl font-bold text-slate-900 mb-4">
              {acceptedQuote
                ? 'Accepted Quote'
                : `Quotes Received (${quotes.length})`}
            </h2>

            {quotes.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
                <MessageSquare className="h-12 w-12 text-slate-300 mx-auto" />
                <h3 className="mt-4 font-semibold text-slate-900">
                  No quotes yet
                </h3>
                <p className="mt-1 text-slate-600">
                  Garages are reviewing your request. You&apos;ll be notified when quotes
                  arrive.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Show accepted quote first if exists */}
                {acceptedQuote && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-green-50 rounded-xl border-2 border-green-200 p-5"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center">
                          <CheckCircle className="h-6 w-6 text-green-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-900">
                            {acceptedQuote.garageName}
                          </h3>
                          <p className="text-sm text-slate-600">
                            {acceptedQuote.garageAddress}
                          </p>
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
                        <p className="text-sm text-slate-600">
                          {acceptedQuote.estimatedDuration}
                        </p>
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
                  </motion.div>
                )}

                {/* Show pending quotes */}
                {pendingQuotes.map((quote, index) => {
                  const isExpanded = expandedQuote === quote._id;

                  return (
                    <motion.div
                      key={quote._id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="bg-white rounded-xl border border-slate-200 overflow-hidden"
                    >
                      <div className="p-5">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                          <div className="flex items-start gap-3">
                            <div className="h-12 w-12 rounded-lg bg-slate-100 flex items-center justify-center">
                              <Building2 className="h-6 w-6 text-slate-600" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-slate-900">
                                {quote.garageName}
                              </h3>
                              <p className="text-sm text-slate-600">
                                {quote.garageAddress}
                              </p>
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
                            <p className="text-sm text-slate-600">
                              Est. {quote.estimatedDuration}
                            </p>
                          </div>
                        </div>

                        {/* Expand/collapse for more details */}
                        <button
                          onClick={() =>
                            setExpandedQuote(isExpanded ? null : quote._id)
                          }
                          className="mt-4 flex items-center gap-1 text-sm text-emerald-600 hover:text-emerald-700"
                        >
                          {isExpanded ? 'Show less' : 'Show details'}
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </button>

                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
                                <div>
                                  <p className="text-sm font-medium text-slate-700 mb-1">
                                    Included Services:
                                  </p>
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
                                    <p className="text-sm font-medium text-slate-700">
                                      Additional Notes:
                                    </p>
                                    <p className="text-sm text-slate-600">
                                      {quote.additionalNotes}
                                    </p>
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

                      {/* Accept button */}
                      {quoteRequest.status !== 'accepted' &&
                        quoteRequest.status !== 'expired' && (
                          <div className="px-5 py-3 bg-slate-50 border-t border-slate-100">
                            <button
                              onClick={() => openAcceptModal(quote)}
                              disabled={acceptingQuote === quote._id}
                              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition disabled:opacity-50"
                            >
                              {acceptingQuote === quote._id ? (
                                <>
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  Accepting...
                                </>
                              ) : (
                                <>
                                  <CheckCircle className="h-4 w-4" />
                                  Accept Quote
                                </>
                              )}
                            </button>
                          </div>
                        )}
                    </motion.div>
                  );
                })}

                {/* Declined quotes */}
                {quotes.filter((q) => q.status === 'declined').length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-sm font-medium text-slate-500 mb-3">
                      Other Quotes
                    </h3>
                    {quotes
                      .filter((q) => q.status === 'declined')
                      .map((quote) => (
                        <div
                          key={quote._id}
                          className="bg-slate-50 rounded-lg border border-slate-200 p-4 opacity-60"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-slate-700">
                                {quote.garageName}
                              </p>
                              <p className="text-sm text-slate-500">
                                {formatCurrency(quote.quotedAmount)}
                              </p>
                            </div>
                            <span className="text-xs text-slate-500">
                              Not selected
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Accept confirmation modal */}
      <AnimatePresence>
        {showAcceptModal && selectedQuoteForAccept && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            onClick={() => setShowAcceptModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl max-w-md w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold text-slate-900">Accept this quote?</h3>
              <p className="mt-2 text-slate-600">
                You&apos;re about to accept the quote from{' '}
                <strong>{selectedQuoteForAccept.garageName}</strong> for{' '}
                <strong>{formatCurrency(selectedQuoteForAccept.quotedAmount)}</strong>.
              </p>
              <p className="mt-2 text-sm text-slate-500">
                Other quotes will be automatically declined.
              </p>

              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => setShowAcceptModal(false)}
                  className="flex-1 px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAcceptQuote}
                  disabled={!!acceptingQuote}
                  className="flex-1 px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition disabled:opacity-50 inline-flex items-center justify-center gap-2"
                >
                  {acceptingQuote ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Accepting...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      Accept Quote
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
