// src/app/api/admin/bookings/[id]/edit/route.ts
// POST — admin edits a paid booking's logistics details.
// Only allowed while the booking is pending/in_progress and the car has not
// been picked up yet (stages: booking_confirmed, driver_en_route).
// Pushes a "booking_updated" timeline entry, emits SSE, and emails the
// customer a summary of what changed.

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { requireValidOrigin } from "@/lib/validation";
import { connectDB } from "@/lib/mongodb";
import Booking from "@/models/Booking";
import { notifyBookingUpdate } from "@/lib/emit-booking-update";
import {
  sendEmail,
  bookingDetailsHtml,
  bookingDetailsText,
  emailPolicyFooterHtml,
  emailPolicyFooterText,
  BookingEmailDetails,
} from "@/lib/email";
import {
  PICKUP_SLOT_VALUES,
  DROPOFF_SLOT_VALUES,
  getPickupSlotLabel,
  getDropoffSlotLabel,
} from "@/config/timeSlots";

// Booking can only be edited before the car is picked up
const EDITABLE_STATUSES = ["pending", "in_progress"];
const EDITABLE_STAGES = ["booking_confirmed", "driver_en_route"];

interface FieldChange {
  field: string;
  label: string;
  from: string;
  to: string;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDate(date?: Date | null): string {
  return date ? date.toLocaleDateString("en-AU") : "not set";
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

  try {
    const body = await request.json().catch(() => ({}));

    await connectDB();

    const booking = await Booking.findById(id);
    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    if (!EDITABLE_STATUSES.includes(booking.status)) {
      return NextResponse.json(
        { error: `Cannot edit a booking with status "${booking.status}"` },
        { status: 400 }
      );
    }
    if (!EDITABLE_STAGES.includes(booking.currentStage)) {
      return NextResponse.json(
        { error: "This booking can no longer be edited — the car has already been picked up." },
        { status: 400 }
      );
    }

    const changes: FieldChange[] = [];

    // ── serviceDate ──
    if (body.serviceDate !== undefined) {
      if (typeof body.serviceDate !== "string") {
        return NextResponse.json({ error: "serviceDate must be an ISO date string" }, { status: 400 });
      }
      const newDate = new Date(body.serviceDate);
      if (isNaN(newDate.getTime())) {
        return NextResponse.json({ error: "serviceDate is not a valid date" }, { status: 400 });
      }
      if (!booking.serviceDate || booking.serviceDate.getTime() !== newDate.getTime()) {
        changes.push({
          field: "serviceDate",
          label: "Service date",
          from: formatDate(booking.serviceDate),
          to: formatDate(newDate),
        });
        booking.serviceDate = newDate;
      }
    }

    // ── pickupTimeSlot ──
    if (body.pickupTimeSlot !== undefined) {
      if (!PICKUP_SLOT_VALUES.includes(body.pickupTimeSlot)) {
        return NextResponse.json(
          { error: `pickupTimeSlot must be one of: ${PICKUP_SLOT_VALUES.join(", ")}` },
          { status: 400 }
        );
      }
      if (booking.pickupTimeSlot !== body.pickupTimeSlot) {
        changes.push({
          field: "pickupTimeSlot",
          label: "Pickup window",
          from: booking.pickupTimeSlot ? getPickupSlotLabel(booking.pickupTimeSlot) : "not set",
          to: getPickupSlotLabel(body.pickupTimeSlot),
        });
        booking.pickupTimeSlot = body.pickupTimeSlot;
        // Keep the display string customers see (emails, tracking) in sync
        booking.pickupTime = getPickupSlotLabel(body.pickupTimeSlot);
      }
    }

    // ── dropoffTimeSlot ──
    if (body.dropoffTimeSlot !== undefined) {
      if (!DROPOFF_SLOT_VALUES.includes(body.dropoffTimeSlot)) {
        return NextResponse.json(
          { error: `dropoffTimeSlot must be one of: ${DROPOFF_SLOT_VALUES.join(", ")}` },
          { status: 400 }
        );
      }
      if (booking.dropoffTimeSlot !== body.dropoffTimeSlot) {
        changes.push({
          field: "dropoffTimeSlot",
          label: "Return window",
          from: booking.dropoffTimeSlot ? getDropoffSlotLabel(booking.dropoffTimeSlot) : "not set",
          to: getDropoffSlotLabel(body.dropoffTimeSlot),
        });
        booking.dropoffTimeSlot = body.dropoffTimeSlot;
        // Keep the display string customers see (emails, tracking) in sync
        booking.dropoffTime = getDropoffSlotLabel(body.dropoffTimeSlot);
      }
    }

    // ── pickupAddress ──
    if (body.pickupAddress !== undefined) {
      if (typeof body.pickupAddress !== "string" || body.pickupAddress.trim().length === 0) {
        return NextResponse.json({ error: "pickupAddress must be a non-empty string" }, { status: 400 });
      }
      const newAddress = body.pickupAddress.trim().slice(0, 500);
      if (booking.pickupAddress !== newAddress) {
        changes.push({
          field: "pickupAddress",
          label: "Pickup address",
          from: booking.pickupAddress || "not set",
          to: newAddress,
        });
        booking.pickupAddress = newAddress;
      }
    }

    // ── garageName ──
    if (body.garageName !== undefined) {
      if (typeof body.garageName !== "string" || body.garageName.trim().length === 0) {
        return NextResponse.json({ error: "garageName must be a non-empty string" }, { status: 400 });
      }
      const newGarage = body.garageName.trim().slice(0, 200);
      if (booking.garageName !== newGarage) {
        changes.push({
          field: "garageName",
          label: "Service centre",
          from: booking.garageName || "not set",
          to: newGarage,
        });
        booking.garageName = newGarage;
      }
    }

    if (changes.length === 0) {
      return NextResponse.json({ error: "No changes to apply" }, { status: 400 });
    }

    const now = new Date();
    const changeSentences = changes.map((c) => `${c.label} changed from ${c.from} to ${c.to}`);

    booking.updates.push({
      stage: "booking_updated",
      timestamp: now,
      message: `Booking details updated: ${changeSentences.join("; ")}.`,
      updatedBy: "admin",
    });

    await booking.save();

    // SSE only — the stage didn't change, so suppress the stage email/SMS
    // (we send our own "booking updated" email below instead).
    notifyBookingUpdate(booking, { suppressCustomerNotifications: true });

    // ── Email the customer a summary of the changes (non-blocking) ──
    if (booking.userEmail) {
      const firstName = (booking.userName || "there").split(" ")[0];
      const details: BookingEmailDetails = {
        vehicleRegistration: booking.vehicleRegistration,
        serviceType: booking.serviceType,
        serviceDate: booking.serviceDate,
        pickupTime: booking.pickupTime,
        dropoffTime: booking.dropoffTime,
        pickupAddress: booking.pickupAddress,
        garageName: booking.garageName,
        trackingCode: booking.trackingCode,
      };

      const changesHtml = changes
        .map(
          (c) => `
        <li style="margin: 0 0 8px; color: #475569; font-size: 14px; line-height: 1.6;">
          <strong>${escapeHtml(c.label)}:</strong>
          <span style="color: #94a3b8; text-decoration: line-through;">${escapeHtml(c.from)}</span>
          &rarr; <strong style="color: #059669;">${escapeHtml(c.to)}</strong>
        </li>`
        )
        .join("");

      const textContent = [
        `Hi ${firstName},`,
        ``,
        `We've updated the details of your drivlet booking (${booking.trackingCode || booking.vehicleRegistration}). Here's what changed:`,
        ``,
        ...changes.map((c) => `  - ${c.label}: ${c.from} -> ${c.to}`),
        ``,
        bookingDetailsText(details),
        ``,
        emailPolicyFooterText(),
        ``,
        `Thanks,`,
        `The drivlet team`,
      ].join("\n");

      const htmlContent = [
        `<p style="color: #475569; font-size: 16px;">Hi ${escapeHtml(firstName)},</p>`,
        `<p style="color: #475569; font-size: 16px; line-height: 1.6;">We've updated the details of your drivlet booking <strong>${escapeHtml(booking.trackingCode || booking.vehicleRegistration)}</strong>. Here's what changed:</p>`,
        `<ul style="margin: 0 0 24px; padding-left: 20px;">${changesHtml}</ul>`,
        bookingDetailsHtml(details),
        emailPolicyFooterHtml(),
      ].join("");

      sendEmail({
        to: booking.userEmail,
        toName: booking.userName || booking.userEmail,
        subject: `Your booking has been updated — ${booking.vehicleRegistration}`,
        textContent,
        htmlContent,
      }).catch((err) => console.error("Failed to send booking updated email:", err));
    }

    return NextResponse.json({
      success: true,
      booking,
      changes: changes.map((c) => ({ field: c.field, label: c.label, from: c.from, to: c.to })),
      message: `Booking updated (${changes.length} field${changes.length === 1 ? "" : "s"}). The customer has been emailed.`,
    });
  } catch (error) {
    console.error("Failed to edit booking:", error);
    return NextResponse.json({ error: "Failed to edit booking" }, { status: 500 });
  }
}
