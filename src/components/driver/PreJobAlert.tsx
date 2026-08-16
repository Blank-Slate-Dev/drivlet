// src/components/driver/PreJobAlert.tsx
// Pre-job alert (2026-08-09): warns the driver 30 minutes before a leg's
// window starts, so they're ready to collect the customer's car (pickup leg)
// or the car from the workshop (return leg).
//
// Mounted in the driver layout so it shows across the whole portal. Uses the
// existing polling model (fetches /api/driver/jobs every 60s — no push
// stack). A prominent dismissible pop-up per leg; after dismissal a subtle
// chip persists until the window starts. Dismissals live in sessionStorage
// keyed per job+leg+day, so nothing nags twice. Handles multiple imminent
// legs in one pop-up. Shows regardless of clocked-in state — a driver who
// is NOT clocked in with a job starting soon needs the warning most.
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlarmClock, ArrowRight, X, ArrowLeft } from "lucide-react";
import { PICKUP_SLOTS, DROPOFF_SLOTS } from "@/config/timeSlots";

const POLL_MS = 60_000;
const LEAD_MS = 30 * 60 * 1000; // alert window: 30 minutes before start

interface JobLite {
  _id: string;
  vehicleRegistration: string;
  pickupAddress?: string;
  garageName?: string;
  serviceDate?: string;
  pickupTimeSlot?: string | null;
  dropoffTimeSlot?: string | null;
  pickupDriverState?: string | null;
  returnDriverState?: string | null;
  pickupClaimedByMe?: boolean;
  returnClaimedByMe?: boolean;
}

export interface ImminentLeg {
  key: string; // jobId-leg
  jobId: string;
  leg: "pickup" | "return";
  plate: string;
  suburb: string;
  windowLabel: string;
  windowStart: number; // epoch ms
}

/** Best-effort suburb from a full address (same heuristic as dispatch). */
function suburbOf(address: string | undefined): string {
  if (!address) return "";
  const parts = address.split(",").map((p) => p.trim());
  const candidate = (parts[1] || parts[0] || "")
    .replace(/\b(NSW|ACT|VIC|QLD|SA|WA|TAS|NT)\b\s*\d{0,4}/i, "")
    .trim();
  return candidate || address.slice(0, 24);
}

/**
 * The leg window's start as a local Date. serviceDate is stored as an ISO
 * instant (midnight UTC of the chosen day); resolve its calendar day in
 * Sydney time, then attach the slot's start hour in the device's local time.
 */
function windowStartFor(
  serviceDate: string | undefined,
  slotValue: string | null | undefined,
  leg: "pickup" | "return"
): { start: Date; label: string } | null {
  if (!serviceDate || !slotValue) return null;
  const slots = leg === "pickup" ? PICKUP_SLOTS : DROPOFF_SLOTS;
  const slot = slots.find((s) => s.value === slotValue);
  if (!slot) return null;
  const base = new Date(serviceDate);
  if (isNaN(base.getTime())) return null;
  const ymd = base.toLocaleDateString("en-CA", { timeZone: "Australia/Sydney" });
  const [y, m, d] = ymd.split("-").map(Number);
  return { start: new Date(y, m - 1, d, slot.hour, 0, 0), label: slot.label };
}

function dismissKey(legKey: string): string {
  const day = new Date().toLocaleDateString("en-CA");
  return `drivlet-prejob-dismissed-${legKey}-${day}`;
}

