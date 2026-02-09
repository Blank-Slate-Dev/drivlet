// src/app/dashboard/page.tsx
'use client';

import type { ElementType } from 'react';
import { Suspense, useEffect, useState, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock,
  MapPin,
  Car,
  ChevronRight,
  Loader2,
  Plus,
  AlertCircle,
  Bell,
  X,
  XCircle,
  Home,
  FileText,
  Calendar,
  MessageSquare,
  CheckCircle,
  Filter,
  RefreshCw,
  Sparkles,
  TrendingUp,
  Settings,
  ClipboardCheck,
  PackageCheck,
  FileWarning,
} from 'lucide-react';
import { BookingModal } from '@/components/homepage';
import { CancelBookingModal } from '@/components/CancelBookingModal';
import PickupConsentForm from '@/components/forms/PickupConsentForm';
import ReturnConfirmationForm from '@/components/forms/ReturnConfirmationForm';
import ClaimLodgementForm from '@/components/forms/ClaimLodgementForm';

const POLLING_INTERVAL = 30000;

// Feature flag for quotes functionality (disabled for now, will be enabled in a later phase)
const QUOTES_ENABLED = false;

// Stage definitions
const STAGES = [
  { id: 'booking_confirmed', label: 'Confirmed' },
  { id: 'driver_en_route', label: 'En Route' },
  { id: 'car_picked_up', label: 'Picked Up' },
  { id: 'at_garage', label: 'At Garage' },
  { id: 'service_in_progress', label: 'In Progress' },
  { id: 'driver_returning', label: 'Returning' },
  { id: 'delivered', label: 'Delivered' },
];

interface Update {
  stage: string;
  timestamp: string;
  message: string;
  updatedBy: string;
}

interface SignedFormRef {
  formId: string;
  formType: 'pickup_consent' | 'return_confirmation' | 'claim_lodgement';
  submittedAt: string;
}

interface DriverInfo {
  firstName: string;
  profilePhoto: string | null;
  rating: number;
  totalRatings: number;
  completedJobs: number;
  memberSince: string;
}

interface Booking {
  _id: string;
  vehicleRegistration: string;
  vehicleState: string;
  vehicleYear?: string;
  vehicleModel?: string;
  vehicleColor?: string;
  serviceType: string;
  currentStage: string;
  overallProgress: number;
  pickupTime: string;
  dropoffTime: string;
  pickupAddress: string;
  garageName?: string;
  garageAddress?: string;
  transmissionType: string;
  status: string;
  updates: Update[];
  createdAt: string;
  updatedAt: string;
  userName?: string;
  userEmail?: string;
  driver?: DriverInfo | null;
  signedForms?: SignedFormRef[];
}

type QuoteRequestStatus = 'open' | 'quoted' | 'accepted' | 'expired' | 'cancelled';

interface QuoteRequest {
  _id: string;
  vehicleRegistration: string;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleYear?: number;
  serviceCategory: string;
  serviceDescription: string;
  urgency: 'immediate' | 'this_week' | 'flexible';
  locationAddress: string;
  status: QuoteRequestStatus;
  quotesReceived: number;
  expiresAt: string;
  createdAt: string;
}

type DashboardSection = 'overview' | 'quotes' | 'bookings';

const QUOTE_STATUS_CONFIG: Record<
  QuoteRequestStatus,
  { label: string; icon: ElementType; color: string; bgColor: string }
