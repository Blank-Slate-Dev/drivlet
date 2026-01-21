// src/app/api/admin/users/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import { requireAdmin } from "@/lib/admin";

// PATCH /api/admin/users/[id] - Update user account status (suspend/reactivate)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminCheck = await requireAdmin();
  if (!adminCheck.authorized) {
    return adminCheck.response;
  }

  try {
    await connectDB();
    const { id } = await params;
    const adminUserId = adminCheck.session.user.id;
    const body = await request.json();
    const { action, reason, suspendedUntil, notes } = body;

    // Validate action
    if (!["suspend", "reactivate"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Must be 'suspend' or 'reactivate'" },
        { status: 400 }
      );
    }

    // Find user
    const user = await User.findById(id);
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Prevent admin from suspending themselves
    if (user._id.toString() === adminUserId) {
      return NextResponse.json(
        { error: "You cannot modify your own account status" },
        { status: 403 }
      );
    }

    // Prevent suspending other admins
    if (user.role === "admin" && action === "suspend") {
      return NextResponse.json(
        { error: "Cannot suspend admin accounts" },
        { status: 403 }
      );
    }

    if (action === "suspend") {
      // Validate reason
      if (!reason || reason.trim().length < 10) {
        return NextResponse.json(
          { error: "Suspension reason must be at least 10 characters" },
          { status: 400 }
        );
      }

      // Validate suspendedUntil if provided
      if (suspendedUntil && new Date(suspendedUntil) <= new Date()) {
        return NextResponse.json(
          { error: "Suspension end date must be in the future" },
          { status: 400 }
        );
      }

      // Archive current suspension to history if exists
      if (user.suspensionInfo && user.accountStatus === "suspended") {
        user.suspensionHistory.push({
          suspendedAt: user.suspensionInfo.suspendedAt,
          suspendedBy: user.suspensionInfo.suspendedBy,
          reason: user.suspensionInfo.reason,
          suspendedUntil: user.suspensionInfo.suspendedUntil,
          notes: user.suspensionInfo.notes,
          reactivatedAt: new Date(),
          reactivatedBy: new mongoose.Types.ObjectId(adminUserId),
        });
      }

      // Apply new suspension
      user.accountStatus = "suspended";
      user.suspensionInfo = {
        suspendedAt: new Date(),
        suspendedBy: new mongoose.Types.ObjectId(adminUserId),
        reason: reason.trim(),
        suspendedUntil: suspendedUntil ? new Date(suspendedUntil) : undefined,
        notes: notes?.trim(),
      };

    } else if (action === "reactivate") {
      if (user.accountStatus !== "suspended") {
        return NextResponse.json(
          { error: "User is not currently suspended" },
          { status: 400 }
        );
      }

      // Archive suspension to history
      if (user.suspensionInfo) {
        user.suspensionHistory.push({
          suspendedAt: user.suspensionInfo.suspendedAt,
          suspendedBy: user.suspensionInfo.suspendedBy,
          reason: user.suspensionInfo.reason,
          suspendedUntil: user.suspensionInfo.suspendedUntil,
          notes: user.suspensionInfo.notes,
          reactivatedAt: new Date(),
          reactivatedBy: new mongoose.Types.ObjectId(adminUserId),
        });
      }

      // Reactivate account
      user.accountStatus = "active";
      user.suspensionInfo = undefined;
    }

    await user.save();

    // Return sanitized user data (exclude password)
    const userObj = user.toObject();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...sanitizedUser } = userObj;

    return NextResponse.json({
      success: true,
      user: sanitizedUser,
      message: action === "suspend"
        ? "User account suspended successfully"
        : "User account reactivated successfully"
    });

  } catch (error) {
    console.error("Error updating user status:", error);
    return NextResponse.json(
      { error: "Failed to update user status" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/users/[id] - Soft delete user
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminCheck = await requireAdmin();
  if (!adminCheck.authorized) {
    return adminCheck.response;
  }

  try {
    await connectDB();
    const { id } = await params;
    const adminUserId = adminCheck.session.user.id;

    const user = await User.findById(id);
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Prevent self-deletion
    if (user._id.toString() === adminUserId) {
      return NextResponse.json(
        { error: "You cannot delete your own account" },
        { status: 403 }
      );
    }

    // Prevent deleting other admins
    if (user.role === "admin") {
      return NextResponse.json(
        { error: "Cannot delete admin accounts" },
        { status: 403 }
      );
    }

    // Soft delete: mark as deleted but keep record
    user.accountStatus = "deleted";
    user.deletedAt = new Date();
    user.deletedBy = new mongoose.Types.ObjectId(adminUserId);

    // Archive any active suspension
    if (user.suspensionInfo) {
      user.suspensionHistory.push({
        suspendedAt: user.suspensionInfo.suspendedAt,
        suspendedBy: user.suspensionInfo.suspendedBy,
        reason: user.suspensionInfo.reason,
        suspendedUntil: user.suspensionInfo.suspendedUntil,
        notes: user.suspensionInfo.notes,
        reactivatedAt: new Date(),
        reactivatedBy: new mongoose.Types.ObjectId(adminUserId),
      });
      user.suspensionInfo = undefined;
    }

    await user.save();

    return NextResponse.json({
      success: true,
      message: "User account deleted successfully"
    });

  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 }
    );
  }
}
