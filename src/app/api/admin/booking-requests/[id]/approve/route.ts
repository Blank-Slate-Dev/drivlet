import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { requireValidOrigin } from "@/lib/validation";
import { connectDB } from "@/lib/mongodb";
import BookingRequest from "@/models/BookingRequest";
import crypto from "crypto";

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
    await connectDB();

    const bookingRequest = await BookingRequest.findById(id);
    if (!bookingRequest) {
      return NextResponse.json({ error: "Booking request not found" }, { status: 404 });
    }

    if (bookingRequest.status !== "pending_review") {
      return NextResponse.json(
        { error: `Cannot approve a request with status "${bookingRequest.status}"` },
        { status: 400 }
      );
    }

    const paymentToken = crypto.randomBytes(32).toString("hex");
    const now = new Date();

    bookingRequest.status = "approved";
    bookingRequest.paymentToken = paymentToken;
    bookingRequest.paymentTokenCreatedAt = now;
    bookingRequest.approvedAt = now;
    bookingRequest.approvedBy = adminCheck.session.user?.email || "admin";
    bookingRequest.reviewedBy = null;
    bookingRequest.reviewedAt = now;

    await bookingRequest.save();

    return NextResponse.json({
      success: true,
      request: bookingRequest,
    });
  } catch (error) {
    console.error("Failed to approve booking request:", error);
    return NextResponse.json({ error: "Failed to approve booking request" }, { status: 500 });
  }
}
