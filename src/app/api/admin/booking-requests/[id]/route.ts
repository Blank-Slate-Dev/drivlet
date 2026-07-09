// src/app/api/admin/booking-requests/[id]/route.ts
// PATCH — admin edits a booking request before payment is made.
// Editable while the request is pending_review, approved or payment_link_sent.
// If the quoted amount changes after a payment link was sent, the response
// flags amountChanged so the admin knows to resend the payment link (the /pay
// page and payment intent both read quotedAmount from the DB server-side).

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { requireValidOrigin } from "@/lib/validation";
import { connectDB } from "@/lib/mongodb";
import BookingRequest from "@/models/BookingRequest";
import { PICKUP_SLOT_VALUES, DROPOFF_SLOT_VALUES } from "@/config/timeSlots";

// Statuses in which the request can still be edited (payment not yet made)
const EDITABLE_STATUSES = ["pending_review", "approved", "payment_link_sent"];

const MIN_QUOTED_AMOUNT = 1000;   // $10.00
const MAX_QUOTED_AMOUNT = 100000; // $1,000.00

export async function PATCH(
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

    const bookingRequest = await BookingRequest.findById(id);
    if (!bookingRequest) {
      return NextResponse.json({ error: "Booking request not found" }, { status: 404 });
    }

    if (!EDITABLE_STATUSES.includes(bookingRequest.status)) {
      return NextResponse.json(
        { error: `Cannot edit a request with status "${bookingRequest.status}"` },
        { status: 400 }
      );
    }

    let changedAnything = false;
    let amountChanged = false;

    // ── serviceDate ──
    if (body.serviceDate !== undefined) {
      if (typeof body.serviceDate !== "string") {
        return NextResponse.json({ error: "serviceDate must be an ISO date string" }, { status: 400 });
      }
      const newDate = new Date(body.serviceDate);
      if (isNaN(newDate.getTime())) {
        return NextResponse.json({ error: "serviceDate is not a valid date" }, { status: 400 });
      }
      bookingRequest.serviceDate = newDate;
      changedAnything = true;
    }

    // ── pickupTimeSlot ──
    if (body.pickupTimeSlot !== undefined) {
      if (!PICKUP_SLOT_VALUES.includes(body.pickupTimeSlot)) {
        return NextResponse.json(
          { error: `pickupTimeSlot must be one of: ${PICKUP_SLOT_VALUES.join(", ")}` },
          { status: 400 }
        );
      }
      bookingRequest.pickupTimeSlot = body.pickupTimeSlot;
      changedAnything = true;
    }

    // ── dropoffTimeSlot ──
    if (body.dropoffTimeSlot !== undefined) {
      if (!DROPOFF_SLOT_VALUES.includes(body.dropoffTimeSlot)) {
        return NextResponse.json(
          { error: `dropoffTimeSlot must be one of: ${DROPOFF_SLOT_VALUES.join(", ")}` },
          { status: 400 }
        );
      }
      bookingRequest.dropoffTimeSlot = body.dropoffTimeSlot;
      changedAnything = true;
    }

    // ── pickupAddress ──
    if (body.pickupAddress !== undefined) {
      if (typeof body.pickupAddress !== "string" || body.pickupAddress.trim().length === 0) {
        return NextResponse.json({ error: "pickupAddress must be a non-empty string" }, { status: 400 });
      }
      bookingRequest.pickupAddress = body.pickupAddress.trim().slice(0, 500);
      changedAnything = true;
    }

    // ── garageName ──
    if (body.garageName !== undefined) {
      if (typeof body.garageName !== "string") {
        return NextResponse.json({ error: "garageName must be a string" }, { status: 400 });
      }
      const trimmed = body.garageName.trim().slice(0, 200);
      bookingRequest.garageName = trimmed.length > 0 ? trimmed : null;
      changedAnything = true;
    }

    // ── adminNotes ──
    if (body.adminNotes !== undefined) {
      if (typeof body.adminNotes !== "string") {
        return NextResponse.json({ error: "adminNotes must be a string" }, { status: 400 });
      }
      const trimmed = body.adminNotes.trim().slice(0, 2000);
      bookingRequest.adminNotes = trimmed.length > 0 ? trimmed : null;
      changedAnything = true;
    }

    // ── quotedAmount ──
    if (body.quotedAmount !== undefined) {
      if (
        typeof body.quotedAmount !== "number" ||
        !Number.isInteger(body.quotedAmount) ||
        body.quotedAmount < MIN_QUOTED_AMOUNT ||
        body.quotedAmount > MAX_QUOTED_AMOUNT
      ) {
        return NextResponse.json(
          {
            error: `quotedAmount must be an integer amount in cents between ${MIN_QUOTED_AMOUNT} ($${(MIN_QUOTED_AMOUNT / 100).toFixed(2)}) and ${MAX_QUOTED_AMOUNT} ($${(MAX_QUOTED_AMOUNT / 100).toFixed(2)})`,
          },
          { status: 400 }
        );
      }
      if (body.quotedAmount !== bookingRequest.quotedAmount) {
        // Admin should resend the payment link if one has already gone out —
        // the /pay page and payment intent recompute from quotedAmount server-side.
        if (bookingRequest.status === "payment_link_sent") {
          amountChanged = true;
        }
        bookingRequest.quotedAmount = body.quotedAmount;
      }
      changedAnything = true;
    }

    if (!changedAnything) {
      return NextResponse.json({ error: "No editable fields provided" }, { status: 400 });
    }

    await bookingRequest.save();

    return NextResponse.json({
      success: true,
      request: bookingRequest,
      ...(amountChanged ? { amountChanged: true } : {}),
    });
  } catch (error) {
    console.error("Failed to edit booking request:", error);
    return NextResponse.json({ error: "Failed to edit booking request" }, { status: 500 });
  }
}
