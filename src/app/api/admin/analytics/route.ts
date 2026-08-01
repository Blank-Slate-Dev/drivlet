// src/app/api/admin/analytics/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import PageView from "@/models/PageView";
import { requireAdmin } from "@/lib/admin";
import { LOCATIONS } from "@/lib/seo-data";

export const dynamic = "force-dynamic";

/**
 * Restricted beyond the normal admin role check. Set ANALYTICS_ADMIN_EMAILS
 * (comma-separated) to change who can see traffic data.
 */
const ALLOWED_EMAILS = (
  process.env.ANALYTICS_ADMIN_EMAILS || "support@drivlet.com.au"
)
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

const TIMEZONE = "Australia/Sydney";

/** Someone is "live" if they've loaded a page in the last 5 minutes. */
const LIVE_WINDOW_MINUTES = 5;

type Period = "today" | "week" | "month" | "year";
const PERIODS: Period[] = ["today", "week", "month", "year"];

// ─── Timezone helpers (no dependencies) ─────────────────────────────────

/** Milliseconds the given zone is ahead of UTC at that instant. */
function zoneOffsetMs(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
    .formatToParts(date)
    .reduce<Record<string, string>>((acc, part) => {
      acc[part.type] = part.value;
      return acc;
    }, {});

  const asUTC = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour) % 24,
    Number(parts.minute),
    Number(parts.second)
  );

  return asUTC - date.getTime();
}

/** Calendar Y/M/D in the given zone. */
function zoneParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .formatToParts(date)
    .reduce<Record<string, string>>((acc, part) => {
      acc[part.type] = part.value;
      return acc;
    }, {});

  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
  };
}

/** The UTC instant matching local midnight of the given calendar date. */
function zoneMidnight(
  year: number,
  month: number,
  day: number,
  timeZone: string
): Date {
  const guess = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
  return new Date(guess.getTime() - zoneOffsetMs(guess, timeZone));
}

const pad = (value: number) => String(value).padStart(2, "0");

/**
 * Start instant, Mongo date format, and the full ordered list of buckets for
 * a period. Buckets are pre-generated so quiet hours/days render as empty
 * bars instead of vanishing from the chart.
 */
function buildPeriod(period: Period, now: Date) {
  const { year, month, day } = zoneParts(now, TIMEZONE);
  const buckets: string[] = [];

  if (period === "today") {
    const dateKey = `${year}-${pad(month)}-${pad(day)}`;
    for (let hour = 0; hour < 24; hour += 1) {
      buckets.push(`${dateKey} ${pad(hour)}`);
    }
    return {
      since: zoneMidnight(year, month, day, TIMEZONE),
      format: "%Y-%m-%d %H",
      buckets,
      granularity: "hour" as const,
    };
  }

  if (period === "year") {
    for (let m = 1; m <= 12; m += 1) {
      buckets.push(`${year}-${pad(m)}`);
    }
    return {
      since: zoneMidnight(year, 1, 1, TIMEZONE),
      format: "%Y-%m",
      buckets,
      granularity: "month" as const,
    };
  }

  // Week (Mon–Sun) and month (1st–last) are both day-bucketed. Both render
  // the FULL period, matching the year view — days still to come show as
  // empty bars rather than the chart stopping dead at today.
  let startDay: number;
  let startMonth = month;
  let startYear = year;
  let endDate: Date;

  if (period === "month") {
    startDay = 1;
    // Day 0 of the next month is the last day of this one.
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
    endDate = new Date(Date.UTC(year, month - 1, daysInMonth));
  } else {
    // Monday-start week. Pure calendar arithmetic in UTC, so no DST drift.
    const todayUTC = new Date(Date.UTC(year, month - 1, day));
    const weekday = (todayUTC.getUTCDay() + 6) % 7; // Mon = 0
    const monday = new Date(todayUTC.getTime() - weekday * 86400000);
    startYear = monday.getUTCFullYear();
    startMonth = monday.getUTCMonth() + 1;
    startDay = monday.getUTCDate();
    endDate = new Date(monday.getTime() + 6 * 86400000); // through Sunday
  }

  let cursor = new Date(Date.UTC(startYear, startMonth - 1, startDay));
  const last = endDate;
  while (cursor.getTime() <= last.getTime()) {
    buckets.push(
      `${cursor.getUTCFullYear()}-${pad(cursor.getUTCMonth() + 1)}-${pad(
        cursor.getUTCDate()
      )}`
    );
    cursor = new Date(cursor.getTime() + 86400000);
  }

  return {
    since: zoneMidnight(startYear, startMonth, startDay, TIMEZONE),
    format: "%Y-%m-%d",
    buckets,
    granularity: "day" as const,
  };
}

/** Turns a raw path into something readable, using your seo-data LOCATIONS. */
function describePath(path: string): { label: string; group: string } {
  if (path === "/") return { label: "Home page", group: "Home" };

  const segments = path.split("/").filter(Boolean);

  if (segments.length === 1) {
    const city = LOCATIONS[segments[0]];
    if (city) {
      return { label: `${city.name} — city page`, group: "City pages" };
    }
  }

  if (segments.length === 2) {
    const city = LOCATIONS[segments[0]];
    const suburb = city?.suburbs.find((s) => s.slug === segments[1]);
    if (city && suburb) {
      return { label: `${suburb.name}, ${city.name}`, group: "Suburb pages" };
    }
  }

  return { label: path, group: "Other pages" };
}

