// src/app/api/garage/location-change-request/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import Garage from "@/models/Garage";
import LocationChangeRequest from "@/models/LocationChangeRequest";
import { requireValidOrigin } from "@/lib/validation";

// GET - Fetch location change requests for current garage user
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "garage") {
      return NextResponse.json(
        { error: "Only garage users can access location requests" },
        { status: 403 }
      );
    }

    await connectDB();

    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // REQUIRE garage profile to exist
    const garage = await Garage.findOne({ userId: user._id });
    if (!garage) {
      return NextResponse.json({
        error: "Garage profile not found. Please complete your garage profile setup first.",
        requiresOnboarding: true,
      }, { status: 404 });
    }

    // Fetch all location change requests for this garage
    const requests = await LocationChangeRequest.find({ garageId: garage._id })
      .sort({ submittedAt: -1 })
      .lean();

    // Check if there's a pending request
    const pendingRequest = requests.find((r) => r.status === "pending");

    // Get current location from Garage profile
    const currentLocation = garage.linkedGaragePlaceId
      ? {
          id: garage.linkedGaragePlaceId,
          name: garage.linkedGarageName,
          address: garage.linkedGarageAddress,
          coordinates: garage.linkedGarageCoordinates,
        }
      : {
          id: null,
          name: null,
          address: null,
          coordinates: null,
        };

    return NextResponse.json({
      requests,
      hasPendingRequest: !!pendingRequest,
      currentLocation,
      hasGarageProfile: true,
      garageBusinessName: garage.businessName,
    });
  } catch (error) {
    console.error("Error fetching location change requests:", error);
    return NextResponse.json(
      { error: "Failed to fetch location change requests" },
      { status: 500 }
    );
  }
}

// POST - Submit a new location change request
export async function POST(request: NextRequest) {
  // CSRF protection
  const originCheck = requireValidOrigin(request);
  if (!originCheck.valid) {
    return NextResponse.json({ error: originCheck.error }, { status: 403 });
  }

  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "garage") {
      return NextResponse.json({ error: "Not a garage user" }, { status: 403 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    const {
      requestedLocationId,
      requestedLocationName,
      requestedLocationAddress,
      requestedLocationCoordinates,
      reason,
    } = body;

    // Validate required fields
    if (!requestedLocationId || !requestedLocationName || !requestedLocationAddress) {
      return NextResponse.json(
        { error: "Location details are required" },
        { status: 400 }
      );
    }

    if (!reason || typeof reason !== "string") {
      return NextResponse.json(
        { error: "Reason is required" },
        { status: 400 }
      );
    }

    const trimmedReason = reason.trim();
    if (trimmedReason.length < 20) {
      return NextResponse.json(
        { error: "Reason must be at least 20 characters" },
        { status: 400 }
      );
    }

    if (trimmedReason.length > 1000) {
      return NextResponse.json(
        { error: "Reason cannot exceed 1000 characters" },
        { status: 400 }
      );
    }

    await connectDB();

    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // REQUIRE garage profile to exist
    const garage = await Garage.findOne({ userId: user._id });
    if (!garage) {
      return NextResponse.json(
        {
          error: "Garage profile not found. Please complete your garage profile setup first.",
          requiresOnboarding: true,
        },
        { status: 404 }
      );
    }

    // Check if requesting the same location
    if (garage.linkedGaragePlaceId && garage.linkedGaragePlaceId === requestedLocationId) {
      return NextResponse.json(
        { error: "Requested location is the same as current location" },
        { status: 400 }
      );
    }

    // Check if there's already a pending request for this garage
    const existingPendingRequest = await LocationChangeRequest.findOne({
      garageId: garage._id,
      status: "pending",
    });

    if (existingPendingRequest) {
      return NextResponse.json(
        { error: "You already have a pending location change request" },
        { status: 400 }
      );
    }

    // Create the location change request
    const requestData: Record<string, unknown> = {
      garageId: garage._id,
      garageUserId: user._id,
      requestedLocationId: requestedLocationId.trim(),
      requestedLocationName: requestedLocationName.trim(),
      requestedLocationAddress: requestedLocationAddress.trim(),
      requestedLocationCoordinates: requestedLocationCoordinates || undefined,
      reason: trimmedReason,
      status: "pending",
      submittedAt: new Date(),
    };

    // Include current location if one is assigned on Garage (optional - can be null for first-time)
    if (garage.linkedGaragePlaceId) {
      requestData.currentLocationId = garage.linkedGaragePlaceId;
      requestData.currentLocationName = garage.linkedGarageName || "";
      requestData.currentLocationAddress = garage.linkedGarageAddress || "";
    }
    // Note: If no current location, these fields stay undefined (optional in schema)

    const newRequest = await LocationChangeRequest.create(requestData);

    return NextResponse.json({
      success: true,
      requestId: newRequest._id.toString(),
      message: "Location change request submitted successfully. An admin will review your request shortly.",
    });
  } catch (error) {
    console.error("Error submitting location change request:", error);

    if (error instanceof Error && error.name === "ValidationError") {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Failed to submit location change request" },
      { status: 500 }
    );
  }
}
