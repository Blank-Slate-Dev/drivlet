// src/app/admin/tracking/page.tsx
// Read-only live operations board. Polls /api/admin/tracking every 30s, renders
// active bookings as horizontal cards, and removes them once completed. Zero writes.
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Radio,
  Bell,
  Copy,
  Check,
  Car,
  User,
  Camera,
  X,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Clock,
  Truck,
  Package,
  CheckCircle2,
  AlertTriangle,
  Shield,
  Cog,
  ImageIcon,
} from "lucide-react";

// ─── Types (mirror /api/admin/tracking response) ───────────────
interface TrackingDriver {
  firstName: string;
  state: string;
}
interface TrackingPhoto {
  id: string;
  leg: string;
  legLabel: string;
  typeLabel: string;
  url: string;
  capturedAt: string | null;
  capturedLocation: string | null;
}
interface TrackingUpdate {
  stage: string;
  message: string;
  timestamp: string;
  actor: string;
}
interface TrackingIncident {
  id: string;
  type: string;
  severity: string;
  title: string;
  status: string;
  exceptionState: string;
  occurredAt: string | null;
  createdAt: string;
}
interface TrackingCard {
  id: string;
  trackingCode: string | null;
  currentStage: string;
  status: string;
  overallProgress: number;
  vehicle: {
    model: string | null;
    year: string | null;
    rego: string;
    regoState: string | null;
    transmission: string;
    isManual: boolean;
  };
  customerFirstName: string;
  pickupSuburb: string;
  workshopName: string | null;
  workshopSuburb: string;
  serviceDate: string | null;
  pickupTimeSlot: string | null;
  dropoffTimeSlot: string | null;
  pickupDriver: TrackingDriver | null;
  returnDriver: TrackingDriver | null;
  photos: TrackingPhoto[];
  updates: TrackingUpdate[];
  incidents: TrackingIncident[];
  hasActiveIncident: boolean;
  incidentExceptionState: string;
  /** null = no payment link issued, "pending" = link sent, "paid" = paid */
  servicePaymentStatus: "pending" | "paid" | null;
  servicePaymentAmount: number | null;
  createdAt: string;
  updatedAt: string;
}
type DisplayCard = TrackingCard & { _exiting?: boolean };

interface ActivityFlag {
  photos: boolean;
  activity: boolean;
}

// ─── Lifecycle stages (matches customer tracking + admin bookings) ──
const STAGES = [
  { id: "booking_confirmed", label: "Confirmed" },
  { id: "driver_en_route", label: "En Route" },
  { id: "car_picked_up", label: "Picked Up" },
  { id: "at_garage", label: "At Garage" },
  { id: "service_in_progress", label: "Servicing" },
  { id: "driver_returning", label: "Returning" },
  { id: "delivered", label: "Delivered" },
];
const STAGE_FULL_LABELS: Record<string, string> = {
  booking_confirmed: "Booking Confirmed",
  driver_en_route: "Driver En Route",
  car_picked_up: "Car Picked Up",
  at_garage: "At Garage",
  service_in_progress: "Service In Progress",
  driver_returning: "Driver Returning",
  delivered: "Delivered",
};
const stageIndex = (id: string) => STAGES.findIndex((s) => s.id === id);

// Per-stage colour ramp — progression reads as "ripening" toward emerald (delivery).
// Class strings are written as literals so Tailwind includes them in the build.
const STAGE_META: Record<string, { dot: string; pill: string; borderL: string; ring: string }> = {
  booking_confirmed: { dot: "bg-slate-400", pill: "bg-slate-100 text-slate-600", borderL: "border-l-slate-300", ring: "ring-slate-300" },
  driver_en_route: { dot: "bg-amber-400", pill: "bg-amber-100 text-amber-700", borderL: "border-l-amber-400", ring: "ring-amber-300" },
  car_picked_up: { dot: "bg-yellow-400", pill: "bg-yellow-100 text-yellow-700", borderL: "border-l-yellow-400", ring: "ring-yellow-300" },
  at_garage: { dot: "bg-lime-400", pill: "bg-lime-100 text-lime-700", borderL: "border-l-lime-400", ring: "ring-lime-300" },
  service_in_progress: { dot: "bg-teal-400", pill: "bg-teal-100 text-teal-700", borderL: "border-l-teal-400", ring: "ring-teal-300" },
  driver_returning: { dot: "bg-emerald-500", pill: "bg-emerald-100 text-emerald-700", borderL: "border-l-emerald-500", ring: "ring-emerald-300" },
  delivered: { dot: "bg-emerald-600", pill: "bg-emerald-100 text-emerald-700", borderL: "border-l-emerald-600", ring: "ring-emerald-300" },
};
const stageMeta = (id: string) => STAGE_META[id] || STAGE_META.booking_confirmed;