export default function PreJobAlert() {
  const [imminent, setImminent] = useState<ImminentLeg[]>([]);
  // Tick so the "starts in Xm" copy and expiry re-evaluate between polls
  const [, setTick] = useState(0);

  const evaluate = useCallback((jobs: JobLite[]) => {
    const now = Date.now();
    const legs: ImminentLeg[] = [];
    for (const job of jobs) {
      const candidates: Array<{ leg: "pickup" | "return"; slot: string | null | undefined; state: string | null | undefined; mine: boolean | undefined }> = [
        { leg: "pickup", slot: job.pickupTimeSlot, state: job.pickupDriverState, mine: job.pickupClaimedByMe },
        { leg: "return", slot: job.dropoffTimeSlot, state: job.returnDriverState, mine: job.returnClaimedByMe },
      ];
      for (const c of candidates) {
        // Only legs the driver holds that haven't been started yet
        if (!c.mine || c.state !== "assigned") continue;
        const win = windowStartFor(job.serviceDate, c.slot, c.leg);
        if (!win) continue;
        const diff = win.start.getTime() - now;
        if (diff <= LEAD_MS && diff > 0) {
          legs.push({
            key: `${job._id}-${c.leg}`,
            jobId: job._id,
            leg: c.leg,
            plate: job.vehicleRegistration,
            // Where the driver is HEADED first: the customer for pickups,
            // the workshop for returns (re-audit: showing the customer's
            // suburb next to "collect from the workshop" read wrong)
            suburb:
              c.leg === "pickup"
                ? suburbOf(job.pickupAddress)
                : job.garageName || suburbOf(job.pickupAddress),
            windowLabel: win.label,
            windowStart: win.start.getTime(),
          });
        }
      }
    }
    legs.sort((a, b) => a.windowStart - b.windowStart);
    setImminent(legs);
  }, []);

  useEffect(() => {
    let active = true;
    const poll = async () => {
      try {
        const res = await fetch("/api/driver/jobs?status=all");
        if (!res.ok) return;
        const data = await res.json();
        if (!active) return;
        // Response groups jobs by bucket — flatten all "my jobs" buckets
        const buckets = data.myJobs || {};
        const jobs: JobLite[] = [
          ...(buckets.accepted || []),
          ...(buckets.in_progress || []),
          ...(buckets.awaiting_payment || []),
          ...(buckets.ready_for_return || []),
        ];
        evaluate(jobs);
      } catch {
        /* silent — alerts simply stay as-is until the next poll */
      }
    };
    poll();
    const interval = setInterval(poll, POLL_MS);
    const tick = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => {
      active = false;
      clearInterval(interval);
      clearInterval(tick);
    };
  }, [evaluate]);

  const now = Date.now();
  const live = imminent.filter((l) => l.windowStart > now);
  // sessionStorage is browser-only; skip the SSR/hydration pass
  const isBrowser = typeof window !== "undefined";
  const undismissed = isBrowser
    ? live.filter((l) => sessionStorage.getItem(dismissKey(l.key)) !== "1")
    : [];
  const dismissedCount = live.length - undismissed.length;

  const dismissAll = () => {
    for (const l of undismissed) sessionStorage.setItem(dismissKey(l.key), "1");
    setTick((t) => t + 1);
  };

  const minutesUntil = (ms: number) => Math.max(1, Math.round((ms - now) / 60000));

  if (!isBrowser || live.length === 0) return null;

  return (
    <>
      {/* Prominent pop-up: all imminent legs, dismiss once. z-40 so open
          form modals (z-50) always sit above it. */}
      {undismissed.length > 0 && (
        <div className="fixed inset-x-0 top-16 z-40 px-4">
          <div className="mx-auto max-w-md rounded-2xl border border-amber-300 bg-white shadow-xl">
            <div className="flex items-center justify-between rounded-t-2xl bg-amber-50 px-4 py-2.5">
              <span className="flex items-center gap-2 text-sm font-semibold text-amber-800">
                <AlarmClock className="h-4 w-4" />
                Job{undismissed.length > 1 ? "s" : ""} starting soon
              </span>
              <button
                onClick={dismissAll}
                aria-label="Dismiss"
                className="rounded-full p-1 text-amber-500 transition hover:bg-amber-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <ul className="divide-y divide-slate-100">
              {undismissed.map((l) => (
                <li key={l.key}>
                  <Link
                    href="/driver/jobs"
                    className="flex items-center gap-3 px-4 py-3 transition hover:bg-slate-50"
                  >
                    <span className={`rounded-full p-1.5 ${l.leg === "pickup" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"}`}>
                      {l.leg === "pickup" ? <ArrowRight className="h-3.5 w-3.5" /> : <ArrowLeft className="h-3.5 w-3.5" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="rounded-md border border-slate-300 bg-slate-50 px-1.5 py-0.5 font-mono text-xs font-semibold uppercase text-slate-800">
                          {l.plate}
                        </span>
                        {l.suburb && (
                          <span className="truncate text-xs text-slate-500">{l.suburb}</span>
                        )}
                      </span>
                      <span className="mt-0.5 block text-xs text-slate-600">
                        {l.leg === "pickup"
                          ? "Pickup window"
                          : "Return delivery window"}{" "}
                        {l.windowLabel} · starts in about {minutesUntil(l.windowStart)} min.{" "}
                        {l.leg === "pickup"
                          ? "Be ready to collect the customer's car."
                          : "Be ready to collect the car from the workshop."}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Subtle persistent chip after dismissal, until the window starts.
          Bottom offset clears the driver tab bar + iOS safe-area inset;
          z-40 keeps the chip UNDER open form modals (z-50). */}
      {undismissed.length === 0 && dismissedCount > 0 && (
        <Link
          href="/driver/jobs"
          className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))] right-4 z-40 inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 shadow-md transition hover:border-amber-400"
        >
          <AlarmClock className="h-3.5 w-3.5" />
          {dismissedCount === 1
            ? `Job starts in ~${minutesUntil(live[0].windowStart)} min`
            : `${dismissedCount} jobs starting soon`}
        </Link>
      )}
    </>
  );
}
