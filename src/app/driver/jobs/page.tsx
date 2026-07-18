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
  CheckCircle2,
  Circle,
  Package,
  Truck,
  ClipboardCheck,
  Undo2,
} from "lucide-react";
import { SHOW_DRIVER_EARNINGS } from "@/lib/featureFlags";
import PhotoUploadModal from "@/components/driver/PhotoUploadModal";
import {
  validateCheckpointPhotos,
  SLOT_LABELS,
  type GatedCheckpoint,
  type MinimalPhoto,
} from "@/lib/photoRequirements";
import {
  hasSignedForm,
  FORM_LABELS,
  type GatedFormType,
} from "@/lib/formRequirements";
import {
  PickupConsentForm,
  ReturnConfirmationForm,
} from "@/components/forms";
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
  vehicleModel?: string;
  vehicleYear?: string;
  transmissionType?: string;
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
  servicePaymentMethod?: "stripe_link" | "phone_direct" | null;
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
  /** Handover forms already signed for this booking (gates custody advances). */
  signedFormTypes?: string[];
  /** Driver's most recent step on their leg(s) — powers "Undo last step". */
  lastStep?: { at: string; label: string } | null;
}

interface MyJobs {
  accepted: Job[];
  in_progress: Job[];
  awaiting_payment: Job[];
  ready_for_return: Job[];
}

// ─── Tailwind class maps (avoid dynamic class purging) ─────────
// One badge system across the whole page: neutral (not-yet-started / done-resting),
// active (current in-progress state), waiting (blocked). No purple/blue.
const statusColorMap: Record<string, { bg: string; text: string }> = {
  neutral: { bg: "bg-slate-100", text: "text-slate-600" },
  active: { bg: "bg-emerald-50", text: "text-emerald-700" },
  waiting: { bg: "bg-amber-50", text: "text-amber-700" },
};

// ─── Helpers ───────────────────────────────────────────────────

function getPickupStateInfo(state: string | null | undefined) {
  switch (state) {
    case "assigned":
      return { label: "Upcoming", colorKey: "neutral" };
    case "started":
      return { label: "En Route", colorKey: "active" };
    case "arrived":
      return { label: "At Customer", colorKey: "active" };
    case "collected":
      return { label: "Car Collected", colorKey: "active" };
    case "completed":
      return { label: "Completed", colorKey: "active" };
    default:
      return { label: "Pending", colorKey: "neutral" };
  }
}

function getReturnStateInfo(
  state: string | null | undefined,
  canStart: boolean,
  hasReturn: boolean
) {
  if (!hasReturn) return { label: "Not Assigned", colorKey: "neutral" };
  switch (state) {
    case "assigned":
      if (canStart) return { label: "Ready", colorKey: "active" };
      return { label: "Waiting", colorKey: "waiting" };
    case "started":
      return { label: "Heading to Workshop", colorKey: "active" };
    case "collected":
      return { label: "Collected from Workshop", colorKey: "active" };
    case "delivering":
      return { label: "Delivering", colorKey: "active" };
    case "completed":
      return { label: "Delivered", colorKey: "active" };
    default:
      return { label: "Pending", colorKey: "neutral" };
  }
}