> = {
  open: { label: 'Open', icon: Clock, color: 'text-blue-600', bgColor: 'bg-blue-100' },
  quoted: {
    label: 'Quotes Received',
    icon: MessageSquare,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-100',
  },
  accepted: { label: 'Accepted', icon: CheckCircle, color: 'text-green-600', bgColor: 'bg-green-100' },
  expired: { label: 'Expired', icon: XCircle, color: 'text-slate-500', bgColor: 'bg-slate-100' },
  cancelled: { label: 'Cancelled', icon: XCircle, color: 'text-red-600', bgColor: 'bg-red-100' },
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

// ── Helper: check what forms a booking still needs ─────────────────
function getPendingForms(booking: Booking): { pickup: boolean; return_: boolean } {
  const signed = booking.signedForms ?? [];
  const hasPickup = signed.some((f) => f.formType === 'pickup_consent');
  const hasReturn = signed.some((f) => f.formType === 'return_confirmation');

  // Pickup form relevant once car is picked up or later
  const pickupStages = ['car_picked_up', 'at_garage', 'service_in_progress', 'driver_returning', 'delivered'];
  const needsPickup = pickupStages.includes(booking.currentStage) && !hasPickup;

  // Return form relevant once delivered
  const needsReturn = booking.currentStage === 'delivered' && !hasReturn;

  return { pickup: needsPickup, return_: needsReturn };
}

// Section Navigation Component
interface SectionNavProps {
  activeSection: DashboardSection;
  onSectionChange: (section: DashboardSection) => void;
  stats: { quotes: number; bookings: number; pendingQuotes: number };
}

function SectionNav({ activeSection, onSectionChange, stats }: SectionNavProps) {
  const sections = [
    { id: 'overview' as DashboardSection, label: 'Overview', icon: Home },
    ...(QUOTES_ENABLED ? [{ id: 'quotes' as DashboardSection, label: 'My Quote Requests', icon: FileText, badge: stats.pendingQuotes }] : []),
    { id: 'bookings' as DashboardSection, label: 'My Bookings', icon: Calendar },
  ];

  return (
    <div className="flex gap-1 overflow-x-auto pb-px -mb-px">
      {sections.map((section) => (
        <button
          key={section.id}
          onClick={() => onSectionChange(section.id)}
          className={`relative flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition whitespace-nowrap ${
            activeSection === section.id
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
          }`}
        >
          <section.icon className="h-4 w-4" />
          {section.label}
          {section.badge !== undefined && section.badge > 0 && (
            <span className="ml-1 px-1.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-700">
              {section.badge}
            </span>
          )}
        </button>
      ))}
      <Link
        href="/account"
        className="relative flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition whitespace-nowrap border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300"
      >
        <Settings className="h-4 w-4" />
        My Settings
      </Link>
    </div>
  );
}

// Overview Section Component
interface OverviewSectionProps {
  bookings: Booking[];
  quoteRequests: QuoteRequest[];
  userName: string;
  onSectionChange: (section: DashboardSection) => void;
  onBookingClick: () => void;
  onOpenForm: (bookingId: string, formType: 'pickup' | 'return' | 'claim') => void;
}

function OverviewSection({ bookings, quoteRequests, userName, onSectionChange, onBookingClick, onOpenForm }: OverviewSectionProps) {
  // Check for action-required forms on active bookings
  const activeBookings = bookings.filter((b) => b.status === 'in_progress' || b.status === 'pending');
  const formsNeeded: { booking: Booking; pickup: boolean; return_: boolean }[] = [];
  for (const b of activeBookings) {
    const pending = getPendingForms(b);
    if (pending.pickup || pending.return_) {
      formsNeeded.push({ booking: b, ...pending });
    }
  }

  return (
    <div className="space-y-6">
      {/* ── Action Required Banner ── */}
      {formsNeeded.length > 0 && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          {formsNeeded.map(({ booking, pickup, return_ }) => (
            <div
              key={booking._id}
              className="mb-4 rounded-2xl border border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50 p-5"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-amber-200">
                  <ClipboardCheck className="h-5 w-5 text-amber-700" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-amber-900">Action Required</h3>
                  <p className="mt-0.5 text-sm text-amber-700">
                    {booking.vehicleRegistration} ({booking.vehicleState}) needs your signature on{' '}
                    {pickup && return_ ? 'pickup consent & return confirmation forms' : pickup ? 'the pickup consent form' : 'the return confirmation form'}.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {pickup && (
                      <button
                        onClick={() => onOpenForm(booking._id, 'pickup')}
                        className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500"
                      >
                        <ClipboardCheck className="h-4 w-4" />
                        Sign Pickup Form
                      </button>
                    )}
                    {return_ && (
                      <button
                        onClick={() => onOpenForm(booking._id, 'return')}
                        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500"
                      >
                        <PackageCheck className="h-4 w-4" />
                        Sign Return Form
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </motion.div>
      )}

      {/* Welcome Banner */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 p-6 text-white"
      >
        <div className="absolute top-0 right-0 -mt-4 -mr-4 h-32 w-32 rounded-full bg-white/10" />
        <div className="absolute bottom-0 left-0 -mb-8 -ml-8 h-40 w-40 rounded-full bg-white/5" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-5 w-5" />
            <span className="text-sm font-medium text-emerald-100">Welcome back</span>
          </div>
          <h2 className="text-2xl font-bold">{userName}!</h2>
          <p className="mt-2 text-emerald-100 max-w-md">
            {QUOTES_ENABLED
              ? "Here's an overview of your vehicle services and quote requests."
              : "Here's an overview of your vehicle services and bookings."}
          </p>
        </div>
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-2xl border border-slate-200 p-6"
      >
        <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-emerald-600" />
          Quick Actions
        </h3>
        <div className={`grid gap-4 ${QUOTES_ENABLED ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
          {QUOTES_ENABLED && (
            <Link
              href="/quotes/request"
              className="group flex items-center gap-3 p-4 rounded-xl border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 transition"
            >
              <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center group-hover:bg-emerald-200 transition">
                <Plus className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="font-medium text-slate-900">New Quote Request</p>
                <p className="text-xs text-slate-500">Get quotes for services</p>
              </div>
            </Link>
          )}
          <button
            onClick={onBookingClick}
            className="group flex items-center gap-3 p-4 rounded-xl border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 transition text-left"
          >
            <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition">
              <Car className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="font-medium text-slate-900">Book a Service</p>
              <p className="text-xs text-slate-500">Schedule pickup & delivery</p>
            </div>
          </button>
          <Link
            href="/track"
            className="group flex items-center gap-3 p-4 rounded-xl border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 transition"
          >
            <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center group-hover:bg-purple-200 transition">
              <MapPin className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="font-medium text-slate-900">Track Service</p>
              <p className="text-xs text-slate-500">Real-time tracking</p>
            </div>
          </Link>
        </div>
      </motion.div>

      {/* Recent Activity */}
      {((QUOTES_ENABLED && quoteRequests.length > 0) || bookings.length > 0) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl border border-slate-200 p-6"
        >
          <h3 className="font-semibold text-slate-900 mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {QUOTES_ENABLED && quoteRequests.slice(0, 3).map((request) => {
              const statusConfig = QUOTE_STATUS_CONFIG[request.status];
              const StatusIcon = statusConfig.icon;
              return (
                <Link
                  key={request._id}
                  href={`/quotes/${request._id}`}
                  className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:border-slate-200 hover:bg-slate-50 transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center">
                      <FileText className="h-4 w-4 text-slate-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        Quote Request: {request.vehicleRegistration}
                      </p>
                      <p className="text-xs text-slate-500">
                        {CATEGORY_LABELS[request.serviceCategory]} • {request.quotesReceived} quotes
                      </p>
                    </div>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusConfig.bgColor} ${statusConfig.color}`}
                  >
                    <StatusIcon className="h-3 w-3" />
                    {statusConfig.label}
                  </span>
                </Link>
              );
            })}
            {bookings.slice(0, QUOTES_ENABLED ? 2 : 5).map((booking) => (
              <Link
                key={booking._id}
                href="/dashboard?section=bookings"
                className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:border-slate-200 hover:bg-slate-50 transition"
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center">
                    <Car className="h-4 w-4 text-slate-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">Booking: {booking.vehicleRegistration}</p>
                    <p className="text-xs text-slate-500">
                      {booking.serviceType} • {booking.overallProgress}% complete
                    </p>
                  </div>
                </div>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                    booking.status === 'completed'
                      ? 'bg-green-100 text-green-700'
                      : booking.status === 'in_progress'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {booking.status === 'completed'
                    ? 'Completed'
                    : booking.status === 'in_progress'
                    ? 'In Progress'
                    : 'Pending'}
                </span>
              </Link>
            ))}
          </div>
          {((QUOTES_ENABLED && quoteRequests.length > 3) || bookings.length > (QUOTES_ENABLED ? 2 : 5)) && (
            <button
              onClick={() => onSectionChange(QUOTES_ENABLED ? 'quotes' : 'bookings')}
              className="mt-4 w-full py-2 text-sm font-medium text-emerald-600 hover:text-emerald-700 transition"
            >
              View all activity →
            </button>
          )}
        </motion.div>
      )}

      {/* Empty State */}
      {(QUOTES_ENABLED ? (quoteRequests.length === 0 && bookings.length === 0) : bookings.length === 0) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-center py-12"
        >
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-slate-100 mb-4">
            <Car className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900">Get started with Drivlet</h3>
          <p className="mt-1 text-slate-600 max-w-md mx-auto">
            {QUOTES_ENABLED
              ? 'Request quotes from local garages or book a service with pickup and delivery.'
              : 'Book a service with pickup and delivery.'}
          </p>
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            {QUOTES_ENABLED && (
              <Link
                href="/quotes/request"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition"
              >
                <FileText className="h-5 w-5" />
                Request a Quote
              </Link>
            )}
            <button
              onClick={onBookingClick}
              className={`inline-flex items-center gap-2 px-6 py-3 rounded-lg transition ${
                QUOTES_ENABLED
                  ? 'border border-slate-300 text-slate-700 hover:bg-slate-50'
                  : 'bg-emerald-600 text-white hover:bg-emerald-700'
              }`}
            >
              <Car className="h-5 w-5" />
              Book a Service
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// Quote Requests Section Component
interface QuoteRequestsSectionProps {
  quoteRequests: QuoteRequest[];
  loading: boolean;
  onRefresh: () => void;
  refreshing: boolean;
}

function QuoteRequestsSection({ quoteRequests, loading, onRefresh, refreshing }: QuoteRequestsSectionProps) {
  const [activeFilter, setActiveFilter] = useState<QuoteRequestStatus | 'all'>('all');

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
    const daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 2 && daysUntilExpiry > 0;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">My Quote Requests</h2>
          <p className="mt-1 text-sm text-slate-600">View and manage all your service quote requests</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
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

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setActiveFilter('all')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
            activeFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          <Filter className="h-4 w-4" />
          All ({statusCounts.all || 0})
        </button>

        {(['open', 'quoted', 'accepted', 'expired'] as QuoteRequestStatus[]).map((status) => {
          const config = QUOTE_STATUS_CONFIG[status];
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
        })}
      </div>

      {filteredRequests.length === 0 ? (
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-slate-100 mb-4">
            <FileText className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900">
            {activeFilter === 'all'
              ? 'No quote requests yet'
              : `No ${QUOTE_STATUS_CONFIG[activeFilter]?.label.toLowerCase()} requests`}
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
        </div>
      ) : (
        <div className="grid gap-4">
          <AnimatePresence mode="popLayout">
            {filteredRequests.map((request, index) => {
              const statusConfig = QUOTE_STATUS_CONFIG[request.status];
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
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 h-12 w-12 rounded-lg bg-slate-100 flex items-center justify-center">
                              <Car className="h-6 w-6 text-slate-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-semibold text-slate-900">{request.vehicleRegistration}</h3>
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig.bgColor} ${statusConfig.color}`}
                                >
                                  <StatusIcon className="h-3 w-3" />
                                  {statusConfig.label}
                                </span>
                                {isExpiringSoon(request.expiresAt) && request.status === 'open' && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                                    <Clock className="h-3 w-3" />
                                    Expiring soon
                                  </span>
                                )}
                              </div>
                              {request.vehicleMake && (
                                <p className="text-sm text-slate-600 mt-0.5">
                                  {request.vehicleYear} {request.vehicleMake} {request.vehicleModel}
                                </p>
                              )}
                              <p className="text-sm text-slate-500 mt-1 line-clamp-1">
                                {CATEGORY_LABELS[request.serviceCategory] || request.serviceCategory} -{' '}
                                {request.serviceDescription}
                              </p>
                            </div>
                          </div>

                          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-slate-500">
                            <span className="inline-flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {formatDate(request.createdAt)}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="h-4 w-4" />
                              {request.locationAddress}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {URGENCY_LABELS[request.urgency]}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          {request.quotesReceived > 0 && (
                            <div className="text-center px-4 py-2 rounded-lg bg-emerald-50">
                              <p className="text-2xl font-bold text-emerald-600">{request.quotesReceived}</p>
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
  );
}

// Bookings Section Component
interface BookingsSectionProps {
  bookings: Booking[];
  activeBooking: Booking | null;
  loading: boolean;
  onCancelBooking: (id: string, rego: string) => void;
  onBookingClick: () => void;
  onOpenForm: (bookingId: string, formType: 'pickup' | 'return' | 'claim') => void;
}

function BookingsSection({ bookings, activeBooking, loading, onCancelBooking, onBookingClick, onOpenForm }: BookingsSectionProps) {
  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-AU', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStageLabel = (stageId: string) => {
    const stage = STAGES.find((s) => s.id === stageId);
    return stage?.label || stageId;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (bookings.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-slate-100 mb-4">
          <Car className="h-8 w-8 text-slate-400" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900">No bookings yet</h3>
        <p className="mt-1 text-slate-600 max-w-md mx-auto">
          Book your first car service and we&apos;ll handle the pickup, service, and return.
        </p>
        <button
          onClick={onBookingClick}
          className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition"
        >
          <Plus className="h-5 w-5" />
          Book a Service
        </button>
      </div>
    );
  }

  // Check pending forms for active booking
  const pendingForms = activeBooking ? getPendingForms(activeBooking) : null;
  const hasSignedPickup = activeBooking?.signedForms?.some((f) => f.formType === 'pickup_consent');
  const hasSignedReturn = activeBooking?.signedForms?.some((f) => f.formType === 'return_confirmation');

  return (
    <div className="space-y-6">
      {/* Active Booking */}
      {activeBooking && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <h2 className="text-xl font-semibold text-slate-900">Active Booking</h2>

          {/* Action Required Banner for active booking */}
          {pendingForms && (pendingForms.pickup || pendingForms.return_) && (
            <div className="rounded-2xl border border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50 p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-amber-200">
                  <ClipboardCheck className="h-5 w-5 text-amber-700" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-amber-900">Signature Required</h3>
                  <p className="mt-0.5 text-sm text-amber-700">
                    Please sign the following form{pendingForms.pickup && pendingForms.return_ ? 's' : ''} for your booking.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {pendingForms.pickup && (
                      <button
                        onClick={() => onOpenForm(activeBooking._id, 'pickup')}
                        className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500"
                      >
                        <ClipboardCheck className="h-4 w-4" />
                        Sign Pickup Consent
                      </button>
                    )}
                    {pendingForms.return_ && (
                      <button
                        onClick={() => onOpenForm(activeBooking._id, 'return')}
                        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500"
                      >
                        <PackageCheck className="h-4 w-4" />
                        Sign Return Confirmation
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Booking Header */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-emerald-600">Your Car Service</p>
                <h3 className="mt-1 text-2xl font-bold text-slate-900">{activeBooking.vehicleRegistration}</h3>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-600">
                  <span className="inline-flex items-center gap-1.5">
                    <Car className="h-4 w-4 text-slate-400" />
                    {activeBooking.vehicleState}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 text-slate-400" />
                    {activeBooking.pickupAddress}
                  </span>
                </div>
              </div>
              <div className="hidden sm:flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
                <Car className="h-8 w-8 text-emerald-600" />
              </div>
            </div>

            {/* Form status badges */}
            {(hasSignedPickup || hasSignedReturn) && (
              <div className="mt-4 flex flex-wrap gap-2">
                {hasSignedPickup && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-medium text-emerald-600">
                    <CheckCircle className="h-3.5 w-3.5" />
                    Pickup Consent Signed
                  </span>
                )}
                {hasSignedReturn && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-200 px-3 py-1 text-xs font-medium text-blue-600">
                    <CheckCircle className="h-3.5 w-3.5" />
                    Return Confirmed
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Status Summary */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-1.5 text-sm font-medium text-emerald-700">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                {getStageLabel(activeBooking.currentStage)}
              </span>
              <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-600">
                {activeBooking.serviceType}
              </span>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-slate-100">
                  <Clock className="h-5 w-5 text-slate-600" />
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Pickup Time</p>
                  <p className="mt-0.5 text-sm font-medium text-slate-900">{activeBooking.pickupTime}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-slate-100">
                  <Clock className="h-5 w-5 text-slate-600" />
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Dropoff Time</p>
                  <p className="mt-0.5 text-sm font-medium text-slate-900">{activeBooking.dropoffTime}</p>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-medium text-slate-700">Overall Progress</span>
                <span className="font-semibold text-emerald-600">{activeBooking.overallProgress}%</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-3 rounded-full bg-emerald-500 transition-all duration-500"
                  style={{ width: `${activeBooking.overallProgress}%` }}
                />
              </div>
            </div>

            <p className="mt-4 text-xs text-slate-400">Last updated: {formatDateTime(activeBooking.updatedAt)}</p>
          </div>

          {/* Form Actions & Cancel */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <div className="flex flex-wrap items-center gap-3">
              {/* Lodge Claim — always available on active bookings */}
              {(activeBooking.status === 'in_progress' || activeBooking.status === 'completed') && (
                <button
                  onClick={() => onOpenForm(activeBooking._id, 'claim')}
                  className="inline-flex items-center gap-2 rounded-lg bg-amber-100 px-4 py-2 text-sm font-medium text-amber-700 transition hover:bg-amber-200"
                >
                  <FileWarning className="h-4 w-4" />
                  Lodge a Claim
                </button>
              )}
              {/* Cancel */}
              {activeBooking.status === 'pending' && (
                <button
                  onClick={() => onCancelBooking(activeBooking._id, activeBooking.vehicleRegistration)}
                  className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
                >
                  <XCircle className="h-4 w-4" />
                  Cancel Booking
                </button>
              )}
            </div>
            {activeBooking.status === 'pending' && (
              <p className="mt-2 text-xs text-slate-500">Free cancellation if more than 24 hours before pickup</p>
            )}
          </div>
        </motion.div>
      )}

      {/* Previous Bookings */}
      {bookings.filter((b) => b._id !== activeBooking?._id).length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl border border-slate-200 p-6"
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">
              {activeBooking ? 'Previous Bookings' : 'All Bookings'}
            </h2>
            <Link
              href="/dashboard/bookings"
              className="flex items-center gap-1 text-sm font-medium text-emerald-600 hover:text-emerald-500"
            >
              View All
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="space-y-3">
            {bookings
              .filter((b) => b._id !== activeBooking?._id)
              .slice(0, 5)
              .map((booking) => (
                <div
                  key={booking._id}
                  className="flex items-center justify-between rounded-lg border border-slate-100 p-3"
                >
                  <div>
                    <p className="font-medium text-slate-900">
                      {booking.vehicleRegistration} ({booking.vehicleState})
                    </p>
                    <p className="text-xs text-slate-500">
                      {booking.serviceType} • {new Date(booking.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-medium ${
                      booking.status === 'completed'
                        ? 'bg-green-100 text-green-700'
                        : booking.status === 'cancelled'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {booking.status}
                  </span>
                </div>
              ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}

// Dashboard Content Component (uses useSearchParams)
function DashboardContent() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [activeSection, setActiveSection] = useState<DashboardSection>('overview');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [quoteRequests, setQuoteRequests] = useState<QuoteRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [quotesLoading, setQuotesLoading] = useState(true);
  const [error, setError] = useState('');
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [updateNotification, setUpdateNotification] = useState<string | null>(null);
  const [cancelModalBooking, setCancelModalBooking] = useState<{ id: string; rego: string } | null>(null);
  const [refreshingQuotes, setRefreshingQuotes] = useState(false);

  // Form modal state
  const [formModal, setFormModal] = useState<{
    bookingId: string;
    type: 'pickup' | 'return' | 'claim';
  } | null>(null);

  const previousBookingsRef = useRef<Booking[]>([]);
  const isInitialLoadRef = useRef(true);
  const autoPromptedRef = useRef<Set<string>>(new Set());

  // Handle URL params for section
  useEffect(() => {
    const section = searchParams.get('section');
    if (section === 'quotes' || section === 'bookings' || section === 'overview') {
      if (section === 'quotes' && !QUOTES_ENABLED) {
        setActiveSection('overview');
      } else {
        setActiveSection(section);
      }
    }
  }, [searchParams]);

  const handleSectionChange = (section: DashboardSection) => {
    setActiveSection(section);
    const url = new URL(window.location.href);
    if (section === 'overview') {
      url.searchParams.delete('section');
    } else {
      url.searchParams.set('section', section);
    }
    window.history.pushState({}, '', url.toString());
  };

  // ── Open form modal handler ──────────────────────────────────────
  const handleOpenForm = useCallback(
    (bookingId: string, formType: 'pickup' | 'return' | 'claim') => {
      setFormModal({ bookingId, type: formType });
    },
    []
  );

  const handleFormSuccess = useCallback(() => {
    setFormModal(null);
    // Refresh bookings to update signed form status
    fetchBookings(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── SSE auto-prompt: when stage changes to pickup/delivered, auto-open form ──
  const checkAutoPrompt = useCallback(
    (newBookings: Booking[]) => {
      for (const b of newBookings) {
        if (b.status !== 'in_progress' && b.status !== 'pending') continue;
        const pending = getPendingForms(b);
        // Auto-prompt pickup form
        if (pending.pickup && !autoPromptedRef.current.has(`${b._id}-pickup`)) {
          autoPromptedRef.current.add(`${b._id}-pickup`);
          setFormModal({ bookingId: b._id, type: 'pickup' });
          return; // One at a time
        }
        // Auto-prompt return form
        if (pending.return_ && !autoPromptedRef.current.has(`${b._id}-return`)) {
          autoPromptedRef.current.add(`${b._id}-return`);
          setFormModal({ bookingId: b._id, type: 'return' });
          return;
        }
      }
    },
    []
  );

  const detectBookingChanges = useCallback((newBookings: Booking[]) => {
    if (isInitialLoadRef.current || previousBookingsRef.current.length === 0) {
      return null;
    }

    for (const newBooking of newBookings) {
      const prevBooking = previousBookingsRef.current.find((b) => b._id === newBooking._id);
      if (prevBooking) {
        if (newBooking.currentStage !== prevBooking.currentStage) {
          const newStage = STAGES.find((s) => s.id === newBooking.currentStage);
          return `Your booking has progressed to: ${newStage?.label || newBooking.currentStage}`;
        }
        if (newBooking.status !== prevBooking.status) {
          if (newBooking.status === 'completed') return 'Your car service has been completed!';
          if (newBooking.status === 'cancelled') return 'Your booking has been cancelled';
        }
        if (newBooking.updates.length > prevBooking.updates.length) {
          return newBooking.updates[newBooking.updates.length - 1].message;
        }
      }
    }
    return null;
  }, []);

  const fetchBookings = useCallback(
    async (isPolling = false) => {
      try {
        if (!isPolling) setLoading(true);
        const response = await fetch('/api/bookings');
        if (!response.ok) throw new Error('Failed to fetch bookings');
        const data = await response.json();

        if (isPolling) {
          const changeMessage = detectBookingChanges(data);
          if (changeMessage) setUpdateNotification(changeMessage);
          // Check for auto-prompt on polling updates
          checkAutoPrompt(data);
        }

        previousBookingsRef.current = data;
        setBookings(data);
        setError('');
        if (!isPolling) isInitialLoadRef.current = false;
      } catch {
        if (!isPolling) setError('Failed to load your bookings');
      } finally {
        if (!isPolling) setLoading(false);
      }
    },
    [detectBookingChanges, checkAutoPrompt]
  );

  const fetchQuoteRequests = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshingQuotes(true);
    else setQuotesLoading(true);

    try {
      const response = await fetch('/api/quotes/request');
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to fetch quote requests');
      setQuoteRequests(data.quoteRequests);
    } catch (err) {
      console.error('Error fetching quotes:', err);
    } finally {
      setQuotesLoading(false);
      setRefreshingQuotes(false);
    }
  }, []);

  useEffect(() => {
    if (authStatus === 'loading') return;
    if (!session?.user) {
      router.push('/login');
      return;
    }
    fetchBookings(false);
    fetchQuoteRequests(false);
  }, [session, authStatus, router, fetchBookings, fetchQuoteRequests]);

  useEffect(() => {
    if (authStatus !== 'authenticated' || !session?.user) return;
    const pollInterval = setInterval(() => {
      fetchBookings(true);
    }, POLLING_INTERVAL);
    return () => clearInterval(pollInterval);
  }, [authStatus, session, fetchBookings]);

  useEffect(() => {
    if (updateNotification) {
      const timer = setTimeout(() => setUpdateNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [updateNotification]);

  const activeBooking = bookings.find((b) => b.status === 'in_progress' || b.status === 'pending');
  const pendingQuotes = quoteRequests.filter((q) => q.status === 'open' || q.status === 'quoted').length;
  const userName = session?.user?.username ?? session?.user?.email?.split('@')[0] ?? 'User';

  // Resolve the booking for the current form modal
  const formBooking = formModal ? bookings.find((b) => b._id === formModal.bookingId) : null;
  const formBookingData = formBooking
    ? {
        _id: formBooking._id,
        userName: formBooking.userName || session?.user?.username || session?.user?.email?.split('@')[0] || '',
        userEmail: formBooking.userEmail || session?.user?.email || '',
        vehicleRegistration: formBooking.vehicleRegistration,
        vehicleState: formBooking.vehicleState,
        vehicleModel: formBooking.vehicleModel,
        vehicleYear: formBooking.vehicleYear,
        vehicleColor: formBooking.vehicleColor,
        pickupAddress: formBooking.pickupAddress,
        garageName: formBooking.garageName,
        garageAddress: formBooking.garageAddress,
        transmissionType: formBooking.transmissionType,
        pickupTime: formBooking.pickupTime,
        dropoffTime: formBooking.dropoffTime,
        createdAt: formBooking.createdAt,
      }
    : null;

  if (authStatus === 'loading' || loading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="h-16 w-16 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto mb-4">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            </div>
            <p className="text-slate-600 font-medium">Loading your dashboard...</p>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-5xl px-4 py-8">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
            <AlertCircle className="mx-auto h-8 w-8 text-red-500" />
            <p className="mt-2 text-red-700">{error}</p>
            <button
              onClick={() => fetchBookings(false)}
              className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500"
            >
              Retry
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Booking Modal */}
      <BookingModal isOpen={showBookingModal} onClose={() => setShowBookingModal(false)} />

      {/* Cancel Booking Modal */}
      <CancelBookingModal
        bookingId={cancelModalBooking?.id || ''}
        vehicleRego={cancelModalBooking?.rego || ''}
        isOpen={!!cancelModalBooking}
        onClose={() => setCancelModalBooking(null)}
        onSuccess={() => {
          setCancelModalBooking(null);
          fetchBookings(false);
        }}
      />

      {/* ── Form Modals ── */}
      {formBookingData && formModal?.type === 'pickup' && (
        <PickupConsentForm
          booking={formBookingData}
          isOpen={true}
          onClose={() => setFormModal(null)}
          onSuccess={handleFormSuccess}
          driverName={formBooking?.driver?.firstName || ''}
        />
      )}
      {formBookingData && formModal?.type === 'return' && (
        <ReturnConfirmationForm
          booking={formBookingData}
          isOpen={true}
          onClose={() => setFormModal(null)}
          onSuccess={handleFormSuccess}
          driverName={formBooking?.driver?.firstName || ''}
        />
      )}
      {formBookingData && formModal?.type === 'claim' && (
        <ClaimLodgementForm
          booking={formBookingData}
          isOpen={true}
          onClose={() => setFormModal(null)}
          onSuccess={handleFormSuccess}
        />
      )}

      {/* Update Notification Toast */}
      {updateNotification && (
        <div className="fixed top-20 left-1/2 z-50 -translate-x-1/2 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 shadow-lg">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500">
              <Bell className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-emerald-800">Booking Updated</p>
              <p className="text-sm text-emerald-700">{updateNotification}</p>
            </div>
            <button
              onClick={() => setUpdateNotification(null)}
              className="ml-2 rounded-lg p-1 text-emerald-600 hover:bg-emerald-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">My Dashboard</h1>
                <p className="mt-1 text-sm text-slate-600">
                  {QUOTES_ENABLED ? 'Manage your quote requests and bookings' : 'Manage your bookings'}
                </p>
              </div>
              <Link href="/" className="text-sm font-medium text-slate-600 hover:text-emerald-600 transition">
                ← Back to Home
              </Link>
            </div>
          </div>

          {/* Section Navigation */}
          <SectionNav
            activeSection={activeSection}
            onSectionChange={handleSectionChange}
            stats={{
              quotes: quoteRequests.length,
              bookings: bookings.length,
              pendingQuotes,
            }}
          />
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <AnimatePresence mode="wait">
          {activeSection === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
            >
              <OverviewSection
                bookings={bookings}
                quoteRequests={quoteRequests}
                userName={userName}
                onSectionChange={handleSectionChange}
                onBookingClick={() => setShowBookingModal(true)}
                onOpenForm={handleOpenForm}
              />
            </motion.div>
          )}
          {QUOTES_ENABLED && activeSection === 'quotes' && (
            <motion.div
              key="quotes"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
            >
              <QuoteRequestsSection
                quoteRequests={quoteRequests}
                loading={quotesLoading}
                onRefresh={() => fetchQuoteRequests(true)}
                refreshing={refreshingQuotes}
              />
            </motion.div>
          )}
          {activeSection === 'bookings' && (
            <motion.div
              key="bookings"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
            >
              <BookingsSection
                bookings={bookings}
                activeBooking={activeBooking || null}
                loading={loading}
                onCancelBooking={(id, rego) => setCancelModalBooking({ id, rego })}
                onBookingClick={() => setShowBookingModal(true)}
                onOpenForm={handleOpenForm}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}

// Main Dashboard Page with Suspense boundary
export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="h-16 w-16 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
              </div>
              <p className="text-slate-600 font-medium">Loading your dashboard...</p>
            </div>
          </div>
        </main>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
