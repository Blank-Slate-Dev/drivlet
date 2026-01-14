// src/app/garage/quotes/view/[id]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Car,
  MapPin,
  Clock,
  Tag,
  Shield,
  Calendar,
  DollarSign,
  CheckCircle,
  AlertCircle,
  Loader2,
  Zap,
  FileText,
  Timer,
  Info,
  Eye,
  XCircle,
} from 'lucide-react';
import {
  isQuoteExpired,
  isExpiringSoon,
  type QuoteWithExpiry,
} from '@/lib/quoteExpiry';
import { QuoteTimer } from '@/components/quotes/QuoteTimer';

type ServiceCategory = 'mechanical' | 'electrical' | 'bodywork' | 'tyres' | 'servicing' | 'other';

interface QuoteRequest {
  _id: string;
  vehicleRegistration: string;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleYear?: number;
  serviceCategory: ServiceCategory;
  serviceDescription: string;
  selectedServices: string[];
  urgency: 'immediate' | 'this_week' | 'flexible';
  locationAddress: string;
  status: string;
  createdAt: string;
  expiresAt: string;
}

interface Quote {
  _id: string;
  quotedAmount: number;
  estimatedDuration: string;
  includedServices: string[];
  additionalNotes?: string;
  warrantyOffered?: string;
  availableFrom: string;
  validUntil: string;
  status: 'pending' | 'viewed' | 'expired' | 'cancelled';
  firstViewedAt?: string;
  expiresAt?: string;
  createdAt: string;
}

const CATEGORY_CONFIG: Record<ServiceCategory, { label: string; color: string; bgColor: string }> = {
  mechanical: { label: 'Mechanical', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  electrical: { label: 'Electrical', color: 'text-amber-700', bgColor: 'bg-amber-100' },
  bodywork: { label: 'Bodywork', color: 'text-pink-700', bgColor: 'bg-pink-100' },
  tyres: { label: 'Tyres & Wheels', color: 'text-slate-700', bgColor: 'bg-slate-100' },
  servicing: { label: 'Servicing', color: 'text-emerald-700', bgColor: 'bg-emerald-100' },
  other: { label: 'Other', color: 'text-purple-700', bgColor: 'bg-purple-100' },
};

const URGENCY_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  immediate: { label: 'Urgent', color: 'text-red-600', bgColor: 'bg-red-100' },
  this_week: { label: 'Within a week', color: 'text-amber-600', bgColor: 'bg-amber-100' },
  flexible: { label: 'Flexible', color: 'text-slate-600', bgColor: 'bg-slate-100' },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  pending: { label: 'Awaiting View', color: 'text-amber-700', bgColor: 'bg-amber-100' },
  viewed: { label: 'Viewed by Customer', color: 'text-emerald-700', bgColor: 'bg-emerald-100' },
  expired: { label: 'Expired', color: 'text-slate-700', bgColor: 'bg-slate-100' },
  cancelled: { label: 'Cancelled', color: 'text-red-700', bgColor: 'bg-red-100' },
};

