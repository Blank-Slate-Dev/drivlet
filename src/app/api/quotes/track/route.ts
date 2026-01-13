// src/app/api/quotes/track/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import QuoteRequest from "@/models/QuoteRequest";
import Quote from "@/models/Quote";
import { isValidQuoteTrackingCodeFormat } from "@/lib/trackingCode";

/**
 * GET /api/quotes/track - Track a quote request (no auth required)
 * 
 * Query params:
 * - code: 8-character tracking code
 * - email: customer email address
 * 
 * Returns quote request details and any quotes received
 * 
 * TODO: Future enhancement - Add email notification when quotes are received
 * This endpoint could be linked from emails sent to customers, allowing them
 * to click through directly to view their quotes without needing to remember
 * their tracking code.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code")?.toUpperCase().trim();
    const email = searchParams.get("email")?.toLowerCase().trim();

    // Validate required fields
    if (!code) {
      return NextResponse.json(
        { error: "Tracking code is required" },
        { status: 400 }
      );
    }

    if (!email) {
      return NextResponse.json(
        { error: "Email address is required" },
        { status: 400 }
      );
    }

    // Validate tracking code format
    if (!isValidQuoteTrackingCodeFormat(code)) {
      return NextResponse.json(
        { error: "Invalid tracking code format. Please check and try again." },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email address format" },
        { status: 400 }
      );
    }

    await connectDB();

    // Find quote request by tracking code and email
    const quoteRequest = await QuoteRequest.findOne({
      trackingCode: code,
      customerEmail: email,
    }).lean();

    if (!quoteRequest) {
      return NextResponse.json(
        { error: "No quote request found with this tracking code and email combination" },
        { status: 404 }
      );
    }

    // Check if expired or cancelled - still show but with appropriate status
    const isExpiredOrCancelled = 
      quoteRequest.status === "expired" || 
      quoteRequest.status === "cancelled";

    // Fetch all quotes for this request
    const quotes = await Quote.find({
      quoteRequestId: quoteRequest._id,
    })
      .sort({ quotedAmount: 1 }) // Sort by price ascending
      .lean();

    // Return quote request with quotes
    return NextResponse.json({
      quoteRequest: {
        _id: quoteRequest._id,
        trackingCode: quoteRequest.trackingCode,
        vehicleRegistration: quoteRequest.vehicleRegistration,
        vehicleMake: quoteRequest.vehicleMake,
        vehicleModel: quoteRequest.vehicleModel,
        vehicleYear: quoteRequest.vehicleYear,
        serviceCategory: quoteRequest.serviceCategory,
        serviceDescription: quoteRequest.serviceDescription,
        urgency: quoteRequest.urgency,
        preferredDate: quoteRequest.preferredDate,
        locationAddress: quoteRequest.locationAddress,
        status: quoteRequest.status,
        quotesReceived: quoteRequest.quotesReceived,
        acceptedQuoteId: quoteRequest.acceptedQuoteId,
        expiresAt: quoteRequest.expiresAt,
        createdAt: quoteRequest.createdAt,
        isExpiredOrCancelled,
      },
      quotes: quotes.map((quote) => ({
        _id: quote._id,
        garageName: quote.garageName,
        garageAddress: quote.garageAddress,
        quotedAmount: quote.quotedAmount,
        estimatedDuration: quote.estimatedDuration,
        includedServices: quote.includedServices,
        additionalNotes: quote.additionalNotes,
        warrantyOffered: quote.warrantyOffered,
        availableFrom: quote.availableFrom,
        validUntil: quote.validUntil,
        status: quote.status,
        createdAt: quote.createdAt,
      })),
    });
  } catch (error) {
    console.error("Error tracking quote request:", error);
    return NextResponse.json(
      { error: "Failed to track quote request" },
      { status: 500 }
    );
  }
}
