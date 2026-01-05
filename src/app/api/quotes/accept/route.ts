// src/app/api/quotes/accept/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import QuoteRequest from "@/models/QuoteRequest";
import Quote from "@/models/Quote";
import mongoose from "mongoose";

// POST /api/quotes/accept - Accept a quote
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Only customers and admins can accept quotes
    if (session.user.role !== "user" && session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Only customers can accept quotes" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { quoteId } = body;

    if (!quoteId || !mongoose.Types.ObjectId.isValid(quoteId)) {
      return NextResponse.json(
        { error: "Valid quote ID is required" },
        { status: 400 }
      );
    }

    await connectDB();

    // Fetch the quote
    const quote = await Quote.findById(quoteId);

    if (!quote) {
      return NextResponse.json(
        { error: "Quote not found" },
        { status: 404 }
      );
    }

    // Fetch the quote request
    const quoteRequest = await QuoteRequest.findById(quote.quoteRequestId);

    if (!quoteRequest) {
      return NextResponse.json(
        { error: "Quote request not found" },
        { status: 404 }
      );
    }

    // Verify authorization
    const isOwner =
      quoteRequest.customerId?.toString() === session.user.id ||
      quoteRequest.customerEmail === session.user.email?.toLowerCase();
    const isAdmin = session.user.role === "admin";

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }

    // Verify request status allows acceptance
    if (quoteRequest.status === "accepted") {
      return NextResponse.json(
        { error: "A quote has already been accepted for this request" },
        { status: 400 }
      );
    }

    if (quoteRequest.status === "expired" || quoteRequest.status === "cancelled") {
      return NextResponse.json(
        { error: "This quote request is no longer active" },
        { status: 400 }
      );
    }

    // Verify quote is pending
    if (quote.status !== "pending") {
      return NextResponse.json(
        { error: `This quote is ${quote.status} and cannot be accepted` },
        { status: 400 }
      );
    }

    // Verify quote has not expired
    if (quote.validUntil < new Date()) {
      return NextResponse.json(
        { error: "This quote has expired" },
        { status: 400 }
      );
    }

    // Use a MongoDB transaction for atomicity
    const mongoSession = await mongoose.startSession();
    mongoSession.startTransaction();

    try {
      const now = new Date();

      // Update the accepted quote
      await Quote.findByIdAndUpdate(
        quoteId,
        {
          status: "accepted",
          acceptedAt: now,
        },
        { session: mongoSession }
      );

      // Update the quote request
      await QuoteRequest.findByIdAndUpdate(
        quoteRequest._id,
        {
          status: "accepted",
          acceptedQuoteId: new mongoose.Types.ObjectId(quoteId),
        },
        { session: mongoSession }
      );

      // Decline all other pending quotes for the same request
      await Quote.updateMany(
        {
          quoteRequestId: quoteRequest._id,
          _id: { $ne: new mongoose.Types.ObjectId(quoteId) },
          status: "pending",
        },
        {
          status: "declined",
          declinedAt: now,
          declineReason: "Customer accepted another quote",
        },
        { session: mongoSession }
      );

      await mongoSession.commitTransaction();
      await mongoSession.endSession();

      return NextResponse.json({
        success: true,
        message: "Quote accepted successfully",
        quote: {
          _id: quote._id,
          garageName: quote.garageName,
          quotedAmount: quote.quotedAmount,
        },
      });
    } catch (transactionError) {
      await mongoSession.abortTransaction();
      await mongoSession.endSession();
      throw transactionError;
    }
  } catch (error) {
    console.error("Error accepting quote:", error);
    return NextResponse.json(
      { error: "Failed to accept quote" },
      { status: 500 }
    );
  }
}
