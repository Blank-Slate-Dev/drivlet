// src/app/api/admin/drivers/[id]/account/route.ts
// Admin account assistance for drivers:
// - send_reset: email the driver a password reset link
// - set_temporary: set a temporary password the admin reads out to the driver
// - suspend: temporarily disable the account (login blocked, driver APIs
//   reject; warns first if the driver has active job assignments)
// - reactivate: re-enable a suspended account
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { Types } from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/admin";
import { requireValidOrigin } from "@/lib/validation";
import Driver from "@/models/Driver";
import User from "@/models/User";
import Booking from "@/models/Booking";
import { sendPasswordResetEmail } from "@/lib/email";

function getAppUrl(): string {
  return process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminCheck = await requireAdmin();
  if (!adminCheck.authorized) return adminCheck.response;

  const originCheck = requireValidOrigin(request);
  if (!originCheck.valid) {
    return NextResponse.json({ error: originCheck.error }, { status: 403 });
  }

  const { id } = await params;
  if (!Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid driver id" }, { status: 400 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const action = body.action as string;
  if (!["send_reset", "set_temporary", "suspend", "reactivate"].includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  try {
    await connectDB();

    const driver = await Driver.findById(id);
    if (!driver) {
      return NextResponse.json({ error: "Driver not found" }, { status: 404 });
    }
    const user = driver.userId ? await User.findById(driver.userId) : null;
    if (!user) {
      return NextResponse.json(
        { error: "No login account is linked to this driver" },
        { status: 404 }
      );
    }

    const adminEmail = adminCheck.session?.user?.email || "admin";

    // ── Send a password reset email ──
    if (action === "send_reset") {
      const rawToken = crypto.randomBytes(32).toString("hex");
      user.passwordResetToken = crypto.createHash("sha256").update(rawToken).digest("hex");
      user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000);
      await user.save({ validateModifiedOnly: true });

      const sent = await sendPasswordResetEmail(
        user.email,
        driver.firstName || user.username || "",
        `${getAppUrl()}/reset-password?token=${rawToken}`
      );
      if (!sent) {
        return NextResponse.json(
          { error: "Couldn't send the email. Check the Mailjet configuration and try again." },
          { status: 500 }
        );
      }
      return NextResponse.json({
        success: true,
        message: `Reset link emailed to ${user.email} (valid for 1 hour)`,
      });
    }

    // ── Set a temporary password ──
    if (action === "set_temporary") {
      const tempPassword = typeof body.tempPassword === "string" ? body.tempPassword : "";
      if (tempPassword.length < 8) {
        return NextResponse.json(
          { error: "Temporary password must be at least 8 characters" },
          { status: 400 }
        );
      }
      user.password = await bcrypt.hash(tempPassword, 12);
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save({ validateModifiedOnly: true });

      return NextResponse.json({
        success: true,
        message: "Temporary password set. Ask the driver to change it in Settings after logging in.",
      });
    }

    // ── Suspend (temporarily disable) ──
    if (action === "suspend") {
      if (user.accountStatus === "suspended") {
        return NextResponse.json({ error: "This account is already disabled" }, { status: 400 });
      }

      // Warn about active assignments unless the admin has confirmed
      const activeAssignments = await Booking.countDocuments({
        status: { $nin: ["completed", "cancelled"] },
        "cancellation.cancelledAt": { $exists: false },
        $or: [{ assignedDriverId: driver._id }, { returnDriverId: driver._id }],
      });
      if (activeAssignments > 0 && body.confirm !== true) {
        return NextResponse.json(
          {
            requiresConfirmation: true,
            activeAssignments,
            error: `This driver has ${activeAssignments} active job assignment${activeAssignments === 1 ? "" : "s"}. Reassign them via Dispatch, or confirm to disable anyway.`,
          },
          { status: 409 }
        );
      }

      // suspendedBy is a required ObjectId ref to the admin's User document
      const adminUserId = adminCheck.session?.user?.id;
      if (!adminUserId || !Types.ObjectId.isValid(adminUserId)) {
        return NextResponse.json(
          { error: "Could not identify your admin session. Please sign out and back in." },
          { status: 500 }
        );
      }

      user.accountStatus = "suspended";
      user.suspensionInfo = {
        reason:
          typeof body.reason === "string" && body.reason.trim()
            ? body.reason.trim().slice(0, 500)
            : "Disabled by admin",
        suspendedAt: new Date(),
        suspendedBy: new Types.ObjectId(adminUserId),
        notes: `Disabled via admin driver management by ${adminEmail}`,
      };
      await user.save({ validateModifiedOnly: true });

      // Belt and braces: also block job acceptance at the driver level
      driver.canAcceptJobs = false;
      await driver.save({ validateModifiedOnly: true });

      return NextResponse.json({
        success: true,
        message: "Account disabled. The driver can no longer log in, and open sessions lose access to driver features.",
        activeAssignments,
      });
    }

    // ── Reactivate ──
    if (action === "reactivate") {
      if (user.accountStatus !== "suspended") {
        return NextResponse.json({ error: "This account is not disabled" }, { status: 400 });
      }
      user.accountStatus = "active";
      user.suspensionInfo = undefined;
      await user.save({ validateModifiedOnly: true });

      // Restore job acceptance only if the driver finished onboarding
      if (driver.onboardingStatus === "active") {
        driver.canAcceptJobs = true;
        await driver.save({ validateModifiedOnly: true });
      }

      return NextResponse.json({
        success: true,
        message: "Account re-enabled. The driver can log in again.",
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Admin driver account action error:", error);
    return NextResponse.json({ error: "Failed to update the driver's account" }, { status: 500 });
  }
}
