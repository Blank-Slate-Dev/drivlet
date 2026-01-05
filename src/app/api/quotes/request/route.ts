// src/app/api/quotes/request/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import QuoteRequest, { ServiceCategory, UrgencyLevel } from "@/models/QuoteRequest";
import mongoose from "mongoose";

// POST /api/quotes/request - Create new quote request
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const body = await request.json();

    // Extract fields from request body
    const {
      customerEmail,
      customerName,
      customerPhone,
      vehicleRegistration,
      vehicleMake,
      vehicleModel,
      vehicleYear,
      serviceCategory,
      serviceDescription,
      urgency = "flexible",
      preferredDate,
      locationAddress,
      locationPlaceId,
      locationCoordinates,
      photos = [],
    } = body;

    // Validate required fields
    const errors: Record<string, string> = {};

    if (!customerEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
      errors.customerEmail = "Valid email address is required";
    }
    if (!customerName || customerName.trim().length < 2) {
      errors.customerName = "Name is required (minimum 2 characters)";
    }
    if (!customerPhone || customerPhone.trim().length < 8) {
      errors.customerPhone = "Valid phone number is required";
    }
    if (!vehicleRegistration || vehicleRegistration.trim().length < 2) {
      errors.vehicleRegistration = "Vehicle registration is required";
    }
    if (!serviceCategory || !["mechanical", "electrical", "bodywork", "tyres", "servicing", "other"].includes(serviceCategory)) {
      errors.serviceCategory = "Valid service category is required";
    }
    if (!serviceDescription || serviceDescription.trim().length < 10) {
      errors.serviceDescription = "Service description is required (minimum 10 characters)";
    }
    if (serviceDescription && serviceDescription.length > 2000) {
      errors.serviceDescription = "Service description cannot exceed 2000 characters";
    }
    if (!locationAddress || locationAddress.trim().length < 5) {
      errors.locationAddress = "Service location address is required";
    }

    if (Object.keys(errors).length > 0) {
      return NextResponse.json(
        { error: "Validation failed", errors },
        { status: 400 }
      );
    }

    await connectDB();

    // Determine if guest or authenticated user
    const isGuest = !session?.user?.id;
    let customerId: mongoose.Types.ObjectId | undefined;

    if (!isGuest) {
      // Verify user role
      if (session.user.role !== "user" && session.user.role !== "admin") {
        return NextResponse.json(
          { error: "Only customers can create quote requests" },
          { status: 403 }
        );
      }
      customerId = new mongoose.Types.ObjectId(session.user.id);
    }

    // Set expiration date (7 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Create quote request
    const quoteRequest = await QuoteRequest.create({
      customerId,
      customerEmail: customerEmail.toLowerCase().trim(),
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      isGuest,
      vehicleRegistration: vehicleRegistration.toUpperCase().trim(),
      vehicleMake: vehicleMake?.trim(),
      vehicleModel: vehicleModel?.trim(),
      vehicleYear: vehicleYear ? parseInt(vehicleYear, 10) : undefined,
      serviceCategory: serviceCategory as ServiceCategory,
      serviceDescription: serviceDescription.trim(),
      urgency: urgency as UrgencyLevel,
      preferredDate: preferredDate ? new Date(preferredDate) : undefined,
      locationAddress: locationAddress.trim(),
      locationPlaceId: locationPlaceId?.trim(),
      locationCoordinates: locationCoordinates || undefined,
      photos,
      expiresAt,
    });

    return NextResponse.json({
      success: true,
      quoteRequestId: quoteRequest._id.toString(),
      message: "Quote request submitted successfully",
    });
  } catch (error) {
    console.error("Error creating quote request:", error);
    return NextResponse.json(
      { error: "Failed to create quote request" },
      { status: 500 }
    );
  }
}

// GET /api/quotes/request - Fetch user's quote requests
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Only customers and admins can view quote requests
    if (session.user.role !== "user" && session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    // Build query - match by customerId OR email (to catch guest-to-user conversions)
    const query: Record<string, unknown> = {
      $or: [
        { customerId: new mongoose.Types.ObjectId(session.user.id) },
        { customerEmail: session.user.email?.toLowerCase() },
      ],
    };

    // Filter by status if provided
    if (status && ["open", "quoted", "accepted", "expired", "cancelled"].includes(status)) {
      query.status = status;
    }

    // Get total count for pagination
    const total = await QuoteRequest.countDocuments(query);

    // Fetch quote requests
    const quoteRequests = await QuoteRequest.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return NextResponse.json({
      quoteRequests,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching quote requests:", error);
    return NextResponse.json(
      { error: "Failed to fetch quote requests" },
      { status: 500 }
    );
  }
}
