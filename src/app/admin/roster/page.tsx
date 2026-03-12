// src/app/admin/roster/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Plus,
  Save,
  Loader2,
  X,
  CheckCircle,
  AlertTriangle,
  Trash2,
} from "lucide-react";
import {
  getCurrentFortnightStart,
  getFortnightDates,
  formatShiftTime,
  getPeriodEnd,
  formatPeriodRange,
  getTimeOptions,
} from "@/lib/roster";

// ── Types ──────────────────────────────────────────────────────────────────
interface Shift {
  driverId: string;
  driverName: string;
  date: string; // ISO string
  startTime: string;
  endTime: string;
  notes: string;
}

interface Driver {
  _id: string;
  firstName: string;
  lastName: string;
}

interface Roster {
  _id: string;
  periodStart: string;
  periodEnd: string;
  status: "draft" | "published";
  shifts: Shift[];
  publishedAt?: string;
}

interface EditModal {
  open: boolean;
  driverId: string;
  driverName: string;
  date: Date | null;
  existingShift: Shift | null;
}

const EMPTY_MODAL: EditModal = {
  open: false,
  driverId: "",
  driverName: "",
  date: null,
  existingShift: null,
};

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const TIME_OPTIONS = getTimeOptions();

// ── Helpers ────────────────────────────────────────────────────────────────
function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