export default function ViewQuotePage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const params = useParams();
  const quoteRequestId = params.id as string;

  const [quoteRequest, setQuoteRequest] = useState<QuoteRequest | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (sessionStatus === 'unauthenticated') {
      router.push('/auth/signin?callbackUrl=/garage/quotes');
    } else if (session?.user?.role !== 'garage') {
      router.push('/');
    }
  }, [sessionStatus, session, router]);

  useEffect(() => {
    const fetchQuoteData = async () => {
      if (!quoteRequestId) return;

      try {
        setLoading(true);
        const response = await fetch(`/api/garage/quotes/view?quoteRequestId=${quoteRequestId}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch quote');
        }

        setQuoteRequest(data.quoteRequest);
        setQuote(data.quote);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    if (session?.user?.role === 'garage') {
      fetchQuoteData();
    }
  }, [session, quoteRequestId]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatShortDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
    }).format(cents / 100);
  };

  if (sessionStatus === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600 mx-auto" />
          <p className="mt-2 text-slate-600">Loading quote details...</p>
        </div>
      </div>
    );
  }

  if (!session || session.user?.role !== 'garage') {
    return null;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-3xl mx-auto px-4 py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">Quote Not Found</h2>
            <p className="text-slate-600 mb-6">{error}</p>
            <Link
              href="/garage/quotes"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Quote Requests
            </Link>
          </motion.div>
        </div>
      </div>
    );
  }

  if (!quoteRequest || !quote) {
    return null;
  }

  const categoryConfig = CATEGORY_CONFIG[quoteRequest.serviceCategory];
  const urgencyConfig = URGENCY_CONFIG[quoteRequest.urgency];
  const statusConfig = STATUS_CONFIG[quote.status];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link
                href="/garage/quotes"
                className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 transition"
              >
                <ArrowLeft className="h-5 w-5" />
                <span className="hidden sm:inline">Back to Quote Requests</span>
              </Link>
            </div>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-emerald-100 text-emerald-700">
                <CheckCircle className="h-4 w-4" />
                Submitted
              </span>
              <span
                className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${statusConfig?.bgColor} ${statusConfig?.color}`}
              >
                {statusConfig?.label}
              </span>
            </div>
          </div>
          <h1 className="mt-4 text-2xl sm:text-3xl font-bold text-slate-900">
            Your Submitted Quote
          </h1>
          <p className="mt-1 text-slate-600">
            Quote for {quoteRequest.vehicleRegistration}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid gap-6 lg:grid-cols-5">
          {/* Left Column: Quote Request Details */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-2"
          >
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-slate-200">
                <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-slate-500" />
                  Quote Request Details
                </h2>
              </div>
              <div className="p-6 space-y-5">
                {/* Vehicle Info */}
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center">
                      <Car className="h-5 w-5 text-slate-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">
                        {quoteRequest.vehicleRegistration}
                      </p>
                      {quoteRequest.vehicleMake && (
                        <p className="text-sm text-slate-600">
                          {quoteRequest.vehicleYear} {quoteRequest.vehicleMake}{' '}
                          {quoteRequest.vehicleModel}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Category & Urgency */}
                <div className="flex flex-wrap gap-2">
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${categoryConfig?.bgColor} ${categoryConfig?.color}`}
                  >
                    {categoryConfig?.label}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${urgencyConfig?.bgColor} ${urgencyConfig?.color}`}
                  >
                    {quoteRequest.urgency === 'immediate' && <Zap className="h-3 w-3" />}
                    {urgencyConfig?.label}
                  </span>
                </div>

                {/* Location */}
                <div className="flex items-start gap-2 text-slate-600">
                  <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">{quoteRequest.locationAddress}</span>
                </div>

                {/* Description */}
                <div>
                  <h4 className="text-sm font-medium text-slate-700 mb-1">Service Description</h4>
                  <p className="text-sm text-slate-600">{quoteRequest.serviceDescription}</p>
                </div>

                {/* Requested Services */}
                {quoteRequest.selectedServices && quoteRequest.selectedServices.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-slate-700 mb-2">Requested Services</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {quoteRequest.selectedServices.map((service, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-100 text-slate-600 text-xs"
                        >
                          <Tag className="h-3 w-3" />
                          {service}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Dates */}
                <div className="pt-4 border-t border-slate-100 space-y-2 text-sm">
                  <div className="flex items-center justify-between text-slate-600">
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-4 w-4" />
                      Posted
                    </span>
                    <span>{formatShortDate(quoteRequest.createdAt)}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-4 w-4" />
                      Expires
                    </span>
                    <span>{formatShortDate(quoteRequest.expiresAt)}</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right Column: Submitted Quote Details */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-3 space-y-6"
          >
            {/* Quote Amount Card */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm text-emerald-600 font-medium">Your Quoted Price</p>
                  <p className="text-3xl font-bold text-emerald-700">
                    {formatCurrency(quote.quotedAmount)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-emerald-200">
                <div>
                  <p className="text-xs text-emerald-600 mb-0.5">Estimated Duration</p>
                  <p className="font-semibold text-emerald-800 flex items-center gap-1.5">
                    <Timer className="h-4 w-4" />
                    {quote.estimatedDuration}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-emerald-600 mb-0.5">Available From</p>
                  <p className="font-semibold text-emerald-800 flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" />
                    {formatShortDate(quote.availableFrom)}
                  </p>
                </div>
              </div>
            </div>

            {/* Quote Details Card */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-slate-200">
                <h2 className="font-semibold text-slate-900">Quote Details</h2>
              </div>
              <div className="p-6 space-y-5">
                {/* Included Services */}
                <div>
                  <h4 className="text-sm font-medium text-slate-700 mb-2">Included Services</h4>
                  <div className="flex flex-wrap gap-2">
                    {quote.includedServices.map((service, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-700 text-sm font-medium"
                      >
                        <CheckCircle className="h-3.5 w-3.5" />
                        {service}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Warranty */}
                {quote.warrantyOffered && (
                  <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                    <div className="flex items-start gap-3">
                      <Shield className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-medium text-blue-800">Warranty Offered</h4>
                        <p className="text-sm text-blue-700 mt-0.5">{quote.warrantyOffered}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Additional Notes */}
                {quote.additionalNotes && (
                  <div>
                    <h4 className="text-sm font-medium text-slate-700 mb-1">Additional Notes</h4>
                    <p className="text-sm text-slate-600 bg-slate-50 rounded-lg p-3">
                      {quote.additionalNotes}
                    </p>
                  </div>
                )}

                {/* Quote Dates */}
                <div className="pt-4 border-t border-slate-100 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-slate-500 mb-0.5">Submitted On</p>
                    <p className="font-medium text-slate-900">
                      {formatDate(quote.createdAt)}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500 mb-0.5">Valid Until</p>
                    <p className="font-medium text-slate-900">
                      {formatDate(quote.validUntil)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Customer View Status */}
            {quote.firstViewedAt && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className={`rounded-xl p-5 ${
                  isQuoteExpired(quote as QuoteWithExpiry)
                    ? 'bg-red-50 border border-red-200'
                    : isExpiringSoon(quote as QuoteWithExpiry)
                    ? 'bg-amber-50 border border-amber-200'
                    : 'bg-emerald-50 border border-emerald-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  {isQuoteExpired(quote as QuoteWithExpiry) ? (
                    <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <Eye className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <h4 className={`text-sm font-semibold ${
                      isQuoteExpired(quote as QuoteWithExpiry) ? 'text-red-800' : 'text-emerald-800'
                    }`}>
                      {isQuoteExpired(quote as QuoteWithExpiry)
                        ? 'Quote Expired'
                        : 'Customer Viewed Your Quote'}
                    </h4>
                    <p className={`text-sm mt-1 ${
                      isQuoteExpired(quote as QuoteWithExpiry) ? 'text-red-700' : 'text-emerald-700'
                    }`}>
                      Viewed on {formatDate(quote.firstViewedAt)}
                    </p>
                    {quote.expiresAt && !isQuoteExpired(quote as QuoteWithExpiry) && (
                      <div className={`mt-3 pt-3 border-t ${
                        isExpiringSoon(quote as QuoteWithExpiry)
                          ? 'border-amber-200'
                          : 'border-emerald-200'
                      }`}>
                        <QuoteTimer
                          expiresAt={quote.expiresAt}
                          firstViewedAt={quote.firstViewedAt}
                          status={quote.status}
                          compact={false}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Info Box */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-blue-50 border border-blue-200 rounded-xl p-5"
            >
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-blue-800">How quote expiry works</h4>
                  <ul className="mt-2 space-y-1.5 text-sm text-blue-700">
                    <li>• Your quote remains valid until the customer views it</li>
                    <li>• Once viewed, the customer has 48 hours to contact you</li>
                    <li>• If they&apos;re interested, they&apos;ll reach out directly</li>
                    <li>• You can continue submitting quotes to other requests</li>
                  </ul>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
