// src/app/admin/traffic/page.tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  BarChart3,
  MapPin,
  RefreshCw,
  Eye,
  Users,
} from "lucide-react";

interface CityRow {
  city: string;
  region?: string;
  views: number;
  visitors: number;
}

interface PageRow {
  path: string;
  label: string;
  group: string;
  views: number;
  visitors: number;
}

interface ChartRow {
  bucket: string;
  views: number;
  visitors: number;
}

interface LiveInfo {
  people: number;
  windowMinutes: number;
  pages: PageRow[];
}

interface TrafficData {
  period: Period;
  granularity: "hour" | "day" | "month";
  totals: { views: number; visitors: number };
  live: LiveInfo;
  chart: ChartRow[];
  cities: CityRow[];
  pages: PageRow[];
  referrers: Array<{ source: string; views: number }>;
  devices: Array<{ device: string; views: number }>;
}

type Period = "today" | "week" | "month" | "year";

const PERIODS: Array<{ value: Period; label: string }> = [
  { value: "today", label: "Today" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
  { value: "year", label: "This year" },
];

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export default function AdminTrafficPage() {
  const [data, setData] = useState<TrafficData | null>(null);
  const [period, setPeriod] = useState<Period>("today");
  const [liveCount, setLiveCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [hovered, setHovered] = useState<number | null>(null);
  const periodRef = useRef(period);
  periodRef.current = period;

  const fetchTraffic = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/analytics?period=${period}`);
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error || "Failed to load website traffic");
      }
      const payload: TrafficData = await response.json();
      setData(payload);
      setLiveCount(payload.live.people);
      setError("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load website traffic"
      );
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchTraffic();
  }, [fetchTraffic]);

  // Poll just the live count so the card stays current without re-running
  // the full set of aggregations. Pauses when the tab is hidden.
  useEffect(() => {
    const tick = async () => {
      if (document.hidden) return;
      try {
        const response = await fetch("/api/admin/analytics?only=live");
        if (!response.ok) return;
        const payload = await response.json();
        setLiveCount(payload.live.people);
      } catch {
        // Silent — the next tick will retry.
      }
    };

    const interval = setInterval(tick, 20000);
    return () => clearInterval(interval);
  }, []);

  const formatNumber = (value: number) =>
    new Intl.NumberFormat("en-AU").format(value);

  /** Short axis label for a bucket key. */
  const bucketLabel = (bucket: string, granularity: string) => {
    if (granularity === "hour") {
      const hour = Number(bucket.slice(-2));
      if (hour === 0) return "12am";
      if (hour === 12) return "12pm";
      return hour < 12 ? `${hour}am` : `${hour - 12}pm`;
    }
    if (granularity === "month") {
      return MONTH_NAMES[Number(bucket.slice(5, 7)) - 1];
    }
    const [, month, day] = bucket.split("-");
    return `${Number(day)} ${MONTH_NAMES[Number(month) - 1]}`;
  };

  /** Fuller label used in the hover tooltip. */
  const bucketTooltip = (bucket: string, granularity: string) => {
    if (granularity === "hour") {
      const hour = Number(bucket.slice(-2));
      const start = hour === 0 ? "12am" : hour < 12 ? `${hour}am` : hour === 12 ? "12pm" : `${hour - 12}pm`;
      return `${start}–${((hour + 1) % 24 === 0 ? "12am" : (hour + 1) % 24 < 12 ? `${(hour + 1) % 24}am` : (hour + 1) % 24 === 12 ? "12pm" : `${((hour + 1) % 24) - 12}pm`)}`;
    }
    if (granularity === "month") {
      return `${MONTH_NAMES[Number(bucket.slice(5, 7)) - 1]} ${bucket.slice(0, 4)}`;
    }
    const [, month, day] = bucket.split("-");
    return `${Number(day)} ${MONTH_NAMES[Number(month) - 1]}`;
  };

  // Loading skeleton
  if (loading && !data) {
    return (
      <div className="min-h-screen bg-slate-50 px-6 py-6 lg:px-8">
        <div className="mx-auto max-w-6xl space-y-8">
          <div className="flex items-center justify-between">
            <div className="h-7 w-40 rounded bg-slate-200 animate-pulse" />
            <div className="h-9 w-64 rounded-lg bg-slate-200 animate-pulse" />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-xl border border-slate-200 p-5"
              >
                <div className="h-8 w-20 bg-slate-100 rounded animate-pulse" />
                <div className="h-4 w-24 bg-slate-100 rounded animate-pulse mt-2" />
              </div>
            ))}
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="h-48 bg-slate-50 rounded animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !data) {
    return (
      <div className="min-h-screen bg-slate-50 px-6 py-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-xl border border-red-200 bg-red-50 p-6">
            <div className="flex items-center gap-2 text-red-700 mb-2">
              <AlertCircle className="h-5 w-5" />
              <span className="font-medium">Couldn&apos;t load traffic</span>
            </div>
            <p className="text-sm text-red-600 mb-3">{error}</p>
            <button
              onClick={fetchTraffic}
              className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-500"
            >
              <RefreshCw className="h-4 w-4" />
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const topCity = data?.cities?.[0];
  const chart = data?.chart || [];
  const granularity = data?.granularity || "day";
  const maxChartViews = Math.max(1, ...chart.map((row) => row.views));
  const maxCityVisitors = Math.max(
    1,
    ...(data?.cities || []).map((c) => c.visitors)
  );
  const maxPageViews = Math.max(1, ...(data?.pages || []).map((p) => p.views));
  const hasData = (data?.totals.views || 0) > 0;
  const isLive = (liveCount || 0) > 0;

  // Thin out x-axis labels so they never overlap.
  const labelStep = Math.ceil(chart.length / 12) || 1;

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-8">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold text-slate-900">
            Website Traffic
          </h1>
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-slate-200 bg-white p-0.5">
              {PERIODS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setPeriod(option.value)}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    period === option.value
                      ? "bg-emerald-50 text-emerald-700"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <button
              onClick={fetchTraffic}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </button>
          </div>
        </div>

        {/* Headline numbers */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Live now */}
          <div
            className={`rounded-xl border p-5 transition-colors ${
              isLive
                ? "border-emerald-200 bg-emerald-50/50"
                : "border-slate-200 bg-white"
            }`}
          >
            <div className="text-2xl font-bold text-slate-900">
              {liveCount === null ? "—" : formatNumber(liveCount)}
            </div>
            <div className="flex items-center gap-1.5 text-sm text-slate-500 mt-1">
              <span className="relative flex h-2 w-2">
                {isLive && (
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                )}
                <span
                  className={`relative inline-flex h-2 w-2 rounded-full ${
                    isLive ? "bg-emerald-500" : "bg-slate-300"
                  }`}
                />
              </span>
              On site now
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="text-2xl font-bold text-slate-900">
              {formatNumber(data?.totals.visitors || 0)}
            </div>
            <div className="flex items-center gap-1.5 text-sm text-slate-500 mt-1">
              <Users className="h-3.5 w-3.5" />
              People
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="text-2xl font-bold text-slate-900">
              {formatNumber(data?.totals.views || 0)}
            </div>
            <div className="flex items-center gap-1.5 text-sm text-slate-500 mt-1">
              <Eye className="h-3.5 w-3.5" />
              Page views
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="truncate text-2xl font-bold text-slate-900">
              {topCity?.city || "—"}
            </div>
            <div className="flex items-center gap-1.5 text-sm text-slate-500 mt-1">
              <MapPin className="h-3.5 w-3.5" />
              Top city
            </div>
          </div>
        </div>

        {/* Who's on the site right now */}
        {isLive && data?.live.pages && data.live.pages.length > 0 && (
          <div className="rounded-xl border border-emerald-200 bg-white p-5">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              Being viewed right now
            </h2>
            <div className="space-y-2">
              {data.live.pages.map((page) => (
                <div
                  key={page.path}
                  className="flex items-center justify-between gap-3"
                >
                  <span className="truncate text-sm text-slate-700">
                    {page.label}
                  </span>
                  <span className="shrink-0 text-sm font-medium text-slate-900">
                    {formatNumber(page.views)}
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-slate-400">
              Activity in the last {data.live.windowMinutes} minutes
            </p>
          </div>
        )}

        {/* Bar chart */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="mb-4 flex items-baseline justify-between gap-3">
            <h2 className="text-sm font-semibold text-slate-900">
              Page views
            </h2>
            <span className="text-xs text-slate-400">
              {granularity === "hour"
                ? "By hour"
                : granularity === "month"
                  ? "By month"
                  : "By day"}
            </span>
          </div>

          <div className="relative">
            {/* Hover tooltip */}
            {hovered !== null && chart[hovered] && (
              <div className="absolute right-0 top-0 z-10 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm">
                <div className="text-xs font-medium text-slate-900">
                  {bucketTooltip(chart[hovered].bucket, granularity)}
                </div>
                <div className="mt-0.5 text-xs text-slate-500">
                  {formatNumber(chart[hovered].views)} views ·{" "}
                  {formatNumber(chart[hovered].visitors)} people
                </div>
              </div>
            )}

            <div className="flex h-48 items-end gap-[3px]">
              {chart.map((row, index) => (
                <div
                  key={row.bucket}
                  className="group flex h-full flex-1 cursor-default flex-col justify-end"
                  onMouseEnter={() => setHovered(index)}
                  onMouseLeave={() => setHovered(null)}
                >
                  <div
                    className={`w-full rounded-t transition-colors ${
                      hovered === index
                        ? "bg-emerald-600"
                        : row.views > 0
                          ? "bg-emerald-500"
                          : "bg-slate-100"
                    }`}
                    style={{
                      height: `${
                        row.views > 0
                          ? Math.max((row.views / maxChartViews) * 100, 3)
                          : 2
                      }%`,
                    }}
                  />
                </div>
              ))}
            </div>

            {/* X axis */}
            <div className="mt-2 flex gap-[3px]">
              {chart.map((row, index) => (
                <div
                  key={row.bucket}
                  className="flex-1 overflow-visible text-center text-[10px] text-slate-400"
                >
                  {index % labelStep === 0
                    ? bucketLabel(row.bucket, granularity)
                    : ""}
                </div>
              ))}
            </div>
          </div>
        </div>

        {!hasData ? (
          <div className="bg-white rounded-xl border border-slate-200 py-12 text-center">
            <BarChart3 className="mx-auto h-8 w-8 text-slate-300 mb-2" />
            <p className="text-sm font-medium text-slate-900">
              No traffic in this period
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Try a longer range, or check back once visitors start arriving.
            </p>
          </div>
        ) : (
          <>
            {/* Cities + Pages */}
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <h2 className="text-sm font-semibold text-slate-900 mb-4">
                  Where visitors are
                </h2>
                <div className="space-y-3">
                  {data?.cities.slice(0, 12).map((city) => (
                    <div key={`${city.city}-${city.region ?? ""}`}>
                      <div className="flex items-baseline justify-between gap-3 mb-1">
                        <span className="truncate text-sm text-slate-700">
                          {city.city}
                          {city.region && (
                            <span className="text-slate-400"> · {city.region}</span>
                          )}
                        </span>
                        <span className="shrink-0 text-sm font-medium text-slate-900">
                          {formatNumber(city.visitors)}
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-slate-100">
                        <div
                          className="h-2 rounded-full bg-emerald-500"
                          style={{
                            width: `${Math.max(
                              (city.visitors / maxCityVisitors) * 100,
                              2
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <h2 className="text-sm font-semibold text-slate-900 mb-4">
                  Most visited pages
                </h2>
                <div className="space-y-3">
                  {data?.pages.slice(0, 12).map((page) => (
                    <div key={page.path}>
                      <div className="flex items-baseline justify-between gap-3 mb-1">
                        <span className="truncate text-sm text-slate-700">
                          {page.label}
                        </span>
                        <span className="shrink-0 text-sm font-medium text-slate-900">
                          {formatNumber(page.views)}
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-slate-100">
                        <div
                          className="h-2 rounded-full bg-blue-500"
                          style={{
                            width: `${Math.max(
                              (page.views / maxPageViews) * 100,
                              2
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Referrers + devices */}
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <h2 className="text-sm font-semibold text-slate-900 mb-4">
                  How they found you
                </h2>
                {data?.referrers.length ? (
                  <div className="space-y-2">
                    {data.referrers.map((referrer) => (
                      <div
                        key={referrer.source}
                        className="flex items-center justify-between gap-3"
                      >
                        <span className="truncate text-sm text-slate-700">
                          {referrer.source}
                        </span>
                        <span className="shrink-0 text-sm font-medium text-slate-900">
                          {formatNumber(referrer.views)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">
                    Everyone arrived directly so far.
                  </p>
                )}
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <h2 className="text-sm font-semibold text-slate-900 mb-4">
                  Device
                </h2>
                <div className="space-y-2">
                  {data?.devices.map((device) => (
                    <div
                      key={device.device}
                      className="flex items-center justify-between gap-3"
                    >
                      <span className="text-sm capitalize text-slate-700">
                        {device.device}
                      </span>
                      <span className="text-sm font-medium text-slate-900">
                        {formatNumber(device.views)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}