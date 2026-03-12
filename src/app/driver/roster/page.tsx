// src/app/driver/roster/page.tsx
"use client";

import { useState, useEffect } from "react";
import { CalendarDays, Clock, Loader2, AlertTriangle } from "lucide-react";
import { formatShiftTime, calculateTotalHours } from "@/lib/roster";

// ── Types ──────────────────────────────────────────────────────────────────
interface Shift {
  driverId: string;
  driverName: string;
  date: string; // ISO string
  startTime: string;
  endTime: string;
  notes?: string;
}

interface RosterMeta {
  _id: string;
  periodStart: string;
  periodEnd: string;
  status: string;
  publishedAt?: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────
function formatFullDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function formatPeriodShort(start: string, end: string): string {
  const s = new Date(start).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
  });
  const e = new Date(end).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return `${s} — ${e}`;
}

function isToday(dateStr: string): boolean {
  const d = new Date(dateStr);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function isPast(dateStr: string): boolean {
  const d = new Date(dateStr);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return d < now;
}

// ── Component ──────────────────────────────────────────────────────────────
export default function DriverRosterPage() {
  const [roster, setRoster] = useState<RosterMeta | null>(null);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchRoster = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/driver/roster");
        if (!res.ok) throw new Error("Failed to fetch roster");
        const data = await res.json();
        setRoster(data.roster ?? null);
        setShifts(data.shifts ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load roster");
      } finally {
        setLoading(false);
      }
    };
    fetchRoster();
  }, []);

  const sortedShifts = [...shifts].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  const totalHours = calculateTotalHours(shifts);

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-emerald-600" />
          <p className="mt-2 text-sm text-slate-500">Loading your roster...</p>
        </div>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-5">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">My Roster</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          Your upcoming scheduled shifts
        </p>
      </div>

      {/* No roster published */}
      {!roster && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center">
          <CalendarDays className="h-12 w-12 text-slate-200" />
          <p className="mt-4 text-sm font-medium text-slate-600">
            No roster published yet
          </p>
          <p className="mt-1 text-xs text-slate-400">Check back soon.</p>
        </div>
      )}

      {/* Roster content */}
      {roster && (
        <div className="space-y-5">
          {/* Summary + shift list — side by side on sm+ */}
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            {/* Summary card */}
            <div className="w-full shrink-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:w-56">
              <h2 className="mb-3 text-sm font-semibold text-slate-900">
                This Fortnight
              </h2>
              <p className="mb-4 text-xs text-slate-500">
                {formatPeriodShort(roster.periodStart, roster.periodEnd)}
              </p>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-sm text-slate-500">
                    <CalendarDays className="h-4 w-4" />
                    Shifts
                  </span>
                  <span className="text-sm font-semibold text-slate-900">
                    {shifts.length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-sm text-slate-500">
                    <Clock className="h-4 w-4" />
                    Hours
                  </span>
                  <span className="text-sm font-semibold text-slate-900">
                    {totalHours}h
                  </span>
                </div>
              </div>
            </div>

            {/* Shift list */}
            <div className="flex-1">
              {sortedShifts.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white py-10 text-center">
                  <p className="text-sm text-slate-500">
                    No shifts scheduled for you this fortnight.
                  </p>
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                  {sortedShifts.map((shift, idx) => {
                    const today = isToday(shift.date);
                    const past = isPast(shift.date);
                    return (
                      <div
                        key={idx}
                        className={`flex items-start gap-4 border-b border-slate-100 px-4 py-3.5 last:border-b-0 ${
                          today
                            ? "border-l-4 border-l-emerald-500 bg-emerald-50/60"
                            : past
                            ? "bg-white"
                            : "bg-white"
                        }`}
                      >
                        {/* Date */}
                        <div className="min-w-0 flex-1">
                          <p
                            className={`text-sm font-medium ${
                              past ? "text-slate-400" : "text-slate-900"
                            }`}
                          >
                            {formatFullDate(shift.date)}
                            {today && (
                              <span className="ml-2 inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                                Today
                              </span>
                            )}
                          </p>
                          {shift.notes && (
                            <p
                              className={`mt-0.5 text-xs ${
                                past ? "text-slate-400" : "text-slate-500"
                              }`}
                            >
                              {shift.notes}
                            </p>
                          )}
                        </div>

                        {/* Time */}
                        <div className="shrink-0 text-right">
                          <p
                            className={`text-sm font-semibold ${
                              past
                                ? "text-slate-400"
                                : today
                                ? "text-emerald-700"
                                : "text-slate-700"
                            }`}
                          >
                            {formatShiftTime(shift.startTime, shift.endTime)}
                          </p>
                          <p
                            className={`text-xs ${
                              past ? "text-slate-300" : "text-slate-400"
                            }`}
                          >
                            {(() => {
                              const [sh, sm] = shift.startTime.split(":").map(Number);
                              const [eh, em] = shift.endTime.split(":").map(Number);
                              const mins = (eh * 60 + em) - (sh * 60 + sm);
                              if (mins <= 0) return "";
                              const h = Math.floor(mins / 60);
                              const m = mins % 60;
                              return m === 0 ? `${h}h` : `${h}h ${m}m`;
                            })()}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
