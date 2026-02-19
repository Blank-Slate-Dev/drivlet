// src/app/api/admin/incidents/stats/route.ts
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { connectDB } from "@/lib/mongodb";
import Incident from "@/models/Incident";

export const dynamic = "force-dynamic";

// GET /api/admin/incidents/stats — Dashboard statistics
export async function GET() {
  const adminCheck = await requireAdmin();
  if (!adminCheck.authorized) return adminCheck.response;

  try {
    await connectDB();

    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const twoWeeksAgo = new Date(now);
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    const [
      openCount,
      severityCounts,
      investigatingCount,
      resolvedThisWeek,
      incidentsThisWeek,
      incidentsLastWeek,
    ] = await Promise.all([
      Incident.countDocuments({ status: { $in: ["open", "investigating", "awaiting_response"] } }),
      Incident.aggregate([
        { $match: { status: { $in: ["open", "investigating", "awaiting_response"] } } },
        { $group: { _id: "$severity", count: { $sum: 1 } } },
      ]),
      Incident.countDocuments({ status: "investigating" }),
      Incident.countDocuments({ status: "resolved", "resolution.resolvedAt": { $gte: weekAgo } }),
      Incident.countDocuments({ createdAt: { $gte: weekAgo } }),
      Incident.countDocuments({ createdAt: { $gte: twoWeeksAgo, $lt: weekAgo } }),
    ]);

    const severityMap: Record<string, number> = { low: 0, medium: 0, high: 0, critical: 0 };
    severityCounts.forEach((s: { _id: string; count: number }) => {
      severityMap[s._id] = s.count;
    });

    return NextResponse.json({
      openCount,
      criticalHighCount: (severityMap.critical || 0) + (severityMap.high || 0),
      investigatingCount,
      resolvedThisWeek,
      incidentsThisWeek,
      incidentsLastWeek,
      severityBreakdown: severityMap,
    });
  } catch (error) {
    console.error("Error fetching incident stats:", error);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
