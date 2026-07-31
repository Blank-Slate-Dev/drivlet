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
const ALLOWED_PERIODS = [7, 30, 90];

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
      return {
        label: `${suburb.name}, ${city.name}`,
        group: "Suburb pages",
      };
    }
  }

  return { label: path, group: "Other pages" };
}

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
    const requested = parseInt(searchParams.get("days") || "30", 10);
    const periodDays = ALLOWED_PERIODS.includes(requested) ? requested : 30;

    const since = new Date();
    since.setDate(since.getDate() - periodDays);
    since.setHours(0, 0, 0, 0);

    const match = { $match: { createdAt: { $gte: since } } };

    const [totalsResult, cities, pages, daily, referrers, devices] =
      await Promise.all([
        // Headline totals
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

        // Where visitors are physically located — the main event
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

        // Daily trend
        PageView.aggregate([
          match,
          {
            $group: {
              _id: {
                $dateToString: {
                  format: "%Y-%m-%d",
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
              date: "$_id",
              views: 1,
              visitors: { $size: "$visitors" },
            },
          },
          { $sort: { date: 1 } },
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

    const totals = totalsResult[0] || { views: 0, visitors: 0 };

    return NextResponse.json({
      periodDays,
      since: since.toISOString(),
      totals,
      cities,
      pages: pages.map((page) => ({
        ...page,
        ...describePath(page.path),
      })),
      daily,
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