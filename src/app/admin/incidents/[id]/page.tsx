// src/app/admin/incidents/[id]/page.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  AlertTriangle,
  MapPin,
  Clock,
  User,
  Car,
  Phone,
  CheckCircle,
  Send,
  ExternalLink,
  XCircle,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────

interface IncidentDetail {
  _id: string;
  incidentType: string;
  severity: string;
  title: string;
  description: string;
  status: string;
  exceptionState: string;
  vehicleStatus: string;
  occurredAt: string;
  createdAt: string;
  location: {
    address: string;
    coordinates?: { lat: number; lng: number };
  };
  bookingStage: string;
  photos: Array<{ url: string; caption?: string; uploadedAt: string }>;
  thirdParty?: {
    name: string;
    phone: string;
    registration: string;
    insurer?: string;
    witnessDetails?: string;
  };
  policeInvolved: boolean;
  policeReference?: string;
  customerNotified: boolean;
  customerNotifiedAt?: string;
  dashcamFootageRef?: string;
  resolution?: {
    resolvedBy: { username: string };
    resolvedAt: string;
    outcome: string;
    notes: string;
    insuranceClaim?: boolean;
    claimReference?: string;
  };
  adminNotes: Array<{
    note: string;
    addedBy: { username: string; email?: string };
    addedAt: string;
  }>;
  driverId?: {
    firstName: string;
    lastName: string;
    phone?: string;
    email?: string;
  };
  bookingId?: {
    _id: string;
    vehicleRegistration: string;
    garageName?: string;
    userName: string;
    userEmail?: string;
    pickupAddress?: string;
    currentStage: string;
    status: string;
  };
  reportedBy?: { username: string; email?: string };
}

// ─── Config ────────────────────────────────────────────

const SEVERITY_BADGE: Record<string, string> = {
  low: "bg-emerald-100 text-emerald-800 border-emerald-200",
  medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
  high: "bg-orange-100 text-orange-800 border-orange-200",
  critical: "bg-red-100 text-red-800 border-red-200",
};

const STATUS_BADGE: Record<string, string> = {
  open: "bg-blue-100 text-blue-800",
  investigating: "bg-purple-100 text-purple-800",
  awaiting_response: "bg-yellow-100 text-yellow-800",
  resolved: "bg-emerald-100 text-emerald-800",
  closed: "bg-slate-100 text-slate-700",
};

const TYPE_LABELS: Record<string, string> = {
  road_accident: "Road Accident / Collision",
  damage_dispute: "Vehicle Damage / Dispute",
  breakdown: "Breakdown / Mechanical Failure",
  customer_unavailable: "Customer Unavailable",
  workshop_refusal: "Workshop Issue",
  keys_incident: "Keys Incident",
  safety_risk: "Safety / Security Risk",
  privacy_incident: "Privacy Incident",
  other: "Other",
};

const STATUSES = ["open", "investigating", "awaiting_response", "resolved", "closed"];
const EXCEPTION_STATES = ["continue", "hold", "stop"];

// ─── Component ─────────────────────────────────────────

