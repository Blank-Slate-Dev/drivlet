// src/app/api/admin/drivers/route.ts
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Driver, { DriverStatus } from "@/models/Driver";
import User from "@/models/User";
import { requireAdmin } from "@/lib/admin";
import mongoose from "mongoose";

// GET /api/admin/drivers - Get all driver applications
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

    // Fetch drivers with user data
    const drivers = await Driver.find(query)
      .populate("userId", "email username createdAt isApproved")
      .sort({ submittedAt: -1 })
      .lean();

    // Calculate stats
    const allDrivers = await Driver.find({}).lean();
    const stats = {
      total: allDrivers.length,
      pending: allDrivers.filter((d) => d.status === "pending").length,
      approved: allDrivers.filter((d) => d.status === "approved").length,
      rejected: allDrivers.filter((d) => d.status === "rejected").length,
      suspended: allDrivers.filter((d) => d.status === "suspended").length,
    };

    return NextResponse.json({
      drivers: drivers.map((driver) => ({
        ...driver,
        _id: driver._id.toString(),
        userId: driver.userId?._id?.toString() || driver.userId?.toString(),
      })),
      stats,
    });
  } catch (error) {
    console.error("Error fetching drivers:", error);
    return NextResponse.json(
      { error: "Failed to fetch drivers" },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/drivers - Update driver status
export async function PATCH(request: Request) {
  const adminCheck = await requireAdmin();
  if (!adminCheck.authorized) {
    return adminCheck.response;
  }

  try {
    const body = await request.json();
    const { driverId, action, rejectionReason } = body;

    if (!driverId || !action) {
      return NextResponse.json(
        { error: "Driver ID and action are required" },
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

    const driver = await Driver.findById(driverId);
    if (!driver) {
      return NextResponse.json(
        { error: "Driver not found" },
        { status: 404 }
      );
    }

    // Update driver status with proper typing
    const statusMap: Record<string, DriverStatus> = {
      approve: "approved",
      reject: "rejected",
      suspend: "suspended",
      reactivate: "approved",
    };

    driver.status = statusMap[action];
    driver.reviewedAt = new Date();
    
    // Convert string ID to ObjectId for reviewedBy
    if (adminCheck.session?.user.id) {
      driver.reviewedBy = new mongoose.Types.ObjectId(adminCheck.session.user.id);
    }

    if (action === "reject" && rejectionReason) {
      driver.rejectionReason = rejectionReason;
    }

    // When approving, enable the driver to accept jobs
    if (action === "approve" || action === "reactivate") {
      driver.canAcceptJobs = true;
    } else if (action === "suspend") {
      driver.canAcceptJobs = false;
    }

    await driver.save();

    // Update user's isApproved status
    const user = await User.findById(driver.userId);
    if (user) {
      user.isApproved = action === "approve" || action === "reactivate";
      await user.save();
    }

    return NextResponse.json({
      message: `Driver ${action}d successfully`,
      driver: {
        _id: driver._id.toString(),
        status: driver.status,
        reviewedAt: driver.reviewedAt,
        canAcceptJobs: driver.canAcceptJobs,
      },
    });
  } catch (error) {
    console.error("Error updating driver:", error);
    return NextResponse.json(
      { error: "Failed to update driver" },
      { status: 500 }
    );
  }
}