const LEG_ORDER = ["pre_pickup", "service_dropoff", "service_pickup", "final_delivery"];

const DRIVER_STATE_LABELS: Record<string, string> = {
  assigned: "Assigned",
  started: "En route",
  arrived: "Arrived",
  collected: "Collected",
  delivering: "Delivering",
  completed: "Completed",
};

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function actorIcon(actor: string) {
  switch (actor) {
    case "driver":
      return Car;
    case "admin":
      return Shield;
    case "customer":
      return User;
    default:
      return Cog;
  }
}

// ─── Page ───────────────────────────────────────────────────────
export default function AdminTrackingPage() {
  const [cards, setCards] = useState<DisplayCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [nowTs, setNowTs] = useState(() => Date.now());
  const [flashIds, setFlashIds] = useState<Set<string>>(new Set());
  const [newActivity, setNewActivity] = useState<Record<string, ActivityFlag>>({});
  const [lightbox, setLightbox] = useState<{ photos: TrackingPhoto[]; index: number } | null>(null);

  const prevRef = useRef<Map<string, TrackingCard>>(new Map());

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/tracking", { cache: "no-store" });
      if (!res.ok) {
        setError("Failed to load live tracking");
        return;
      }
      const data = await res.json();
      const list: TrackingCard[] = data.bookings || [];
      const prev = prevRef.current;
      const newById = new Map<string, TrackingCard>(list.map((c) => [c.id, c]));

      // Diff: removed (completed), stage changes, and new activity.
      const removedIds: string[] = [];
      prev.forEach((_, id) => {
        if (!newById.has(id)) removedIds.push(id);
      });

      const flashed = new Set<string>();
      const activityUpdates: Record<string, ActivityFlag> = {};
      for (const card of list) {
        const before = prev.get(card.id);
        if (!before) continue;
        if (before.currentStage !== card.currentStage) flashed.add(card.id);
        const newerUpdate =
          (card.updates[0]?.timestamp || "") !== (before.updates[0]?.timestamp || "");
        const morePhotos = card.photos.length > before.photos.length;
        if (newerUpdate || morePhotos) {
          activityUpdates[card.id] = {
            photos: morePhotos,
            activity: newerUpdate,
          };
        }
      }

      // Merge exiting cards so they can animate out.
      const exiting: DisplayCard[] = removedIds
        .map((id) => prev.get(id))
        .filter((c): c is TrackingCard => !!c)
        .map((c) => ({ ...c, _exiting: true }));
      setCards([...list.map((c) => ({ ...c })), ...exiting]);

      if (removedIds.length > 0) {
        window.setTimeout(() => {
          setCards((cur) => cur.filter((c) => !(c._exiting && removedIds.includes(c.id))));
        }, 450);
      }

      if (flashed.size > 0) {
        setFlashIds(flashed);
        window.setTimeout(() => setFlashIds(new Set()), 1600);
      }
      if (Object.keys(activityUpdates).length > 0) {
        setNewActivity((cur) => {
          const merged = { ...cur };
          for (const [id, flag] of Object.entries(activityUpdates)) {
            merged[id] = {
              photos: (cur[id]?.photos || false) || flag.photos,
              activity: (cur[id]?.activity || false) || flag.activity,
            };
          }
          return merged;
        });
      }

      prevRef.current = newById;
      setError("");
      setLastUpdated(new Date());
    } catch {
      setError("Failed to load live tracking");
    } finally {
      setLoading(false);
    }
  }, []);

  // Polling: 30s interval, paused while tab hidden, immediate refetch on return.
  useEffect(() => {
    fetchData();
    let interval = window.setInterval(fetchData, 30000);
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        window.clearInterval(interval);
      } else {
        fetchData();
        interval = window.setInterval(fetchData, 30000);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [fetchData]);

  // "Updated Xs ago" ticker.
  useEffect(() => {
    const t = window.setInterval(() => setNowTs(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  const acknowledge = useCallback((id: string, kind: keyof ActivityFlag) => {
    setNewActivity((cur) => {
      if (!cur[id]?.[kind]) return cur;
      return { ...cur, [id]: { ...cur[id], [kind]: false } };
    });
  }, []);

  const secondsAgo = lastUpdated ? Math.max(0, Math.floor((nowTs - lastUpdated.getTime()) / 1000)) : 0;
  const activeCount = cards.filter((c) => !c._exiting).length;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
              </span>
              <h1 className="text-2xl font-bold text-slate-900">Live Tracking</h1>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
                <Radio className="h-3 w-3" />
                Live
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              {activeCount} active {activeCount === 1 ? "booking" : "bookings"}
              {lastUpdated && <> &middot; Updated {secondsAgo}s ago</>}
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Progression colour legend — matches each card's left accent + stage pill */}
        {activeCount > 0 && (
          <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-slate-100 bg-white px-4 py-2.5 shadow-sm">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Progress
            </span>
            {STAGES.slice(0, 6).map((s) => (
              <span key={s.id} className="flex items-center gap-1.5 text-xs text-slate-600">
                <span className={`h-2.5 w-2.5 rounded-full ${stageMeta(s.id).dot}`} />
                {s.label}
              </span>
            ))}
          </div>
        )}

        {/* List */}
        {loading && cards.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400">
            <Radio className="h-8 w-8 animate-pulse text-emerald-500" />
            <p className="mt-3 text-sm">Tuning in…</p>
          </div>
        ) : activeCount === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-4">
            {cards.map((card) => (
              <TrackingCardRow
                key={card.id}
                card={card}
                flashing={flashIds.has(card.id)}
                activity={newActivity[card.id]}
                onOpenLightbox={(photos, index) => setLightbox({ photos, index })}
                onAcknowledge={acknowledge}
              />
            ))}
          </div>
        )}
      </div>

      {lightbox && (
        <Lightbox
          photos={lightbox.photos}
          index={lightbox.index}
          onIndexChange={(i) => setLightbox({ photos: lightbox.photos, index: i })}
          onClose={() => setLightbox(null)}
        />
      )}
    </div>
  );
}

// ─── Card ───────────────────────────────────────────────────────
function TrackingCardRow({
  card,
  flashing,
  activity,
  onOpenLightbox,
  onAcknowledge,
}: {
  card: DisplayCard;
  flashing: boolean;
  activity?: ActivityFlag;
  onOpenLightbox: (photos: TrackingPhoto[], index: number) => void;
  onAcknowledge: (id: string, kind: keyof ActivityFlag) => void;
}) {
  const meta = stageMeta(card.currentStage);
  return (
    <div
      className={`overflow-hidden rounded-2xl border border-slate-100 border-l-4 ${meta.borderL} bg-white shadow-sm transition-all duration-[400ms] hover:shadow-md ${
        card._exiting ? "max-h-0 scale-[0.98] border-transparent opacity-0" : "max-h-[900px] opacity-100"
      }`}
    >
      <div className="flex flex-col gap-5 p-5 lg:flex-row lg:items-stretch lg:gap-6 lg:p-6">
        {/* 1. Identity */}
        <IdentityBlock card={card} />

        {/* 2. Stage pipeline (centrepiece) */}
        <div className="min-w-0 flex-1 border-t border-slate-100 pt-4 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
          <StagePipeline currentStage={card.currentStage} flashing={flashing} />
          {/* 3. Drivers */}
          <div className="mt-4">
            <DriversBlock card={card} />
          </div>
          {/* 4. Photos */}
          <div
            className="mt-4"
            onMouseEnter={() => activity?.photos && onAcknowledge(card.id, "photos")}
          >
            <PhotosBlock
              photos={card.photos}
              hasNew={!!activity?.photos}
              onOpen={onOpenLightbox}
            />
          </div>
        </div>

        {/* 5. Notification box */}
        <div
          className="border-t border-slate-100 pt-4 lg:w-72 lg:flex-shrink-0 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0"
          onMouseEnter={() => activity?.activity && onAcknowledge(card.id, "activity")}
        >
          <NotificationBox
            updates={card.updates}
            incidents={card.incidents}
            hasNew={!!activity?.activity}
          />
        </div>
      </div>
    </div>
  );
}

function IdentityBlock({ card }: { card: DisplayCard }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    if (!card.trackingCode) return;
    try {
      await navigator.clipboard.writeText(card.trackingCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked — ignore */
    }
  };
  const dateLabel = card.serviceDate
    ? new Date(card.serviceDate).toLocaleDateString("en-AU", { day: "numeric", month: "short" })
    : null;

  return (
    <div className="lg:w-56 lg:flex-shrink-0">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-base font-semibold text-slate-900">
            {card.vehicle.year} {card.vehicle.model || "Vehicle"}
          </p>
          <div className="mt-1 flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-md bg-slate-900 px-2 py-0.5 font-mono text-xs font-bold tracking-wider text-white">
              {card.vehicle.rego}
            </span>
            {card.vehicle.isManual && (
              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                Manual
              </span>
            )}
          </div>
          {/* Service payment state (only shown once a payment link exists) */}
          {card.servicePaymentStatus === "paid" && (
            <span className="mt-1.5 inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
              Paid
              {typeof card.servicePaymentAmount === "number" &&
                ` · $${(card.servicePaymentAmount / 100).toFixed(2)}`}
            </span>
          )}
          {card.servicePaymentStatus === "pending" && (
            <span className="mt-1.5 inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
              Payment link sent
              {typeof card.servicePaymentAmount === "number" &&
                ` · $${(card.servicePaymentAmount / 100).toFixed(2)}`}
            </span>
          )}
        </div>
      </div>

      <div className="mt-3 space-y-1.5 text-sm">
        <div className="flex items-center gap-1.5 text-slate-600">
          <User className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
          <span className="truncate">
            {card.customerFirstName}
            {card.pickupSuburb && <span className="text-slate-400"> · {card.pickupSuburb}</span>}
          </span>
        </div>
        {card.workshopName && (
          <div className="flex items-center gap-1.5 text-slate-600">
            <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
            <span className="truncate">
              {card.workshopName}
              {card.workshopSuburb && <span className="text-slate-400"> · {card.workshopSuburb}</span>}
            </span>
          </div>
        )}
        {(dateLabel || card.pickupTimeSlot) && (
          <div className="flex items-center gap-1.5 text-slate-600">
            <Clock className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
            <span className="truncate">
              {dateLabel}
              {card.pickupTimeSlot && <span className="text-slate-400"> · {card.pickupTimeSlot}</span>}
            </span>
          </div>
        )}
      </div>

      {card.trackingCode && (
        <button
          onClick={copy}
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-slate-50 px-2.5 py-1.5 font-mono text-xs text-slate-600 transition hover:bg-slate-100"
          title="Copy tracking code"
        >
          {card.trackingCode}
          {copied ? (
            <Check className="h-3.5 w-3.5 text-emerald-500" />
          ) : (
            <Copy className="h-3.5 w-3.5 text-slate-400" />
          )}
        </button>
      )}
    </div>
  );
}

function StagePipeline({ currentStage, flashing }: { currentStage: string; flashing: boolean }) {
  const current = stageIndex(currentStage);
  const fullLabel = STAGE_FULL_LABELS[currentStage] || currentStage;
  const meta = stageMeta(currentStage);

  return (
    <div>
      <div className="flex items-center gap-2">
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-all duration-500 ${meta.pill} ${
            flashing ? `ring-2 ring-offset-1 ${meta.ring}` : ""
          }`}
        >
          {fullLabel}
        </span>
      </div>

      <div className="mt-3 flex items-center overflow-x-auto pb-1">
        {STAGES.map((stage, i) => {
          const done = i < current;
          const isCurrent = i === current;
          return (
            <div key={stage.id} className="flex flex-shrink-0 items-center">
              {i > 0 && (
                <div className={`h-0.5 w-6 sm:w-8 ${i <= current ? "bg-emerald-500" : "bg-slate-200"}`} />
              )}
              <div className="flex flex-col items-center gap-1">
                <div className="relative flex h-6 w-6 items-center justify-center">
                  {isCurrent && (
                    <span className="animate-breathe absolute inline-flex h-4 w-4 rounded-full bg-emerald-400" />
                  )}
                  {done ? (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white">
                      <Check className="h-3 w-3" />
                    </span>
                  ) : isCurrent ? (
                    <span className="relative h-4 w-4 rounded-full bg-emerald-600 ring-2 ring-emerald-100" />
                  ) : (
                    <span className="h-3 w-3 rounded-full bg-slate-200" />
                  )}
                </div>
                <span
                  className={`whitespace-nowrap text-[10px] ${
                    isCurrent ? "font-medium text-emerald-700" : done ? "text-slate-500" : "text-slate-300"
                  }`}
                >
                  {stage.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DriverRow({ label, icon: Icon, driver }: { label: string; icon: typeof Truck; driver: TrackingDriver | null }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <Icon className="h-4 w-4 flex-shrink-0 text-slate-400" />
      <span className="text-slate-400">{label}</span>
      {driver ? (
        <span className="flex items-center gap-1.5 text-slate-700">
          <span className="font-medium">{driver.firstName}</span>
          <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
            {DRIVER_STATE_LABELS[driver.state] || driver.state}
          </span>
        </span>
      ) : (
        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">
          Awaiting dispatch
        </span>
      )}
    </div>
  );
}

function DriversBlock({ card }: { card: DisplayCard }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:gap-6">
      <DriverRow label="Pickup" icon={Truck} driver={card.pickupDriver} />
      <DriverRow label="Return" icon={Package} driver={card.returnDriver} />
    </div>
  );
}

function PhotosBlock({
  photos,
  hasNew,
  onOpen,
}: {
  photos: TrackingPhoto[];
  hasNew: boolean;
  onOpen: (photos: TrackingPhoto[], index: number) => void;
}) {
  if (photos.length === 0) {
    return (
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <ImageIcon className="h-4 w-4" />
        No photos yet
      </div>
    );
  }

  // Group by leg, preserving leg order.
  const groups = LEG_ORDER.map((leg) => ({
    leg,
    label: photos.find((p) => p.leg === leg)?.legLabel || leg,
    items: photos.filter((p) => p.leg === leg),
  })).filter((g) => g.items.length > 0);

  const MAX_THUMBS = 5;

  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <Camera className="h-4 w-4 text-slate-400" />
        <span className="text-xs font-medium text-slate-500">Photos</span>
        {hasNew && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" title="New photos" />}
      </div>
      <div className="flex flex-wrap gap-4">
        {groups.map((group) => {
          const visible = group.items.slice(0, MAX_THUMBS);
          const overflow = group.items.length - visible.length;
          return (
            <div key={group.leg} className="min-w-0">
              <p className="mb-1 text-[11px] font-medium text-slate-400">
                {group.label} · {group.items.length}
              </p>
              <div className="flex items-center gap-1.5">
                {visible.map((photo) => {
                  const globalIndex = photos.findIndex((p) => p.id === photo.id);
                  return (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={photo.id}
                      src={photo.url}
                      alt={`${photo.legLabel} ${photo.typeLabel}`}
                      loading="lazy"
                      onClick={() => onOpen(photos, globalIndex)}
                      className="h-12 w-12 flex-shrink-0 cursor-pointer rounded-lg border border-slate-200 object-cover transition hover:opacity-90 sm:h-14 sm:w-14"
                    />
                  );
                })}
                {overflow > 0 && (
                  <button
                    onClick={() => onOpen(photos, photos.findIndex((p) => p.id === group.items[MAX_THUMBS].id))}
                    className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-xs font-medium text-slate-500 transition hover:bg-slate-100 sm:h-14 sm:w-14"
                  >
                    +{overflow}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function NotificationBox({
  updates,
  incidents,
  hasNew,
}: {
  updates: TrackingUpdate[];
  incidents: TrackingIncident[];
  hasNew: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasIncident = incidents.length > 0;
  const totalEntries = updates.length + incidents.length;
  const visibleUpdates = expanded ? updates : updates.slice(0, 3);

  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Bell className="h-4 w-4 text-slate-400" />
          <span className="text-xs font-semibold text-slate-700">Activity</span>
          {hasNew && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" title="New activity" />}
        </div>
        <span
          className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
            hasIncident ? "animate-pulse bg-red-100 text-red-700" : "bg-slate-200 text-slate-500"
          }`}
        >
          {totalEntries}
        </span>
      </div>

      <div className={`space-y-1.5 ${expanded ? "max-h-64 overflow-y-auto pr-1" : ""}`}>
        {/* Incidents pinned to the top regardless of age */}
        {incidents.map((inc) => (
          <div key={inc.id} className="rounded-lg border border-red-200 bg-red-50 p-2">
            <div className="flex items-start gap-1.5">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-red-600" />
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-red-700">{inc.title}</p>
                <p className="text-[10px] text-red-500">
                  {inc.severity} · {inc.status.replace(/_/g, " ")} · {relativeTime(inc.createdAt)}
                </p>
              </div>
            </div>
          </div>
        ))}

        {visibleUpdates.length === 0 && incidents.length === 0 ? (
          <p className="py-2 text-center text-[11px] text-slate-400">No activity yet</p>
        ) : (
          visibleUpdates.map((u, i) => {
            const Icon = actorIcon(u.actor);
            return (
              <div key={`${u.timestamp}-${i}`} className="flex items-start gap-1.5">
                <Icon className="mt-0.5 h-3 w-3 flex-shrink-0 text-slate-400" />
                <div className="min-w-0">
                  <p className="text-[11px] leading-snug text-slate-700">{u.message}</p>
                  <p className="text-[10px] text-slate-400">{relativeTime(u.timestamp)}</p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {updates.length > 3 && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-2 text-[11px] font-medium text-emerald-600 hover:text-emerald-700"
        >
          {expanded ? "Show less" : "View all"}
        </button>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-100 bg-white py-24 text-center shadow-sm">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
        <Radio className="h-8 w-8 text-emerald-500" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-slate-900">All quiet</h3>
      <p className="mt-1 text-sm text-slate-500">No active bookings right now — new jobs will appear here live.</p>
    </div>
  );
}

// ─── Lightbox ───────────────────────────────────────────────────
function Lightbox({
  photos,
  index,
  onIndexChange,
  onClose,
}: {
  photos: TrackingPhoto[];
  index: number;
  onIndexChange: (i: number) => void;
  onClose: () => void;
}) {
  const photo = photos[index];

  // Lock body scroll while open; restore on close.
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  // Keyboard navigation (no touch handlers → no mobile freeze).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") onIndexChange((index - 1 + photos.length) % photos.length);
      else if (e.key === "ArrowRight") onIndexChange((index + 1) % photos.length);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, photos.length, onClose, onIndexChange]);

  if (!photo) return null;

  const go = (delta: number) => onIndexChange((index + delta + photos.length) % photos.length);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/90" onClick={onClose}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 text-white" onClick={(e) => e.stopPropagation()}>
        <div className="min-w-0 text-sm">
          <span className="font-medium">{photo.legLabel}</span>
          <span className="text-white/60"> · {photo.typeLabel}</span>
        </div>
        <button onClick={onClose} className="rounded-full p-2 text-white/80 hover:bg-white/10" aria-label="Close">
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Image */}
      <div className="relative flex flex-1 items-center justify-center px-4" onClick={(e) => e.stopPropagation()}>
        {photos.length > 1 && (
          <button
            onClick={() => go(-1)}
            className="absolute left-2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            aria-label="Previous"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photo.url} alt={`${photo.legLabel} ${photo.typeLabel}`} className="max-h-full max-w-full object-contain" />
        {photos.length > 1 && (
          <button
            onClick={() => go(1)}
            className="absolute right-2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            aria-label="Next"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        )}
      </div>

      {/* Caption */}
      <div className="px-4 py-2 text-center text-xs text-white/70" onClick={(e) => e.stopPropagation()}>
        {photo.capturedAt && (
          <span>{new Date(photo.capturedAt).toLocaleString("en-AU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
        )}
        {photo.capturedLocation && <span> · {photo.capturedLocation}</span>}
        <span className="ml-2 text-white/40">
          {index + 1} / {photos.length}
        </span>
      </div>

      {/* Thumbnail rail */}
      {photos.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto px-4 py-3" onClick={(e) => e.stopPropagation()}>
          {photos.map((p, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={p.id}
              src={p.url}
              alt={p.typeLabel}
              loading="lazy"
              onClick={() => onIndexChange(i)}
              className={`h-12 w-12 flex-shrink-0 cursor-pointer rounded-md object-cover ${
                i === index ? "ring-2 ring-emerald-400" : "opacity-60 hover:opacity-100"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
