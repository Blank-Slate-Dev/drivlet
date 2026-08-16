// src/app/dashboard/page.tsx
'use client';

import type { ElementType } from 'react';
import { Suspense, useEffect, useState, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import ChangePasswordForm from '@/components/ChangePasswordForm';
import {
  Clock, MapPin, Car, ChevronRight, Loader2, Plus, AlertCircle, Bell, X, XCircle,
  FileText, Calendar, MessageSquare, CheckCircle, Filter, RefreshCw,
  Settings, ClipboardCheck, PackageCheck, FileWarning,
} from 'lucide-react';
import { CancelBookingModal } from '@/components/CancelBookingModal';
import { CANCELLATION_CUTOFF_HOURS, SUPPORT_PHONE } from '@/lib/policy';
import PickupConsentForm from '@/components/forms/PickupConsentForm';
import ReturnConfirmationForm from '@/components/forms/ReturnConfirmationForm';
import ClaimLodgementForm from '@/components/forms/ClaimLodgementForm';

const POLLING_INTERVAL = 30000;
const QUOTES_ENABLED = false;

const STAGES = [
  { id: 'booking_confirmed', label: 'Confirmed' }, { id: 'driver_en_route', label: 'En Route' },
  { id: 'car_picked_up', label: 'Picked Up' }, { id: 'at_garage', label: 'At Garage' },
  { id: 'service_in_progress', label: 'In Progress' },
  // Backend-only stage (payment received, awaiting return dispatch) — needs
  // a label or the chip shows the raw id (re-audit S-6)
  { id: 'ready_for_return', label: 'Ready for Return' },
  { id: 'driver_returning', label: 'Returning' },
  { id: 'delivered', label: 'Delivered' },
];

interface Update { stage: string; timestamp: string; message: string; updatedBy: string; }
interface SignedFormRef { formId: string; formType: 'pickup_consent' | 'return_confirmation' | 'claim_lodgement'; submittedAt: string; }
interface DriverInfo { firstName: string; profilePhoto: string | null; rating: number; totalRatings: number; completedJobs: number; memberSince: string; }
interface Booking {
  _id: string; vehicleRegistration: string; vehicleState: string; vehicleYear?: string; vehicleModel?: string;
  vehicleColor?: string; serviceType: string; currentStage: string; overallProgress: number; pickupTime: string;
  dropoffTime: string; pickupAddress: string; garageName?: string; garageAddress?: string; transmissionType: string;
  status: string; updates: Update[]; createdAt: string; updatedAt: string; userName?: string; userEmail?: string;
  driver?: DriverInfo | null; signedForms?: SignedFormRef[];
}

type QuoteRequestStatus = 'open' | 'quoted' | 'accepted' | 'expired' | 'cancelled';
interface QuoteRequest {
  _id: string; vehicleRegistration: string; vehicleMake?: string; vehicleModel?: string; vehicleYear?: number;
  serviceCategory: string; serviceDescription: string; urgency: 'immediate' | 'this_week' | 'flexible';
  locationAddress: string; status: QuoteRequestStatus; quotesReceived: number; expiresAt: string; createdAt: string;
}

// Phase 2: quote sections return with QUOTES_ENABLED; the tabbed
// DashboardSection nav was retired in the 2026-08-08 utility redesign
// (single page, no sections).

const QUOTE_STATUS_CONFIG: Record<QuoteRequestStatus, { label: string; icon: ElementType; color: string; bgColor: string }> = {
  open: { label: 'Open', icon: Clock, color: 'text-blue-600', bgColor: 'bg-blue-100' },
  quoted: { label: 'Quotes Received', icon: MessageSquare, color: 'text-emerald-600', bgColor: 'bg-emerald-100' },
  accepted: { label: 'Accepted', icon: CheckCircle, color: 'text-green-600', bgColor: 'bg-green-100' },
  expired: { label: 'Expired', icon: XCircle, color: 'text-slate-500', bgColor: 'bg-slate-100' },
  cancelled: { label: 'Cancelled', icon: XCircle, color: 'text-red-600', bgColor: 'bg-red-100' },
};

const URGENCY_LABELS: Record<string, string> = { immediate: 'Urgent - ASAP', this_week: 'Within a week', flexible: 'Flexible timing' };
const CATEGORY_LABELS: Record<string, string> = { mechanical: 'Mechanical', electrical: 'Electrical', bodywork: 'Bodywork', tyres: 'Tyres & Wheels', servicing: 'Servicing', other: 'Other' };

function getPendingForms(booking: Booking): { pickup: boolean; return_: boolean } {
  const signed = booking.signedForms ?? [];
  const hasPickup = signed.some((f) => f.formType === 'pickup_consent');
  const hasReturn = signed.some((f) => f.formType === 'return_confirmation');
  const pickupStages = ['car_picked_up', 'at_garage', 'service_in_progress', 'driver_returning', 'delivered'];
  const needsPickup = pickupStages.includes(booking.currentStage) && !hasPickup;
  const needsReturn = booking.currentStage === 'delivered' && !hasReturn;
  return { pickup: needsPickup, return_: needsReturn };
}

interface QuoteRequestsSectionProps { quoteRequests: QuoteRequest[]; loading: boolean; onRefresh: () => void; refreshing: boolean; }
function QuoteRequestsSection({ quoteRequests, loading, onRefresh, refreshing }: QuoteRequestsSectionProps) {
  const [activeFilter, setActiveFilter] = useState<QuoteRequestStatus | 'all'>('all');
  const filteredRequests = quoteRequests.filter((request) => activeFilter === 'all' ? true : request.status === activeFilter);
  const getStatusCounts = () => { const counts: Record<string, number> = { all: quoteRequests.length }; quoteRequests.forEach((req) => { counts[req.status] = (counts[req.status] || 0) + 1; }); return counts; };
  const statusCounts = getStatusCounts();
  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
  const isExpiringSoon = (expiresAt: string) => { const daysUntilExpiry = Math.ceil((new Date(expiresAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)); return daysUntilExpiry <= 2 && daysUntilExpiry > 0; };

  if (loading) return (<div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-emerald-600" /></div>);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div><h2 className="text-xl font-semibold text-slate-900">My Quote Requests</h2><p className="mt-1 text-sm text-slate-600">View and manage all your service quote requests</p></div>
        <div className="flex items-center gap-3">
          <button onClick={onRefresh} disabled={refreshing} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />Refresh</button>
          <Link href="/quotes/request" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition"><Plus className="h-4 w-4" />New Request</Link>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setActiveFilter('all')} className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${activeFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}><Filter className="h-4 w-4" />All ({statusCounts.all || 0})</button>
        {(['open', 'quoted', 'accepted', 'expired'] as QuoteRequestStatus[]).map((status) => { const config = QUOTE_STATUS_CONFIG[status]; const Icon = config.icon; return (<button key={status} onClick={() => setActiveFilter(status)} className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${activeFilter === status ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}><Icon className="h-4 w-4" />{config.label} ({statusCounts[status] || 0})</button>); })}
      </div>
      {filteredRequests.length === 0 ? (
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-slate-100 mb-4"><FileText className="h-8 w-8 text-slate-400" /></div>
          <h3 className="text-lg font-semibold text-slate-900">{activeFilter === 'all' ? 'No quote requests yet' : `No ${QUOTE_STATUS_CONFIG[activeFilter]?.label.toLowerCase()} requests`}</h3>
          <p className="mt-1 text-slate-600 max-w-md mx-auto">{activeFilter === 'all' ? 'Get started by requesting quotes for your vehicle service needs.' : 'Try selecting a different filter to see other requests.'}</p>
          {activeFilter === 'all' && (<Link href="/quotes/request" className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition"><Plus className="h-5 w-5" />Request Your First Quote</Link>)}
        </div>
      ) : (
        <div className="grid gap-4">
          <AnimatePresence mode="popLayout">
            {filteredRequests.map((request, index) => { const statusConfig = QUOTE_STATUS_CONFIG[request.status]; const StatusIcon = statusConfig.icon; return (
              <motion.div key={request._id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ delay: index * 0.05 }}>
                <Link href={`/quotes/${request._id}`}>
                  <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 hover:shadow-md hover:border-slate-300 transition group">
                    <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 h-12 w-12 rounded-lg bg-slate-100 flex items-center justify-center"><Car className="h-6 w-6 text-slate-600" /></div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-semibold text-slate-900">{request.vehicleRegistration}</h3>
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig.bgColor} ${statusConfig.color}`}><StatusIcon className="h-3 w-3" />{statusConfig.label}</span>
                              {isExpiringSoon(request.expiresAt) && request.status === 'open' && (<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700"><Clock className="h-3 w-3" />Expiring soon</span>)}
                            </div>
                            {request.vehicleMake && (<p className="text-sm text-slate-600 mt-0.5">{request.vehicleYear} {request.vehicleMake} {request.vehicleModel}</p>)}
                            <p className="text-sm text-slate-500 mt-1 line-clamp-1">{CATEGORY_LABELS[request.serviceCategory] || request.serviceCategory} - {request.serviceDescription}</p>
                          </div>
                        </div>
                        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-slate-500">
                          <span className="inline-flex items-center gap-1"><Calendar className="h-4 w-4" />{formatDate(request.createdAt)}</span>
                          <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" />{request.locationAddress}</span>
                          <span className="inline-flex items-center gap-1"><Clock className="h-4 w-4" />{URGENCY_LABELS[request.urgency]}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {request.quotesReceived > 0 && (<div className="text-center px-4 py-2 rounded-lg bg-emerald-50"><p className="text-2xl font-bold text-emerald-600">{request.quotesReceived}</p><p className="text-xs text-emerald-600">quote{request.quotesReceived !== 1 ? 's' : ''}</p></div>)}
                        <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-emerald-600 transition" />
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>); })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

// ── Utility-page building blocks (2026-08-08 redesign) ─────────────────────

const PlateBadge = ({ value }: { value: string }) => (
  <span className="inline-block w-fit whitespace-nowrap rounded-md border border-slate-300 bg-slate-50 px-2 py-1 text-center font-mono text-sm font-semibold uppercase tracking-wide text-slate-800">
    {value}
  </span>
);

const STATUS_CHIP: Record<string, string> = {
  completed: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  in_progress: 'border-teal-200 bg-teal-50 text-teal-700',
  pending: 'border-amber-200 bg-amber-50 text-amber-700',
  cancelled: 'border-red-200 bg-red-50 text-red-600',
};

interface BookingsSectionProps { bookings: Booking[]; activeBooking: Booking | null; loading: boolean; onCancelBooking: (id: string, rego: string) => void; onBookingClick: () => void; onOpenForm: (bookingId: string, formType: 'pickup' | 'return' | 'claim') => void; }
function BookingsSection({ bookings, activeBooking, loading, onCancelBooking, onBookingClick, onOpenForm }: BookingsSectionProps) {
  const formatDateTime = (dateString: string) => new Date(dateString).toLocaleString('en-AU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  const getStageLabel = (stageId: string) => STAGES.find((s) => s.id === stageId)?.label || stageId;

  if (loading) return (<div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-emerald-600" /></div>);

  if (bookings.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-slate-100"><Car className="h-7 w-7 text-slate-400" /></div>
        <h3 className="text-lg font-semibold text-slate-900">No bookings yet</h3>
        <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">Book your first car service and we&apos;ll handle the pickup, service, and return.</p>
        <button onClick={onBookingClick} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500"><Plus className="h-4 w-4" />Book a Service</button>
      </div>
    );
  }

  const pendingForms = activeBooking ? getPendingForms(activeBooking) : null;
  const hasSignedPickup = activeBooking?.signedForms?.some((f) => f.formType === 'pickup_consent');
  const hasSignedReturn = activeBooking?.signedForms?.some((f) => f.formType === 'return_confirmation');
  const pastBookings = bookings.filter((b) => b._id !== activeBooking?._id);

  return (
    <div className="space-y-4">
      {/* Action required: unsigned forms */}
      {activeBooking && pendingForms && (pendingForms.pickup || pendingForms.return_) && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <ClipboardCheck className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-amber-900">Signature needed</p>
              <p className="mt-0.5 text-xs text-amber-700">Please sign the form{pendingForms.pickup && pendingForms.return_ ? 's' : ''} below for {activeBooking.vehicleRegistration}.</p>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {pendingForms.pickup && (<button onClick={() => onOpenForm(activeBooking._id, 'pickup')} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-emerald-500"><ClipboardCheck className="h-3.5 w-3.5" />Sign Pickup Consent</button>)}
                {pendingForms.return_ && (<button onClick={() => onOpenForm(activeBooking._id, 'return')} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-blue-500"><PackageCheck className="h-3.5 w-3.5" />Sign Return Confirmation</button>)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Current booking — everything in ONE card, tracker link prominent */}
      {activeBooking && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <PlateBadge value={activeBooking.vehicleRegistration} />
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                {getStageLabel(activeBooking.currentStage)}
              </span>
              <span className="text-xs text-slate-400">{activeBooking.serviceType}</span>
            </div>
            <Link href="/track" className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-emerald-500">
              <MapPin className="h-3.5 w-3.5" />
              Track your car
            </Link>
          </div>

          {/* Progress */}
          <div className="mt-4">
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="text-slate-500">Progress</span>
              <span className="font-semibold text-emerald-600">{activeBooking.overallProgress}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div className="h-2 rounded-full bg-emerald-500 transition-all duration-500" style={{ width: `${activeBooking.overallProgress}%` }} />
            </div>
          </div>

          {/* Key facts, single compact row set */}
          <div className="mt-4 grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
            <span className="inline-flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 shrink-0 text-slate-400" />Pickup: <span className="font-medium text-slate-800">{activeBooking.pickupTime}</span></span>
            <span className="inline-flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 shrink-0 text-slate-400" />Dropoff: <span className="font-medium text-slate-800">{activeBooking.dropoffTime}</span></span>
            <span className="inline-flex items-center gap-1.5 sm:col-span-2"><MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" /><span className="truncate">{activeBooking.pickupAddress}</span></span>
          </div>

          {/* Signed-form chips */}
          {(hasSignedPickup || hasSignedReturn) && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {hasSignedPickup && (<span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-600"><CheckCircle className="h-3 w-3" />Pickup consent signed</span>)}
              {hasSignedReturn && (<span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-600"><CheckCircle className="h-3 w-3" />Return confirmed</span>)}
            </div>
          )}

          {/* Secondary actions, small and out of the way */}
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
            {(activeBooking.status === 'in_progress' || activeBooking.status === 'completed') && (
              <button onClick={() => onOpenForm(activeBooking._id, 'claim')} className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 transition hover:border-amber-300"><FileWarning className="h-3.5 w-3.5" />Lodge a claim</button>
            )}
            {activeBooking.status === 'pending' && (
              <button onClick={() => onCancelBooking(activeBooking._id, activeBooking.vehicleRegistration)} className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50"><XCircle className="h-3.5 w-3.5" />Request cancellation</button>
            )}
            <span className="ml-auto text-[11px] text-slate-400">Updated {formatDateTime(activeBooking.updatedAt)}</span>
          </div>
          {activeBooking.status === 'pending' && (
            <p className="mt-2 text-[11px] text-slate-400">Cancellations can be requested up to {CANCELLATION_CUTOFF_HOURS} hours before pickup. Within {CANCELLATION_CUTOFF_HOURS} hours, please call {SUPPORT_PHONE}.</p>
          )}
        </div>
      )}

      {/* Past bookings — compact rows */}
      {pastBookings.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">{activeBooking ? 'Past bookings' : 'Your bookings'}</h2>
            <Link href="/dashboard/bookings" className="inline-flex items-center gap-0.5 text-xs font-medium text-emerald-600 hover:text-emerald-500">View all<ChevronRight className="h-3.5 w-3.5" /></Link>
          </div>
          <ul className="divide-y divide-slate-100">
            {pastBookings.slice(0, 5).map((booking) => (
              <li key={booking._id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="flex min-w-0 items-center gap-2.5">
                  <PlateBadge value={booking.vehicleRegistration} />
                  <div className="min-w-0">
                    <p className="truncate text-xs text-slate-600">{booking.serviceType}</p>
                    <p className="text-[11px] text-slate-400">{new Date(booking.createdAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                  </div>
                </div>
                <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize ${STATUS_CHIP[booking.status] || 'border-slate-200 bg-slate-50 text-slate-600'}`}>{booking.status.replace('_', ' ')}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/** Account bits, tucked behind a collapsible card (change password + settings link) */
function AccountSection() {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between p-4 text-left"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Settings className="h-4 w-4 text-slate-400" />
          Account
        </span>
        <ChevronRight className={`h-4 w-4 text-slate-400 transition-transform duration-300 ${open ? 'rotate-90' : ''}`} />
      </button>
      <div className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
        <div className="overflow-hidden">
          <div className="space-y-4 border-t border-slate-100 p-4">
            <ChangePasswordForm />
            <Link href="/account" className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-500">
              All account settings<ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function DashboardContent() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [quoteRequests, setQuoteRequests] = useState<QuoteRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [quotesLoading, setQuotesLoading] = useState(true);
  const [error, setError] = useState('');
  const [updateNotification, setUpdateNotification] = useState<string | null>(null);
  const [cancelModalBooking, setCancelModalBooking] = useState<{ id: string; rego: string } | null>(null);
  const [refreshingQuotes, setRefreshingQuotes] = useState(false);
  const [formModal, setFormModal] = useState<{ bookingId: string; type: 'pickup' | 'return' | 'claim' } | null>(null);

  const previousBookingsRef = useRef<Booking[]>([]);
  const isInitialLoadRef = useRef(true);
  const autoPromptedRef = useRef<Set<string>>(new Set());
  // Mirrors formModal so the polling auto-prompt can never replace a form
  // the customer is mid-way through (re-audit NB-4, fixed 2026-08-16)
  const formModalOpenRef = useRef(false);
  useEffect(() => {
    formModalOpenRef.current = formModal !== null;
  }, [formModal]);

  // Navigate to /booking instead of opening a modal
  const handleBookingClick = useCallback(() => { router.push('/booking'); }, [router]);

  const handleOpenForm = useCallback((bookingId: string, formType: 'pickup' | 'return' | 'claim') => { setFormModal({ bookingId, type: formType }); }, []);
  const handleFormSuccess = useCallback(() => { setFormModal(null); fetchBookings(false); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const checkAutoPrompt = useCallback((newBookings: Booking[]) => {
    // Never stomp an open form modal (the customer may be mid-claim)
    if (formModalOpenRef.current) return;
    for (const b of newBookings) {
      if (b.status !== 'in_progress' && b.status !== 'pending') continue;
      const pending = getPendingForms(b);
      if (pending.pickup && !autoPromptedRef.current.has(`${b._id}-pickup`)) { autoPromptedRef.current.add(`${b._id}-pickup`); setFormModal({ bookingId: b._id, type: 'pickup' }); return; }
      if (pending.return_ && !autoPromptedRef.current.has(`${b._id}-return`)) { autoPromptedRef.current.add(`${b._id}-return`); setFormModal({ bookingId: b._id, type: 'return' }); return; }
    }
  }, []);

  const detectBookingChanges = useCallback((newBookings: Booking[]) => {
    if (isInitialLoadRef.current || previousBookingsRef.current.length === 0) return null;
    for (const newBooking of newBookings) {
      const prevBooking = previousBookingsRef.current.find((b) => b._id === newBooking._id);
      if (prevBooking) {
        if (newBooking.currentStage !== prevBooking.currentStage) { const newStage = STAGES.find((s) => s.id === newBooking.currentStage); return `Your booking has progressed to: ${newStage?.label || newBooking.currentStage}`; }
        if (newBooking.status !== prevBooking.status) { if (newBooking.status === 'completed') return 'Your car service has been completed!'; if (newBooking.status === 'cancelled') return 'Your booking has been cancelled'; }
        if (newBooking.updates.length > prevBooking.updates.length) return newBooking.updates[newBooking.updates.length - 1].message;
      }
    }
    return null;
  }, []);

  const fetchBookings = useCallback(async (isPolling = false) => {
    try {
      if (!isPolling) setLoading(true);
      const response = await fetch('/api/bookings');
      if (!response.ok) throw new Error('Failed to fetch bookings');
      const data = await response.json();
      if (isPolling) { const changeMessage = detectBookingChanges(data); if (changeMessage) setUpdateNotification(changeMessage); }
      // Auto-prompt on FIRST load too, not just on polls — a customer landing
      // with a pending signature previously waited 30s for the modal
      checkAutoPrompt(data);
      previousBookingsRef.current = data; setBookings(data); setError('');
      if (!isPolling) isInitialLoadRef.current = false;
    } catch { if (!isPolling) setError('Failed to load your bookings'); }
    finally { if (!isPolling) setLoading(false); }
  }, [detectBookingChanges, checkAutoPrompt]);

  const fetchQuoteRequests = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshingQuotes(true); else setQuotesLoading(true);
    try { const response = await fetch('/api/quotes/request'); const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Failed to fetch quote requests'); setQuoteRequests(data.quoteRequests); }
    catch (err) { console.error('Error fetching quotes:', err); }
    finally { setQuotesLoading(false); setRefreshingQuotes(false); }
  }, []);

  // Quotes only fetched when the Phase 2 flag is on — no wasted request
  useEffect(() => { if (authStatus === 'loading') return; if (!session?.user) { router.push('/login'); return; } fetchBookings(false); if (QUOTES_ENABLED) fetchQuoteRequests(false); else setQuotesLoading(false); }, [session, authStatus, router, fetchBookings, fetchQuoteRequests]);
  useEffect(() => { if (authStatus !== 'authenticated' || !session?.user) return; const pollInterval = setInterval(() => { fetchBookings(true); }, POLLING_INTERVAL); return () => clearInterval(pollInterval); }, [authStatus, session, fetchBookings]);
  useEffect(() => { if (updateNotification) { const timer = setTimeout(() => setUpdateNotification(null), 5000); return () => clearTimeout(timer); } }, [updateNotification]);

  const activeBooking = bookings.find((b) => b.status === 'in_progress' || b.status === 'pending');

  const formBooking = formModal ? bookings.find((b) => b._id === formModal.bookingId) : null;
  const formBookingData = formBooking ? {
    _id: formBooking._id, userName: formBooking.userName || session?.user?.username || session?.user?.email?.split('@')[0] || '',
    userEmail: formBooking.userEmail || session?.user?.email || '', vehicleRegistration: formBooking.vehicleRegistration,
    vehicleState: formBooking.vehicleState, vehicleModel: formBooking.vehicleModel, vehicleYear: formBooking.vehicleYear,
    vehicleColor: formBooking.vehicleColor, pickupAddress: formBooking.pickupAddress, garageName: formBooking.garageName,
    garageAddress: formBooking.garageAddress, transmissionType: formBooking.transmissionType, pickupTime: formBooking.pickupTime,
    dropoffTime: formBooking.dropoffTime, createdAt: formBooking.createdAt,
  } : null;

  if (authStatus === 'loading' || loading) {
    return (<main className="min-h-screen bg-gradient-to-b from-slate-50 to-white"><div className="flex items-center justify-center py-20"><div className="text-center"><div className="h-16 w-16 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto mb-4"><Loader2 className="h-8 w-8 animate-spin text-emerald-600" /></div><p className="text-slate-600 font-medium">Loading your dashboard...</p></div></div></main>);
  }

  if (error) {
    return (<main className="min-h-screen bg-slate-50"><div className="mx-auto max-w-5xl px-4 py-8"><div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center"><AlertCircle className="mx-auto h-8 w-8 text-red-500" /><p className="mt-2 text-red-700">{error}</p><button onClick={() => fetchBookings(false)} className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500">Retry</button></div></div></main>);
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <CancelBookingModal bookingId={cancelModalBooking?.id || ''} vehicleRego={cancelModalBooking?.rego || ''} isOpen={!!cancelModalBooking} onClose={() => setCancelModalBooking(null)} onSuccess={() => { setCancelModalBooking(null); fetchBookings(false); }} />

      {formBookingData && formModal?.type === 'pickup' && (<PickupConsentForm booking={formBookingData} isOpen={true} onClose={() => setFormModal(null)} onSuccess={handleFormSuccess} driverName={formBooking?.driver?.firstName || ''} />)}
      {formBookingData && formModal?.type === 'return' && (<ReturnConfirmationForm booking={formBookingData} isOpen={true} onClose={() => setFormModal(null)} onSuccess={handleFormSuccess} driverName={formBooking?.driver?.firstName || ''} />)}
      {formBookingData && formModal?.type === 'claim' && (<ClaimLodgementForm booking={formBookingData} isOpen={true} onClose={() => setFormModal(null)} onSuccess={handleFormSuccess} />)}

      {updateNotification && (
        <div className="fixed top-20 left-1/2 z-50 -translate-x-1/2 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 shadow-lg">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500"><Bell className="h-4 w-4 text-white" /></div>
            <div><p className="text-sm font-medium text-emerald-800">Booking Updated</p><p className="text-sm text-emerald-700">{updateNotification}</p></div>
            <button onClick={() => setUpdateNotification(null)} className="ml-2 rounded-lg p-1 text-emerald-600 hover:bg-emerald-100"><X className="h-4 w-4" /></button>
          </div>
        </div>
      )}

      {/* Slim top bar: title + the one primary action. No welcome banner —
          this page is a utility, not a destination (2026-08-08 redesign). */}
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <h1 className="text-base font-semibold text-slate-900">My bookings</h1>
            <Link href="/" className="hidden text-xs font-medium text-slate-400 transition hover:text-emerald-600 sm:block">← Home</Link>
          </div>
          <button
            onClick={handleBookingClick}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-emerald-500"
          >
            <Plus className="h-3.5 w-3.5" />
            Book a service
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-3xl space-y-4 px-4 py-5 sm:px-6">
        <BookingsSection
          bookings={bookings}
          activeBooking={activeBooking || null}
          loading={loading}
          onCancelBooking={(id, rego) => setCancelModalBooking({ id, rego })}
          onBookingClick={handleBookingClick}
          onOpenForm={handleOpenForm}
        />

        {/* Phase 2: quotes return here with the flag */}
        {QUOTES_ENABLED && (
          <QuoteRequestsSection
            quoteRequests={quoteRequests}
            loading={quotesLoading}
            onRefresh={() => fetchQuoteRequests(true)}
            refreshing={refreshingQuotes}
          />
        )}

        {/* Account bits, tucked away but reachable */}
        <AccountSection />
      </div>
    </main>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-gradient-to-b from-slate-50 to-white"><div className="flex items-center justify-center py-20"><div className="text-center"><div className="h-16 w-16 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto mb-4"><Loader2 className="h-8 w-8 animate-spin text-emerald-600" /></div><p className="text-slate-600 font-medium">Loading your dashboard...</p></div></div></main>}>
      <DashboardContent />
    </Suspense>
  );
}