// ─── Route ──────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const adminCheck = await requireAdmin();
  if (!adminCheck.authorized) {
    return adminCheck.response;
  }

  const email = adminCheck.session.user?.email?.toLowerCase();
  if (!email || !ALLOWED_EMAILS.includes(email)) {
    return NextResponse.json(
      { error: "This account can't view website traffic." },
      { status: 403 }
    );
  }

  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const now = new Date();
    const liveSince = new Date(now.getTime() - LIVE_WINDOW_MINUTES * 60000);

    // Lightweight poll used by the "Live now" card.
    if (searchParams.get("only") === "live") {
      const liveAgg = await PageView.aggregate([
        { $match: { createdAt: { $gte: liveSince } } },
        { $group: { _id: null, people: { $addToSet: "$visitorHash" } } },
        { $project: { _id: 0, people: { $size: "$people" } } },
      ]);

      return NextResponse.json({
        live: { people: liveAgg[0]?.people || 0, windowMinutes: LIVE_WINDOW_MINUTES },
      });
    }

    const requested = (searchParams.get("period") || "today") as Period;
    const period: Period = PERIODS.includes(requested) ? requested : "month";
    const { since, format, buckets, granularity } = buildPeriod(period, now);

    const match = { $match: { createdAt: { $gte: since } } };

    const [
      totalsResult,
      liveResult,
      livePages,
      series,
      cities,
      pages,
      referrers,
      devices,
    ] = await Promise.all([
      // Headline totals for the period
      PageView.aggregate([
        match,
        {
          $group: {
            _id: null,
            views: { $sum: 1 },
            visitors: { $addToSet: "$visitorHash" },
          },
        },
        { $project: { _id: 0, views: 1, visitors: { $size: "$visitors" } } },
      ]),

      // People active right now
      PageView.aggregate([
        { $match: { createdAt: { $gte: liveSince } } },
        { $group: { _id: null, people: { $addToSet: "$visitorHash" } } },
        { $project: { _id: 0, people: { $size: "$people" } } },
      ]),

      // What those people are looking at
      PageView.aggregate([
        { $match: { createdAt: { $gte: liveSince } } },
        { $group: { _id: "$path", views: { $sum: 1 } } },
        { $project: { _id: 0, path: "$_id", views: 1 } },
        { $sort: { views: -1 } },
        { $limit: 5 },
      ]),

      // Time series for the bar chart
      PageView.aggregate([
        match,
        {
          $group: {
            _id: {
              $dateToString: {
                format,
                date: "$createdAt",
                timezone: TIMEZONE,
              },
            },
            views: { $sum: 1 },
            visitors: { $addToSet: "$visitorHash" },
          },
        },
        {
          $project: {
            _id: 0,
            bucket: "$_id",
            views: 1,
            visitors: { $size: "$visitors" },
          },
        },
      ]),

      // Where visitors are
      PageView.aggregate([
        match,
        {
          $group: {
            _id: { city: "$visitorCity", region: "$visitorRegion" },
            views: { $sum: 1 },
            visitors: { $addToSet: "$visitorHash" },
          },
        },
        {
          $project: {
            _id: 0,
            city: "$_id.city",
            region: "$_id.region",
            views: 1,
            visitors: { $size: "$visitors" },
          },
        },
        { $sort: { visitors: -1, views: -1 } },
        { $limit: 20 },
      ]),

      // Which pages get hit
      PageView.aggregate([
        match,
        {
          $group: {
            _id: "$path",
            views: { $sum: 1 },
            visitors: { $addToSet: "$visitorHash" },
          },
        },
        {
          $project: {
            _id: 0,
            path: "$_id",
            views: 1,
            visitors: { $size: "$visitors" },
          },
        },
        { $sort: { views: -1 } },
        { $limit: 20 },
      ]),

      // Where they came from
      PageView.aggregate([
        {
          $match: {
            createdAt: { $gte: since },
            referrerHost: { $exists: true, $ne: null },
          },
        },
        { $group: { _id: "$referrerHost", views: { $sum: 1 } } },
        { $project: { _id: 0, source: "$_id", views: 1 } },
        { $sort: { views: -1 } },
        { $limit: 8 },
      ]),

      // Mobile vs desktop
      PageView.aggregate([
        match,
        { $group: { _id: "$deviceType", views: { $sum: 1 } } },
        { $project: { _id: 0, device: "$_id", views: 1 } },
        { $sort: { views: -1 } },
      ]),
    ]);

    // Merge the sparse aggregation result onto the full bucket list so quiet
    // periods render as empty bars rather than disappearing.
    const seriesMap = new Map<string, { views: number; visitors: number }>(
      series.map((row) => [
        row.bucket as string,
        { views: row.views as number, visitors: row.visitors as number },
      ])
    );

    const chart = buckets.map((bucket) => ({
      bucket,
      views: seriesMap.get(bucket)?.views || 0,
      visitors: seriesMap.get(bucket)?.visitors || 0,
    }));

    const totals = totalsResult[0] || { views: 0, visitors: 0 };

    return NextResponse.json({
      period,
      granularity,
      since: since.toISOString(),
      totals,
      live: {
        people: liveResult[0]?.people || 0,
        windowMinutes: LIVE_WINDOW_MINUTES,
        pages: livePages.map((page) => ({
          ...page,
          ...describePath(page.path),
        })),
      },
      chart,
      cities,
      pages: pages.map((page) => ({ ...page, ...describePath(page.path) })),
      referrers,
      devices,
    });
  } catch (error) {
    console.error("Error fetching traffic analytics:", error);
    return NextResponse.json(
      { error: "Failed to load website traffic" },
      { status: 500 }
    );
  }
}