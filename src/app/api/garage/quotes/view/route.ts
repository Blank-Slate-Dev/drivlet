// src/app/api/garage/quotes/view/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import QuoteRequest from "@/models/QuoteRequest";
import Quote from "@/models/Quote";
import Garage from "@/models/Garage";
import User from "@/models/User";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

// GET /api/garage/quotes/view - Get a garage's submitted quote for a quote request
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Only garage users can view their quotes
    if (session.user.role !== "garage") {
      return NextResponse.json(
        { error: "Only garage partners can view quotes" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const quoteRequestId = searchParams.get("quoteRequestId");

    if (!quoteRequestId || !mongoose.Types.ObjectId.isValid(quoteRequestId)) {
      return NextResponse.json(
        { error: "Valid quote request ID is required" },
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

    // Fetch the quote request
    const quoteRequest = await QuoteRequest.findById(quoteRequestId).lean();
    if (!quoteRequest) {
      return NextResponse.json(
        { error: "Quote request not found" },
        { status: 404 }
      );
    }

    // Fetch the garage's quote for this request
    const quote = await Quote.findOne({
      quoteRequestId: new mongoose.Types.ObjectId(quoteRequestId),
      garageId: garage._id,
    }).lean();

    if (!quote) {
      return NextResponse.json(
        { error: "You haven't submitted a quote for this request" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      quoteRequest,
      quote,
    });
  } catch (error) {
    console.error("Error fetching quote:", error);
    return NextResponse.json(
      { error: "Failed to fetch quote" },
      { status: 500 }
    );
  }
}
