// src/app/driver/jobs/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
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
  Home,
  ArrowRight,
  ArrowLeft,
  Package,
  Truck,
} from "lucide-react";
import PhotoUploadModal from "@/components/driver/PhotoUploadModal";

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
  servicePaymentStatus?: string;
  servicePaymentAmount?: number;
  servicePaymentUrl?: string;
  checkpointStatus?: CheckpointStatus;
  // New leg-based fields
  legType?: "pickup" | "return";
  driverState?: string;
}

// Primary tab: Pickup or Return
type PrimaryTab = "pickup" | "return";
// Secondary tab within each primary tab
type SecondaryTab = "available" | "my_jobs";

export default function DriverJobsPage() {
  const { data: session } = useSession();
  const [primaryTab, setPrimaryTab] = useState<PrimaryTab>("pickup");
  const [secondaryTab, setSecondaryTab] = useState<SecondaryTab>("available");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

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

  const openPhotoModal = (job: Job) => {
    setPhotoJob(job);
    setShowPhotoModal(true);
  };

  const closePhotoModal = () => {
    setShowPhotoModal(false);
    setPhotoJob(null);
    fetchJobs();
  };

  // Map primary/secondary tabs to API status
  const getApiStatus = useCallback(() => {
    if (primaryTab === "pickup") {
      return secondaryTab === "available" ? "available_pickup" : "my_pickup";
    } else {
      return secondaryTab === "available" ? "available_return" : "my_return";
    }
  }, [primaryTab, secondaryTab]);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const status = getApiStatus();
      const res = await fetch(`/api/driver/jobs?status=${status}&page=${page}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch jobs");
      }

      setJobs(data.jobs || []);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch jobs");
    } finally {
      setLoading(false);
    }
  }, [getApiStatus, page]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  // Poll for updates when viewing my jobs
  useEffect(() => {
    if (secondaryTab === "my_jobs") {
      const interval = setInterval(fetchJobs, 15000);
      return () => clearInterval(interval);
    }
  }, [secondaryTab, fetchJobs]);

  // Type for all possible actions
  type JobAction =
    | "accept_pickup"
    | "decline_pickup"
    | "start_pickup"
    | "arrived_pickup"
    | "collected"
    | "dropped_at_workshop"
    | "accept_return"
    | "decline_return"
    | "start_return"
    | "collected_from_workshop"
    | "delivering"
    | "delivered"
    | "generate_payment";

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

      if (!res.ok) {
        throw new Error(data.error || "Action failed");
      }

      fetchJobs();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setActionLoading(null);
    }
  };

  // Call customer handler
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

      if (!res.ok) {
        throw new Error(data.error || "Failed to initiate call");
      }

      setCallSuccess(job._id);
      setTimeout(() => setCallSuccess(null), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to call customer");
    } finally {
      setCallingCustomer(null);
    }
  };

  const openPaymentModal = (job: Job) => {
    setSelectedJob(job);
    setServiceAmount(
      job.servicePaymentAmount ? (job.servicePaymentAmount / 100).toString() : ""
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

      if (!res.ok) {
        throw new Error(data.error || "Failed to generate payment link");
      }

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

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <div className="mx-auto max-w-2xl px-4 py-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Jobs</h1>
            <p className="text-sm text-slate-500">
              Manage your pickup and return jobs
            </p>
          </div>
          <button
            onClick={() => fetchJobs()}
            disabled={loading}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-600"
          >
            <RefreshCw className={`h-5 w-5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-red-700">
            <AlertTriangle className="h-5 w-5" />
            <span className="text-sm">{error}</span>
            <button onClick={() => setError("")} className="ml-auto">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Primary Tabs - Pickup / Return */}
        <div className="mb-4 flex gap-2">
          <button
            onClick={() => {
              setPrimaryTab("pickup");
              setSecondaryTab("available");
              setPage(1);
            }}
            className={`flex-1 flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition ${
              primaryTab === "pickup"
                ? "bg-emerald-600 text-white shadow-lg shadow-emerald-500/25"
                : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
            }`}
          >
            <ArrowRight className="h-4 w-4" />
            Pickup Jobs
          </button>
          <button
            onClick={() => {
              setPrimaryTab("return");
              setSecondaryTab("available");
              setPage(1);
            }}
            className={`flex-1 flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition ${
              primaryTab === "return"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-500/25"
                : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
            }`}
          >
            <ArrowLeft className="h-4 w-4" />
            Return Jobs
          </button>
        </div>

        {/* Secondary Tabs - Available / My Jobs */}
        <div className="mb-6 flex gap-2">
          <button
            onClick={() => {
              setSecondaryTab("available");
              setPage(1);
            }}
            className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition ${
              secondaryTab === "available"
                ? primaryTab === "pickup"
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-blue-100 text-blue-800"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Available
          </button>
          <button
            onClick={() => {
              setSecondaryTab("my_jobs");
              setPage(1);
            }}
            className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition ${
              secondaryTab === "my_jobs"
                ? primaryTab === "pickup"
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-blue-100 text-blue-800"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            My Jobs
          </button>
        </div>

        {/* Tab Description */}
        <div className="mb-4 rounded-lg bg-slate-100 px-4 py-2 text-sm text-slate-600">
          {primaryTab === "pickup" && secondaryTab === "available" && (
            <p>
              <strong>Available Pickups:</strong> New jobs waiting to be picked
              up from customers and taken to the workshop.
            </p>
          )}
          {primaryTab === "pickup" && secondaryTab === "my_jobs" && (
            <p>
              <strong>My Pickups:</strong> Jobs you've accepted for the pickup
              leg (customer → workshop).
            </p>
          )}
          {primaryTab === "return" && secondaryTab === "available" && (
            <p>
              <strong>Available Returns:</strong> Cars ready for return after
              service completion and payment.
            </p>
          )}
          {primaryTab === "return" && secondaryTab === "my_jobs" && (
            <p>
              <strong>My Returns:</strong> Return jobs you've accepted (workshop
              → customer).
            </p>
          )}
        </div>

        {/* Jobs List */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            <p className="mt-2 text-sm text-slate-500">Loading jobs...</p>
          </div>
        ) : jobs.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white py-12 text-center">
            <Briefcase className="mx-auto h-12 w-12 text-slate-300" />
            <h3 className="mt-4 text-lg font-medium text-slate-900">No jobs</h3>
            <p className="mt-2 text-sm text-slate-500">
              {secondaryTab === "available"
                ? "Check back soon for new opportunities"
                : `No active ${primaryTab} jobs`}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {jobs.map((job) => (
                <JobCard
                  key={job._id}
                  job={job}
                  primaryTab={primaryTab}
                  secondaryTab={secondaryTab}
                  actionLoading={actionLoading}
                  onAction={handleJobAction}
                  onOpenPayment={openPaymentModal}
                  onOpenPhotos={openPhotoModal}
                  onCallCustomer={handleCallCustomer}
                  callingCustomer={callingCustomer}
                  callSuccess={callSuccess}
                />
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-sm text-slate-600">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}

        {/* Return to Home Button */}
        <div className="mt-8 flex justify-center">
          <Link
            href="/driver/dashboard"
            className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-5 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-200 active:scale-95"
          >
            <Home className="h-4 w-4" />
            Return to Home
          </Link>
        </div>
      </div>

      {/* Payment Modal */}
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

      {/* Photo Upload Modal */}
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
    </div>
  );
}

function JobCard({
  job,
  primaryTab,
  secondaryTab,
  actionLoading,
  onAction,
  onOpenPayment,
  onOpenPhotos,
  onCallCustomer,
  callingCustomer,
  callSuccess,
}: {
  job: Job;
  primaryTab: PrimaryTab;
  secondaryTab: SecondaryTab;
  actionLoading: string | null;
  onAction: (
    jobId: string,
    action:
      | "accept_pickup"
      | "decline_pickup"
      | "start_pickup"
      | "arrived_pickup"
      | "collected"
      | "dropped_at_workshop"
      | "accept_return"
      | "decline_return"
      | "start_return"
      | "collected_from_workshop"
      | "delivering"
      | "delivered"
      | "generate_payment"
  ) => void;
  onOpenPayment: (job: Job) => void;
  onOpenPhotos: (job: Job) => void;
  onCallCustomer: (job: Job) => void;
  callingCustomer: string | null;
  callSuccess: string | null;
}) {
  const isLoading = actionLoading === job._id;
  const isCalling = callingCustomer === job._id;
  const isCallSuccess = callSuccess === job._id;
  const isPickupLeg = primaryTab === "pickup";

  // Calculate photo progress
  const photoCount = job.checkpointStatus
    ? job.checkpointStatus.pre_pickup +
      job.checkpointStatus.service_dropoff +
      job.checkpointStatus.service_pickup +
      job.checkpointStatus.final_delivery
    : 0;
  const photoProgress = Math.round((photoCount / 20) * 100);
  const completedCheckpoints = job.checkpointStatus
    ? [
        job.checkpointStatus.pre_pickup >= 5,
        job.checkpointStatus.service_dropoff >= 5,
        job.checkpointStatus.service_pickup >= 5,
        job.checkpointStatus.final_delivery >= 5,
      ].filter(Boolean).length
    : 0;

  // Determine the current driver state for this leg
  const driverState = job.driverState || "assigned";

  // Get appropriate actions based on driver state
  const renderActions = () => {
    // Available jobs - can accept or decline
    if (secondaryTab === "available") {
      const acceptAction = isPickupLeg ? "accept_pickup" : "accept_return";
      const declineAction = isPickupLeg ? "decline_pickup" : "decline_return";

      return (
        <>
          <button
            onClick={() => onAction(job._id, declineAction)}
            disabled={isLoading}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Skip
          </button>
          <button
            onClick={() => onAction(job._id, acceptAction)}
            disabled={isLoading}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 ${
              isPickupLeg
                ? "bg-emerald-600 hover:bg-emerald-500"
                : "bg-blue-600 hover:bg-blue-500"
            }`}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle className="h-4 w-4" />
            )}
            Accept
          </button>
        </>
      );
    }

    // My jobs - show progress actions based on current state
    if (isPickupLeg) {
      // Pickup leg states: assigned → started → arrived → collected → completed
      switch (driverState) {
        case "assigned":
        case "accepted":
          return (
            <>
              <button
                onClick={() => onAction(job._id, "decline_pickup")}
                disabled={isLoading}
                className="rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => onAction(job._id, "start_pickup")}
                disabled={isLoading}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                Start Pickup
              </button>
            </>
          );
        case "started":
          return (
            <button
              onClick={() => onAction(job._id, "arrived_pickup")}
              disabled={isLoading}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <MapPin className="h-4 w-4" />
              )}
              Arrived at Customer
            </button>
          );
        case "arrived":
          return (
            <button
              onClick={() => onAction(job._id, "collected")}
              disabled={isLoading}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Car className="h-4 w-4" />
              )}
              Car Collected
            </button>
          );
        case "collected":
          return (
            <>
              <button
                onClick={() => onAction(job._id, "dropped_at_workshop")}
                disabled={isLoading}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Navigation className="h-4 w-4" />
                )}
                Dropped at Workshop
              </button>
              {/* Also show payment button if at workshop stage */}
              {!job.servicePaymentUrl && (
                <button
                  onClick={() => onOpenPayment(job)}
                  disabled={isLoading}
                  className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
                >
                  <DollarSign className="h-4 w-4" />
                  Generate Payment Link
                </button>
              )}
            </>
          );
        case "completed":
          return (
            <div className="flex items-center gap-2 text-emerald-600">
              <CheckCircle className="h-5 w-5" />
              <span className="text-sm font-medium">Pickup Complete</span>
            </div>
          );
        default:
          return null;
      }
    } else {
      // Return leg states: assigned → started → collected → delivering → completed
      switch (driverState) {
        case "assigned":
        case "accepted":
          return (
            <>
              <button
                onClick={() => onAction(job._id, "decline_return")}
                disabled={isLoading}
                className="rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => onAction(job._id, "start_return")}
                disabled={isLoading}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                Start Return
              </button>
            </>
          );
        case "started":
          return (
            <button
              onClick={() => onAction(job._id, "collected_from_workshop")}
              disabled={isLoading}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Package className="h-4 w-4" />
              )}
              Collected from Workshop
            </button>
          );
        case "collected":
          return (
            <button
              onClick={() => onAction(job._id, "delivering")}
              disabled={isLoading}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Truck className="h-4 w-4" />
              )}
              En Route to Customer
            </button>
          );
        case "delivering":
          return (
            <button
              onClick={() => onAction(job._id, "delivered")}
              disabled={isLoading}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              Delivered to Customer
            </button>
          );
        case "completed":
          return (
            <div className="flex items-center gap-2 text-blue-600">
              <CheckCircle className="h-5 w-5" />
              <span className="text-sm font-medium">Delivery Complete</span>
            </div>
          );
        default:
          return null;
      }
    }
  };

  // Get state label for display
  const getStateLabel = () => {
    if (secondaryTab === "available") return null;

    const stateLabels: Record<string, { label: string; color: string }> = {
      assigned: { label: "Assigned", color: "bg-slate-100 text-slate-700" },
      accepted: { label: "Accepted", color: "bg-amber-100 text-amber-700" },
      started: { label: "En Route", color: "bg-blue-100 text-blue-700" },
      arrived: { label: "Arrived", color: "bg-purple-100 text-purple-700" },
      collected: { label: "Car Collected", color: "bg-emerald-100 text-emerald-700" },
      delivering: { label: "Delivering", color: "bg-blue-100 text-blue-700" },
      completed: { label: "Complete", color: "bg-green-100 text-green-700" },
    };

    const state = stateLabels[driverState] || stateLabels.assigned;
    return (
      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${state.color}`}>
        {state.label}
      </span>
    );
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`overflow-hidden rounded-xl border bg-white transition-shadow hover:shadow-md ${
        job.isPreferredArea
          ? "border-emerald-300 ring-1 ring-emerald-100"
          : "border-slate-200"
      }`}
    >
      {/* Header */}
      <div className="p-4">
        <div className="mb-2 flex items-center gap-2">
          {/* Leg Type Badge */}
          <span
            className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
              isPickupLeg
                ? "bg-emerald-100 text-emerald-700"
                : "bg-blue-100 text-blue-700"
            }`}
          >
            {isPickupLeg ? (
              <>
                <ArrowRight className="h-3 w-3" />
                Pickup
              </>
            ) : (
              <>
                <ArrowLeft className="h-3 w-3" />
                Return
              </>
            )}
          </span>

          {/* State Label */}
          {getStateLabel()}

          {/* Preferred Area Badge */}
          {job.isPreferredArea && (
            <span className="flex items-center gap-1 text-xs text-emerald-600">
              <Star className="h-3 w-3 fill-emerald-500" />
              Your area
            </span>
          )}
        </div>

        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-slate-900">
              {job.vehicleRegistration} ({job.vehicleState})
            </h3>
            <p className="text-sm text-slate-500">{job.serviceType}</p>
          </div>
          <div className="text-right">
            <span className="text-lg font-bold text-emerald-600">
              ${job.payout}
            </span>
            <p className="text-xs text-slate-500">payout</p>
          </div>
        </div>

        {/* Details */}
        <div className="mt-3 space-y-1.5 text-sm text-slate-600">
          <div className="flex items-start gap-2">
            <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400" />
            <span>
              {isPickupLeg ? job.pickupAddress : `Return to: ${job.pickupAddress}`}
            </span>
          </div>
          {job.garageName && (
            <div className="flex items-start gap-2">
              <Navigation className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400" />
              <span>{job.garageName}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-slate-400" />
            <span>
              {isPickupLeg ? `Pickup: ${job.pickupTime}` : `Return: ${job.dropoffTime}`}
            </span>
          </div>
        </div>

        {/* Manual transmission warning */}
        {job.isManualTransmission && (
          <div className="mt-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
              <AlertTriangle className="h-3 w-3" />
              Manual transmission
            </span>
          </div>
        )}

        {/* Call Customer Button */}
        {secondaryTab === "my_jobs" && job.customerPhone && (
          <div className="mt-3">
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
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:bg-blue-400"
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
            <p className="mt-1 text-center text-xs text-slate-500">
              Your number stays private - customer sees business number
            </p>
          </div>
        )}

        {/* Photo Progress - show for my_jobs */}
        {secondaryTab === "my_jobs" && (
          <div className="mt-3">
            <button
              onClick={() => onOpenPhotos(job)}
              className="w-full rounded-lg bg-slate-100 p-3 transition hover:bg-slate-200"
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
                        i < completedCheckpoints ? "bg-emerald-500" : "bg-slate-300"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </button>
          </div>
        )}

        {/* Payment info for return jobs */}
        {!isPickupLeg && job.servicePaymentStatus === "paid" && (
          <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-600" />
              <span className="text-sm font-medium text-emerald-800">
                Payment received - $
                {((job.servicePaymentAmount || 0) / 100).toFixed(2)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div
        className={`flex flex-wrap items-center justify-end gap-2 border-t px-4 py-3 ${
          isPickupLeg
            ? "border-emerald-100 bg-emerald-50"
            : "border-blue-100 bg-blue-50"
        }`}
      >
        {renderActions()}
      </div>
    </motion.div>
  );
}
