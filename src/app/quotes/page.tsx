// src/app/quotes/page.tsx
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
  XCircle,
  MessageSquare,
  ChevronRight,
  Plus,
  Filter,
  Loader2,
  AlertCircle,
  Car,
  Calendar,
  MapPin,
  RefreshCw,
} from 'lucide-react';

type QuoteRequestStatus = 'open' | 'quoted' | 'accepted' | 'expired' | 'cancelled';

interface QuoteRequest {
  _id: string;
  vehicleRegistration: string;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleYear?: number;
  serviceCategory: string;
  serviceDescription: string;
  urgency: 'flexible' | 'within_week' | 'urgent';
  preferredLocation: {
    suburb: string;
    postcode: string;
    state: string;
  };
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
  flexible: 'Flexible timing',
  within_week: 'Within a week',
  urgent: 'Urgent',
};

const CATEGORY_LABELS: Record<string, string> = {
  mechanical: 'Mechanical',
  electrical: 'Electrical',
  bodywork: 'Bodywork',
  tyres: 'Tyres & Wheels',
  servicing: 'Servicing',
  other: 'Other',
};

export default function QuotesDashboardPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const [quoteRequests, setQuoteRequests] = useState<QuoteRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<QuoteRequestStatus | 'all'>('all');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (sessionStatus === 'unauthenticated') {
      router.push('/auth/signin?callbackUrl=/quotes');
    }
  }, [sessionStatus, router]);

  const fetchQuoteRequests = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const response = await fetch('/api/quotes/request');
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
    if (session?.user) {
      fetchQuoteRequests();
    }
  }, [session]);

  const filteredRequests = quoteRequests.filter((request) => {
    if (activeFilter === 'all') return true;
    return request.status === activeFilter;
  });

  const getStatusCounts = () => {
    const counts: Record<string, number> = { all: quoteRequests.length };
    quoteRequests.forEach((req) => {
      counts[req.status] = (counts[req.status] || 0) + 1;
    });
    return counts;
  };

  const statusCounts = getStatusCounts();

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const isExpiringSoon = (expiresAt: string) => {
    const expiry = new Date(expiresAt);
    const now = new Date();
    const daysUntilExpiry = Math.ceil(
      (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysUntilExpiry <= 2 && daysUntilExpiry > 0;
  };

  if (sessionStatus === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600 mx-auto" />
          <p className="mt-2 text-slate-600">Loading your quote requests...</p>
        </div>
      </div>
    );
  }

  if (!session) {
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
                My Quote Requests
              </h1>
              <p className="mt-1 text-slate-600">
                Track and manage your service quote requests
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => fetchQuoteRequests(true)}
                disabled={refreshing}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition disabled:opacity-50"
              >
                <RefreshCw
                  className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`}
                />
                Refresh
              </button>
              <Link
                href="/quotes/request"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition"
              >
                <Plus className="h-4 w-4" />
                New Request
              </Link>
            </div>
          </div>

          {/* Filter tabs */}
          <div className="mt-6 flex flex-wrap gap-2">
            <button
              onClick={() => setActiveFilter('all')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
                activeFilter === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Filter className="h-4 w-4" />
              All ({statusCounts.all || 0})
            </button>
            {(['open', 'quoted', 'accepted', 'expired'] as QuoteRequestStatus[]).map(
              (status) => {
                const config = STATUS_CONFIG[status];
                const Icon = config.icon;
                return (
                  <button
                    key={status}
                    onClick={() => setActiveFilter(status)}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
                      activeFilter === status
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {config.label} ({statusCounts[status] || 0})
                  </button>
                );
              }
            )}
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
              {activeFilter === 'all'
                ? 'No quote requests yet'
                : `No ${STATUS_CONFIG[activeFilter]?.label.toLowerCase()} requests`}
            </h3>
            <p className="mt-1 text-slate-600 max-w-md mx-auto">
              {activeFilter === 'all'
                ? 'Get started by requesting quotes for your vehicle service needs.'
                : 'Try selecting a different filter to see other requests.'}
            </p>
            {activeFilter === 'all' && (
              <Link
                href="/quotes/request"
                className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition"
              >
                <Plus className="h-5 w-5" />
                Request Your First Quote
              </Link>
            )}
          </motion.div>
        ) : (
          <div className="grid gap-4">
            <AnimatePresence mode="popLayout">
              {filteredRequests.map((request, index) => {
                const statusConfig = STATUS_CONFIG[request.status];
                const StatusIcon = statusConfig.icon;

                return (
                  <motion.div
                    key={request._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Link href={`/quotes/${request._id}`}>
                      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 hover:shadow-md hover:border-slate-300 transition group">
                        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                          {/* Left: Vehicle and service info */}
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
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig.bgColor} ${statusConfig.color}`}
                                  >
                                    <StatusIcon className="h-3 w-3" />
                                    {statusConfig.label}
                                  </span>
                                  {isExpiringSoon(request.expiresAt) &&
                                    request.status === 'open' && (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                                        <Clock className="h-3 w-3" />
                                        Expiring soon
                                      </span>
                                    )}
                                </div>
                                {request.vehicleMake && (
                                  <p className="text-sm text-slate-600 mt-0.5">
                                    {request.vehicleYear} {request.vehicleMake}{' '}
                                    {request.vehicleModel}
                                  </p>
                                )}
                                <p className="text-sm text-slate-500 mt-1 line-clamp-1">
                                  {CATEGORY_LABELS[request.serviceCategory] ||
                                    request.serviceCategory}{' '}
                                  - {request.serviceDescription}
                                </p>
                              </div>
                            </div>

                            {/* Meta info */}
                            <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-slate-500">
                              <span className="inline-flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                {formatDate(request.createdAt)}
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <MapPin className="h-4 w-4" />
                                {request.preferredLocation.suburb},{' '}
                                {request.preferredLocation.state}
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                {URGENCY_LABELS[request.urgency]}
                              </span>
                            </div>
                          </div>

                          {/* Right: Quotes count and action */}
                          <div className="flex items-center gap-4">
                            {request.quotesReceived > 0 && (
                              <div className="text-center px-4 py-2 rounded-lg bg-emerald-50">
                                <p className="text-2xl font-bold text-emerald-600">
                                  {request.quotesReceived}
                                </p>
                                <p className="text-xs text-emerald-600">
                                  quote{request.quotesReceived !== 1 ? 's' : ''}
                                </p>
                              </div>
                            )}
                            <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-emerald-600 transition" />
                          </div>
                        </div>
                      </div>
                    </Link>
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