// ── Component ──────────────────────────────────────────────────────────────
export default function AdminRosterPage() {
  const [periodStart, setPeriodStart] = useState<Date>(() =>
    getCurrentFortnightStart()
  );
  const [roster, setRoster] = useState<Roster | null>(null);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [confirmPublish, setConfirmPublish] = useState(false);
  const [modal, setModal] = useState<EditModal>(EMPTY_MODAL);
  const [editStart, setEditStart] = useState("08:00");
  const [editEnd, setEditEnd] = useState("16:30");
  const [editNotes, setEditNotes] = useState("");

  const periodEnd = getPeriodEnd(periodStart);
  const fortnightDates = getFortnightDates(periodStart);
  const week1 = fortnightDates.slice(0, 7);
  const week2 = fortnightDates.slice(7, 14);

  // ── Data fetching ────────────────────────────────────────────────────────
  const fetchRoster = useCallback(async (start: Date) => {
    setLoading(true);
    setError("");
    try {
      const isoDate = start.toISOString().split("T")[0];
      const res = await fetch(`/api/admin/roster?period=${isoDate}`);
      if (!res.ok) throw new Error("Failed to fetch roster");
      const data = await res.json();
      setRoster(data.roster);
      setDrivers(data.drivers || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load roster");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoster(periodStart);
  }, [periodStart, fetchRoster]);

  // ── Period navigation ────────────────────────────────────────────────────
  const goToPrevFortnight = () => setPeriodStart((p) => addDays(p, -14));
  const goToNextFortnight = () => setPeriodStart((p) => addDays(p, 14));

  // ── Create new roster ────────────────────────────────────────────────────
  const handleCreateRoster = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/roster", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ periodStart: periodStart.toISOString(), shifts: [] }),
      });
      if (!res.ok) throw new Error("Failed to create roster");
      const data = await res.json();
      setRoster(data.roster);
      setSuccess("Roster created!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create roster");
    } finally {
      setSaving(false);
    }
  };

  // ── Publish roster ────────────────────────────────────────────────────────
  const handlePublish = async () => {
    if (!roster) return;
    setPublishing(true);
    setError("");
    setConfirmPublish(false);
    try {
      const res = await fetch(`/api/admin/roster/${roster._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "published" }),
      });
      if (!res.ok) throw new Error("Failed to publish roster");
      const data = await res.json();
      setRoster(data.roster);
      setSuccess("Roster published! Drivers can now see their shifts.");
      setTimeout(() => setSuccess(""), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to publish roster");
    } finally {
      setPublishing(false);
    }
  };

  // ── Cell click ───────────────────────────────────────────────────────────
  const handleCellClick = (driver: Driver, date: Date) => {
    if (!roster) return;
    const existing = roster.shifts.find(
      (s) =>
        s.driverId === driver._id &&
        isSameDay(new Date(s.date), date)
    ) ?? null;
    setEditStart(existing?.startTime ?? "08:00");
    setEditEnd(existing?.endTime ?? "16:30");
    setEditNotes(existing?.notes ?? "");
    setModal({
      open: true,
      driverId: driver._id,
      driverName: `${driver.firstName} ${driver.lastName}`,
      date,
      existingShift: existing,
    });
  };

  // ── Save shift ───────────────────────────────────────────────────────────
  const handleSaveShift = async () => {
    if (!roster || !modal.date) return;
    setSaving(true);
    setError("");

    // Build updated shifts array: remove any existing shift for this driver/date,
    // then add the new one
    const filtered = roster.shifts.filter(
      (s) =>
        !(
          s.driverId === modal.driverId &&
          isSameDay(new Date(s.date), modal.date!)
        )
    );

    const newShift: Shift = {
      driverId: modal.driverId,
      driverName: modal.driverName,
      date: modal.date.toISOString(),
      startTime: editStart,
      endTime: editEnd,
      notes: editNotes.trim(),
    };

    const updatedShifts = [...filtered, newShift];

    try {
      const res = await fetch(`/api/admin/roster/${roster._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shifts: updatedShifts }),
      });
      if (!res.ok) throw new Error("Failed to save shift");
      const data = await res.json();
      setRoster(data.roster);
      setModal(EMPTY_MODAL);
      setSuccess("Shift saved!");
      setTimeout(() => setSuccess(""), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save shift");
    } finally {
      setSaving(false);
    }
  };

  // ── Remove shift ─────────────────────────────────────────────────────────
  const handleRemoveShift = async () => {
    if (!roster || !modal.date) return;
    setSaving(true);
    setError("");

    const updatedShifts = roster.shifts.filter(
      (s) =>
        !(
          s.driverId === modal.driverId &&
          isSameDay(new Date(s.date), modal.date!)
        )
    );

    try {
      const res = await fetch(`/api/admin/roster/${roster._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shifts: updatedShifts }),
      });
      if (!res.ok) throw new Error("Failed to remove shift");
      const data = await res.json();
      setRoster(data.roster);
      setModal(EMPTY_MODAL);
      setSuccess("Shift removed.");
      setTimeout(() => setSuccess(""), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove shift");
    } finally {
      setSaving(false);
    }
  };

  // ── Shift lookup helper ──────────────────────────────────────────────────
  const getShift = (driverId: string, date: Date): Shift | undefined => {
    return roster?.shifts.find(
      (s) => s.driverId === driverId && isSameDay(new Date(s.date), date)
    );
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Page header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Driver Roster</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Manage the fortnightly driver schedule
          </p>
        </div>
        <div className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-slate-400" />
          <span className="text-sm font-medium text-slate-700">
            {formatPeriodRange(periodStart, periodEnd)}
          </span>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
          <button onClick={() => setError("")} className="ml-auto">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      {success && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <CheckCircle className="h-4 w-4 shrink-0" />
          {success}
        </div>
      )}

      {/* Period controls bar */}
      <div className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <button
          onClick={goToPrevFortnight}
          className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
          title="Previous fortnight"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div className="flex flex-1 items-center justify-center gap-3">
          <span className="text-sm font-semibold text-slate-800">
            {formatPeriodRange(periodStart, periodEnd)}
          </span>
          {roster && (
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                roster.status === "published"
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-amber-100 text-amber-700"
              }`}
            >
              {roster.status === "published" ? "Published" : "Draft"}
            </span>
          )}
        </div>

        <button
          onClick={goToNextFortnight}
          className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
          title="Next fortnight"
        >
          <ChevronRight className="h-4 w-4" />
        </button>

        {!loading && !roster && (
          <button
            onClick={handleCreateRoster}
            disabled={saving}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            New Roster
          </button>
        )}

        {roster?.status === "draft" && !confirmPublish && (
          <button
            onClick={() => setConfirmPublish(true)}
            className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100"
          >
            <CheckCircle className="h-4 w-4" />
            Publish Roster
          </button>
        )}

        {confirmPublish && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600">Publish to all drivers?</span>
            <button
              onClick={handlePublish}
              disabled={publishing}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              {publishing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Yes, publish
            </button>
            <button
              onClick={() => setConfirmPublish(false)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        </div>
      )}

      {/* No roster state */}
      {!loading && !roster && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white py-16">
          <CalendarDays className="h-12 w-12 text-slate-300" />
          <p className="mt-3 text-sm font-medium text-slate-600">
            No roster for this fortnight
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Click &ldquo;New Roster&rdquo; to create one
          </p>
        </div>
      )}

      {/* No drivers state */}
      {!loading && roster && drivers.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white py-16">
          <p className="text-sm text-slate-500">
            No active approved drivers found. Approve drivers before building a roster.
          </p>
        </div>
      )}

      {/* Roster grid */}
      {!loading && roster && drivers.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          {[week1, week2].map((week, weekIdx) => (
            <div key={weekIdx}>
              {/* Week header */}
              <div className="border-b border-slate-100 bg-slate-50 px-4 py-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Week {weekIdx + 1} —{" "}
                  {week[0].toLocaleDateString("en-AU", {
                    day: "numeric",
                    month: "short",
                  })}{" "}
                  to{" "}
                  {week[6].toLocaleDateString("en-AU", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>

              <table className="w-full min-w-[700px] table-fixed border-collapse">
                {/* Day headers */}
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="w-36 px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Driver
                    </th>
                    {week.map((date, i) => (
                      <th
                        key={i}
                        className="px-2 py-2 text-center text-xs font-semibold uppercase tracking-wide text-slate-500"
                      >
                        <div>{DAY_LABELS[i]}</div>
                        <div className="font-normal normal-case text-slate-400">
                          {date.getDate()}/{date.getMonth() + 1}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>

                {/* Driver rows */}
                <tbody>
                  {drivers.map((driver, rowIdx) => (
                    <tr
                      key={driver._id}
                      className={rowIdx % 2 === 0 ? "bg-white" : "bg-slate-50/50"}
                    >
                      <td className="truncate px-4 py-2 text-sm font-medium text-slate-900">
                        {driver.firstName} {driver.lastName}
                      </td>
                      {week.map((date, colIdx) => {
                        const shift = getShift(driver._id, date);
                        return (
                          <td key={colIdx} className="px-1.5 py-1.5 text-center">
                            <button
                              onClick={() => handleCellClick(driver, date)}
                              className={`group w-full rounded-lg px-1 py-1.5 text-xs transition ${
                                shift
                                  ? "bg-emerald-50 font-medium text-emerald-700 hover:bg-emerald-100"
                                  : "text-transparent hover:bg-slate-50 hover:text-slate-300"
                              }`}
                              title={
                                shift
                                  ? `${formatShiftTime(shift.startTime, shift.endTime)}${shift.notes ? ` — ${shift.notes}` : ""}`
                                  : `Add shift for ${driver.firstName}`
                              }
                            >
                              {shift ? (
                                formatShiftTime(shift.startTime, shift.endTime)
                              ) : (
                                <span className="opacity-0 group-hover:opacity-100">+</span>
                              )}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>

              {weekIdx === 0 && (
                <div className="border-b border-slate-200" />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Edit Shift Modal */}
      {modal.open && modal.date && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/40"
            onClick={() => setModal(EMPTY_MODAL)}
          />
          <div className="fixed inset-x-4 top-1/2 z-50 mx-auto max-w-md -translate-y-1/2 rounded-2xl bg-white p-6 shadow-xl">
            {/* Modal header */}
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  {modal.existingShift ? "Edit Shift" : "Add Shift"}
                </h2>
                <p className="mt-0.5 text-sm text-slate-500">
                  {modal.driverName} —{" "}
                  {modal.date.toLocaleDateString("en-AU", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })}
                </p>
              </div>
              <button
                onClick={() => setModal(EMPTY_MODAL)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Time fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Start time
                </label>
                <select
                  value={editStart}
                  onChange={(e) => setEditStart(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  {TIME_OPTIONS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  End time
                </label>
                <select
                  value={editEnd}
                  onChange={(e) => setEditEnd(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  {TIME_OPTIONS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Notes */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-slate-700">
                Notes{" "}
                <span className="font-normal text-slate-400">(optional)</span>
              </label>
              <input
                type="text"
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value.slice(0, 100))}
                placeholder="e.g. CBD run, Training day"
                maxLength={100}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
              <p className="mt-1 text-right text-xs text-slate-400">
                {editNotes.length}/100
              </p>
            </div>

            {/* Actions */}
            <div className="mt-5 flex items-center justify-between">
              {modal.existingShift ? (
                <button
                  onClick={handleRemoveShift}
                  disabled={saving}
                  className="flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                  Remove shift
                </button>
              ) : (
                <span />
              )}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setModal(EMPTY_MODAL)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveShift}
                  disabled={saving}
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Save
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
