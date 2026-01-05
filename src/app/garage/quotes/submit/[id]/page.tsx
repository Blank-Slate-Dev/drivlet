// src/app/garage/quotes/submit/[id]/page.tsx
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
  Loader2,
  AlertCircle,
  DollarSign,
  Wrench,
  FileText,
  Shield,
  Plus,
  X,
  Send,
  Tag,
  Zap,
} from 'lucide-react';

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
  urgency: 'flexible' | 'within_week' | 'urgent';
  preferredLocation: {
    suburb: string;
    postcode: string;
    state: string;
  };
  additionalNotes?: string;
  status: string;
  quotesReceived: number;
  expiresAt: string;
  createdAt: string;
}

interface ExistingQuote {
  _id: string;
  quotedAmount: number;
  estimatedDuration: string;
  includedServices: string[];
  additionalNotes?: string;
  warrantyOffered?: string;
  availableFrom: string;
  validUntil: string;
  status: string;
  createdAt: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  mechanical: 'Mechanical',
  electrical: 'Electrical',
  bodywork: 'Bodywork',
  tyres: 'Tyres & Wheels',
  servicing: 'Servicing',
  other: 'Other',
};

const URGENCY_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  flexible: { label: 'Flexible timing', color: 'text-slate-600', bgColor: 'bg-slate-100' },
  within_week: { label: 'Within a week', color: 'text-amber-600', bgColor: 'bg-amber-100' },
  urgent: { label: 'Urgent', color: 'text-red-600', bgColor: 'bg-red-100' },
};

