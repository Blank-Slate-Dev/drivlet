// src/app/api/admin/payment-disputes/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { connectDB } from "@/lib/mongodb";
import PaymentDispute from "@/models/PaymentDispute";

export const dynamic = "force-dynamic";

// GET /api/admin/payment-disputes - List disputes with filtering and pagination
export async function GET(request: NextRequest) {
  const adminCheck = await requireAdmin();
  if (!adminCheck.authorized) return adminCheck.response;

  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status"); // open, under_review, resolved, dismissed
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    // Build query
    const query: Record<string, unknown> = {};
    if (status && status !== "all") {
      query.status = status;
    }

    const [disputes, total, stats] = await Promise.all([
      PaymentDispute.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("driverId", "firstName lastName phone")
        .populate("bookingId", "vehicleRegistration garageName userName")
        .populate("resolvedBy", "username email")
        .lean(),
      PaymentDispute.countDocuments(query),
      // Aggregate stats
      PaymentDispute.aggregate([
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const statusCounts: Record<string, number> = {
      open: 0,
      under_review: 0,
      resolved: 0,
      dismissed: 0,
    };
    stats.forEach((s: { _id: string; count: number }) => {
      statusCounts[s._id] = s.count;
    });

    return NextResponse.json({
      disputes,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      stats: statusCounts,
    });
  } catch (error) {
    console.error("Error fetching payment disputes:", error);
    return NextResponse.json(
      { error: "Failed to fetch disputes" },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/payment-disputes - Update dispute (respond, resolve, dismiss)
export async function PATCH(request: NextRequest) {
  const adminCheck = await requireAdmin();
  if (!adminCheck.authorized) return adminCheck.response;

  try {
    await connectDB();

    const body = await request.json();
    const { disputeId, action, adminResponse } = body;

    if (!disputeId || !action) {
      return NextResponse.json(
        { error: "disputeId and action are required" },
        { status: 400 }
      );
    }

    const dispute = await PaymentDispute.findById(disputeId);
    if (!dispute) {
      return NextResponse.json(
        { error: "Dispute not found" },
        { status: 404 }
      );
    }

    switch (action) {
      case "review":
        // Move to under_review
        if (dispute.status !== "open") {
          return NextResponse.json(
            { error: "Only open disputes can be moved to review" },
            { status: 400 }
          );
        }
        dispute.status = "under_review";
        if (adminResponse) dispute.adminResponse = adminResponse;
        break;

      case "resolve":
        // Resolve the dispute
        if (!["open", "under_review"].includes(dispute.status)) {
          return NextResponse.json(
            { error: "Only open or under-review disputes can be resolved" },
            { status: 400 }
          );
        }
        if (!adminResponse) {
          return NextResponse.json(
            { error: "Admin response is required when resolving" },
            { status: 400 }
          );
        }
        dispute.status = "resolved";
        dispute.adminResponse = adminResponse;
        dispute.resolvedAt = new Date();
        dispute.resolvedBy = adminCheck.session.user.id;
        break;

      case "dismiss":
        // Dismiss the dispute
        if (!["open", "under_review"].includes(dispute.status)) {
          return NextResponse.json(
            { error: "Only open or under-review disputes can be dismissed" },
            { status: 400 }
          );
        }
        if (!adminResponse) {
          return NextResponse.json(
            { error: "Admin response is required when dismissing" },
            { status: 400 }
          );
        }
        dispute.status = "dismissed";
        dispute.adminResponse = adminResponse;
        dispute.resolvedAt = new Date();
        dispute.resolvedBy = adminCheck.session.user.id;
        break;

      default:
        return NextResponse.json(
          { error: "Invalid action. Use: review, resolve, dismiss" },
          { status: 400 }
        );
    }

    await dispute.save();

    return NextResponse.json({ dispute });
  } catch (error) {
    console.error("Error updating payment dispute:", error);
    return NextResponse.json(
      { error: "Failed to update dispute" },
      { status: 500 }
    );
  }
}
