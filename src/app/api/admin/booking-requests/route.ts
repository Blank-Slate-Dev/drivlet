import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import BookingRequest from "@/models/BookingRequest";

// Always serve fresh data — the admin pipeline view must reflect the latest state.
export const dynamic = "force-dynamic";

// Every non-converted, non-paid request state — used by the unified /admin/bookings page
// so it can load the whole pre-conversion pipeline in a single request.
const OPEN_REQUEST_STATUSES = [
  "pending_review",
  "accepted_awaiting_payment",
  "approved",
  "payment_link_sent",
  "declined",
  "expired",
];

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const status = searchParams.get("status");

  try {
    await connectDB();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: any = {};
    if (status === "all_open") {
      // Whole pre-conversion pipeline in one call (unified /admin/bookings page)
      filter.status = { $in: OPEN_REQUEST_STATUSES };
    } else if (status && status !== "all") {
      filter.status = status;
    }

    const [requests, total, stats] = await Promise.all([
      BookingRequest.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      BookingRequest.countDocuments(filter),
      BookingRequest.aggregate([
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const statMap: Record<string, number> = {
      pending_review: 0,
      accepted_awaiting_payment: 0,
      approved: 0,
      payment_link_sent: 0,
      paid: 0,
      declined: 0,
      converted: 0,
      expired: 0,
    };
    let statsTotal = 0;
    for (const s of stats) {
      statMap[s._id] = s.count;
      statsTotal += s.count;
    }

    return NextResponse.json({
      requests,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      stats: { ...statMap, total: statsTotal },
    });
  } catch (error) {
    console.error("Failed to fetch booking requests:", error);
    return NextResponse.json({ error: "Failed to fetch booking requests" }, { status: 500 });
  }
}
