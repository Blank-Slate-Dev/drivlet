// src/app/api/driver/settings/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Driver from "@/models/Driver";
import User from "@/models/User";

export const dynamic = "force-dynamic";

// GET /api/driver/settings - Get driver settings and profile
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "driver") {
      return NextResponse.json({ error: "Not a driver" }, { status: 403 });
    }

    await connectDB();

    // Get the driver profile
    const user = await User.findById(session.user.id);
    if (!user?.driverProfile) {
      return NextResponse.json({ error: "Driver profile not found" }, { status: 404 });
    }

    const driver = await Driver.findById(user.driverProfile).lean();
    if (!driver) {
      return NextResponse.json({ error: "Driver not found" }, { status: 404 });
    }

    // Return driver settings (excluding sensitive data)
    return NextResponse.json({
      profile: {
        firstName: driver.firstName,
        lastName: driver.lastName,
        email: user.email,
        phone: driver.phone,
        address: driver.address,
        profilePhoto: driver.profilePhoto,
      },
      license: {
        number: driver.license?.number ? `****${driver.license.number.slice(-4)}` : null,
        state: driver.license?.state,
        class: driver.license?.class,
        expiryDate: driver.license?.expiryDate,
      },
      vehicle: driver.hasOwnVehicle ? {
        make: driver.vehicle?.make,
        model: driver.vehicle?.model,
        year: driver.vehicle?.year,
        color: driver.vehicle?.color,
        registration: driver.vehicle?.registration,
        registrationState: driver.vehicle?.registrationState,
        registrationExpiry: driver.vehicle?.registrationExpiry,
      } : null,
      hasOwnVehicle: driver.hasOwnVehicle,
      availability: driver.availability,
      maxJobsPerDay: driver.maxJobsPerDay,
      preferredAreas: driver.preferredAreas,
      isActive: driver.isActive,
      canAcceptJobs: driver.canAcceptJobs,
      status: driver.status,
      onboardingStatus: driver.onboardingStatus,
      metrics: driver.metrics,
      memberSince: driver.createdAt,
    });
  } catch (error) {
    console.error("Error fetching driver settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

// PATCH /api/driver/settings - Update driver settings
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "driver") {
      return NextResponse.json({ error: "Not a driver" }, { status: 403 });
    }

    const body = await request.json();
    const {
      phone,
      address,
      availability,
      maxJobsPerDay,
      preferredAreas,
      isActive,
      vehicle,
    } = body;

    await connectDB();

    // Get the driver profile
    const user = await User.findById(session.user.id);
    if (!user?.driverProfile) {
      return NextResponse.json({ error: "Driver profile not found" }, { status: 404 });
    }

    const driver = await Driver.findById(user.driverProfile);
    if (!driver) {
      return NextResponse.json({ error: "Driver not found" }, { status: 404 });
    }

    // Update allowed fields
    if (phone !== undefined) {
      // Validate phone format
      const cleanPhone = phone.replace(/[\s-]/g, "");
      if (!/^(\+?61|0)[2-478](\d{8}|\d{4}\s?\d{4})$/.test(cleanPhone)) {
        return NextResponse.json(
          { error: "Please enter a valid Australian phone number" },
          { status: 400 }
        );
      }
      driver.phone = phone;
    }

    if (address !== undefined) {
      // Validate address fields
      if (!address.street || !address.suburb || !address.state || !address.postcode) {
        return NextResponse.json(
          { error: "All address fields are required" },
          { status: 400 }
        );
      }
      if (!/^\d{4}$/.test(address.postcode)) {
        return NextResponse.json(
          { error: "Invalid postcode format" },
          { status: 400 }
        );
      }
      driver.address = address;
    }

    if (availability !== undefined) {
      // Validate availability structure
      const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
      for (const day of days) {
        if (availability[day]) {
          const dayData = availability[day];
          if (typeof dayData.available !== "boolean") {
            return NextResponse.json(
              { error: `Invalid availability format for ${day}` },
              { status: 400 }
            );
          }
          if (dayData.available && (!dayData.startTime || !dayData.endTime)) {
            return NextResponse.json(
              { error: `Start and end times required for ${day}` },
              { status: 400 }
            );
          }
        }
      }
      driver.availability = availability;
    }

    if (maxJobsPerDay !== undefined) {
      const maxJobs = parseInt(maxJobsPerDay);
      if (isNaN(maxJobs) || maxJobs < 1 || maxJobs > 20) {
        return NextResponse.json(
          { error: "Max jobs per day must be between 1 and 20" },
          { status: 400 }
        );
      }
      driver.maxJobsPerDay = maxJobs;
    }

    if (preferredAreas !== undefined) {
      if (!Array.isArray(preferredAreas)) {
        return NextResponse.json(
          { error: "Preferred areas must be an array" },
          { status: 400 }
        );
      }
      // Limit to 20 areas
      driver.preferredAreas = preferredAreas.slice(0, 20).map((a: string) => a.trim());
    }

    if (isActive !== undefined) {
      // Toggle active status (available for jobs)
      driver.isActive = Boolean(isActive);
    }

    if (vehicle !== undefined && driver.hasOwnVehicle) {
      // Update vehicle details
      if (vehicle.make) driver.vehicle!.make = vehicle.make;
      if (vehicle.model) driver.vehicle!.model = vehicle.model;
      if (vehicle.year) driver.vehicle!.year = parseInt(vehicle.year);
      if (vehicle.color) driver.vehicle!.color = vehicle.color;
      if (vehicle.registration) driver.vehicle!.registration = vehicle.registration;
      if (vehicle.registrationState) driver.vehicle!.registrationState = vehicle.registrationState;
      if (vehicle.registrationExpiry) driver.vehicle!.registrationExpiry = new Date(vehicle.registrationExpiry);
    }

    await driver.save();

    return NextResponse.json({
      success: true,
      message: "Settings updated successfully",
      updated: {
        phone: driver.phone,
        address: driver.address,
        availability: driver.availability,
        maxJobsPerDay: driver.maxJobsPerDay,
        preferredAreas: driver.preferredAreas,
        isActive: driver.isActive,
      },
    });
  } catch (error) {
    console.error("Error updating driver settings:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}
