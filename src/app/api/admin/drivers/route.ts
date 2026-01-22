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
    const onboardingStatus = searchParams.get("onboardingStatus"); // Filter by onboarding status

    // Build query
    const query: Record<string, unknown> = {};
    if (status && status !== "all") {
      query.status = status;
    }
    if (onboardingStatus && onboardingStatus !== "all") {
      query.onboardingStatus = onboardingStatus;
    }

    // Define the shape of populated user data
    interface PopulatedUser {
      _id: mongoose.Types.ObjectId;
      email: string;
      username: string;
      createdAt: Date;
      isApproved: boolean;
    }

    // Fetch drivers with user data
    // NOTE: Using lean() for performance - virtuals like insuranceEligible won't be included
    // We compute derived fields manually in the response
    const drivers = await Driver.find(query)
      .populate<{ userId: PopulatedUser | null }>("userId", "email username createdAt isApproved")
      .sort({ submittedAt: -1 })
      .lean();

    // Calculate stats
    const allDrivers = await Driver.find({}).lean();
    
    // Helper to compute derived insuranceEligible (since virtuals don't work with lean)
    const isInsuranceEligible = (d: typeof allDrivers[0]) => 
      d.employmentType === "employee" && d.onboardingStatus === "active";
    
    const stats = {
      total: allDrivers.length,
      pending: allDrivers.filter((d) => d.status === "pending").length,
      approved: allDrivers.filter((d) => d.status === "approved").length,
      rejected: allDrivers.filter((d) => d.status === "rejected").length,
      suspended: allDrivers.filter((d) => d.status === "suspended").length,
      // Onboarding stats (3 states only)
      onboarding: {
        notStarted: allDrivers.filter((d) => d.onboardingStatus === "not_started").length,
        contractsPending: allDrivers.filter((d) => d.onboardingStatus === "contracts_pending").length,
        active: allDrivers.filter((d) => d.onboardingStatus === "active").length,
      },
      // Computed from derived logic
      insuranceEligible: allDrivers.filter(isInsuranceEligible).length,
    };

    return NextResponse.json({
      drivers: drivers.map((driver) => ({
        ...driver,
        _id: driver._id.toString(),
        // Compute insuranceEligible since it's a virtual and lean() doesn't include it
        insuranceEligible: driver.employmentType === "employee" && driver.onboardingStatus === "active",
        // Preserve the populated user data, just convert the nested _id to string
        userId: driver.userId ? {
          _id: driver.userId._id?.toString(),
          email: driver.userId.email,
          username: driver.userId.username,
          createdAt: driver.userId.createdAt,
          isApproved: driver.userId.isApproved,
        } : null,
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

    // ========== ONBOARDING STATE MACHINE LOGIC ==========
    
    if (action === "approve") {
      // CRITICAL: Approval only advances to "contracts_pending"
      // Driver CANNOT accept jobs yet - they must complete onboarding
      driver.onboardingStatus = "contracts_pending";
      driver.canAcceptJobs = false; // EXPLICITLY FALSE
      // insuranceEligible is now derived from onboardingStatus, not set directly
    } else if (action === "reactivate") {
      // Reactivating a suspended driver
      // Check if they had completed onboarding before suspension
      if (driver.contracts?.employmentContractSignedAt && 
          driver.contracts?.driverAgreementSignedAt &&
          driver.contracts?.workHealthSafetySignedAt &&
          driver.contracts?.codeOfConductSignedAt) {
        // They had completed onboarding, restore to active
        driver.onboardingStatus = "active";
        driver.canAcceptJobs = true;
      } else {
        // They hadn't completed onboarding, send back to contracts_pending
        driver.onboardingStatus = "contracts_pending";
        driver.canAcceptJobs = false;
      }
    } else if (action === "suspend") {
      // Suspending a driver removes job access immediately
      driver.canAcceptJobs = false;
      // Note: We keep onboardingStatus as-is for record keeping
      // The canAcceptJobs = false is what matters for blocking
    } else if (action === "reject") {
      // Validate admin ID exists before proceeding
      const adminId = adminCheck.session?.user?.id;
      if (!adminId) {
        return NextResponse.json(
          { error: "Admin session invalid" },
          { status: 401 }
        );
      }

      // PRESERVE AUDIT TRAIL: Add to rejection history before updating
      if (!driver.rejectionHistory) {
        driver.rejectionHistory = [];
      }
      driver.rejectionHistory.push({
        rejectedAt: new Date(),
        rejectedBy: new mongoose.Types.ObjectId(adminId),
        reason: rejectionReason || "No reason provided",
      });

      // STATUS CLARITY:
      // - driver.status = "rejected" (set by statusMap above) = admin decision, source of truth
      // - driver.onboardingStatus = "not_started" = reset for potential re-application
      // We keep submittedAt, contracts, rejectionHistory for full audit trail
      driver.onboardingStatus = "not_started";
      driver.canAcceptJobs = false;
    }
    // ==========================================================

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
        onboardingStatus: driver.onboardingStatus,
        reviewedAt: driver.reviewedAt,
        canAcceptJobs: driver.canAcceptJobs,
      },
    });
  } catch (error) {
    console.error("Error updating driver:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Detailed error:", errorMessage);
    return NextResponse.json(
      {
        error: "Failed to update driver",
        details: process.env.NODE_ENV === "development" ? errorMessage : undefined
      },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/drivers - Permanently delete a driver application
export async function DELETE(request: Request) {
  const adminCheck = await requireAdmin();
  if (!adminCheck.authorized) {
    return adminCheck.response;
  }

  try {
    const { searchParams } = new URL(request.url);
    const driverId = searchParams.get("driverId");
    const confirmDelete = searchParams.get("confirm") === "true";

    if (!driverId) {
      return NextResponse.json(
        { error: "Driver ID is required" },
        { status: 400 }
      );
    }

    if (!confirmDelete) {
      return NextResponse.json(
        { error: "Deletion must be confirmed" },
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

    // SAFETY: Only allow deletion of rejected or pending applications
    // Approved/suspended drivers should be handled differently to preserve history
    if (!["rejected", "pending"].includes(driver.status)) {
      return NextResponse.json(
        { error: "Can only delete rejected or pending applications. Suspend approved drivers instead." },
        { status: 400 }
      );
    }

    // Check for any completed bookings - prevent deletion if driver has job history
    const Booking = (await import("@/models/Booking")).default;
    const hasBookings = await Booking.exists({
      assignedDriverId: driver._id,
      status: { $in: ["completed", "in_progress"] },
    });

    if (hasBookings) {
      return NextResponse.json(
        { error: "Cannot delete driver with booking history. Archive instead." },
        { status: 400 }
      );
    }

    // Get associated user
    const user = await User.findById(driver.userId);

    // Delete driver document
    await Driver.findByIdAndDelete(driverId);

    // Update user: remove driver profile reference and reset role
    if (user) {
      user.driverProfile = undefined;
      user.role = "user";
      user.isApproved = true; // Reset to standard user
      await user.save();
    }

    // Log deletion for audit
    console.log(`[ADMIN ACTION] Driver ${driverId} permanently deleted by admin ${adminCheck.session?.user?.id}`);

    return NextResponse.json({
      success: true,
      message: "Driver application permanently deleted",
      deletedDriverId: driverId,
    });
  } catch (error) {
    console.error("Error deleting driver:", error);
    return NextResponse.json(
      { error: "Failed to delete driver" },
      { status: 500 }
    );
  }
}
