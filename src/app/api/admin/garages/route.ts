// src/app/api/admin/garages/route.ts
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Garage, { GarageStatus } from "@/models/Garage";
import User from "@/models/User";
import { requireAdmin } from "@/lib/admin";

// GET /api/admin/garages - Get all garage applications
export async function GET(request: Request) {
  const adminCheck = await requireAdmin();
  if (!adminCheck.authorized) {
    return adminCheck.response;
  }

  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status"); // pending, approved, rejected, suspended, all

    // Build query
    const query: Record<string, unknown> = {};
    if (status && status !== "all") {
      query.status = status;
    }

    // Fetch garages with user data
    const garages = await Garage.find(query)
      .populate("userId", "email username createdAt")
      .sort({ submittedAt: -1 })
      .lean();

    // Calculate stats
    const allGarages = await Garage.find({}).lean();
    const stats = {
      total: allGarages.length,
      pending: allGarages.filter((g) => g.status === "pending").length,
      approved: allGarages.filter((g) => g.status === "approved").length,
      rejected: allGarages.filter((g) => g.status === "rejected").length,
      suspended: allGarages.filter((g) => g.status === "suspended").length,
    };

    return NextResponse.json({
      garages: garages.map((garage) => ({
        ...garage,
        _id: garage._id.toString(),
        userId: garage.userId?._id?.toString() || garage.userId?.toString(),
      })),
      stats,
    });
  } catch (error) {
    console.error("Error fetching garages:", error);
    return NextResponse.json(
      { error: "Failed to fetch garages" },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/garages - Update garage status
export async function PATCH(request: Request) {
  const adminCheck = await requireAdmin();
  if (!adminCheck.authorized) {
    return adminCheck.response;
  }

  try {
    const body = await request.json();
    const { garageId, action, rejectionReason } = body;

    if (!garageId || !action) {
      return NextResponse.json(
        { error: "Garage ID and action are required" },
        { status: 400 }
      );
    }

    if (!["approve", "reject", "suspend", "reactivate"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action" },
        { status: 400 }
      );
    }

    await connectDB();

    const garage = await Garage.findById(garageId);
    if (!garage) {
      return NextResponse.json(
        { error: "Garage not found" },
        { status: 404 }
      );
    }

    // Update garage status with proper typing
    const statusMap: Record<string, GarageStatus> = {
      approve: "approved",
      reject: "rejected",
      suspend: "suspended",
      reactivate: "approved",
    };

    garage.status = statusMap[action];
    garage.reviewedAt = new Date();

    if (action === "reject" && rejectionReason) {
      garage.rejectionReason = rejectionReason;
    }

    await garage.save();

    // Update user's isApproved status
    const user = await User.findById(garage.userId);
    if (user) {
      user.isApproved = action === "approve" || action === "reactivate";
      await user.save();
    }

    return NextResponse.json({
      message: `Garage ${action}d successfully`,
      garage: {
        _id: garage._id.toString(),
        status: garage.status,
        reviewedAt: garage.reviewedAt,
      },
    });
  } catch (error) {
    console.error("Error updating garage:", error);
    return NextResponse.json(
      { error: "Failed to update garage" },
      { status: 500 }
    );
  }
}
