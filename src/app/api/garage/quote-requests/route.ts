// src/app/api/garage/quote-requests/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import QuoteRequest from "@/models/QuoteRequest";
import Quote from "@/models/Quote";
import Garage from "@/models/Garage";
import User from "@/models/User";
import mongoose from "mongoose";

// GET /api/garage/quote-requests - Fetch available quote requests for garages
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Only garage users can access this
    if (session.user.role !== "garage") {
      return NextResponse.json(
        { error: "Only garage partners can access quote requests" },
        { status: 403 }
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
        { error: "Garage must be approved to view quote requests" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const category = searchParams.get("category");
    const urgency = searchParams.get("urgency");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    // Build query for active quote requests
    const query: Record<string, unknown> = {
      status: { $in: ["open", "quoted"] },
      expiresAt: { $gt: new Date() },
    };

    // Filter by status
    if (status && ["open", "quoted"].includes(status)) {
      query.status = status;
    }

    // Filter by category
    if (category && ["mechanical", "electrical", "bodywork", "tyres", "servicing", "other"].includes(category)) {
      query.serviceCategory = category;
    }

    // Filter by urgency
    if (urgency && ["immediate", "this_week", "flexible"].includes(urgency)) {
      query.urgency = urgency;
    }

    // Search by registration or location
    if (search) {
      const searchUpper = search.toUpperCase().trim();
      query.$or = [
        { vehicleRegistration: { $regex: searchUpper, $options: "i" } },
        { locationAddress: { $regex: search, $options: "i" } },
      ];
    }

    // Get total count
    const total = await QuoteRequest.countDocuments(query);

    // Fetch quote requests
    const quoteRequests = await QuoteRequest.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    // Get garage's existing quotes for these requests
    const requestIds = quoteRequests.map((qr) => qr._id);
    const existingQuotes = await Quote.find({
      quoteRequestId: { $in: requestIds },
      garageId: garage._id,
    }).lean();

    // Create a map of existing quotes
    const quotesMap = new Map(
      existingQuotes.map((q) => [q.quoteRequestId.toString(), q])
    );

    // Enhance quote requests with garage's quote status
    const enhancedRequests = quoteRequests.map((qr) => {
      const myQuote = quotesMap.get(qr._id.toString());
      return {
        ...qr,
        hasSubmittedQuote: !!myQuote,
        myQuote: myQuote || null,
      };
    });

    return NextResponse.json({
      quoteRequests: enhancedRequests,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching quote requests for garage:", error);
    return NextResponse.json(
      { error: "Failed to fetch quote requests" },
      { status: 500 }
    );
  }
}