export default function GarageSubmitQuotePage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const params = useParams();
  const requestId = params.id as string;

  const [quoteRequest, setQuoteRequest] = useState<QuoteRequest | null>(null);
  const [existingQuote, setExistingQuote] = useState<ExistingQuote | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form state
  const [quotedAmount, setQuotedAmount] = useState('');
  const [estimatedDuration, setEstimatedDuration] = useState('');
  const [includedServices, setIncludedServices] = useState<string[]>([]);
  const [newService, setNewService] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [warrantyOffered, setWarrantyOffered] = useState('');
  const [availableFrom, setAvailableFrom] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (sessionStatus === 'unauthenticated') {
      router.push(`/auth/signin?callbackUrl=/garage/quotes/submit/${requestId}`);
    } else if (session?.user?.role !== 'garage') {
      router.push('/');
    }
  }, [sessionStatus, session, router, requestId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/garage/quote-requests?id=${requestId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch quote request');
      }

      setQuoteRequest(data.quoteRequest);

      if (data.existingQuote) {
        setExistingQuote(data.existingQuote);
        // Pre-fill form with existing quote data
        setQuotedAmount(data.existingQuote.quotedAmount.toString());
        setEstimatedDuration(data.existingQuote.estimatedDuration);
        setIncludedServices(data.existingQuote.includedServices);
        setAdditionalNotes(data.existingQuote.additionalNotes || '');
        setWarrantyOffered(data.existingQuote.warrantyOffered || '');
        setAvailableFrom(
          new Date(data.existingQuote.availableFrom).toISOString().split('T')[0]
        );
      } else {
        // Pre-populate with selected services from request
        if (data.quoteRequest.selectedServices) {
          setIncludedServices([...data.quoteRequest.selectedServices]);
        }
        // Default available from to today
        setAvailableFrom(new Date().toISOString().split('T')[0]);
      }

      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user?.role === 'garage' && requestId) {
      fetchData();
    }
  }, [session, requestId]);

  const addService = () => {
    if (newService.trim() && !includedServices.includes(newService.trim())) {
      setIncludedServices([...includedServices, newService.trim()]);
      setNewService('');
      setFieldErrors((prev) => ({ ...prev, includedServices: '' }));
    }
  };

  const removeService = (service: string) => {
    setIncludedServices(includedServices.filter((s) => s !== service));
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!quotedAmount || parseFloat(quotedAmount) <= 0) {
      errors.quotedAmount = 'Please enter a valid quote amount';
    }
    if (!estimatedDuration || estimatedDuration.trim().length < 2) {
      errors.estimatedDuration = 'Please provide an estimated duration';
    }
    if (includedServices.length === 0) {
      errors.includedServices = 'Please add at least one included service';
    }
    if (!availableFrom) {
      errors.availableFrom = 'Please select an available from date';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/garage/quotes/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quoteRequestId: requestId,
          quotedAmount: parseFloat(quotedAmount),
          estimatedDuration: estimatedDuration.trim(),
          includedServices,
          additionalNotes: additionalNotes.trim() || undefined,
          warrantyOffered: warrantyOffered.trim() || undefined,
          availableFrom,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.errors) {
          setFieldErrors(data.errors);
          throw new Error('Please fix the errors below');
        }
        throw new Error(data.error || 'Failed to submit quote');
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit quote');
    } finally {
      setSubmitting(false);
    }
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

  if (!session || session.user?.role !== 'garage' || !quoteRequest) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-slate-400 mx-auto" />
          <h2 className="mt-4 text-lg font-semibold text-slate-900">
            Quote request not found
          </h2>
          <p className="mt-1 text-slate-600">
            This request may have been deleted or is no longer available.
          </p>
          <Link
            href="/garage/quotes"
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Quote Requests
          </Link>
        </div>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center"
        >
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-emerald-100 mb-4">
            <CheckCircle className="h-8 w-8 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Quote Submitted!</h2>
          <p className="mt-2 text-slate-600">
            Your quote has been sent to the customer. You&apos;ll be notified if they
            accept your quote.
          </p>
          <div className="mt-6 space-y-3">
            <Link
              href="/garage/quotes"
              className="block w-full px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition"
            >
              View More Requests
            </Link>
            <Link
              href="/garage/dashboard"
              className="block w-full px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 transition"
            >
              Back to Dashboard
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  const urgencyConfig = URGENCY_CONFIG[quoteRequest.urgency];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
          <Link
            href="/garage/quotes"
            className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Quote Requests
          </Link>

          <h1 className="text-2xl font-bold text-slate-900">
            {existingQuote ? 'View Your Quote' : 'Submit Quote'}
          </h1>
          <p className="mt-1 text-slate-600">
            {existingQuote
              ? 'You have already submitted a quote for this request'
              : 'Provide your quote details for this service request'}
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-red-800">Error</p>
              <p className="text-sm text-red-600">{error}</p>
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-5 gap-6">
          {/* Left: Request details */}
          <div className="lg:col-span-2 space-y-4">
            {/* Vehicle card */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2 mb-4">
                <Car className="h-5 w-5 text-slate-600" />
                Vehicle Details
              </h3>
              <dl className="space-y-2 text-sm">
                <div>
                  <dt className="text-slate-500">Registration</dt>
                  <dd className="font-semibold text-slate-900 text-lg">
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
              </dl>
            </div>

            {/* Service card */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2 mb-4">
                <Wrench className="h-5 w-5 text-slate-600" />
                Service Request
              </h3>
              <dl className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${urgencyConfig?.bgColor} ${urgencyConfig?.color}`}
                  >
                    {quoteRequest.urgency === 'urgent' && <Zap className="h-3 w-3 inline mr-1" />}
                    {urgencyConfig?.label}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                    {CATEGORY_LABELS[quoteRequest.serviceCategory]}
                  </span>
                </div>
                <div>
                  <dt className="text-slate-500">Description</dt>
                  <dd className="text-slate-900 mt-1">{quoteRequest.serviceDescription}</dd>
                </div>
                {quoteRequest.selectedServices && quoteRequest.selectedServices.length > 0 && (
                  <div>
                    <dt className="text-slate-500 mb-1">Requested Services</dt>
                    <dd className="flex flex-wrap gap-1">
                      {quoteRequest.selectedServices.map((service, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-xs"
                        >
                          <Tag className="h-3 w-3" />
                          {service}
                        </span>
                      ))}
                    </dd>
                  </div>
                )}
                {quoteRequest.additionalNotes && (
                  <div>
                    <dt className="text-slate-500">Additional Notes</dt>
                    <dd className="text-slate-900 mt-1">{quoteRequest.additionalNotes}</dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Location & timing */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <dl className="space-y-3 text-sm">
                <div className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 text-slate-400" />
                  <div>
                    <dt className="text-slate-500">Location</dt>
                    <dd className="font-medium text-slate-900">
                      {quoteRequest.preferredLocation.suburb},{' '}
                      {quoteRequest.preferredLocation.state}{' '}
                      {quoteRequest.preferredLocation.postcode}
                    </dd>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-slate-400" />
                  <div>
                    <dt className="text-slate-500">Request Expires</dt>
                    <dd className="font-medium text-slate-900">
                      {formatDate(quoteRequest.expiresAt)}
                    </dd>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <FileText className="h-4 w-4 text-slate-400" />
                  <div>
                    <dt className="text-slate-500">Quotes Received</dt>
                    <dd className="font-medium text-slate-900">
                      {quoteRequest.quotesReceived} quote
                      {quoteRequest.quotesReceived !== 1 ? 's' : ''}
                    </dd>
                  </div>
                </div>
              </dl>
            </div>
          </div>

          {/* Right: Quote form or existing quote */}
          <div className="lg:col-span-3">
            {existingQuote ? (
              // Show existing quote
              <div className="bg-white rounded-xl border border-emerald-200 p-6">
                <div className="flex items-center gap-2 mb-6">
                  <CheckCircle className="h-5 w-5 text-emerald-600" />
                  <h2 className="text-lg font-semibold text-slate-900">
                    Your Submitted Quote
                  </h2>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-lg bg-emerald-50">
                    <span className="text-slate-600">Quoted Amount</span>
                    <span className="text-2xl font-bold text-emerald-600">
                      {formatCurrency(existingQuote.quotedAmount)}
                    </span>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm text-slate-500">Estimated Duration</span>
                      <p className="font-medium text-slate-900">
                        {existingQuote.estimatedDuration}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm text-slate-500">Available From</span>
                      <p className="font-medium text-slate-900">
                        {formatDate(existingQuote.availableFrom)}
                      </p>
                    </div>
                  </div>

                  <div>
                    <span className="text-sm text-slate-500">Included Services</span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {existingQuote.includedServices.map((service, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 rounded bg-slate-100 text-slate-700 text-sm"
                        >
                          {service}
                        </span>
                      ))}
                    </div>
                  </div>

                  {existingQuote.warrantyOffered && (
                    <div>
                      <span className="text-sm text-slate-500 flex items-center gap-1">
                        <Shield className="h-4 w-4" />
                        Warranty Offered
                      </span>
                      <p className="font-medium text-slate-900">
                        {existingQuote.warrantyOffered}
                      </p>
                    </div>
                  )}

                  {existingQuote.additionalNotes && (
                    <div>
                      <span className="text-sm text-slate-500">Additional Notes</span>
                      <p className="text-slate-900">{existingQuote.additionalNotes}</p>
                    </div>
                  )}

                  <div className="pt-4 border-t border-slate-200">
                    <p className="text-sm text-slate-500">
                      Submitted on {formatDate(existingQuote.createdAt)} | Valid until{' '}
                      {formatDate(existingQuote.validUntil)}
                    </p>
                    <p className="text-sm text-slate-500 mt-1">
                      Status:{' '}
                      <span
                        className={`font-medium ${
                          existingQuote.status === 'accepted'
                            ? 'text-green-600'
                            : existingQuote.status === 'declined'
                            ? 'text-red-600'
                            : 'text-amber-600'
                        }`}
                      >
                        {existingQuote.status.charAt(0).toUpperCase() +
                          existingQuote.status.slice(1)}
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              // Quote form
              <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-6">
                  Your Quote Details
                </h2>

                <div className="space-y-5">
                  {/* Quoted amount */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Quoted Amount (AUD) *
                    </label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={quotedAmount}
                        onChange={(e) => {
                          setQuotedAmount(e.target.value);
                          setFieldErrors((prev) => ({ ...prev, quotedAmount: '' }));
                        }}
                        placeholder="0.00"
                        className={`w-full pl-10 pr-4 py-2.5 rounded-lg border ${
                          fieldErrors.quotedAmount
                            ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                            : 'border-slate-300 focus:ring-emerald-500 focus:border-emerald-500'
                        } focus:ring-2`}
                      />
                    </div>
                    {fieldErrors.quotedAmount && (
                      <p className="mt-1 text-sm text-red-600">{fieldErrors.quotedAmount}</p>
                    )}
                  </div>

                  {/* Estimated duration */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Estimated Duration *
                    </label>
                    <input
                      type="text"
                      value={estimatedDuration}
                      onChange={(e) => {
                        setEstimatedDuration(e.target.value);
                        setFieldErrors((prev) => ({ ...prev, estimatedDuration: '' }));
                      }}
                      placeholder="e.g., 2-3 hours, 1 day, etc."
                      className={`w-full px-4 py-2.5 rounded-lg border ${
                        fieldErrors.estimatedDuration
                          ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                          : 'border-slate-300 focus:ring-emerald-500 focus:border-emerald-500'
                      } focus:ring-2`}
                    />
                    {fieldErrors.estimatedDuration && (
                      <p className="mt-1 text-sm text-red-600">
                        {fieldErrors.estimatedDuration}
                      </p>
                    )}
                  </div>

                  {/* Available from */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Available From *
                    </label>
                    <input
                      type="date"
                      value={availableFrom}
                      onChange={(e) => {
                        setAvailableFrom(e.target.value);
                        setFieldErrors((prev) => ({ ...prev, availableFrom: '' }));
                      }}
                      min={new Date().toISOString().split('T')[0]}
                      className={`w-full px-4 py-2.5 rounded-lg border ${
                        fieldErrors.availableFrom
                          ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                          : 'border-slate-300 focus:ring-emerald-500 focus:border-emerald-500'
                      } focus:ring-2`}
                    />
                    {fieldErrors.availableFrom && (
                      <p className="mt-1 text-sm text-red-600">{fieldErrors.availableFrom}</p>
                    )}
                  </div>

                  {/* Included services */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Included Services *
                    </label>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={newService}
                        onChange={(e) => setNewService(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addService();
                          }
                        }}
                        placeholder="Add a service..."
                        className="flex-1 px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={addService}
                        className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
                      >
                        <Plus className="h-5 w-5" />
                      </button>
                    </div>
                    {includedServices.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {includedServices.map((service, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-sm"
                          >
                            {service}
                            <button
                              type="button"
                              onClick={() => removeService(service)}
                              className="hover:text-emerald-900"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                    {fieldErrors.includedServices && (
                      <p className="mt-1 text-sm text-red-600">
                        {fieldErrors.includedServices}
                      </p>
                    )}
                  </div>

                  {/* Warranty */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Warranty Offered (optional)
                    </label>
                    <input
                      type="text"
                      value={warrantyOffered}
                      onChange={(e) => setWarrantyOffered(e.target.value)}
                      placeholder="e.g., 12 months / 20,000km"
                      className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>

                  {/* Additional notes */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Additional Notes (optional)
                    </label>
                    <textarea
                      value={additionalNotes}
                      onChange={(e) => setAdditionalNotes(e.target.value)}
                      rows={3}
                      placeholder="Any additional information for the customer..."
                      className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
                    />
                  </div>

                  {/* Submit button */}
                  <div className="pt-4">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          Submitting Quote...
                        </>
                      ) : (
                        <>
                          <Send className="h-5 w-5" />
                          Submit Quote
                        </>
                      )}
                    </button>
                    <p className="text-xs text-slate-500 text-center mt-2">
                      Your quote will be valid for 14 days
                    </p>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
