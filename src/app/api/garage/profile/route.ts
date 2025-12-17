// src/app/api/garage/profile/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import Garage from "@/models/Garage";

// GET - Fetch garage profile for current user
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "garage") {
      return NextResponse.json({ error: "Not a garage user" }, { status: 403 });
    }

    await connectDB();

    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const garage = await Garage.findOne({ userId: user._id });
    if (!garage) {
      return NextResponse.json({ error: "Garage profile not found" }, { status: 404 });
    }

    return NextResponse.json({ garage });
  } catch (error) {
    console.error("Error fetching garage profile:", error);
    return NextResponse.json(
      { error: "Failed to fetch garage profile" },
      { status: 500 }
    );
  }
}

// PATCH - Update garage profile
export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "garage") {
      return NextResponse.json({ error: "Not a garage user" }, { status: 403 });
    }

    const body = await request.json();

    await connectDB();

    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const garage = await Garage.findOne({ userId: user._id });
    if (!garage) {
      return NextResponse.json({ error: "Garage profile not found" }, { status: 404 });
    }

    // Define allowed fields that can be updated
    const allowedUpdates = [
      "tradingName",
      "businessAddress",
      "primaryContact",
      "afterHoursContact",
      "operatingHours",
      "serviceBays",
      "servicesOffered",
      "vehicleTypes",
      "averageTurnaroundTimes",
      "appointmentPolicy",
      "serviceRadius",
      "pickupDropoff",
      "certifications",
    ];

    // Filter out any fields that shouldn't be updated
    const updates: Record<string, unknown> = {};
    for (const key of allowedUpdates) {
      if (body[key] !== undefined) {
        updates[key] = body[key];
      }
    }

    // Update the garage profile
    const updatedGarage = await Garage.findByIdAndUpdate(
      garage._id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    return NextResponse.json({
      message: "Profile updated successfully",
      garage: updatedGarage,
    });
  } catch (error) {
    console.error("Error updating garage profile:", error);

    if (error instanceof Error && error.name === "ValidationError") {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Failed to update garage profile" },
      { status: 500 }
    );
  }
}
