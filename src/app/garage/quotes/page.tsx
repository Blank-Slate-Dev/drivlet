// src/app/garage/quotes/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  Filter,
  Loader2,
  Car,
  Calendar,
  MapPin,
  RefreshCw,
  Search,
  Zap,
  Send,
  Tag,
} from 'lucide-react';

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
  quotesReceived: number;
  expiresAt: string;
  createdAt: string;
  hasSubmittedQuote?: boolean;
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

export default function GarageQuoteRequestsPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const [quoteRequests, setQuoteRequests] = useState<QuoteRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<ServiceCategory | 'all'>('all');
  const [urgencyFilter, setUrgencyFilter] = useState<string>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (sessionStatus === 'unauthenticated') {
      router.push('/auth/signin?callbackUrl=/garage/quotes');
    } else if (session?.user?.role !== 'garage') {
      router.push('/');
    }
  }, [sessionStatus, session, router]);

  const fetchQuoteRequests = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const params = new URLSearchParams();
      if (categoryFilter !== 'all') params.append('category', categoryFilter);
      if (urgencyFilter !== 'all') params.append('urgency', urgencyFilter);

      const response = await fetch(`/api/garage/quote-requests?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch quote requests');
      }

      setQuoteRequests(data.quoteRequests);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (session?.user?.role === 'garage') {
      fetchQuoteRequests();
    }
  }, [session, categoryFilter, urgencyFilter]);

  const filteredRequests = quoteRequests.filter((request) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      request.vehicleRegistration.toLowerCase().includes(search) ||
      request.serviceDescription.toLowerCase().includes(search) ||
      request.vehicleMake?.toLowerCase().includes(search) ||
      request.vehicleModel?.toLowerCase().includes(search) ||
      request.locationAddress.toLowerCase().includes(search)
    );
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
    });
  };

  const getTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays} days ago`;
  };

  const getDaysUntilExpiry = (expiresAt: string) => {
    const expiry = new Date(expiresAt);
    const now = new Date();
    return Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  };

  if (sessionStatus === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600 mx-auto" />
          <p className="mt-2 text-slate-600">Loading quote requests...</p>
        </div>
      </div>
    );
  }

  if (!session || session.user?.role !== 'garage') {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
                Available Quote Requests
              </h1>
              <p className="mt-1 text-slate-600">
                Browse and submit quotes for customer service requests
              </p>
            </div>
            <button
              onClick={() => fetchQuoteRequests(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {/* Search and filters */}
          <div className="mt-6 flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by registration, vehicle, location..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            {/* Category filter */}
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-slate-400" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value as ServiceCategory | 'all')}
                className="px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="all">All Categories</option>
                {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                  <option key={key} value={key}>
                    {config.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Urgency filter */}
            <select
              value={urgencyFilter}
              onChange={(e) => setUrgencyFilter(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="all">All Urgency</option>
              <option value="immediate">Urgent</option>
              <option value="this_week">Within a week</option>
              <option value="flexible">Flexible</option>
            </select>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-red-800">Error loading requests</p>
              <p className="text-sm text-red-600">{error}</p>
            </div>
          </div>
        )}

        {filteredRequests.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12"
          >
            <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-slate-100 mb-4">
              <FileText className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">
              No quote requests found
            </h3>
            <p className="mt-1 text-slate-600 max-w-md mx-auto">
              {searchTerm || categoryFilter !== 'all' || urgencyFilter !== 'all'
                ? 'Try adjusting your filters to see more requests.'
                : 'New quote requests will appear here as customers submit them.'}
            </p>
          </motion.div>
        ) : (
          <div className="grid gap-4">
            <AnimatePresence mode="popLayout">
              {filteredRequests.map((request, index) => {
                const categoryConfig = CATEGORY_CONFIG[request.serviceCategory];
                const urgencyConfig = URGENCY_CONFIG[request.urgency];
                const daysUntilExpiry = getDaysUntilExpiry(request.expiresAt);

                return (
                  <motion.div
                    key={request._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: index * 0.03 }}
                  >
                    <div
                      className={`bg-white rounded-xl border p-4 sm:p-6 hover:shadow-md transition group ${
                        request.hasSubmittedQuote
                          ? 'border-emerald-200 bg-emerald-50/50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                        {/* Left: Main info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 h-12 w-12 rounded-lg bg-slate-100 flex items-center justify-center">
                              <Car className="h-6 w-6 text-slate-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-semibold text-slate-900">
                                  {request.vehicleRegistration}
                                </h3>
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${categoryConfig?.bgColor} ${categoryConfig?.color}`}
                                >
                                  {categoryConfig?.label || request.serviceCategory}
                                </span>
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${urgencyConfig?.bgColor} ${urgencyConfig?.color}`}
                                >
                                  {request.urgency === 'immediate' && (
                                    <Zap className="h-3 w-3" />
                                  )}
                                  {urgencyConfig?.label}
                                </span>
                                {request.hasSubmittedQuote && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                                    <CheckCircle className="h-3 w-3" />
                                    Quote submitted
                                  </span>
                                )}
                              </div>
                              {request.vehicleMake && (
                                <p className="text-sm text-slate-600 mt-0.5">
                                  {request.vehicleYear} {request.vehicleMake}{' '}
                                  {request.vehicleModel}
                                </p>
                              )}
                              <p className="text-sm text-slate-700 mt-2 line-clamp-2">
                                {request.serviceDescription}
                              </p>

                              {/* Selected services tags */}
                              {request.selectedServices && request.selectedServices.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-1">
                                  {request.selectedServices.slice(0, 3).map((service, idx) => (
                                    <span
                                      key={idx}
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-xs"
                                    >
                                      <Tag className="h-3 w-3" />
                                      {service}
                                    </span>
                                  ))}
                                  {request.selectedServices.length > 3 && (
                                    <span className="text-xs text-slate-500">
                                      +{request.selectedServices.length - 3} more
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Meta info */}
                          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-slate-500">
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="h-4 w-4" />
                              {request.locationAddress}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              Posted {getTimeAgo(request.createdAt)}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {daysUntilExpiry > 0
                                ? `Expires in ${daysUntilExpiry} days`
                                : 'Expires today'}
                            </span>
                          </div>
                        </div>

                        {/* Right: Action section */}
                        <div className="flex items-center gap-4 lg:flex-col lg:items-end">
                          {/* Quotes count */}
                          <div className="text-center px-4 py-2 rounded-lg bg-slate-50">
                            <p className="text-xl font-bold text-slate-700">
                              {request.quotesReceived}
                            </p>
                            <p className="text-xs text-slate-500">
                              quote{request.quotesReceived !== 1 ? 's' : ''}
                            </p>
                          </div>

                          {/* Action button */}
                          {request.hasSubmittedQuote ? (
                            <Link
                              href={`/garage/quotes/submit/${request._id}`}
                              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-emerald-200 text-emerald-700 hover:bg-emerald-50 transition"
                            >
                              <CheckCircle className="h-4 w-4" />
                              View Quote
                            </Link>
                          ) : (
                            <Link
                              href={`/garage/quotes/submit/${request._id}`}
                              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition"
                            >
                              <Send className="h-4 w-4" />
                              Submit Quote
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
