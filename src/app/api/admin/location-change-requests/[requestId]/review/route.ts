// src/app/api/admin/location-change-requests/[requestId]/review/route.ts
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import LocationChangeRequest from "@/models/LocationChangeRequest";
import Garage from "@/models/Garage";
import { requireAdmin } from "@/lib/admin";

// POST /api/admin/location-change-requests/[requestId]/review
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  const adminCheck = await requireAdmin();
  if (!adminCheck.authorized) {
    return adminCheck.response;
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

  const { action, adminNotes } = body;

  if (!action || !["approve", "reject"].includes(action)) {
    return NextResponse.json(
      { error: "Valid action (approve/reject) is required" },
      { status: 400 }
    );
  }

  try {
    await connectDB();

    const { requestId } = await params;

    const locationRequest = await LocationChangeRequest.findById(requestId);
    if (!locationRequest) {
      return NextResponse.json(
        { error: "Location change request not found" },
        { status: 404 }
      );
    }

    if (locationRequest.status !== "pending") {
      return NextResponse.json(
        { error: `This request has already been ${locationRequest.status}` },
        { status: 400 }
      );
    }

    const now = new Date();

    if (action === "approve") {
      // Get the garage profile (required for all location requests)
      const garage = await Garage.findById(locationRequest.garageId);
      if (!garage) {
        return NextResponse.json(
          { error: "Garage profile not found. Cannot approve request." },
          { status: 404 }
        );
      }

      // Update garage location
      garage.linkedGaragePlaceId = locationRequest.requestedLocationId;
      garage.linkedGarageName = locationRequest.requestedLocationName;
      garage.linkedGarageAddress = locationRequest.requestedLocationAddress;
      if (locationRequest.requestedLocationCoordinates) {
        garage.linkedGarageCoordinates = locationRequest.requestedLocationCoordinates;
      }
      await garage.save();

      // Update request status
      locationRequest.status = "approved";
      locationRequest.reviewedAt = now;
      locationRequest.reviewedBy = new mongoose.Types.ObjectId(adminCheck.session.user.id);
      if (adminNotes) {
        locationRequest.adminNotes = adminNotes.trim();
      }
      await locationRequest.save();

      return NextResponse.json({
        success: true,
        message: "Location change request approved and garage updated successfully",
        request: {
          _id: locationRequest._id.toString(),
          status: locationRequest.status,
          reviewedAt: locationRequest.reviewedAt,
        },
        garage: {
          _id: garage._id.toString(),
          linkedGarageName: garage.linkedGarageName,
          linkedGarageAddress: garage.linkedGarageAddress,
        },
      });
    } else {
      // Reject the request
      locationRequest.status = "rejected";
      locationRequest.reviewedAt = now;
      locationRequest.reviewedBy = new mongoose.Types.ObjectId(adminCheck.session.user.id);
      if (adminNotes) {
        locationRequest.adminNotes = adminNotes.trim();
      }
      await locationRequest.save();

      return NextResponse.json({
        success: true,
        message: "Location change request rejected",
        request: {
          _id: locationRequest._id.toString(),
          status: locationRequest.status,
          reviewedAt: locationRequest.reviewedAt,
          adminNotes: locationRequest.adminNotes,
        },
      });
    }
  } catch (error) {
    console.error("Error reviewing location change request:", error);
    return NextResponse.json(
      { error: "Failed to review location change request" },
      { status: 500 }
    );
  }
}
