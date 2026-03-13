// src/app/driver/roster/page.tsx
"use client";

import { useState, useEffect } from "react";
import { CalendarDays, Clock, Loader2, AlertTriangle, ChevronLeft, ChevronRight, Sun, Sunrise } from "lucide-react";
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

function shiftDuration(startTime: string, endTime: string): string {
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  const mins = eh * 60 + em - (sh * 60 + sm);
  if (mins <= 0) return "";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
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

  // ── Derived values ────────────────────────────────────────────────────────
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const nextShiftIndex = sortedShifts.findIndex((shift) => {
    const d = new Date(shift.date);
    d.setHours(0, 0, 0, 0);
    return d >= today;
  });
  const nextShift = nextShiftIndex >= 0 ? sortedShifts[nextShiftIndex] : null;

  const shiftsRemaining = sortedShifts.filter((shift) => {
    const d = new Date(shift.date);
    d.setHours(0, 0, 0, 0);
    return d >= today;
  }).length;

  // ── Calendar grid ─────────────────────────────────────────────────────────
  // Snap fortnight start to the Monday of that week
  const snappedStart = roster ? new Date(roster.periodStart) : new Date();
  snappedStart.setHours(0, 0, 0, 0);
  const dow = snappedStart.getDay();
  const offset = dow === 0 ? -6 : 1 - dow;
  snappedStart.setDate(snappedStart.getDate() + offset);

  const calendarDays = Array.from({ length: 14 }, (_, i) => {
    const date = new Date(snappedStart);
    date.setDate(snappedStart.getDate() + i);
    date.setHours(0, 0, 0, 0);
    return date;
  });

  const shiftMap = new Map<string, Shift>();
  shifts.forEach((shift) => {
    const key = new Date(shift.date).toISOString().slice(0, 10);
    shiftMap.set(key, shift);
  });

  const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

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
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-900">My Roster</h1>
        <p className="mt-1 text-sm text-slate-500">Your upcoming scheduled shifts</p>
      </div>

      {/* No roster published */}
      {!roster && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center">
          <CalendarDays className="h-12 w-12 text-slate-200" />
          <p className="mt-4 text-sm font-medium text-slate-600">No roster published yet</p>
          <p className="mt-1 text-xs text-slate-400">Check back soon.</p>
        </div>
      )}

      {roster && (
        <>
          {/* Fortnight Summary Banner */}
          <div className="mb-6 overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-700 to-teal-600 p-6 text-white shadow-lg shadow-emerald-500/20">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-emerald-200">This Fortnight</p>
                <p className="mt-0.5 text-lg font-semibold text-white">
                  {formatPeriodShort(roster.periodStart, roster.periodEnd)}
                </p>
              </div>
              <div className="flex gap-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-white">{shifts.length}</p>
                  <p className="text-xs font-medium text-emerald-200 uppercase tracking-wide">Shifts</p>
                </div>
                <div className="w-px bg-white/20" />
                <div className="text-center">
                  <p className="text-3xl font-bold text-white">{totalHours}h</p>
                  <p className="text-xs font-medium text-emerald-200 uppercase tracking-wide">Hours</p>
                </div>
                <div className="w-px bg-white/20" />
                <div className="text-center">
                  <p className="text-3xl font-bold text-white">{shiftsRemaining}</p>
                  <p className="text-xs font-medium text-emerald-200 uppercase tracking-wide">Remaining</p>
                </div>
              </div>
            </div>
          </div>

          {/* Next Shift Spotlight */}
          {nextShift && (
            <div className="mb-6 flex items-center gap-4 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 shadow-sm">
                <Sunrise className="h-5 w-5 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">Next Shift</p>
                <p className="text-sm font-semibold text-slate-900">
                  {new Date(nextShift.date).toLocaleDateString("en-AU", { weekday: "long" })}
                  {" — "}
                  {new Date(nextShift.date).toLocaleDateString("en-AU", { day: "numeric", month: "long" })}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-emerald-700">
                  {nextShift.startTime}–{nextShift.endTime}
                </p>
                <p className="text-xs text-slate-500">{shiftDuration(nextShift.startTime, nextShift.endTime)}</p>
              </div>
            </div>
          )}

          {/* Calendar Legend */}
          <div className="mb-3 flex items-center gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded-sm bg-emerald-500" />
              Working
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded-sm bg-slate-200" />
              Day Off
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded-sm bg-amber-400" />
              Today
            </span>
          </div>

          {/* Day-of-week header */}
          <div className="mb-1 grid grid-cols-7 gap-2">
            {DAY_LABELS.map((d) => (
              <div
                key={d}
                className="text-center text-[11px] font-semibold uppercase tracking-wide text-slate-400"
              >
                {d}
              </div>
            ))}
          </div>

          {/* Week 1 */}
          <div className="mb-2 grid grid-cols-7 gap-2">
            {calendarDays.slice(0, 7).map((date) => {
              const key = date.toISOString().slice(0, 10);
              const shift = shiftMap.get(key);
              const cellIsToday = date.getTime() === today.getTime();
              const cellIsPast = date < today;
              const isWeekend = date.getDay() === 0 || date.getDay() === 6;
              return (
                <div
                  key={key}
                  className={`relative flex flex-col rounded-xl p-3 transition ${
                    cellIsToday
                      ? "bg-amber-400 shadow-md shadow-amber-200 ring-2 ring-amber-300"
                      : shift
                      ? cellIsPast
                        ? "bg-emerald-200 opacity-75"
                        : "bg-emerald-600 shadow-md shadow-emerald-300 ring-1 ring-emerald-500"
                      : isWeekend
                      ? "border border-slate-200 bg-slate-100"
                      : "border border-slate-200 bg-slate-50"
                  }`}
                >
                  <span
                    className={`text-lg font-bold leading-none ${
                      cellIsToday
                        ? "text-white"
                        : shift && !cellIsPast
                        ? "text-white"
                        : "text-slate-900"
                    }`}
                  >
                    {date.getDate()}
                  </span>
                  {shift ? (
                    <span
                      className={`mt-1.5 text-[10px] font-semibold leading-tight ${
                        cellIsToday
                          ? "text-amber-900"
                          : cellIsPast
                          ? "text-slate-700"
                          : "text-emerald-100"
                      }`}
                    >
                      {shift.startTime}
                      <br />
                      {shift.endTime}
                    </span>
                  ) : (
                    <span className="mt-1.5 text-[10px] font-medium text-slate-500">
                      {isWeekend ? "Weekend" : "Off"}
                    </span>
                  )}
                  {cellIsToday && (
                    <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-white" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Week 2 */}
          <div className="mb-6 grid grid-cols-7 gap-2">
            {calendarDays.slice(7, 14).map((date) => {
              const key = date.toISOString().slice(0, 10);
              const shift = shiftMap.get(key);
              const cellIsToday = date.getTime() === today.getTime();
              const cellIsPast = date < today;
              const isWeekend = date.getDay() === 0 || date.getDay() === 6;
              return (
                <div
                  key={key}
                  className={`relative flex flex-col rounded-xl p-3 transition ${
                    cellIsToday
                      ? "bg-amber-400 shadow-md shadow-amber-200 ring-2 ring-amber-300"
                      : shift
                      ? cellIsPast
                        ? "bg-emerald-200 opacity-75"
                        : "bg-emerald-600 shadow-md shadow-emerald-300 ring-1 ring-emerald-500"
                      : isWeekend
                      ? "border border-slate-200 bg-slate-100"
                      : "border border-slate-200 bg-slate-50"
                  }`}
                >
                  <span
                    className={`text-lg font-bold leading-none ${
                      cellIsToday
                        ? "text-white"
                        : shift && !cellIsPast
                        ? "text-white"
                        : "text-slate-900"
                    }`}
                  >
                    {date.getDate()}
                  </span>
                  {shift ? (
                    <span
                      className={`mt-1.5 text-[10px] font-semibold leading-tight ${
                        cellIsToday
                          ? "text-amber-900"
                          : cellIsPast
                          ? "text-slate-700"
                          : "text-emerald-100"
                      }`}
                    >
                      {shift.startTime}
                      <br />
                      {shift.endTime}
                    </span>
                  ) : (
                    <span className="mt-1.5 text-[10px] font-medium text-slate-500">
                      {isWeekend ? "Weekend" : "Off"}
                    </span>
                  )}
                  {cellIsToday && (
                    <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-white" />
                  )}
                </div>
              );
            })}
          </div>

        </>
      )}
    </div>
  );
}
