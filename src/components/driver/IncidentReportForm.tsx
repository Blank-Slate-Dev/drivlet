// src/components/driver/IncidentReportForm.tsx
"use client";

import { useState, useCallback } from "react";
import {
  X,
  ArrowLeft,
  ArrowRight,
  AlertTriangle,
  Camera,
  Loader2,
  CheckCircle,
  Car,
  Wrench,
  Home,
  Factory,
  Key,
  Shield,
  Lock,
  FileText,
  MapPin,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────

type IncidentType =
  | "road_accident"
  | "damage_dispute"
  | "breakdown"
  | "customer_unavailable"
  | "workshop_refusal"
  | "keys_incident"
  | "safety_risk"
  | "privacy_incident"
  | "other";

type Severity = "low" | "medium" | "high" | "critical";

interface Photo {
  url: string;
  caption?: string;
  uploadedAt: Date;
}

interface FormData {
  incidentType: IncidentType | null;
  severity: Severity | null;
  title: string;
  description: string;
  location: { address: string; coordinates?: { lat: number; lng: number } };
  photos: Photo[];
  thirdParty: {
    name: string;
    phone: string;
    registration: string;
    insurer: string;
    witnessDetails: string;
  };
  policeInvolved: boolean;
  policeReference: string;
  vehicleStatus: "drivable" | "towed" | "held" | "unknown";
}

// ─── Constants ─────────────────────────────────────────

const INCIDENT_TYPES: {
  value: IncidentType;
  label: string;
  icon: React.ElementType;
  desc: string;
}[] = [
  { value: "road_accident", label: "Road Accident", icon: Car, desc: "Collision or road incident" },
  { value: "damage_dispute", label: "Vehicle Damage", icon: AlertTriangle, desc: "Dispute about damage" },
  { value: "breakdown", label: "Breakdown", icon: Wrench, desc: "Mechanical failure" },
  { value: "customer_unavailable", label: "Customer Unavailable", icon: Home, desc: "Customer not present" },
  { value: "workshop_refusal", label: "Workshop Issue", icon: Factory, desc: "Problem with garage" },
  { value: "keys_incident", label: "Keys Incident", icon: Key, desc: "Key loss or issue" },
  { value: "safety_risk", label: "Safety Risk", icon: Shield, desc: "Safety or security risk" },
  { value: "privacy_incident", label: "Privacy Incident", icon: Lock, desc: "Privacy concern" },
  { value: "other", label: "Other", icon: FileText, desc: "Something else" },
];

const SEVERITY_OPTIONS: {
  value: Severity;
  label: string;
  desc: string;
  color: string;
  borderColor: string;
}[] = [
  {
    value: "low",
    label: "Low",
    desc: "Minor — job can continue",
    color: "text-emerald-700 bg-emerald-50",
    borderColor: "border-emerald-300",
  },
  {
    value: "medium",
    label: "Medium",
    desc: "Notable — may need follow-up",
    color: "text-yellow-700 bg-yellow-50",
    borderColor: "border-yellow-300",
  },
  {
    value: "high",
    label: "High",
    desc: "Significant — HOLD for Ops",
    color: "text-orange-700 bg-orange-50",
    borderColor: "border-orange-300",
  },
  {
    value: "critical",
    label: "Critical",
    desc: "Serious — STOP immediately",
    color: "text-red-700 bg-red-50",
    borderColor: "border-red-300",
  },
];

const PHOTOS_REQUIRED_TYPES: IncidentType[] = [
  "road_accident",
  "damage_dispute",
  "breakdown",
];

// ─── Component ─────────────────────────────────────────

export default function IncidentReportForm({
  bookingId,
  onClose,
  onSubmitted,
}: {
  bookingId: string;
  onClose: () => void;
  onSubmitted: (exceptionState: string) => void;
}) {
  const [step, setStep] = useState(1);
  const totalSteps = 5;
  const [submitting, setSubmitting] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState<FormData>({
    incidentType: null,
    severity: null,
    title: "",
    description: "",
    location: { address: "" },
    photos: [],
    thirdParty: { name: "", phone: "", registration: "", insurer: "", witnessDetails: "" },
    policeInvolved: false,
    policeReference: "",
    vehicleStatus: "unknown",
  });

  // Auto-get GPS location
  const getLocation = useCallback(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((prev) => ({
          ...prev,
          location: {
            ...prev.location,
            coordinates: { lat: pos.coords.latitude, lng: pos.coords.longitude },
          },
        }));
      },
      () => {
        // Silently fail — user can enter manually
      }
    );
  }, []);

  // Upload photos
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingPhotos(true);
    setError("");

    const newPhotos: Photo[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/incidents/upload", {
          method: "POST",
          body: formData,
        });
        if (res.ok) {
          const data = await res.json();
          newPhotos.push({ url: data.url, uploadedAt: new Date() });
        }
      } catch {
        // skip failed uploads
      }
    }

    setForm((prev) => ({
      ...prev,
      photos: [...prev.photos, ...newPhotos],
    }));
    setUploadingPhotos(false);
    // Reset file input
    e.target.value = "";
  };

  const removePhoto = (idx: number) => {
    setForm((prev) => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== idx),
    }));
  };

  // Validation per step
  const canProceed = (): boolean => {
    switch (step) {
      case 1:
        return !!form.incidentType;
      case 2:
        return !!form.severity && form.title.trim().length > 0 && form.description.trim().length > 0 && form.location.address.trim().length > 0;
      case 3: {
        if (PHOTOS_REQUIRED_TYPES.includes(form.incidentType!) && form.photos.length === 0) {
          return false;
        }
        return true;
      }
      case 4:
        return true; // conditional fields are optional
      case 5:
        return true;
      default:
        return false;
    }
  };

  // Submit
  const handleSubmit = async () => {
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId,
          incidentType: form.incidentType,
          severity: form.severity,
          title: form.title.trim(),
          description: form.description.trim(),
          location: form.location,
          photos: form.photos,
          thirdParty:
            form.incidentType === "road_accident" &&
            form.thirdParty.name
              ? form.thirdParty
              : undefined,
          policeInvolved: form.policeInvolved,
          policeReference: form.policeReference || undefined,
          vehicleStatus: form.vehicleStatus,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to submit incident");
      }

      const data = await res.json();
      onSubmitted(data.exceptionState);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSubmitting(false);
    }
  };

  // Determine which additional fields are needed
  const needsThirdParty = form.incidentType === "road_accident";
  const needsVehicleStatus = ["road_accident", "breakdown"].includes(form.incidentType || "");

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Report Incident</h2>
            <p className="text-xs text-slate-500">Step {step} of {totalSteps}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {Array.from({ length: totalSteps }, (_, i) => (
            <div
              key={i}
              className={`h-1.5 w-6 rounded-full transition ${
                i < step ? "bg-emerald-500" : "bg-slate-200"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Body — scrollable */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto max-w-lg">
          {/* ═══ STEP 1: What happened? ═══ */}
          {step === 1 && (
            <div>
              <h3 className="mb-4 text-lg font-semibold text-slate-800">What happened?</h3>
              <div className="grid grid-cols-2 gap-3">
                {INCIDENT_TYPES.map((type) => {
                  const Icon = type.icon;
                  const selected = form.incidentType === type.value;
                  return (
                    <button
                      key={type.value}
                      onClick={() => setForm((p) => ({ ...p, incidentType: type.value }))}
                      className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 text-center transition ${
                        selected
                          ? "border-emerald-500 bg-emerald-50"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      <Icon className={`h-6 w-6 ${selected ? "text-emerald-600" : "text-slate-400"}`} />
                      <span className={`text-sm font-medium ${selected ? "text-emerald-700" : "text-slate-700"}`}>
                        {type.label}
                      </span>
                      <span className="text-[10px] text-slate-400">{type.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ═══ STEP 2: Severity & Details ═══ */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h3 className="mb-3 text-lg font-semibold text-slate-800">Severity</h3>
                <div className="grid grid-cols-2 gap-2">
                  {SEVERITY_OPTIONS.map((sev) => {
                    const selected = form.severity === sev.value;
                    return (
                      <button
                        key={sev.value}
                        onClick={() => setForm((p) => ({ ...p, severity: sev.value }))}
                        className={`rounded-xl border-2 p-3 text-left transition ${
                          selected
                            ? `${sev.borderColor} ${sev.color}`
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        <span className="text-sm font-semibold">{sev.label}</span>
                        <p className="text-xs opacity-70 mt-0.5">{sev.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Short Summary
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  placeholder="e.g. Minor scrape on driver side door"
                  maxLength={200}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700 placeholder:text-slate-300 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Description — Facts only
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Describe what happened. Stick to facts..."
                  rows={4}
                  maxLength={5000}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700 placeholder:text-slate-300 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
                />
                <div className="text-right text-[10px] text-slate-400 mt-0.5">
                  {form.description.length}/5000
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Location
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={form.location.address}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        location: { ...p.location, address: e.target.value },
                      }))
                    }
                    placeholder="Enter address or intersection"
                    className="flex-1 rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700 placeholder:text-slate-300 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={getLocation}
                    className="rounded-lg border border-slate-200 p-2.5 text-slate-500 hover:bg-slate-50"
                    title="Use current location"
                  >
                    <MapPin className="h-4 w-4" />
                  </button>
                </div>
                {form.location.coordinates && (
                  <p className="text-[10px] text-emerald-600 mt-1">
                    GPS captured: {form.location.coordinates.lat.toFixed(5)},{" "}
                    {form.location.coordinates.lng.toFixed(5)}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ═══ STEP 3: Evidence (Photos) ═══ */}
          {step === 3 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-800">Evidence</h3>

              {PHOTOS_REQUIRED_TYPES.includes(form.incidentType!) && (
                <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
                  <p className="text-xs text-amber-700">
                    Photos are required for this incident type.
                  </p>
                </div>
              )}

              {/* Photo grid */}
              {form.photos.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {form.photos.map((photo, idx) => (
                    <div key={idx} className="relative aspect-square rounded-lg overflow-hidden bg-slate-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photo.url}
                        alt={`Evidence ${idx + 1}`}
                        className="h-full w-full object-cover"
                      />
                      <button
                        onClick={() => removePhoto(idx)}
                        className="absolute right-1 top-1 rounded-full bg-black/50 p-1 text-white hover:bg-black/70"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Upload button */}
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 p-6 text-center transition hover:border-emerald-400 hover:bg-emerald-50/30">
                {uploadingPhotos ? (
                  <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
                ) : (
                  <Camera className="h-6 w-6 text-slate-400" />
                )}
                <span className="text-sm text-slate-600">
                  {uploadingPhotos
                    ? "Uploading..."
                    : form.photos.length > 0
                    ? "Add more photos"
                    : "Take or upload photos"}
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/heic"
                  multiple
                  onChange={handlePhotoUpload}
                  disabled={uploadingPhotos}
                  className="hidden"
                />
              </label>

              <p className="text-xs text-slate-400 text-center">
                JPEG, PNG, HEIC — max 10MB per photo
              </p>
            </div>
          )}

          {/* ═══ STEP 4: Additional Details (conditional) ═══ */}
          {step === 4 && (
            <div className="space-y-5">
              <h3 className="text-lg font-semibold text-slate-800">Additional Details</h3>

              {needsThirdParty && (
                <div className="space-y-3 rounded-lg border border-slate-200 p-4">
                  <h4 className="text-sm font-semibold text-slate-700">Third Party Details</h4>
                  <input
                    type="text"
                    placeholder="Name"
                    value={form.thirdParty.name}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        thirdParty: { ...p.thirdParty, name: e.target.value },
                      }))
                    }
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <input
                    type="tel"
                    placeholder="Phone"
                    value={form.thirdParty.phone}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        thirdParty: { ...p.thirdParty, phone: e.target.value },
                      }))
                    }
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <input
                    type="text"
                    placeholder="Registration"
                    value={form.thirdParty.registration}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        thirdParty: { ...p.thirdParty, registration: e.target.value },
                      }))
                    }
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm uppercase focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <input
                    type="text"
                    placeholder="Insurer (optional)"
                    value={form.thirdParty.insurer}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        thirdParty: { ...p.thirdParty, insurer: e.target.value },
                      }))
                    }
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <textarea
                    placeholder="Witness details (optional)"
                    value={form.thirdParty.witnessDetails}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        thirdParty: { ...p.thirdParty, witnessDetails: e.target.value },
                      }))
                    }
                    rows={2}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm resize-none focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              )}

              {/* Police */}
              <div className="rounded-lg border border-slate-200 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">Police Involved?</span>
                  <button
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, policeInvolved: !p.policeInvolved }))}
                    className={`relative h-6 w-11 rounded-full transition ${
                      form.policeInvolved ? "bg-emerald-500" : "bg-slate-300"
                    }`}
                  >
                    <span
                      className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${
                        form.policeInvolved ? "translate-x-5" : ""
                      }`}
                    />
                  </button>
                </div>
                {form.policeInvolved && (
                  <input
                    type="text"
                    placeholder="Police reference number"
                    value={form.policeReference}
                    onChange={(e) => setForm((p) => ({ ...p, policeReference: e.target.value }))}
                    className="mt-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                )}
              </div>

              {/* Vehicle status */}
              {needsVehicleStatus && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Vehicle Status After Incident
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {(["drivable", "towed", "held", "unknown"] as const).map((vs) => (
                      <button
                        key={vs}
                        onClick={() => setForm((p) => ({ ...p, vehicleStatus: vs }))}
                        className={`rounded-lg border-2 px-3 py-2 text-sm font-medium capitalize transition ${
                          form.vehicleStatus === vs
                            ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                            : "border-slate-200 text-slate-600 hover:border-slate-300"
                        }`}
                      >
                        {vs}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {!needsThirdParty && !needsVehicleStatus && (
                <div className="py-6 text-center">
                  <p className="text-sm text-slate-400">
                    No additional details needed for this incident type.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ═══ STEP 5: Review & Submit ═══ */}
          {step === 5 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-800">Review & Submit</h3>

              {/* Summary */}
              <div className="rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
                <div className="px-4 py-3">
                  <span className="text-[10px] uppercase tracking-wide text-slate-400">Type</span>
                  <p className="text-sm font-medium text-slate-800">
                    {INCIDENT_TYPES.find((t) => t.value === form.incidentType)?.label}
                  </p>
                </div>
                <div className="px-4 py-3">
                  <span className="text-[10px] uppercase tracking-wide text-slate-400">Severity</span>
                  <p className="text-sm font-medium text-slate-800 capitalize">{form.severity}</p>
                </div>
                <div className="px-4 py-3">
                  <span className="text-[10px] uppercase tracking-wide text-slate-400">Summary</span>
                  <p className="text-sm text-slate-800">{form.title}</p>
                </div>
                <div className="px-4 py-3">
                  <span className="text-[10px] uppercase tracking-wide text-slate-400">Description</span>
                  <p className="text-sm text-slate-600 line-clamp-3">{form.description}</p>
                </div>
                <div className="px-4 py-3">
                  <span className="text-[10px] uppercase tracking-wide text-slate-400">Location</span>
                  <p className="text-sm text-slate-600">{form.location.address}</p>
                </div>
                <div className="px-4 py-3">
                  <span className="text-[10px] uppercase tracking-wide text-slate-400">Photos</span>
                  <p className="text-sm text-slate-600">{form.photos.length} uploaded</p>
                </div>
                {form.policeInvolved && (
                  <div className="px-4 py-3">
                    <span className="text-[10px] uppercase tracking-wide text-slate-400">Police</span>
                    <p className="text-sm text-slate-600">
                      Yes{form.policeReference && ` — Ref: ${form.policeReference}`}
                    </p>
                  </div>
                )}
              </div>

              {/* Warning */}
              <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3">
                <p className="text-xs text-amber-800 font-medium">
                  Do not admit liability. Stick to facts only.
                </p>
              </div>

              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3">
                  <p className="text-xs text-red-700">{error}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer — navigation buttons */}
      <div className="border-t border-slate-200 px-4 py-3">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-3">
          {step > 1 ? (
            <button
              onClick={() => setStep(step - 1)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
          ) : (
            <button
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
          )}

          {step < totalSteps ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={!canProceed()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-40"
            >
              Next
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <AlertTriangle className="h-4 w-4" />
              )}
              Submit Incident
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Submission Confirmation Modal ────────────────────

export function IncidentSubmittedModal({
  exceptionState,
  onClose,
}: {
  exceptionState: string;
  onClose: () => void;
}) {
  const config = {
    continue: {
      icon: CheckCircle,
      iconColor: "text-emerald-600",
      bg: "bg-emerald-50 border-emerald-200",
      title: "Incident Logged",
      message: "Continue with your job. Ops will review this incident.",
    },
    hold: {
      icon: AlertTriangle,
      iconColor: "text-amber-600",
      bg: "bg-amber-50 border-amber-200",
      title: "Incident Logged — HOLD",
      message: "Please wait for Ops instructions before proceeding.",
    },
    stop: {
      icon: AlertTriangle,
      iconColor: "text-red-600",
      bg: "bg-red-50 border-red-200",
      title: "Incident Logged — STOP",
      message: "DO NOT proceed. Ops will contact you shortly.",
    },
  }[exceptionState] || {
    icon: CheckCircle,
    iconColor: "text-emerald-600",
    bg: "bg-emerald-50 border-emerald-200",
    title: "Incident Logged",
    message: "Ops will review this incident.",
  };

  const Icon = config.icon;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl text-center">
        <div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full ${config.bg} border`}>
          <Icon className={`h-8 w-8 ${config.iconColor}`} />
        </div>
        <h3 className="text-lg font-semibold text-slate-900 mb-2">{config.title}</h3>
        <p className="text-sm text-slate-600 mb-6">{config.message}</p>
        <button
          onClick={onClose}
          className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
        >
          OK
        </button>
      </div>
    </div>
  );
}
