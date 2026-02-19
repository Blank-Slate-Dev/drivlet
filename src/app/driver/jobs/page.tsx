// src/app/driver/jobs/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Briefcase,
  MapPin,
  Clock,
  Car,
  CheckCircle,
  Loader2,
  RefreshCw,
  AlertTriangle,
  Play,
  Star,
  DollarSign,
  Link as LinkIcon,
  Copy,
  Check,
  Phone,
  Navigation,
  CreditCard,
  X,
  Camera,
  PhoneCall,
  ArrowRight,
  ArrowLeft,
  Package,
  Truck,
} from "lucide-react";
import PhotoUploadModal from "@/components/driver/PhotoUploadModal";
import IncidentReportButton from "@/components/driver/IncidentReportButton";
import IncidentReportForm, {
  IncidentSubmittedModal,
} from "@/components/driver/IncidentReportForm";

// ─── Types ─────────────────────────────────────────────────────

interface CheckpointStatus {
  pre_pickup: number;
  service_dropoff: number;
  service_pickup: number;
  final_delivery: number;
}

interface Job {
  _id: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  vehicleRegistration: string;
  vehicleState: string;
  serviceType: string;
  pickupAddress: string;
  garageName?: string;
  garageAddress?: string;
  pickupTime: string;
  dropoffTime: string;
  isManualTransmission: boolean;
  hasExistingBooking: boolean;
  status: string;
  currentStage?: string;
  createdAt: string;
  payout: number;
  isPreferredArea: boolean;
  servicePaymentStatus?: string | null;
  servicePaymentAmount?: number | null;
  servicePaymentUrl?: string | null;
  checkpointStatus?: CheckpointStatus;
  // Leg state info
  pickupDriverState?: string | null;
  returnDriverState?: string | null;
  pickupClaimedByMe?: boolean;
  returnClaimedByMe?: boolean;
  canStartReturn?: boolean;
  returnWaitingReason?: string | null;
  hasActiveIncident?: boolean;
  incidentExceptionState?: string | null;
}

interface MyJobs {
  accepted: Job[];
  in_progress: Job[];
  awaiting_payment: Job[];
  ready_for_return: Job[];
}

// ─── Tailwind class maps (avoid dynamic class purging) ─────────

const statusColorMap: Record<string, { bg: string; text: string }> = {
  blue: { bg: "bg-blue-100", text: "text-blue-700" },
  amber: { bg: "bg-amber-100", text: "text-amber-700" },
  emerald: { bg: "bg-emerald-100", text: "text-emerald-700" },
  orange: { bg: "bg-orange-100", text: "text-orange-700" },
  slate: { bg: "bg-slate-100", text: "text-slate-700" },
  purple: { bg: "bg-purple-100", text: "text-purple-700" },
  red: { bg: "bg-red-100", text: "text-red-700" },
};

// ─── Helpers ───────────────────────────────────────────────────

function getPickupStateInfo(state: string | null | undefined) {
  switch (state) {
    case "assigned":
      return { label: "Upcoming", colorKey: "blue" };
    case "started":
      return { label: "En Route", colorKey: "amber" };
    case "arrived":
      return { label: "At Customer", colorKey: "purple" };
    case "collected":
      return { label: "Car Collected", colorKey: "amber" };
    case "completed":
      return { label: "Completed", colorKey: "emerald" };
    default:
      return { label: "Pending", colorKey: "slate" };
  }
}

function getReturnStateInfo(
  state: string | null | undefined,
  canStart: boolean,
  hasReturn: boolean
) {
  if (!hasReturn) return { label: "Not Assigned", colorKey: "slate" };
  switch (state) {
    case "assigned":
      if (canStart) return { label: "Ready", colorKey: "emerald" };
      return { label: "Waiting", colorKey: "amber" };
    case "started":
      return { label: "Heading to Workshop", colorKey: "blue" };
    case "collected":
      return { label: "Collected from Workshop", colorKey: "amber" };
    case "delivering":
      return { label: "Delivering", colorKey: "blue" };
    case "completed":
      return { label: "Delivered", colorKey: "emerald" };
    default:
      return { label: "Pending", colorKey: "slate" };
  }
}