export default function AdminIncidentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [incident, setIncident] = useState<IncidentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [addingNote, setAddingNote] = useState(false);

  // Resolution form
  const [resOutcome, setResOutcome] = useState("");
  const [resNotes, setResNotes] = useState("");
  const [resInsurance, setResInsurance] = useState(false);
  const [resClaimRef, setResClaimRef] = useState("");

  const fetchIncident = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/incidents/${id}`);
      if (res.ok) {
        const data = await res.json();
        setIncident(data.incident);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchIncident();
  }, [fetchIncident]);

  const handleUpdate = async (updates: Record<string, unknown>) => {
    setUpdating(true);
    try {
      const res = await fetch(`/api/admin/incidents/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        fetchIncident();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to update");
      }
    } catch {
      alert("Something went wrong");
    } finally {
      setUpdating(false);
    }
  };

  const handleResolve = async () => {
    if (!resOutcome.trim()) {
      alert("Please enter an outcome");
      return;
    }
    await handleUpdate({
      resolution: {
        outcome: resOutcome.trim(),
        notes: resNotes.trim(),
        insuranceClaim: resInsurance,
        claimReference: resClaimRef || undefined,
      },
    });
  };

  const handleAddNote = async () => {
    if (!noteText.trim()) return;
    setAddingNote(true);
    try {
      const res = await fetch(`/api/admin/incidents/${id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: noteText.trim() }),
      });
      if (res.ok) {
        setNoteText("");
        fetchIncident();
      }
    } catch {
      alert("Failed to add note");
    } finally {
      setAddingNote(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-AU", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 gap-3">
        <p className="text-slate-500">Incident not found</p>
        <button
          onClick={() => router.push("/admin/incidents")}
          className="text-sm text-emerald-600 hover:text-emerald-500"
        >
          Back to Incidents
        </button>
      </div>
    );
  }

  const isResolvable = ["open", "investigating", "awaiting_response"].includes(incident.status);

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <div>
          <button
            onClick={() => router.push("/admin/incidents")}
            className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Incidents
          </button>

          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold text-slate-900">{incident.title}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full border px-2.5 py-0.5 text-xs font-bold uppercase ${
                    SEVERITY_BADGE[incident.severity] || SEVERITY_BADGE.low
                  }`}
                >
                  {incident.severity}
                </span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    STATUS_BADGE[incident.status] || STATUS_BADGE.open
                  }`}
                >
                  {incident.status.replace("_", " ")}
                </span>
                {(incident.exceptionState === "hold" || incident.exceptionState === "stop") && (
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-bold uppercase ${
                      incident.exceptionState === "stop"
                        ? "bg-red-100 text-red-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {incident.exceptionState}
                  </span>
                )}
              </div>
            </div>

            {/* Quick actions */}
            {isResolvable && (
              <div className="flex items-center gap-2">
                <select
                  value={incident.status}
                  onChange={(e) => handleUpdate({ status: e.target.value })}
                  disabled={updating}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm focus:border-emerald-500 focus:outline-none"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s.replace("_", " ")}
                    </option>
                  ))}
                </select>
                <select
                  value={incident.exceptionState}
                  onChange={(e) => handleUpdate({ exceptionState: e.target.value })}
                  disabled={updating}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm focus:border-emerald-500 focus:outline-none"
                >
                  {EXCEPTION_STATES.map((s) => (
                    <option key={s} value={s}>
                      Exception: {s}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main content — 2 cols */}
          <div className="space-y-6 lg:col-span-2">
            {/* Incident Info */}
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <h2 className="mb-3 text-sm font-semibold text-slate-900">Incident Information</h2>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-xs text-slate-400">Type</span>
                  <p className="text-slate-700">{TYPE_LABELS[incident.incidentType]}</p>
                </div>
                <div>
                  <span className="text-xs text-slate-400">Vehicle Status</span>
                  <p className="text-slate-700 capitalize">{incident.vehicleStatus}</p>
                </div>
                <div>
                  <span className="text-xs text-slate-400">Booking Stage</span>
                  <p className="text-slate-700">{incident.bookingStage.replace(/_/g, " ")}</p>
                </div>
                <div>
                  <span className="text-xs text-slate-400">Occurred</span>
                  <p className="text-slate-700">{formatDate(incident.occurredAt)}</p>
                </div>
                <div className="col-span-2">
                  <span className="text-xs text-slate-400">Location</span>
                  <div className="flex items-start gap-2 mt-0.5">
                    <MapPin className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-slate-700">{incident.location.address}</p>
                      {incident.location.coordinates && (
                        <a
                          href={`https://www.google.com/maps?q=${incident.location.coordinates.lat},${incident.location.coordinates.lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-500"
                        >
                          <ExternalLink className="h-3 w-3" />
                          View on Map
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <h2 className="mb-2 text-sm font-semibold text-slate-900">Description</h2>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{incident.description}</p>
            </div>

            {/* Third Party */}
            {incident.thirdParty?.name && (
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <h2 className="mb-3 text-sm font-semibold text-slate-900">Third Party Details</h2>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-xs text-slate-400">Name</span>
                    <p className="text-slate-700">{incident.thirdParty.name}</p>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400">Phone</span>
                    <p className="text-slate-700">{incident.thirdParty.phone}</p>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400">Registration</span>
                    <p className="text-slate-700 font-mono uppercase">{incident.thirdParty.registration}</p>
                  </div>
                  {incident.thirdParty.insurer && (
                    <div>
                      <span className="text-xs text-slate-400">Insurer</span>
                      <p className="text-slate-700">{incident.thirdParty.insurer}</p>
                    </div>
                  )}
                  {incident.thirdParty.witnessDetails && (
                    <div className="col-span-2">
                      <span className="text-xs text-slate-400">Witnesses</span>
                      <p className="text-slate-700">{incident.thirdParty.witnessDetails}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Police */}
            {incident.policeInvolved && (
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <h2 className="mb-2 text-sm font-semibold text-slate-900">Police Involvement</h2>
                <p className="text-sm text-slate-700">
                  Police involved{incident.policeReference && ` — Reference: ${incident.policeReference}`}
                </p>
              </div>
            )}

            {/* Photos */}
            {incident.photos.length > 0 && (
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <h2 className="mb-3 text-sm font-semibold text-slate-900">
                  Evidence Photos ({incident.photos.length})
                </h2>
                <div className="grid grid-cols-3 gap-2">
                  {incident.photos.map((photo, idx) => (
                    <a
                      key={idx}
                      href={photo.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block aspect-square overflow-hidden rounded-lg bg-slate-100 hover:opacity-80 transition"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photo.url}
                        alt={photo.caption || `Photo ${idx + 1}`}
                        className="h-full w-full object-cover"
                      />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Resolution Section */}
            {incident.resolution ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-5">
                <h2 className="mb-3 text-sm font-semibold text-emerald-900">Resolution</h2>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-xs text-emerald-600">Outcome</span>
                    <p className="text-emerald-800">{incident.resolution.outcome}</p>
                  </div>
                  {incident.resolution.notes && (
                    <div>
                      <span className="text-xs text-emerald-600">Notes</span>
                      <p className="text-emerald-800">{incident.resolution.notes}</p>
                    </div>
                  )}
                  {incident.resolution.insuranceClaim && (
                    <p className="text-xs text-emerald-600">
                      Insurance claim filed{" "}
                      {incident.resolution.claimReference && `— Ref: ${incident.resolution.claimReference}`}
                    </p>
                  )}
                  <p className="text-xs text-emerald-500">
                    Resolved {formatDate(incident.resolution.resolvedAt)} by{" "}
                    {incident.resolution.resolvedBy?.username || "admin"}
                  </p>
                </div>
              </div>
            ) : (
              isResolvable && (
                <div className="rounded-xl border border-slate-200 bg-white p-5">
                  <h2 className="mb-3 text-sm font-semibold text-slate-900">Resolve Incident</h2>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Outcome</label>
                      <input
                        type="text"
                        value={resOutcome}
                        onChange={(e) => setResOutcome(e.target.value)}
                        placeholder="What was the outcome?"
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Notes</label>
                      <textarea
                        value={resNotes}
                        onChange={(e) => setResNotes(e.target.value)}
                        placeholder="Additional details..."
                        rows={2}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm resize-none focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 text-sm text-slate-700">
                        <input
                          type="checkbox"
                          checked={resInsurance}
                          onChange={(e) => setResInsurance(e.target.checked)}
                          className="rounded border-slate-300"
                        />
                        Insurance claim
                      </label>
                      {resInsurance && (
                        <input
                          type="text"
                          value={resClaimRef}
                          onChange={(e) => setResClaimRef(e.target.value)}
                          placeholder="Claim reference"
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-emerald-500 focus:outline-none"
                        />
                      )}
                    </div>
                    <button
                      onClick={handleResolve}
                      disabled={updating}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
                    >
                      {updating ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle className="h-4 w-4" />
                      )}
                      Resolve Incident
                    </button>
                  </div>
                </div>
              )
            )}

            {/* Admin Notes */}
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <h2 className="mb-3 text-sm font-semibold text-slate-900">Admin Notes</h2>

              {/* Add note */}
              <div className="mb-4 flex gap-2">
                <input
                  type="text"
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Add a note..."
                  onKeyDown={(e) => e.key === "Enter" && handleAddNote()}
                  className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <button
                  onClick={handleAddNote}
                  disabled={addingNote || !noteText.trim()}
                  className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  {addingNote ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </button>
              </div>

              {/* Notes list */}
              {incident.adminNotes.length > 0 ? (
                <div className="space-y-3">
                  {[...incident.adminNotes].reverse().map((n, i) => (
                    <div key={i} className="rounded-lg bg-slate-50 px-3 py-2">
                      <p className="text-sm text-slate-700">{n.note}</p>
                      <p className="text-[10px] text-slate-400 mt-1">
                        {n.addedBy?.username || "admin"} &middot; {formatDate(n.addedAt)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400">No notes yet</p>
              )}
            </div>
          </div>

          {/* Sidebar — 1 col */}
          <div className="space-y-4">
            {/* Driver Info */}
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Driver
              </h3>
              {incident.driverId ? (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-slate-400" />
                    <span className="text-sm font-medium text-slate-800">
                      {incident.driverId.firstName} {incident.driverId.lastName}
                    </span>
                  </div>
                  {incident.driverId.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-slate-400" />
                      <a
                        href={`tel:${incident.driverId.phone}`}
                        className="text-sm text-emerald-600"
                      >
                        {incident.driverId.phone}
                      </a>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-slate-400">Unknown</p>
              )}
            </div>

            {/* Booking Info */}
            {incident.bookingId && (
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Booking
                </h3>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Car className="h-4 w-4 text-slate-400" />
                    <span className="text-sm font-mono font-medium text-slate-800 uppercase">
                      {incident.bookingId.vehicleRegistration}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    {incident.bookingId.userName}
                  </p>
                  {incident.bookingId.garageName && (
                    <p className="text-xs text-slate-500">
                      {incident.bookingId.garageName}
                    </p>
                  )}
                  <Link
                    href={`/admin/bookings/${incident.bookingId._id}`}
                    className="inline-flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-500"
                  >
                    View Booking
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            )}

            {/* Customer Notification */}
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Customer Notified
              </h3>
              {incident.customerNotified ? (
                <div className="flex items-center gap-2 text-emerald-600">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm">
                    Yes{incident.customerNotifiedAt && ` — ${formatDate(incident.customerNotifiedAt)}`}
                  </span>
                </div>
              ) : (
                <button
                  onClick={() => handleUpdate({ customerNotified: true })}
                  disabled={updating}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200 disabled:opacity-50"
                >
                  Mark as Notified
                </button>
              )}
            </div>

            {/* Timeline */}
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Timeline
              </h3>
              <div className="space-y-3 text-xs">
                <div className="flex items-start gap-2">
                  <Clock className="h-3.5 w-3.5 text-slate-400 mt-0.5" />
                  <div>
                    <p className="font-medium text-slate-700">Incident reported</p>
                    <p className="text-slate-400">{formatDate(incident.createdAt)}</p>
                  </div>
                </div>
                {incident.adminNotes.map((n, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <Clock className="h-3.5 w-3.5 text-slate-400 mt-0.5" />
                    <div>
                      <p className="font-medium text-slate-700">Note added by {n.addedBy?.username}</p>
                      <p className="text-slate-400">{formatDate(n.addedAt)}</p>
                    </div>
                  </div>
                ))}
                {incident.resolution && (
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-3.5 w-3.5 text-emerald-500 mt-0.5" />
                    <div>
                      <p className="font-medium text-emerald-700">Resolved</p>
                      <p className="text-slate-400">{formatDate(incident.resolution.resolvedAt)}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