function StatusBadge({ colorKey, label }: { colorKey: string; label: string }) {
  const colors = statusColorMap[colorKey] || statusColorMap.neutral;
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
  | "generate_payment"
  | "mark_paid_phone"
  | "undo_last";

// ─── Main Page Component ──────────────────────────────────────

export default function DriverJobsPage() {
  const { data: session } = useSession();
  // Session has no display name — prefill with username; the driver can
  // correct it in the form's editable "Driver Name" field.
  const driverName = session?.user?.username || "";

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

  // Consent form modal state (pickup consent / return confirmation)
  const [consentFormJob, setConsentFormJob] = useState<Job | null>(null);
  const [consentFormType, setConsentFormType] = useState<GatedFormType | null>(null);

  // Per-booking active photos, used to gate custody-checkpoint transitions in the UI.
  // Loaded lazily (only for cards at a gated step) to stay light on 4G.
  const [photosByBooking, setPhotosByBooking] = useState<Record<string, MinimalPhoto[]>>({});

  const loadPhotos = useCallback(async (bookingId: string) => {
    try {
      const res = await fetch(`/api/driver/bookings/${bookingId}/photos`);
      if (!res.ok) return;
      const data = await res.json();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- API returns untyped JSON
      const list: MinimalPhoto[] = (data.photos || []).map((p: any) => ({
        checkpointType: p.checkpointType,
        photoType: p.photoType,
      }));
      setPhotosByBooking((prev) => ({ ...prev, [bookingId]: list }));
    } catch {
      /* silent — button stays gated until photos load */
    }
  }, []);

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
    if (isNaN(amountDollars) || amountDollars < 1) {
      setPaymentError("Please enter a valid amount (minimum $1)");
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

  // ─── Consent Form Modal ───────────────────────────────────

  const openConsentForm = useCallback((job: Job, formType: GatedFormType) => {
    setConsentFormJob(job);
    setConsentFormType(formType);
  }, []);

  const closeConsentForm = () => {
    setConsentFormJob(null);
    setConsentFormType(null);
  };

  const onConsentFormSuccess = () => {
    closeConsentForm();
    // Refresh so signedFormTypes updates and the advance button unlocks.
    fetchJobs();
  };

  // ─── Photo Modal ──────────────────────────────────────────

  const openPhotoModal = (job: Job) => {
    setPhotoJob(job);
    setShowPhotoModal(true);
  };

  const closePhotoModal = () => {
    const id = photoJob?._id;
    setShowPhotoModal(false);
    setPhotoJob(null);
    fetchJobs();
    // Refresh gate state after any uploads/edits in the modal.
    if (id) loadPhotos(id);
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
                      photos={photosByBooking[job._id]}
                      onEnsurePhotos={loadPhotos}
                      onOpenForm={openConsentForm}
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
                      photos={photosByBooking[job._id]}
                      onEnsurePhotos={loadPhotos}
                      onOpenForm={openConsentForm}
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
                      photos={photosByBooking[job._id]}
                      onEnsurePhotos={loadPhotos}
                      onOpenForm={openConsentForm}
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
                      photos={photosByBooking[job._id]}
                      onEnsurePhotos={loadPhotos}
                      onOpenForm={openConsentForm}
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
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
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
                      Send this to the customer as a backup payment option.
                      Most customers pay the service centre directly.
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
                      className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
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

      {/* ═══ PICKUP CONSENT FORM ═══ */}
      {consentFormJob && consentFormType === "pickup_consent" && (
        <PickupConsentForm
          booking={{
            _id: consentFormJob._id,
            userName: consentFormJob.customerName,
            userEmail: consentFormJob.customerEmail,
            vehicleRegistration: consentFormJob.vehicleRegistration,
            vehicleState: consentFormJob.vehicleState,
            vehicleModel: consentFormJob.vehicleModel,
            vehicleYear: consentFormJob.vehicleYear,
            pickupAddress: consentFormJob.pickupAddress,
            garageName: consentFormJob.garageName,
            garageAddress: consentFormJob.garageAddress,
            transmissionType:
              consentFormJob.transmissionType ||
              (consentFormJob.isManualTransmission ? "manual" : "automatic"),
          }}
          isOpen={true}
          onClose={closeConsentForm}
          onSuccess={onConsentFormSuccess}
          driverName={driverName}
        />
      )}

      {/* ═══ RETURN CONFIRMATION FORM ═══ */}
      {consentFormJob && consentFormType === "return_confirmation" && (
        <ReturnConfirmationForm
          booking={{
            _id: consentFormJob._id,
            userName: consentFormJob.customerName,
            userEmail: consentFormJob.customerEmail,
            vehicleRegistration: consentFormJob.vehicleRegistration,
            vehicleState: consentFormJob.vehicleState,
            vehicleModel: consentFormJob.vehicleModel,
            vehicleYear: consentFormJob.vehicleYear,
            pickupAddress: consentFormJob.pickupAddress,
            garageName: consentFormJob.garageName,
            garageAddress: consentFormJob.garageAddress,
          }}
          isOpen={true}
          onClose={closeConsentForm}
          onSuccess={onConsentFormSuccess}
          driverName={driverName}
          allowRefusal={true}
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

// ─── Compulsory-photo (and consent-form) gated advance button ──
// Disables the custody status-advance until the checkpoint's required photos exist
// — and, where required, the signed handover form — with an inline checklist of
// what's still missing. Same rules as the API (src/lib/photoRequirements.ts +
// src/lib/formRequirements.ts) so UI and server can never disagree.
function GatedAdvanceButton({
  job,
  action,
  checkpoint,
  label,
  Icon,
  isLoading,
  photos,
  onAction,
  onOpenPhotos,
  onEnsurePhotos,
  requiredForm,
  onOpenForm,
}: {
  job: Job;
  action: JobAction;
  checkpoint: GatedCheckpoint;
  label: string;
  Icon: React.ElementType;
  isLoading: boolean;
  photos?: MinimalPhoto[];
  onAction: (jobId: string, action: JobAction) => void;
  onOpenPhotos: (job: Job) => void;
  onEnsurePhotos: (bookingId: string) => void;
  /** When set, a signed form of this type must exist before advancing. */
  requiredForm?: GatedFormType;
  onOpenForm?: (job: Job, formType: GatedFormType) => void;
}) {
  const photosLoaded = photos !== undefined;

  // Lazily load this booking's photos the first time a gated card mounts.
  useEffect(() => {
    if (!photosLoaded) onEnsurePhotos(job._id);
  }, [photosLoaded, job._id, onEnsurePhotos]);

  const v = validateCheckpointPhotos(photos ?? [], checkpoint);
  const pct = v.required > 0 ? Math.min(100, Math.round((v.present / v.required) * 100)) : 0;
  const formDone =
    !requiredForm || hasSignedForm(job.signedFormTypes, requiredForm);

  // REPLACED — old amber photo-requirements box, now a flat sub-section with a
  // slim progress bar and a strict one-primary action hierarchy. cleanup 2026-07-08
  return (
    <div className="mt-4 w-full space-y-4 border-t border-slate-100 pt-4">
      {!v.valid && (
        <div className="space-y-3">
          {/* Header + slim progress bar (merges the checklist with photo progress) */}
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
              <Camera className="h-4 w-4 flex-shrink-0 text-slate-400" />
              <span>
                Photos ·{" "}
                {photosLoaded ? `${v.present} of ${v.required} required` : "checking…"}
              </span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          {/* Slot checklist — 2 cols desktop, 1 col at 375px */}
          <ul className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
            {v.requiredSlots.map((slot) => {
              const done = photosLoaded && !v.missing.includes(slot);
              return (
                <li key={slot} className="flex items-center gap-2 text-sm">
                  {done ? (
                    <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-emerald-500" />
                  ) : (
                    <Circle className="h-4 w-4 flex-shrink-0 text-slate-300" />
                  )}
                  <span className={done ? "text-slate-700" : "text-slate-500"}>
                    {SLOT_LABELS[slot] || slot}
                  </span>
                </li>
              );
            })}
          </ul>

          {/* Missing list retained for screen readers (unchecked items convey it visually) */}
          {photosLoaded && v.missing.length > 0 && (
            <p className="sr-only">
              Missing: {v.missing.map((s) => SLOT_LABELS[s] || s).join(", ")}
            </p>
          )}
        </div>
      )}

      {/* Consent form requirement row (same checklist style as photo slots) */}
      {requiredForm && (
        <div className="flex items-center gap-2 text-sm">
          {formDone ? (
            <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-emerald-500" />
          ) : (
            <Circle className="h-4 w-4 flex-shrink-0 text-slate-300" />
          )}
          <span className={formDone ? "text-slate-700" : "text-slate-500"}>
            {FORM_LABELS[requiredForm]}
            {formDone && <span className="text-emerald-600"> — signed</span>}
          </span>
        </div>
      )}

      {/* Action hierarchy — exactly one primary at a time:
          photos → consent form → advance */}
      {!v.valid ? (
        <div className="space-y-2">
          {/* Primary while photos incomplete */}
          <button
            onClick={() => onOpenPhotos(job)}
            className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-medium text-white transition hover:bg-emerald-700"
          >
            <Camera className="h-4 w-4" />
            Take photos
          </button>
          {/* Disabled secondary — never green (green implies go) */}
          <div>
            <button
              onClick={() => onAction(job._id, action)}
              disabled={isLoading || !v.valid}
              className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-slate-100 py-3 text-sm font-medium text-slate-400 disabled:cursor-not-allowed"
            >
              <Camera className="h-4 w-4" />
              {label}
            </button>
            <p className="mt-1 text-center text-xs text-slate-400">
              {requiredForm && !formDone
                ? "Complete required photos and the consent form to continue"
                : "Complete required photos to continue"}
            </p>
          </div>
        </div>
      ) : requiredForm && !formDone && onOpenForm ? (
        <div className="space-y-2">
          {/* Primary while the consent form is unsigned */}
          <button
            onClick={() => onOpenForm(job, requiredForm)}
            className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-medium text-white transition hover:bg-emerald-700"
          >
            <ClipboardCheck className="h-4 w-4" />
            Sign consent form
          </button>
          {/* Disabled secondary — never green (green implies go) */}
          <div>
            <button
              onClick={() => onAction(job._id, action)}
              disabled
              className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-slate-100 py-3 text-sm font-medium text-slate-400 disabled:cursor-not-allowed"
            >
              <ClipboardCheck className="h-4 w-4" />
              {label}
            </button>
            <p className="mt-1 text-center text-xs text-slate-400">
              Consent form must be signed to continue
            </p>
          </div>
          {/* Take photos demotes to outline secondary */}
          <button
            onClick={() => onOpenPhotos(job)}
            className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-white py-3 text-sm font-medium text-emerald-700 transition hover:bg-emerald-50"
          >
            <Camera className="h-4 w-4" />
            Take photos
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Primary once every gate is met */}
          <button
            onClick={() => onAction(job._id, action)}
            disabled={isLoading}
            className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Icon className="h-4 w-4" />
            )}
            {label}
          </button>
          {/* Take photos demotes to outline secondary (still available for extra/damage shots) */}
          <button
            onClick={() => onOpenPhotos(job)}
            className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-white py-3 text-sm font-medium text-emerald-700 transition hover:bg-emerald-50"
          >
            <Camera className="h-4 w-4" />
            Take photos
          </button>
        </div>
      )}
    </div>
  );
}

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
  photos,
  onEnsurePhotos,
  onOpenForm,
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
  photos?: MinimalPhoto[];
  onEnsurePhotos: (bookingId: string) => void;
  onOpenForm: (job: Job, formType: GatedFormType) => void;
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

  // Photo progress — total uploaded across all checkpoints (20 slots total).
  const cs = job.checkpointStatus;
  const photoCount = cs
    ? cs.pre_pickup + cs.service_dropoff + cs.service_pickup + cs.final_delivery
    : 0;

  // Undo is offered for 15 minutes after the driver's last step (accidental
  // taps). The server re-validates the window; photos/forms are preserved.
  const undoAvailable = !!(
    job.lastStep &&
    Date.now() - new Date(job.lastStep.at).getTime() < 15 * 60 * 1000
  );

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
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
    >
      {/* ─── Vehicle Header ─── */}
      <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Car className="h-5 w-5 flex-shrink-0 text-emerald-600" />
            <p className="truncate text-lg font-semibold text-slate-900">
              {job.vehicleRegistration} ({job.vehicleState})
            </p>
          </div>
          <p className="mt-0.5 truncate text-sm text-slate-500">
            {job.customerName} &middot; {job.serviceType}
            {job.isManualTransmission && (
              <span className="ml-1 text-amber-600">Manual</span>
            )}
          </p>
        </div>
        {SHOW_DRIVER_EARNINGS && (
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700">
            ${job.payout}
          </span>
        )}
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
        <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
          <div className="mb-3 flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Pickup
            </span>
            <StatusBadge
              colorKey={pickupInfo.colorKey}
              label={pickupInfo.label}
            />
            {job.isPreferredArea && (
              <span className="flex items-center gap-0.5 text-xs text-emerald-600">
                <Star className="h-3 w-3 fill-emerald-400" />
                Your area
              </span>
            )}
          </div>

          <div className="space-y-2 text-sm text-slate-700">
            <div className="flex items-start gap-2.5">
              <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400" />
              <span>{job.pickupAddress}</span>
            </div>
            {job.garageName && (
              <div className="flex items-start gap-2.5">
                <Navigation className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400" />
                <span>{job.garageName}</span>
              </div>
            )}
            <div className="flex items-center gap-2.5">
              <Clock className="h-4 w-4 flex-shrink-0 text-slate-400" />
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
                <GatedAdvanceButton
                  job={job}
                  action="collected"
                  checkpoint="pre_pickup"
                  label="Car Collected"
                  Icon={Car}
                  isLoading={isLoading}
                  photos={photos}
                  onAction={onAction}
                  onOpenPhotos={onOpenPhotos}
                  onEnsurePhotos={onEnsurePhotos}
                  requiredForm="pickup_consent"
                  onOpenForm={onOpenForm}
                />
              )}
              {pickupState === "collected" && (
                <>
                  <GatedAdvanceButton
                    job={job}
                    action="dropped_at_workshop"
                    checkpoint="service_dropoff"
                    label="Dropped at Workshop"
                    Icon={Navigation}
                    isLoading={isLoading}
                    photos={photos}
                    onAction={onAction}
                    onOpenPhotos={onOpenPhotos}
                    onEnsurePhotos={onEnsurePhotos}
                  />
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
        <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
          <div className="mb-3 flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Return
            </span>
            <StatusBadge
              colorKey={returnInfo.colorKey}
              label={returnInfo.label}
            />
          </div>

          {/* REPLACED — old prose route line, now stacked icon rows (from → to → time). cleanup 2026-07-08 */}
          <div className="space-y-2 text-sm text-slate-700">
            <div className="flex items-start gap-2.5">
              <Navigation className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400" />
              <span>{job.garageName || "Workshop"}</span>
            </div>
            <div className="flex items-start gap-2.5">
              <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400" />
              <span>{job.pickupAddress}</span>
            </div>
            {job.dropoffTime && (
              <div className="flex items-center gap-2.5">
                <Clock className="h-4 w-4 flex-shrink-0 text-slate-400" />
                <span>Return: {job.dropoffTime}</span>
              </div>
            )}
          </div>

          {/* Return Actions — not started */}
          {(returnState === "assigned") && (
            <>
              {job.canStartReturn ? (
                <div className="mt-4">
                  <button
                    onClick={() => onAction(job._id, "start_return")}
                    disabled={isLoading}
                    className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
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
                <div className="mt-3 flex items-center gap-2 text-sm italic text-slate-400">
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
            <GatedAdvanceButton
              job={job}
              action="collected_from_workshop"
              checkpoint="service_pickup"
              label="Collected from Workshop"
              Icon={Package}
              isLoading={isLoading}
              photos={photos}
              onAction={onAction}
              onOpenPhotos={onOpenPhotos}
              onEnsurePhotos={onEnsurePhotos}
            />
          )}
          {returnState === "collected" && (
            <div className="mt-4">
              <button
                onClick={() => onAction(job._id, "delivering")}
                disabled={isLoading}
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
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
          {returnState === "delivering" &&
            (hasSignedForm(job.signedFormTypes, "return_confirmation") ? (
              <div className="mt-4">
                <div className="mb-2 flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-emerald-500" />
                  <span className="text-slate-700">
                    {FORM_LABELS.return_confirmation}
                    <span className="text-emerald-600"> — completed</span>
                  </span>
                </div>
                <button
                  onClick={() => onAction(job._id, "delivered")}
                  disabled={isLoading}
                  className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4" />
                  )}
                  Delivered to Customer
                </button>
              </div>
            ) : (
              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Circle className="h-4 w-4 flex-shrink-0 text-slate-300" />
                  <span className="text-slate-500">
                    {FORM_LABELS.return_confirmation}
                  </span>
                </div>
                {/* Primary while the return form is incomplete */}
                <button
                  onClick={() => onOpenForm(job, "return_confirmation")}
                  className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-medium text-white transition hover:bg-emerald-700"
                >
                  <ClipboardCheck className="h-4 w-4" />
                  Complete return form
                </button>
                {/* Disabled secondary — never green (green implies go) */}
                <div>
                  <button
                    disabled
                    className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-slate-100 py-3 text-sm font-medium text-slate-400 disabled:cursor-not-allowed"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Delivered to Customer
                  </button>
                  <p className="mt-1 text-center text-xs text-slate-400">
                    Return form must be completed with the customer to continue
                  </p>
                </div>
              </div>
            ))}
          {returnState === "completed" && (
            <div className="mt-3 flex items-center gap-1.5 text-emerald-600">
              <CheckCircle className="h-4 w-4" />
              <span className="text-xs font-medium">Delivery Complete</span>
            </div>
          )}
        </div>
      )}

      {/* ─── Info sections when not assigned to specific legs ─── */}
      {!isMyPickup && !isMyReturn && (
        <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
          <div className="space-y-2 text-sm text-slate-700">
            <div className="flex items-start gap-2.5">
              <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400" />
              <span>{job.pickupAddress}</span>
            </div>
            {job.garageName && (
              <div className="flex items-start gap-2.5">
                <Navigation className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400" />
                <span>{job.garageName}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Payment info for awaiting_payment stage (waiting → amber) */}
      {job.servicePaymentStatus === "pending" && job.servicePaymentUrl && (
        <div className="mx-5 mb-3 rounded-xl border border-amber-200 bg-amber-50 p-3 sm:mx-6">
          <div className="flex items-center gap-2 text-sm text-amber-800">
            <CreditCard className="h-4 w-4" />
            <span className="font-medium">Awaiting customer payment</span>
          </div>
          <p className="mt-1 text-xs text-amber-700">
            $
            {job.servicePaymentAmount
              ? (job.servicePaymentAmount / 100).toFixed(2)
              : "0.00"}{" "}
            &middot; Payment link sent
          </p>
        </div>
      )}

      {/* Payment received badge — shows HOW the customer paid */}
      {job.servicePaymentStatus === "paid" && (
        <div className="mx-5 mb-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 sm:mx-6">
          <div className="flex items-center gap-2 text-sm text-emerald-800">
            <CheckCircle className="h-4 w-4" />
            <span className="font-medium">
              {job.servicePaymentMethod === "phone_direct"
                ? "Paid to service centre by phone"
                : `Payment received via link — $${
                    job.servicePaymentAmount
                      ? (job.servicePaymentAmount / 100).toFixed(2)
                      : "0.00"
                  }`}
            </span>
          </div>
        </div>
      )}

      {/* Payment link — available to BOTH drivers at every stage after the car
          reaches the workshop, until paid. It's a backup for customers who
          can't pay the service centre over the phone, so it's never stage-locked. */}
      {(isMyPickup || isMyReturn) &&
        pickupComplete &&
        job.servicePaymentStatus !== "paid" && (
          <div className="mx-5 mb-3 flex flex-wrap gap-2 sm:mx-6">
            <button
              onClick={() => onOpenPayment(job)}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <DollarSign className="h-4 w-4" />
              {job.servicePaymentUrl ? "Payment Link" : "Generate Payment Link"}
            </button>
            {/* Record that the customer paid the service centre directly */}
            <button
              onClick={() => {
                if (
                  window.confirm(
                    "Mark this service as paid directly to the service centre by phone? Only confirm once the service centre has verified the payment."
                  )
                ) {
                  onAction(job._id, "mark_paid_phone");
                }
              }}
              disabled={isLoading}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-emerald-200 bg-white px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
            >
              <Phone className="h-4 w-4" />
              Paid by Phone
            </button>
          </div>
        )}

      {/* ─── Footer: Photos + Call + Incident ─── */}
      {hasActiveLeg && (
        <div className="space-y-3 border-t border-slate-100 px-5 py-4 sm:px-6">
          {/* REPLACED — old big "Vehicle Photos 0/20" progress bar, now a single quiet
              row so it no longer competes with the per-checkpoint checklist. cleanup 2026-07-08 */}
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>20 photo slots total &middot; {photoCount} uploaded</span>
            <button
              onClick={() => onOpenPhotos(job)}
              className="font-medium text-emerald-600 transition hover:text-emerald-700"
            >
              View all
            </button>
          </div>

          {/* Call Customer — outline secondary (brand-consistent, not solid blue) */}
          {job.customerPhone && (
            <div>
              {isCallSuccess ? (
                <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
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
                  className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  {isCalling ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <Phone className="h-4 w-4" />
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

          {/* Report Incident — low-key text button at the very bottom */}
          <div className="flex justify-center">
            <IncidentReportButton onClick={() => onReportIncident(job._id)} />
          </div>
        </div>
      )}

      {/* Undo last step — quiet correction control for accidental taps.
          Rendered outside the active-leg footer so it's still available right
          after a leg-completing tap (e.g. accidental "Dropped at Workshop"). */}
      {undoAvailable && job.lastStep && (
        <div className="flex justify-center border-t border-slate-100 px-5 py-3 sm:px-6">
          <button
            onClick={() => {
              if (
                window.confirm(
                  `Undo "${job.lastStep!.label}"? This rolls the job back one step. Photos and signed forms are kept.`
                )
              ) {
                onAction(job._id, "undo_last");
              }
            }}
            disabled={isLoading}
            className="inline-flex min-h-[36px] items-center gap-1.5 text-xs font-medium text-slate-400 transition hover:text-slate-600 disabled:opacity-50"
          >
            <Undo2 className="h-3.5 w-3.5" />
            Tapped by mistake? Undo &ldquo;{job.lastStep.label}&rdquo;
          </button>
        </div>
      )}
    </motion.div>
  );
}
