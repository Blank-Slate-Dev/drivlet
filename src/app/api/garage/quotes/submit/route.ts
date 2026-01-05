// src/app/api/garage/quotes/submit/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import QuoteRequest from "@/models/QuoteRequest";
import Quote from "@/models/Quote";
import Garage from "@/models/Garage";
import User from "@/models/User";
import mongoose from "mongoose";

// POST /api/garage/quotes/submit - Submit a quote for a quote request
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Only garage users can submit quotes
    if (session.user.role !== "garage") {
      return NextResponse.json(
        { error: "Only garage partners can submit quotes" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      quoteRequestId,
      quotedAmount,
      estimatedDuration,
      includedServices,
      additionalNotes,
      warrantyOffered,
      availableFrom,
    } = body;

    // Validate required fields
    const errors: Record<string, string> = {};

    if (!quoteRequestId || !mongoose.Types.ObjectId.isValid(quoteRequestId)) {
      errors.quoteRequestId = "Valid quote request ID is required";
    }
    if (!quotedAmount || typeof quotedAmount !== "number" || quotedAmount <= 0) {
      errors.quotedAmount = "Quoted amount must be a positive number";
    }
    if (!estimatedDuration || estimatedDuration.trim().length < 2) {
      errors.estimatedDuration = "Estimated duration is required";
    }
    if (!includedServices || !Array.isArray(includedServices) || includedServices.length === 0) {
      errors.includedServices = "At least one included service is required";
    }
    if (!availableFrom) {
      errors.availableFrom = "Available from date is required";
    }

    if (Object.keys(errors).length > 0) {
      return NextResponse.json(
        { error: "Validation failed", errors },
        { status: 400 }
      );
    }

    await connectDB();

    // Get garage profile
    const user = await User.findById(session.user.id);
    if (!user?.garageProfile) {
      return NextResponse.json(
        { error: "Garage profile not found" },
        { status: 404 }
      );
    }

    const garage = await Garage.findById(user.garageProfile);
    if (!garage) {
      return NextResponse.json(
        { error: "Garage not found" },
        { status: 404 }
      );
    }

    // Verify garage is approved
    if (garage.status !== "approved") {
      return NextResponse.json(
        { error: "Garage must be approved to submit quotes" },
        { status: 403 }
      );
    }

    // Fetch the quote request
    const quoteRequest = await QuoteRequest.findById(quoteRequestId);
    if (!quoteRequest) {
      return NextResponse.json(
        { error: "Quote request not found" },
        { status: 404 }
      );
    }

    // Verify quote request is still open or quoted
    if (!["open", "quoted"].includes(quoteRequest.status)) {
      return NextResponse.json(
        { error: "This quote request is no longer accepting quotes" },
        { status: 400 }
      );
    }

    // Verify quote request has not expired
    if (quoteRequest.expiresAt < new Date()) {
      return NextResponse.json(
        { error: "This quote request has expired" },
        { status: 400 }
      );
    }

    // Check for existing quote from this garage
    const existingQuote = await Quote.findOne({
      quoteRequestId: new mongoose.Types.ObjectId(quoteRequestId),
      garageId: garage._id,
    });

    if (existingQuote) {
      return NextResponse.json(
        { error: "You have already submitted a quote for this request" },
        { status: 409 }
      );
    }

    // Set validUntil to 14 days from now
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 14);

    // Build garage address string
    const garageAddress = [
      garage.businessAddress.street,
      garage.businessAddress.suburb,
      garage.businessAddress.state,
      garage.businessAddress.postcode,
    ]
      .filter(Boolean)
      .join(", ");

    // Create the quote
    const quote = await Quote.create({
      quoteRequestId: new mongoose.Types.ObjectId(quoteRequestId),
      garageId: garage._id,
      garageName: garage.businessName || garage.tradingName,
      garageAddress,
      quotedAmount,
      estimatedDuration: estimatedDuration.trim(),
      includedServices: includedServices.map((s: string) => s.trim()).filter(Boolean),
      additionalNotes: additionalNotes?.trim() || undefined,
      warrantyOffered: warrantyOffered?.trim() || undefined,
      availableFrom: new Date(availableFrom),
      validUntil,
    });

    // Update quote request
    await QuoteRequest.findByIdAndUpdate(quoteRequestId, {
      $inc: { quotesReceived: 1 },
      status: "quoted",
    });

    return NextResponse.json({
      success: true,
      message: "Quote submitted successfully",
      quote: {
        _id: quote._id,
        quotedAmount: quote.quotedAmount,
        estimatedDuration: quote.estimatedDuration,
        validUntil: quote.validUntil,
      },
    });
  } catch (error) {
    // Handle duplicate key error
    if ((error as { code?: number }).code === 11000) {
      return NextResponse.json(
        { error: "You have already submitted a quote for this request" },
        { status: 409 }
      );
    }

    console.error("Error submitting quote:", error);
    return NextResponse.json(
      { error: "Failed to submit quote" },
      { status: 500 }
    );
  }
}
