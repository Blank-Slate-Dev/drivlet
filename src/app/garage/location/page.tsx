// src/app/garage/location/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  MapPin,
  Loader2,
  CheckCircle,
  AlertCircle,
  Clock,
  X,
  XCircle,
  Building2,
  Wrench,
} from "lucide-react";
import GarageAutocomplete, { type GarageDetails } from "@/components/GarageAutocomplete";

interface LocationData {
  id: string;
  name: string;
  address: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

interface LocationChangeRequest {
  _id: string;
  currentLocationId: string;
  currentLocationName: string;
  currentLocationAddress: string;
  requestedLocationId: string;
  requestedLocationName: string;
  requestedLocationAddress: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  submittedAt: string;
  reviewedAt?: string;
  adminNotes?: string;
}

export default function GarageLocationPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [requests, setRequests] = useState<LocationChangeRequest[]>([]);
  const [hasPendingRequest, setHasPendingRequest] = useState(false);
  const [requiresOnboarding, setRequiresOnboarding] = useState(false);
  const [apiError, setApiError] = useState("");

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState("");

  // Modal form state (using GarageAutocomplete)
  const [modalGarageSearch, setModalGarageSearch] = useState("");
  const [modalSelectedGarage, setModalSelectedGarage] = useState<GarageDetails | null>(null);
  const [reason, setReason] = useState("");

  // Inline form state (for no location assigned)
  const [inlineGarageSearch, setInlineGarageSearch] = useState("");
  const [inlineSelectedGarage, setInlineSelectedGarage] = useState<GarageDetails | null>(null);
  const [inlineReason, setInlineReason] = useState("");
  const [inlineSubmitting, setInlineSubmitting] = useState(false);
  const [inlineError, setInlineError] = useState("");

  // Redirect if not authenticated or not a garage user
  useEffect(() => {
    if (status === "loading") return;

    if (!session) {
      router.push("/garage/login");
      return;
    }

    if (session.user.role !== "garage") {
      router.push("/");
      return;
    }
  }, [session, status, router]);

  // Fetch location data
  useEffect(() => {
    if (session?.user.role === "garage") {
      fetchLocationData();
    }
  }, [session]);

  const fetchLocationData = async () => {
    try {
      setLoading(true);
      setApiError("");
      const res = await fetch("/api/garage/location-change-request");
      const data = await res.json();

      if (res.ok) {
        setCurrentLocation(data.currentLocation);
        setRequests(data.requests);
        setHasPendingRequest(data.hasPendingRequest);
        setRequiresOnboarding(false);
      } else if (res.status === 404 && data.requiresOnboarding) {
        // User doesn't have a garage profile yet
        setRequiresOnboarding(true);
        setApiError(data.error || "Please complete your garage profile setup first.");
      } else if (res.status === 403) {
        // Not a garage user - redirect
        router.push("/dashboard");
      } else {
        setApiError(data.error || "Failed to load location data");
      }
    } catch (err) {
      console.error("Failed to fetch location data:", err);
      setApiError("Failed to load location data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Handle modal garage selection
  const handleModalGarageSelect = (garage: GarageDetails) => {
    setModalSelectedGarage(garage);
    setModalGarageSearch(garage.name);
    setSubmitError("");
  };

  // Submit location change request
  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalSelectedGarage) return;

    setSubmitting(true);
    setSubmitError("");

    try {
      const res = await fetch("/api/garage/location-change-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestedLocationId: modalSelectedGarage.placeId,
          requestedLocationName: modalSelectedGarage.name,
          requestedLocationAddress: modalSelectedGarage.formattedAddress,
          requestedLocationCoordinates: modalSelectedGarage.lat && modalSelectedGarage.lng
            ? { lat: modalSelectedGarage.lat, lng: modalSelectedGarage.lng }
            : undefined,
          reason: reason.trim(),
        }),
      });

