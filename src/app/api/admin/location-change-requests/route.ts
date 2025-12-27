// src/app/api/admin/location-change-requests/route.ts
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import LocationChangeRequest from "@/models/LocationChangeRequest";
import { requireAdmin } from "@/lib/admin";

// GET /api/admin/location-change-requests - Get all location change requests
export async function GET(request: Request) {
  const adminCheck = await requireAdmin();
  if (!adminCheck.authorized) {
    return adminCheck.response;
  }

  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "pending"; // pending, approved, rejected, all
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    // Build query
    const query: Record<string, unknown> = {};
    if (status && status !== "all") {
      query.status = status;
    }

    // Count total for pagination
    const total = await LocationChangeRequest.countDocuments(query);
    const totalPages = Math.ceil(total / limit);
    const skip = (page - 1) * limit;

    // Fetch requests with garage and user data
    const requests = await LocationChangeRequest.find(query)
      .populate({
        path: "garageId",
        select: "businessName tradingName primaryContact",
      })
      .populate({
        path: "garageUserId",
        select: "email username",
      })
      .populate({
        path: "reviewedBy",
        select: "email username",
      })
      .sort({ submittedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Calculate stats
    const allRequests = await LocationChangeRequest.find({}).lean();
    const stats = {
      total: allRequests.length,
      pending: allRequests.filter((r) => r.status === "pending").length,
      approved: allRequests.filter((r) => r.status === "approved").length,
      rejected: allRequests.filter((r) => r.status === "rejected").length,
    };

    // Transform ObjectIds to strings for JSON serialization
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const transformedRequests = requests.map((req: any) => {
      const transformed = {
        ...req,
        _id: req._id?.toString(),
      };
      if (typeof req.garageId === "object" && req.garageId?._id) {
        transformed.garageId = {
          ...req.garageId,
          _id: req.garageId._id.toString(),
        };
      }
      if (typeof req.garageUserId === "object" && req.garageUserId?._id) {
        transformed.garageUserId = {
          ...req.garageUserId,
          _id: req.garageUserId._id.toString(),
        };
      }
      if (typeof req.reviewedBy === "object" && req.reviewedBy?._id) {
        transformed.reviewedBy = {
          ...req.reviewedBy,
          _id: req.reviewedBy._id.toString(),
        };
      }
      return transformed;
    });

    return NextResponse.json({
      requests: transformedRequests,
      stats,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    console.error("Error fetching location change requests:", error);
    return NextResponse.json(
      { error: "Failed to fetch location change requests" },
      { status: 500 }
    );
  }
}
