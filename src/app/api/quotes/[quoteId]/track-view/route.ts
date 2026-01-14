// src/app/api/quotes/[quoteId]/track-view/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Quote from "@/models/Quote";
import QuoteRequest from "@/models/QuoteRequest";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

// POST /api/quotes/[quoteId]/track-view - Track when customer first views a quote
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ quoteId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { quoteId } = await params;

    if (!quoteId || !mongoose.Types.ObjectId.isValid(quoteId)) {
      return NextResponse.json(
        { error: "Valid quote ID is required" },
        { status: 400 }
      );
    }

    await connectDB();

    // Find the quote
    const quote = await Quote.findById(quoteId);

    if (!quote) {
      return NextResponse.json(
        { error: "Quote not found" },
        { status: 404 }
      );
    }

    // Verify the requesting user owns the quote request
    const quoteRequest = await QuoteRequest.findById(quote.quoteRequestId);

    if (!quoteRequest) {
      return NextResponse.json(
        { error: "Quote request not found" },
        { status: 404 }
      );
    }

    // Check if the user is the owner of the quote request
    const isOwner =
      quoteRequest.customerId?.toString() === session.user.id ||
      quoteRequest.customerEmail === session.user.email?.toLowerCase();

    if (!isOwner) {
      return NextResponse.json(
        { error: "You don't have permission to view this quote" },
        { status: 403 }
      );
    }

    // If already viewed or expired, just return current state
    if (quote.status === "expired" || quote.status === "cancelled") {
      return NextResponse.json({
        success: true,
        quote: {
          _id: quote._id,
          status: quote.status,
          firstViewedAt: quote.firstViewedAt,
          expiresAt: quote.expiresAt,
        },
        message: "Quote is no longer active",
      });
    }

    // Check if this is the first view
    if (!quote.firstViewedAt) {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 48 * 60 * 60 * 1000); // 48 hours from now

      // Update the quote with view tracking
      quote.firstViewedAt = now;
      quote.expiresAt = expiresAt;
      quote.status = "viewed";
      await quote.save();

      return NextResponse.json({
        success: true,
        quote: {
          _id: quote._id,
          status: quote.status,
          firstViewedAt: quote.firstViewedAt,
          expiresAt: quote.expiresAt,
        },
        message: "View tracked successfully",
        isFirstView: true,
      });
    }

    // Already viewed - return current expiry info
    return NextResponse.json({
      success: true,
      quote: {
        _id: quote._id,
        status: quote.status,
        firstViewedAt: quote.firstViewedAt,
        expiresAt: quote.expiresAt,
      },
      isFirstView: false,
    });
  } catch (error) {
    console.error("Error tracking quote view:", error);
    return NextResponse.json(
      { error: "Failed to track quote view" },
      { status: 500 }
    );
  }
}