      if (res.ok) {
        setSubmitSuccess("Location change request submitted successfully!");
        setShowModal(false);
        setModalSelectedGarage(null);
        setModalGarageSearch("");
        setReason("");
        fetchLocationData();
      } else {
        const data = await res.json();
        setSubmitError(data.error || "Failed to submit request");
      }
    } catch {
      setSubmitError("Failed to submit request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle inline garage selection (for no location assigned)
  const handleInlineGarageSelect = (garage: GarageDetails) => {
    setInlineSelectedGarage(garage);
    setInlineGarageSearch(garage.name);
    setInlineError("");
  };

  // Handle inline form submission (for no location assigned)
  const handleInlineSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inlineSelectedGarage) {
      setInlineError("Please select a garage location");
      return;
    }
    if (inlineReason.trim().length < 20) {
      setInlineError("Reason must be at least 20 characters");
      return;
    }

    setInlineSubmitting(true);
    setInlineError("");

    try {
      const res = await fetch("/api/garage/location-change-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestedLocationId: inlineSelectedGarage.placeId,
          requestedLocationName: inlineSelectedGarage.name,
          requestedLocationAddress: inlineSelectedGarage.formattedAddress,
          requestedLocationCoordinates: inlineSelectedGarage.lat && inlineSelectedGarage.lng
            ? { lat: inlineSelectedGarage.lat, lng: inlineSelectedGarage.lng }
            : undefined,
          reason: inlineReason.trim(),
        }),
      });

      if (res.ok) {
        setSubmitSuccess("Location assignment request submitted successfully!");
        setInlineSelectedGarage(null);
        setInlineGarageSearch("");
        setInlineReason("");
        fetchLocationData();
      } else {
        const data = await res.json();
        setInlineError(data.error || "Failed to submit request");
      }
    } catch {
      setInlineError("Failed to submit request. Please try again.");
    } finally {
      setInlineSubmitting(false);
    }
  };

  const pendingRequest = requests.find((r) => r.status === "pending");

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  // Show message when garage profile is required
  if (requiresOnboarding) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-8 text-center">
            <div className="mx-auto h-16 w-16 rounded-full bg-amber-100 flex items-center justify-center mb-4">
              <AlertCircle className="h-8 w-8 text-amber-600" />
            </div>
            <h1 className="text-xl font-bold text-amber-900 mb-2">Garage Profile Required</h1>
            <p className="text-amber-700 mb-6">
              {apiError || "Please complete your garage profile setup before requesting a location."}
            </p>
            <button
              onClick={() => router.push("/garage/onboarding")}
              className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-6 py-3 text-sm font-medium text-white hover:bg-amber-700 transition"
            >
              Complete Garage Profile
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show error message for other errors
  if (apiError && !requiresOnboarding) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center">
            <div className="mx-auto h-16 w-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
            <h1 className="text-xl font-bold text-red-900 mb-2">Error Loading Page</h1>
            <p className="text-red-700 mb-6">{apiError}</p>
            <button
              onClick={fetchLocationData}
              className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-6 py-3 text-sm font-medium text-white hover:bg-red-700 transition"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Garage Location</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage your linked garage location for receiving bookings
          </p>
        </div>

        {/* Success Message */}
        {submitSuccess && (
          <div className="mb-6 flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 p-4 text-emerald-700">
            <CheckCircle className="h-5 w-5" />
            {submitSuccess}
            <button
              onClick={() => setSubmitSuccess("")}
              className="ml-auto text-emerald-600 hover:text-emerald-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Current Location Card */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 mb-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Current Location</h2>

          {currentLocation?.id ? (
            <div className="rounded-lg border-2 border-emerald-200 bg-emerald-50 p-5">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
                  <Building2 className="h-6 w-6 text-emerald-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900">{currentLocation.name}</h3>
                  {currentLocation.address && (
                    <p className="mt-1 text-sm text-slate-600 flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {currentLocation.address}
                    </p>
                  )}
                </div>
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
                  Active
                </span>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* No location assigned - show selection form */}
              <div className="rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-6">
                <div className="text-center mb-6">
                  <div className="mx-auto h-12 w-12 rounded-full bg-slate-200 flex items-center justify-center mb-3">
                    <Wrench className="h-6 w-6 text-slate-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900">No Location Assigned</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Search for your garage or mechanic shop to request it as your linked location.
                  </p>
                </div>

                {/* Inline Request Form */}
                {!hasPendingRequest && (
                  <form onSubmit={handleInlineSubmit} className="space-y-4">
                    {inlineError && (
                      <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                        <AlertCircle className="h-4 w-4 flex-shrink-0" />
                        {inlineError}
                      </div>
                    )}

                    {/* Garage Search with Autocomplete */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Search for Your Garage *
                      </label>
                      <GarageAutocomplete
                        value={inlineGarageSearch}
                        onChange={setInlineGarageSearch}
                        onSelect={handleInlineGarageSelect}
                        placeholder="Start typing your garage name..."
                      />
                      <p className="mt-1 text-xs text-slate-500">
                        Search for your garage, mechanic shop, or auto service center
                      </p>
                    </div>

                    {/* Selected Location Preview */}
                    {inlineSelectedGarage && (
                      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                        <div className="flex items-start gap-3">
                          <Building2 className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-slate-900">{inlineSelectedGarage.name}</p>
                            <p className="text-sm text-slate-600 truncate">{inlineSelectedGarage.formattedAddress}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setInlineSelectedGarage(null);
                              setInlineGarageSearch("");
                            }}
                            className="text-slate-400 hover:text-slate-600"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Reason Textarea */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Why is this your garage? *
                      </label>
                      <textarea
                        value={inlineReason}
                        onChange={(e) => setInlineReason(e.target.value)}
                        placeholder="Please explain your connection to this garage (e.g., 'I am the owner of this business' or 'I work as the service manager here')..."
                        className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 focus:border-emerald-500 focus:ring-emerald-500 h-24 resize-none"
                        required
                        minLength={20}
                      />
                      <p className="mt-1 text-xs text-slate-500">
                        {inlineReason.length}/20 characters minimum
                      </p>
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={!inlineSelectedGarage || inlineReason.trim().length < 20 || inlineSubmitting}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                      {inlineSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Submitting Request...
                        </>
                      ) : (
                        <>
                          <MapPin className="h-4 w-4" />
                          Request Location Assignment
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Pending Request Alert */}
        {pendingRequest && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 mb-6">
            <div className="flex items-start gap-4">
              <Clock className="h-6 w-6 text-amber-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-amber-800">Location Change Request Pending</h3>
                <p className="mt-1 text-sm text-amber-700">
                  Your request to change to <strong>{pendingRequest.requestedLocationName}</strong> is
                  being reviewed by our team.
                </p>
                <p className="mt-2 text-xs text-amber-600">
                  Submitted: {new Date(pendingRequest.submittedAt).toLocaleDateString("en-AU", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Request Change Button */}
        {!hasPendingRequest && currentLocation?.id && (
          <div className="rounded-xl border border-slate-200 bg-white p-6 mb-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-2">Need to Change Location?</h2>
            <p className="text-sm text-slate-500 mb-4">
              If you&apos;ve moved to a new location or need to update your linked garage, you can submit
              a change request for admin review.
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition"
            >
              <MapPin className="h-4 w-4" />
              Request Location Change
            </button>
          </div>
        )}

        {/* Request History */}
        {requests.length > 0 && (
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Request History</h2>
            <div className="space-y-4">
              {requests.map((request) => (
                <div
                  key={request._id}
                  className={`rounded-lg border p-4 ${
                    request.status === "pending"
                      ? "border-amber-200 bg-amber-50"
                      : request.status === "approved"
                        ? "border-emerald-200 bg-emerald-50"
                        : "border-red-200 bg-red-50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {request.status === "pending" && (
                          <Clock className="h-4 w-4 text-amber-600" />
                        )}
                        {request.status === "approved" && (
                          <CheckCircle className="h-4 w-4 text-emerald-600" />
                        )}
                        {request.status === "rejected" && (
                          <XCircle className="h-4 w-4 text-red-600" />
                        )}
                        <span className="font-medium text-slate-900">
                          {request.requestedLocationName}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-slate-600">
                        {request.requestedLocationAddress}
                      </p>
                      <p className="mt-2 text-xs text-slate-500">
                        Submitted: {new Date(request.submittedAt).toLocaleDateString("en-AU")}
                        {request.reviewedAt && (
                          <> | Reviewed: {new Date(request.reviewedAt).toLocaleDateString("en-AU")}</>
                        )}
                      </p>
                      {request.adminNotes && (
                        <p className="mt-2 text-sm text-slate-600 italic">
                          Admin notes: {request.adminNotes}
                        </p>
                      )}
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                        request.status === "pending"
                          ? "bg-amber-100 text-amber-700"
                          : request.status === "approved"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-red-100 text-red-700"
                      }`}
                    >
                      {request.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Location Change Request Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-slate-900">Request Location Change</h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  setModalSelectedGarage(null);
                  setModalGarageSearch("");
                  setReason("");
                  setSubmitError("");
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitRequest} className="p-6">
              {submitError && (
                <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                  <AlertCircle className="h-4 w-4" />
                  {submitError}
                </div>
              )}

              {/* Location Search */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  New Garage Location *
                </label>
                <GarageAutocomplete
                  value={modalGarageSearch}
                  onChange={setModalGarageSearch}
                  onSelect={handleModalGarageSelect}
                  placeholder="Search for your new garage location..."
                />
                <p className="mt-1 text-xs text-slate-500">
                  Search for a garage, mechanic shop, or auto service center
                </p>
              </div>

              {/* Selected Location Preview */}
              {modalSelectedGarage && (
                <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                  <div className="flex items-start gap-3">
                    <Building2 className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900">{modalSelectedGarage.name}</p>
                      <p className="text-sm text-slate-600 truncate">{modalSelectedGarage.formattedAddress}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setModalSelectedGarage(null);
                        setModalGarageSearch("");
                      }}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Reason */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Reason for Change *
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Please explain why you need to change your garage location (minimum 20 characters)..."
                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 focus:border-emerald-500 focus:ring-emerald-500 h-24 resize-none"
                  required
                  minLength={20}
                />
                <p className="mt-1 text-xs text-slate-500">
                  {reason.length}/20 characters minimum
                </p>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setModalSelectedGarage(null);
                    setModalGarageSearch("");
                    setReason("");
                    setSubmitError("");
                  }}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!modalSelectedGarage || reason.trim().length < 20 || submitting}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Submit Request"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
