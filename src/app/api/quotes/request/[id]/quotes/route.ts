// src/app/api/quotes/request/[id]/quotes/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import QuoteRequest from "@/models/QuoteRequest";
import Quote from "@/models/Quote";
import mongoose from "mongoose";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/quotes/request/[id]/quotes - Fetch quotes for a specific request
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id: quoteRequestId } = await context.params;

    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(quoteRequestId)) {
      return NextResponse.json(
        { error: "Invalid quote request ID" },
        { status: 400 }
      );
    }

    await connectDB();

    // Fetch quote request
    const quoteRequest = await QuoteRequest.findById(quoteRequestId).lean();

    if (!quoteRequest) {
      return NextResponse.json(
        { error: "Quote request not found" },
        { status: 404 }
      );
    }

    // Verify authorization: user must own the request or be admin
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

    // Get sort parameter
    const { searchParams } = new URL(request.url);
    const sort = searchParams.get("sort") || "price_asc";

    // Build sort object
    let sortObj: Record<string, 1 | -1> = { quotedAmount: 1 };
    switch (sort) {
      case "price_desc":
        sortObj = { quotedAmount: -1 };
        break;
      case "recent":
        sortObj = { createdAt: -1 };
        break;
      case "price_asc":
      default:
        sortObj = { quotedAmount: 1 };
    }

    // Fetch all quotes for this request
    const quotes = await Quote.find({
      quoteRequestId: new mongoose.Types.ObjectId(quoteRequestId),
    })
      .sort(sortObj)
      .lean();

    return NextResponse.json({
      quoteRequest,
      quotes,
    });
  } catch (error) {
    console.error("Error fetching quotes:", error);
    return NextResponse.json(
      { error: "Failed to fetch quotes" },
      { status: 500 }
    );
  }
}