function StatusBadge({ colorKey, label }: { colorKey: string; label: string }) {
  const colors = statusColorMap[colorKey] || statusColorMap.slate;
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${colors.bg} ${colors.text}`}
    >
      {label}
    </span>
  );
}

// ─── Action types ──────────────────────────────────────────────

type JobAction =
  | "start_pickup"
  | "arrived_pickup"
  | "collected"
  | "dropped_at_workshop"
  | "start_return"
  | "collected_from_workshop"
  | "delivering"
  | "delivered"
  | "generate_payment";

// ─── Main Page Component ──────────────────────────────────────

export default function DriverJobsPage() {
  useSession();

  const [myJobs, setMyJobs] = useState<MyJobs>({
    accepted: [],
    in_progress: [],
    awaiting_payment: [],
    ready_for_return: [],
  });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState("");

  // Payment modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [serviceAmount, setServiceAmount] = useState("");
  const [generatingPayment, setGeneratingPayment] = useState(false);
  const [generatedLink, setGeneratedLink] = useState("");
  const [linkCopied, setLinkCopied] = useState(false);
  const [paymentError, setPaymentError] = useState("");

  // Photo upload modal state
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [photoJob, setPhotoJob] = useState<Job | null>(null);

  // Call customer state
  const [callingCustomer, setCallingCustomer] = useState<string | null>(null);
  const [callSuccess, setCallSuccess] = useState<string | null>(null);

  // Incident report state
  const [showIncidentForm, setShowIncidentForm] = useState(false);
  const [incidentBookingId, setIncidentBookingId] = useState<string | null>(null);
  const [incidentSubmittedState, setIncidentSubmittedState] = useState<string | null>(null);

  // ─── Fetch ─────────────────────────────────────────────────

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/driver/jobs?status=all");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch jobs");
      setMyJobs(data.myJobs);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch jobs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
    const interval = setInterval(fetchJobs, 15000);
    return () => clearInterval(interval);
  }, [fetchJobs]);

  // ─── Job Actions ───────────────────────────────────────────

  const handleJobAction = async (
    jobId: string,
    action: JobAction,
    extraData?: Record<string, unknown>
  ) => {
    setActionLoading(jobId);
    try {
      const res = await fetch("/api/driver/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: jobId, action, ...extraData }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Action failed");
      await fetchJobs();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setActionLoading(null);
    }
  };

  // ─── Call Customer ─────────────────────────────────────────

  const handleCallCustomer = async (job: Job) => {
    if (!job.customerPhone) {
      setError("Customer phone number not available");
      return;
    }
    setCallingCustomer(job._id);
    setError("");
    try {
      const res = await fetch("/api/driver/call-customer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: job._id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to initiate call");
      setCallSuccess(job._id);
      setTimeout(() => setCallSuccess(null), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to call customer");
    } finally {
      setCallingCustomer(null);
    }
  };

  // ─── Payment Modal ────────────────────────────────────────

  const openPaymentModal = (job: Job) => {
    setSelectedJob(job);
    setServiceAmount(
      job.servicePaymentAmount
        ? (job.servicePaymentAmount / 100).toString()
        : ""
    );
    setGeneratedLink(job.servicePaymentUrl || "");
    setPaymentError("");
    setShowPaymentModal(true);
  };

  const generatePaymentLink = async () => {
    if (!selectedJob) return;
    const amountDollars = parseFloat(serviceAmount);
    if (isNaN(amountDollars) || amountDollars <= 0) {
      setPaymentError("Please enter a valid amount");
      return;
    }
    setGeneratingPayment(true);
    setPaymentError("");
    try {
      const res = await fetch("/api/driver/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: selectedJob._id,
          action: "generate_payment",
          serviceAmount: Math.round(amountDollars * 100),
        }),
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error || "Failed to generate payment link");
      setGeneratedLink(data.paymentLink);
      fetchJobs();
    } catch (err) {
      setPaymentError(
        err instanceof Error ? err.message : "Failed to generate link"
      );
    } finally {
      setGeneratingPayment(false);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(generatedLink);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const closePaymentModal = () => {
    setShowPaymentModal(false);
    setSelectedJob(null);
    setGeneratedLink("");
  };

  // ─── Photo Modal ──────────────────────────────────────────

  const openPhotoModal = (job: Job) => {
    setPhotoJob(job);
    setShowPhotoModal(true);
  };

  const closePhotoModal = () => {
    setShowPhotoModal(false);
    setPhotoJob(null);
    fetchJobs();
  };

  // ─── Computed ─────────────────────────────────────────────

  const totalJobs = Object.values(myJobs).flat().length;

  // ─── Render ───────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <div className="mx-auto max-w-2xl px-4 py-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">My Jobs</h1>
            <p className="text-sm text-slate-500">
              Your assigned pickups &amp; returns
            </p>
          </div>
          <button
            onClick={() => fetchJobs()}
            disabled={loading}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-600"
          >
            <RefreshCw
              className={`h-5 w-5 ${loading ? "animate-spin" : ""}`}
            />
          </button>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-red-700">
            <AlertTriangle className="h-5 w-5" />
            <span className="text-sm">{error}</span>
            <button onClick={() => setError("")} className="ml-auto">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Loading */}
        {loading && totalJobs === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            <p className="mt-2 text-sm text-slate-500">Loading jobs...</p>
          </div>
        ) : (
          <>
            {/* Empty State */}
            {!loading && totalJobs === 0 && (
              <div className="rounded-xl border border-slate-200 bg-white py-16 text-center">
                <Briefcase className="mx-auto h-12 w-12 text-slate-300" />
                <h3 className="mt-4 text-lg font-medium text-slate-900">
                  No jobs assigned
                </h3>
                <p className="mt-2 text-sm text-slate-500">
                  Jobs will appear here when dispatch assigns them to you
                </p>
              </div>
            )}

            {/* ═══ MY JOBS ═══ */}
            {totalJobs > 0 && (
              <div className="space-y-3">
                <AnimatePresence mode="popLayout">
                  {/* In Progress — highest priority */}
                  {myJobs.in_progress.map((job) => (
                    <MyJobCard
                      key={`ip-${job._id}`}
                      job={job}
                      actionLoading={actionLoading}
                      onAction={handleJobAction}
                      onOpenPayment={openPaymentModal}
                      onOpenPhotos={openPhotoModal}
                      onCallCustomer={handleCallCustomer}
                      callingCustomer={callingCustomer}
                      callSuccess={callSuccess}
                      onReportIncident={(id) => {
                        setIncidentBookingId(id);
                        setShowIncidentForm(true);
                      }}
                    />
                  ))}

                  {/* Awaiting Payment */}
                  {myJobs.awaiting_payment.map((job) => (
                    <MyJobCard
                      key={`ap-${job._id}`}
                      job={job}
                      actionLoading={actionLoading}
                      onAction={handleJobAction}
                      onOpenPayment={openPaymentModal}
                      onOpenPhotos={openPhotoModal}
                      onCallCustomer={handleCallCustomer}
                      callingCustomer={callingCustomer}
                      callSuccess={callSuccess}
                      onReportIncident={(id) => {
                        setIncidentBookingId(id);
                        setShowIncidentForm(true);
                      }}
                    />
                  ))}

                  {/* Ready for Return */}
                  {myJobs.ready_for_return.map((job) => (
                    <MyJobCard
                      key={`rr-${job._id}`}
                      job={job}
                      actionLoading={actionLoading}
                      onAction={handleJobAction}
                      onOpenPayment={openPaymentModal}
                      onOpenPhotos={openPhotoModal}
                      onCallCustomer={handleCallCustomer}
                      callingCustomer={callingCustomer}
                      callSuccess={callSuccess}
                      onReportIncident={(id) => {
                        setIncidentBookingId(id);
                        setShowIncidentForm(true);
                      }}
                    />
                  ))}

                  {/* Accepted / Upcoming */}
                  {myJobs.accepted.map((job) => (
                    <MyJobCard
                      key={`ac-${job._id}`}
                      job={job}
                      actionLoading={actionLoading}
                      onAction={handleJobAction}
                      onOpenPayment={openPaymentModal}
                      onOpenPhotos={openPhotoModal}
                      onCallCustomer={handleCallCustomer}
                      callingCustomer={callingCustomer}
                      callSuccess={callSuccess}
                      onReportIncident={(id) => {
                        setIncidentBookingId(id);
                        setShowIncidentForm(true);
                      }}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </>
        )}
      </div>

      {/* ═══ PAYMENT MODAL ═══ */}
      {showPaymentModal && selectedJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
                  <DollarSign className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <h2 className="font-semibold text-slate-900">
                    Service Payment
                  </h2>
                  <p className="text-sm text-slate-500">
                    {selectedJob.vehicleRegistration}
                  </p>
                </div>
              </div>
              <button
                onClick={closePaymentModal}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 p-4">
              {paymentError && (
                <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-red-700">
                  <AlertTriangle className="h-5 w-5" />
                  <span className="text-sm">{paymentError}</span>
                </div>
              )}

              {generatedLink ? (
                <>
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-emerald-600" />
                      <span className="font-medium text-emerald-800">
                        Payment Link Ready
                      </span>
                    </div>
                    <p className="mb-3 text-sm text-emerald-700">
                      Send this to the customer. Once they pay, return leg
                      becomes available.
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={generatedLink}
                        readOnly
                        className="flex-1 truncate rounded-lg border border-emerald-300 bg-white px-3 py-2 text-sm"
                      />
                      <button
                        onClick={copyLink}
                        className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
                      >
                        {linkCopied ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {selectedJob.customerPhone && (
                    <a
                      href={`sms:${selectedJob.customerPhone}?body=Your car service is complete! Please pay here: ${generatedLink}`}
                      className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-500"
                    >
                      <Phone className="h-4 w-4" />
                      Send via SMS
                    </a>
                  )}

                  <button
                    onClick={closePaymentModal}
                    className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Done
                  </button>
                </>
              ) : (
                <>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Service Total from Garage (AUD)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                        $
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={serviceAmount}
                        onChange={(e) => setServiceAmount(e.target.value)}
                        placeholder="0.00"
                        disabled={generatingPayment}
                        className="w-full rounded-lg border border-slate-300 py-3 pl-8 pr-4 text-lg text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                      />
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      Enter the exact amount the garage charged
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={closePaymentModal}
                      disabled={generatingPayment}
                      className="flex-1 rounded-lg border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={generatePaymentLink}
                      disabled={generatingPayment || !serviceAmount}
                      className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                    >
                      {generatingPayment ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <LinkIcon className="h-4 w-4" />
                      )}
                      Generate Link
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══ PHOTO UPLOAD MODAL ═══ */}
      {showPhotoModal && photoJob && (
        <PhotoUploadModal
          isOpen={showPhotoModal}
          onClose={closePhotoModal}
          bookingId={photoJob._id}
          customerName={photoJob.customerName}
          vehicleRegistration={photoJob.vehicleRegistration}
          vehicleState={photoJob.vehicleState}
          currentStage={photoJob.currentStage}
        />
      )}

      {/* ═══ INCIDENT REPORT FORM ═══ */}
      {showIncidentForm && incidentBookingId && (
        <IncidentReportForm
          bookingId={incidentBookingId}
          onClose={() => {
            setShowIncidentForm(false);
            setIncidentBookingId(null);
          }}
          onSubmitted={(exceptionState) => {
            setShowIncidentForm(false);
            setIncidentBookingId(null);
            setIncidentSubmittedState(exceptionState);
            fetchJobs();
          }}
        />
      )}

      {/* ═══ INCIDENT SUBMITTED CONFIRMATION ═══ */}
      {incidentSubmittedState && (
        <IncidentSubmittedModal
          exceptionState={incidentSubmittedState}
          onClose={() => setIncidentSubmittedState(null)}
        />
      )}
    </div>
  );
}

// ─── MyJobCard Component ───────────────────────────────────────
// Shows a paired card with both pickup and return legs visible

function MyJobCard({
  job,
  actionLoading,
  onAction,
  onOpenPayment,
  onOpenPhotos,
  onCallCustomer,
  callingCustomer,
  callSuccess,
  onReportIncident,
}: {
  job: Job;
  actionLoading: string | null;
  onAction: (
    jobId: string,
    action: JobAction,
    extraData?: Record<string, unknown>
  ) => void;
  onOpenPayment: (job: Job) => void;
  onOpenPhotos: (job: Job) => void;
  onCallCustomer: (job: Job) => void;
  callingCustomer: string | null;
  callSuccess: string | null;
  onReportIncident: (bookingId: string) => void;
}) {
  const isLoading = actionLoading === job._id;
  const isCalling = callingCustomer === job._id;
  const isCallSuccess = callSuccess === job._id;

  const isMyPickup = job.pickupClaimedByMe;
  const isMyReturn = job.returnClaimedByMe;
  const hasReturn = !!job.returnClaimedByMe;

  const pickupState = job.pickupDriverState;
  const returnState = job.returnDriverState;
  const pickupComplete = pickupState === "completed";

  const pickupInfo = getPickupStateInfo(pickupState);
  const returnInfo = getReturnStateInfo(
    returnState,
    !!job.canStartReturn,
    hasReturn
  );

  // Photo progress
  const cs = job.checkpointStatus;
  const photoCount = cs
    ? cs.pre_pickup + cs.service_dropoff + cs.service_pickup + cs.final_delivery
    : 0;
  const photoProgress = Math.round((photoCount / 20) * 100);
  const completedCheckpoints = cs
    ? [
        cs.pre_pickup >= 5,
        cs.service_dropoff >= 5,
        cs.service_pickup >= 5,
        cs.final_delivery >= 5,
      ].filter(Boolean).length
    : 0;

  // Determine if any leg is actively in progress (for showing photos/call)
  const hasActiveLeg =
    (isMyPickup && !pickupComplete) ||
    (isMyReturn &&
      returnState &&
      returnState !== "completed" &&
      returnState !== "assigned");

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="overflow-hidden rounded-xl border border-slate-200 bg-white"
    >
      {/* ─── Vehicle Header ─── */}
      <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
        <Car className="h-5 w-5 text-emerald-600" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-slate-900">
            {job.vehicleRegistration} ({job.vehicleState})
          </p>
          <p className="truncate text-xs text-slate-500">
            {job.customerName} &middot; {job.serviceType}
            {job.isManualTransmission && (
              <span className="ml-1 text-amber-600">Manual</span>
            )}
          </p>
        </div>
        <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
          ${job.payout}
        </span>
      </div>

      {/* ─── Exception State Banner ─── */}
      {job.hasActiveIncident && job.incidentExceptionState === "hold" && (
        <div className="flex items-center gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2">
          <AlertTriangle className="h-4 w-4 flex-shrink-0 text-amber-600" />
          <span className="text-xs font-semibold text-amber-800">
            Job on hold — Waiting for Ops instructions
          </span>
        </div>
      )}
      {job.hasActiveIncident && job.incidentExceptionState === "stop" && (
        <div className="flex items-center gap-2 border-b border-red-200 bg-red-50 px-4 py-2">
          <AlertTriangle className="h-4 w-4 flex-shrink-0 text-red-600" />
          <span className="text-xs font-semibold text-red-800">
            Job stopped — Do not proceed. Ops will contact you.
          </span>
        </div>
      )}

      {/* ─── Pickup Leg ─── */}
      {isMyPickup && (
        <div className="border-b border-slate-50 px-4 py-3">
          <div className="mb-2 flex items-center gap-2">
            <ArrowRight className="h-3.5 w-3.5 text-emerald-600" />
            <span className="text-xs font-bold uppercase tracking-wide text-slate-400">
              Pickup
            </span>
            <StatusBadge
              colorKey={pickupInfo.colorKey}
              label={pickupInfo.label}
            />
            {job.isPreferredArea && (
              <span className="flex items-center gap-0.5 text-xs text-amber-500">
                <Star className="h-3 w-3 fill-amber-400" />
                Your area
              </span>
            )}
          </div>

          <div className="space-y-1 text-sm text-slate-600">
            <div className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
              <span>{job.pickupAddress}</span>
            </div>
            {job.garageName && (
              <div className="flex items-start gap-2">
                <Navigation className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
                <span>{job.garageName}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 text-slate-400" />
              <span>Pickup: {job.pickupTime}</span>
            </div>
          </div>

          {/* Pickup Actions */}
          {!pickupComplete && (
            <div className="mt-3 flex flex-wrap gap-2">
              {pickupState === "assigned" && (
                <button
                  onClick={() => onAction(job._id, "start_pickup")}
                  disabled={isLoading}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                  Start Pickup
                </button>
              )}
              {pickupState === "started" && (
                <button
                  onClick={() => onAction(job._id, "arrived_pickup")}
                  disabled={isLoading}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <MapPin className="h-4 w-4" />
                  )}
                  Arrived at Customer
                </button>
              )}
              {pickupState === "arrived" && (
                <button
                  onClick={() => onAction(job._id, "collected")}
                  disabled={isLoading}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Car className="h-4 w-4" />
                  )}
                  Car Collected
                </button>
              )}
              {pickupState === "collected" && (
                <>
                  <button
                    onClick={() => onAction(job._id, "dropped_at_workshop")}
                    disabled={isLoading}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Navigation className="h-4 w-4" />
                    )}
                    Dropped at Workshop
                  </button>
                  {!job.servicePaymentUrl && (
                    <button
                      onClick={() => onOpenPayment(job)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
                    >
                      <DollarSign className="h-4 w-4" />
                      Generate Payment
                    </button>
                  )}
                </>
              )}
            </div>
          )}

          {pickupComplete && (
            <div className="mt-2 flex items-center gap-1.5 text-emerald-600">
              <CheckCircle className="h-4 w-4" />
              <span className="text-xs font-medium">
                Dropped off at {job.garageName || "workshop"}
              </span>
            </div>
          )}
        </div>
      )}

      {/* ─── Return Leg ─── */}
      {isMyReturn && (
        <div className="px-4 py-3">
          <div className="mb-2 flex items-center gap-2">
            <ArrowLeft className="h-3.5 w-3.5 text-blue-600" />
            <span className="text-xs font-bold uppercase tracking-wide text-slate-400">
              Return
            </span>
            <StatusBadge
              colorKey={returnInfo.colorKey}
              label={returnInfo.label}
            />
          </div>

          <p className="text-sm text-slate-600">
            {job.garageName || "Workshop"} &rarr; {job.pickupAddress}
          </p>
          {job.dropoffTime && (
            <div className="mt-1 flex items-center gap-2 text-sm text-slate-500">
              <Clock className="h-3.5 w-3.5" />
              <span>Return: {job.dropoffTime}</span>
            </div>
          )}

          {/* Return Actions — not started */}
          {(returnState === "assigned") && (
            <>
              {job.canStartReturn ? (
                <div className="mt-3">
                  <button
                    onClick={() => onAction(job._id, "start_return")}
                    disabled={isLoading}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                    Start Return
                  </button>
                </div>
              ) : (
                <div className="mt-2 flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
                  <Clock className="h-4 w-4 flex-shrink-0" />
                  <span>
                    {job.returnWaitingReason || "Waiting to start..."}
                  </span>
                </div>
              )}
            </>
          )}

          {/* Return Actions — in progress */}
          {returnState === "started" && (
            <div className="mt-3">
              <button
                onClick={() => onAction(job._id, "collected_from_workshop")}
                disabled={isLoading}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Package className="h-4 w-4" />
                )}
                Collected from Workshop
              </button>
            </div>
          )}
          {returnState === "collected" && (
            <div className="mt-3">
              <button
                onClick={() => onAction(job._id, "delivering")}
                disabled={isLoading}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Truck className="h-4 w-4" />
                )}
                En Route to Customer
              </button>
            </div>
          )}
          {returnState === "delivering" && (
            <div className="mt-3">
              <button
                onClick={() => onAction(job._id, "delivered")}
                disabled={isLoading}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                Delivered to Customer
              </button>
            </div>
          )}
          {returnState === "completed" && (
            <div className="mt-2 flex items-center gap-1.5 text-blue-600">
              <CheckCircle className="h-4 w-4" />
              <span className="text-xs font-medium">Delivery Complete</span>
            </div>
          )}
        </div>
      )}

      {/* ─── Info sections when not assigned to specific legs ─── */}
      {!isMyPickup && !isMyReturn && (
        <div className="px-4 py-3">
          <div className="space-y-1 text-sm text-slate-600">
            <div className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
              <span>{job.pickupAddress}</span>
            </div>
            {job.garageName && (
              <div className="flex items-start gap-2">
                <Navigation className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
                <span>{job.garageName}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Payment info for awaiting_payment stage */}
      {job.servicePaymentStatus === "pending" && job.servicePaymentUrl && (
        <div className="mx-4 mb-3 rounded-lg border border-orange-200 bg-orange-50 p-3">
          <div className="flex items-center gap-2 text-sm text-orange-800">
            <CreditCard className="h-4 w-4" />
            <span className="font-medium">Awaiting customer payment</span>
          </div>
          <p className="mt-1 text-xs text-orange-600">
            $
            {job.servicePaymentAmount
              ? (job.servicePaymentAmount / 100).toFixed(2)
              : "0.00"}{" "}
            &middot; Payment link sent
          </p>
        </div>
      )}

      {/* Payment received badge */}
      {job.servicePaymentStatus === "paid" && (
        <div className="mx-4 mb-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
          <div className="flex items-center gap-2 text-sm text-emerald-800">
            <CheckCircle className="h-4 w-4" />
            <span className="font-medium">
              Payment received &mdash; $
              {job.servicePaymentAmount
                ? (job.servicePaymentAmount / 100).toFixed(2)
                : "0.00"}
            </span>
          </div>
        </div>
      )}

      {/* Generate payment if pickup complete but no link yet */}
      {isMyPickup &&
        pickupComplete &&
        !job.servicePaymentUrl &&
        job.servicePaymentStatus !== "paid" && (
          <div className="mx-4 mb-3">
            <button
              onClick={() => onOpenPayment(job)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-100 px-4 py-2 text-sm font-medium text-amber-800 hover:bg-amber-200"
            >
              <DollarSign className="h-4 w-4" />
              Generate Payment Link
            </button>
          </div>
        )}

      {/* ─── Footer: Photos + Call + Incident ─── */}
      {hasActiveLeg && (
        <div className="space-y-2 border-t border-slate-100 px-4 py-3">
          {/* Photo Progress */}
          <button
            onClick={() => onOpenPhotos(job)}
            className="w-full rounded-lg bg-slate-50 p-3 transition hover:bg-slate-100"
          >
            <div className="mb-1.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Camera className="h-4 w-4 text-slate-500" />
                <span className="text-sm font-medium text-slate-700">
                  Vehicle Photos
                </span>
              </div>
              <span className="text-sm font-bold text-emerald-600">
                {photoCount}/20
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all"
                  style={{ width: `${photoProgress}%` }}
                />
              </div>
              <div className="flex gap-0.5">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={`h-1.5 w-1.5 rounded-full ${
                      i < completedCheckpoints
                        ? "bg-emerald-500"
                        : "bg-slate-300"
                    }`}
                  />
                ))}
              </div>
            </div>
          </button>

          {/* Call Customer */}
          {job.customerPhone && (
            <div>
              {isCallSuccess ? (
                <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                  <CheckCircle className="h-5 w-5 text-emerald-600" />
                  <div>
                    <span className="text-sm font-medium text-emerald-800">
                      Call initiated!
                    </span>
                    <p className="text-xs text-emerald-600">
                      Your phone will ring shortly.
                    </p>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => onCallCustomer(job)}
                  disabled={isCalling}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:bg-blue-400"
                >
                  {isCalling ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <PhoneCall className="h-4 w-4" />
                      Call Customer
                    </>
                  )}
                </button>
              )}
              <p className="mt-1 text-center text-xs text-slate-400">
                Your number stays private
              </p>
            </div>
          )}

          {/* Report Incident */}
          <IncidentReportButton onClick={() => onReportIncident(job._id)} />
        </div>
      )}
    </motion.div>
  );
}
