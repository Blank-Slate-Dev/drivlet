// src/app/admin/traffic/page.tsx
"use client";

import { useCallback, useEffect, useState } from "react";
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

interface DailyRow {
  date: string;
  views: number;
  visitors: number;
}

interface TrafficData {
  periodDays: number;
  totals: { views: number; visitors: number };
  cities: CityRow[];
  pages: PageRow[];
  daily: DailyRow[];
  referrers: Array<{ source: string; views: number }>;
  devices: Array<{ device: string; views: number }>;
}

const PERIODS = [
  { days: 7, label: "7 days" },
  { days: 30, label: "30 days" },
  { days: 90, label: "90 days" },
];

export default function AdminTrafficPage() {
  const [data, setData] = useState<TrafficData | null>(null);
  const [periodDays, setPeriodDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchTraffic = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/analytics?days=${periodDays}`);
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error || "Failed to load website traffic");
      }
      setData(await response.json());
      setError("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load website traffic"
      );
    } finally {
      setLoading(false);
    }
  }, [periodDays]);

  useEffect(() => {
    fetchTraffic();
  }, [fetchTraffic]);

  const formatNumber = (value: number) =>
    new Intl.NumberFormat("en-AU").format(value);

  const formatDay = (date: string) =>
    new Date(`${date}T00:00:00`).toLocaleDateString("en-AU", {
      day: "numeric",
      month: "short",
    });

  // Loading skeleton
  if (loading && !data) {
    return (
      <div className="min-h-screen bg-slate-50 px-6 py-6 lg:px-8">
        <div className="mx-auto max-w-6xl space-y-8">
          <div className="flex items-center justify-between">
            <div className="h-7 w-40 rounded bg-slate-200 animate-pulse" />
            <div className="h-9 w-48 rounded-lg bg-slate-200 animate-pulse" />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-xl border border-slate-200 p-5"
              >
                <div className="h-8 w-20 bg-slate-100 rounded animate-pulse" />
                <div className="h-4 w-24 bg-slate-100 rounded animate-pulse mt-2" />
              </div>
            ))}
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="h-10 bg-slate-50 rounded animate-pulse mb-2"
              />
            ))}
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
  const maxCityVisitors = Math.max(
    1,
    ...(data?.cities || []).map((c) => c.visitors)
  );
  const maxPageViews = Math.max(1, ...(data?.pages || []).map((p) => p.views));
  const maxDailyViews = Math.max(1, ...(data?.daily || []).map((d) => d.views));
  const hasData = (data?.totals.views || 0) > 0;

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
              {PERIODS.map((period) => (
                <button
                  key={period.days}
                  onClick={() => setPeriodDays(period.days)}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    periodDays === period.days
                      ? "bg-emerald-50 text-emerald-700"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  {period.label}
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
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
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

          <div className="col-span-2 lg:col-span-1 bg-white rounded-xl border border-slate-200 p-5">
            <div className="truncate text-2xl font-bold text-slate-900">
              {topCity?.city || "—"}
            </div>
            <div className="flex items-center gap-1.5 text-sm text-slate-500 mt-1">
              <MapPin className="h-3.5 w-3.5" />
              Top city
            </div>
          </div>
        </div>

        {!hasData ? (
          <div className="bg-white rounded-xl border border-slate-200 py-12 text-center">
            <BarChart3 className="mx-auto h-8 w-8 text-slate-300 mb-2" />
            <p className="text-sm font-medium text-slate-900">
              No traffic recorded yet
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Numbers appear here once the site is deployed and visitors start
              arriving.
            </p>
          </div>
        ) : (
          <>
            {/* Cities + Pages */}
            <div className="grid gap-4 lg:grid-cols-2">
              {/* Visitor cities */}
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
                            <span className="text-slate-400">
                              {" "}
                              · {city.region}
                            </span>
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

              {/* Top pages */}
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

            {/* Daily trend */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h2 className="text-sm font-semibold text-slate-900 mb-4">
                Daily page views
              </h2>
              <div className="flex h-32 items-end gap-1">
                {data?.daily.map((day) => (
                  <div
                    key={day.date}
                    className="group relative flex-1 rounded-t bg-emerald-500/80 transition-colors hover:bg-emerald-500"
                    style={{
                      height: `${Math.max(
                        (day.views / maxDailyViews) * 100,
                        2
                      )}%`,
                    }}
                    title={`${formatDay(day.date)} — ${day.views} views, ${
                      day.visitors
                    } people`}
                  />
                ))}
              </div>
              {data && data.daily.length > 0 && (
                <div className="mt-2 flex justify-between text-xs text-slate-400">
                  <span>{formatDay(data.daily[0].date)}</span>
                  <span>
                    {formatDay(data.daily[data.daily.length - 1].date)}
                  </span>
                </div>
              )}
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