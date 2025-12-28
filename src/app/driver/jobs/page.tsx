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
  XCircle,
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
}

type TabType = "available" | "accepted" | "in_progress" | "awaiting_payment" | "ready_for_return";

export default function DriverJobsPage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<TabType>("available");
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

  const openPhotoModal = (job: Job) => {
    setPhotoJob(job);
    setShowPhotoModal(true);
  };

  const closePhotoModal = () => {
    setShowPhotoModal(false);
    setPhotoJob(null);
    fetchJobs(); // Refresh to get updated checkpoint status
  };

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/driver/jobs?status=${activeTab}&page=${page}`);
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
  }, [activeTab, page]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  // Poll for payment status when in awaiting_payment tab
  useEffect(() => {
    if (activeTab === "awaiting_payment") {
      const interval = setInterval(fetchJobs, 10000); // Poll every 10 seconds
      return () => clearInterval(interval);
    }
  }, [activeTab, fetchJobs]);

  const handleJobAction = async (
    jobId: string,
    action: "accept" | "decline" | "start" | "picked_up" | "at_garage" | "complete",
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

  const openPaymentModal = (job: Job) => {
    setSelectedJob(job);
    setServiceAmount(job.servicePaymentAmount ? (job.servicePaymentAmount / 100).toString() : "");
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
          serviceAmount: Math.round(amountDollars * 100), // Convert to cents
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to generate payment link");
      }

      setGeneratedLink(data.paymentLink);
      fetchJobs();
    } catch (err) {
      setPaymentError(err instanceof Error ? err.message : "Failed to generate link");
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

  const tabs: { key: TabType; label: string }[] = [
    { key: "available", label: "Available" },
    { key: "accepted", label: "Accepted" },
    { key: "in_progress", label: "In Progress" },
    { key: "awaiting_payment", label: "Awaiting Payment" },
    { key: "ready_for_return", label: "Ready to Return" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <div className="mx-auto max-w-2xl px-4 py-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Jobs</h1>
            <p className="text-sm text-slate-500">Find and manage your pickups</p>
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

        {/* Tabs */}
        <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key);
                setPage(1);
              }}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition ${
                activeTab === tab.key
                  ? "bg-emerald-600 text-white"
                  : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
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
              {activeTab === "available"
                ? "Check back soon for new opportunities"
                : `No ${activeTab.replace("_", " ")} jobs`}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {jobs.map((job) => (
                <JobCard
                  key={job._id}
                  job={job}
                  activeTab={activeTab}
                  actionLoading={actionLoading}
                  onAction={handleJobAction}
                  onOpenPayment={openPaymentModal}
                  onOpenPhotos={openPhotoModal}
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
                  <h2 className="font-semibold text-slate-900">Service Payment</h2>
                  <p className="text-sm text-slate-500">{selectedJob.vehicleRegistration}</p>
                </div>
              </div>
              <button
                onClick={closePaymentModal}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {paymentError && (
                <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-red-700">
                  <AlertTriangle className="h-5 w-5" />
                  <span className="text-sm">{paymentError}</span>
                </div>
              )}

              {generatedLink ? (
                <>
                  <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="h-5 w-5 text-emerald-600" />
                      <span className="font-medium text-emerald-800">Payment Link Ready</span>
                    </div>
                    <p className="text-sm text-emerald-700 mb-3">
                      Send this to the customer. Once they pay, you can complete the delivery.
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={generatedLink}
                        readOnly
                        className="flex-1 rounded-lg border border-emerald-300 bg-white px-3 py-2 text-sm truncate"
                      />
                      <button
                        onClick={copyLink}
                        className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
                      >
                        {linkCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {selectedJob.customerPhone && (
                    <a
                      href={`sms:${selectedJob.customerPhone}?body=Your car service is complete! Please pay here to receive your car: ${generatedLink}`}
                      className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-500 w-full"
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
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Service Total from Garage (AUD)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={serviceAmount}
                        onChange={(e) => setServiceAmount(e.target.value)}
                        placeholder="0.00"
                        disabled={generatingPayment}
                        className="w-full rounded-lg border border-slate-300 pl-8 pr-4 py-3 text-lg text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                      />
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      Enter the exact amount the garage charged ($150 - $800)
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
                      className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
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
  activeTab,
  actionLoading,
  onAction,
  onOpenPayment,
  onOpenPhotos,
}: {
  job: Job;
  activeTab: TabType;
  actionLoading: string | null;
  onAction: (jobId: string, action: "accept" | "decline" | "start" | "picked_up" | "at_garage" | "complete") => void;
  onOpenPayment: (job: Job) => void;
  onOpenPhotos: (job: Job) => void;
}) {
  const isLoading = actionLoading === job._id;

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

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`rounded-xl border bg-white overflow-hidden transition-shadow hover:shadow-md ${
        job.isPreferredArea ? "border-emerald-300 ring-1 ring-emerald-100" : "border-slate-200"
      }`}
    >
      {/* Header */}
      <div className="p-4">
        {job.isPreferredArea && (
          <div className="mb-2 flex items-center gap-1 text-xs text-emerald-600">
            <Star className="h-3 w-3 fill-emerald-500" />
            Your area
          </div>
        )}

        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-slate-900">
              {job.vehicleRegistration} ({job.vehicleState})
            </h3>
            <p className="text-sm text-slate-500">{job.serviceType}</p>
          </div>
          <div className="text-right">
            <span className="text-lg font-bold text-emerald-600">${job.payout}</span>
            <p className="text-xs text-slate-500">payout</p>
          </div>
        </div>

        {/* Details */}
        <div className="mt-3 space-y-1.5 text-sm text-slate-600">
          <div className="flex items-start gap-2">
            <MapPin className="h-4 w-4 mt-0.5 text-slate-400 flex-shrink-0" />
            <span>{job.pickupAddress}</span>
          </div>
          {job.garageName && (
            <div className="flex items-start gap-2">
              <Navigation className="h-4 w-4 mt-0.5 text-slate-400 flex-shrink-0" />
              <span>{job.garageName}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-slate-400" />
            <span>Pickup: {job.pickupTime}</span>
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

        {/* Photo Progress Indicator - show for active jobs */}
        {activeTab !== "available" && (
          <div className="mt-3">
            <button
              onClick={() => onOpenPhotos(job)}
              className="w-full rounded-lg bg-slate-100 hover:bg-slate-200 p-3 transition"
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <Camera className="h-4 w-4 text-slate-500" />
                  <span className="text-sm font-medium text-slate-700">Vehicle Photos</span>
                </div>
                <span className="text-sm font-bold text-emerald-600">
                  {photoCount}/20
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all"
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

        {/* Payment status for awaiting_payment tab */}
        {activeTab === "awaiting_payment" && job.servicePaymentUrl && (
          <div className="mt-3 rounded-lg bg-amber-50 border border-amber-200 p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-amber-600" />
                <span className="text-sm font-medium text-amber-800">
                  ${((job.servicePaymentAmount || 0) / 100).toFixed(2)} pending
                </span>
              </div>
              <button
                onClick={() => navigator.clipboard.writeText(job.servicePaymentUrl || "")}
                className="text-xs text-amber-600 hover:underline"
              >
                Copy link
              </button>
            </div>
          </div>
        )}

        {/* Payment received for ready_for_return tab */}
        {activeTab === "ready_for_return" && (
          <div className="mt-3 rounded-lg bg-emerald-50 border border-emerald-200 p-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-600" />
              <span className="text-sm font-medium text-emerald-800">
                Payment received - ${((job.servicePaymentAmount || 0) / 100).toFixed(2)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50 px-4 py-3">
        {activeTab === "available" && (
          <>
            <button
              onClick={() => onAction(job._id, "decline")}
              disabled={isLoading}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Skip
            </button>
            <button
              onClick={() => onAction(job._id, "accept")}
              disabled={isLoading}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
              Accept
            </button>
          </>
        )}

        {activeTab === "accepted" && (
          <>
            <button
              onClick={() => onAction(job._id, "decline")}
              disabled={isLoading}
              className="rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={() => onAction(job._id, "start")}
              disabled={isLoading}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Start Pickup
            </button>
          </>
        )}

        {activeTab === "in_progress" && (
          <>
            {job.currentStage === "driver_en_route" && (
              <button
                onClick={() => onAction(job._id, "picked_up")}
                disabled={isLoading}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Car className="h-4 w-4" />}
                Picked Up
              </button>
            )}
            {job.currentStage === "car_picked_up" && (
              <button
                onClick={() => onAction(job._id, "at_garage")}
                disabled={isLoading}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Navigation className="h-4 w-4" />}
                At Garage
              </button>
            )}
            {/* Show payment button if no payment link yet - available at garage or returning */}
            {!job.servicePaymentUrl && ["at_garage", "service_in_progress", "driver_returning", "awaiting_payment"].includes(job.currentStage || "") && (
              <button
                onClick={() => onOpenPayment(job)}
                disabled={isLoading}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
              >
                <DollarSign className="h-4 w-4" />
                Service Done - Get Payment
              </button>
            )}
            {/* Show payment link status if already generated */}
            {job.servicePaymentUrl && job.servicePaymentStatus === "pending" && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-amber-600">Payment link sent</span>
                <button
                  onClick={() => onOpenPayment(job)}
                  className="text-xs text-emerald-600 hover:underline"
                >
                  View link
                </button>
              </div>
            )}
          </>
        )}

        {activeTab === "awaiting_payment" && (
          <div className="text-sm text-amber-600">
            Waiting for customer to pay...
          </div>
        )}

        {activeTab === "ready_for_return" && (
          <button
            onClick={() => onAction(job._id, "complete")}
            disabled={isLoading}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
            Complete Delivery
          </button>
        )}
      </div>
    </motion.div>
  );
}
