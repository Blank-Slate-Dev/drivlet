// src/app/api/garage/services/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Garage from "@/models/Garage";
import GarageServicePricing from "@/models/GarageServicePricing";
import { logger } from "@/lib/logger";

// GET /api/garage/services - Get garage's service catalog
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "garage") {
      return NextResponse.json({ error: "Not a garage user" }, { status: 403 });
    }

    await connectDB();

    const garage = await Garage.findOne({ userId: session.user.id });
    if (!garage) {
      return NextResponse.json({ error: "Garage not found" }, { status: 404 });
    }

    // Get or create service pricing document
    let servicePricing = await GarageServicePricing.findOne({ garageId: garage._id });

    if (!servicePricing) {
      // Create default service pricing
      servicePricing = await GarageServicePricing.create({
        garageId: garage._id,
        services: [],
        isPublished: false,
      });
    }

    return NextResponse.json({
      success: true,
      servicePricing,
      garageName: garage.businessName,
    });
  } catch (error) {
    logger.error("Error fetching service pricing", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json(
      { error: "Failed to fetch service pricing" },
      { status: 500 }
    );
  }
}

// PUT /api/garage/services - Update garage's service catalog
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "garage") {
      return NextResponse.json({ error: "Not a garage user" }, { status: 403 });
    }

    const body = await request.json();

    await connectDB();

    const garage = await Garage.findOne({ userId: session.user.id });
    if (!garage) {
      return NextResponse.json({ error: "Garage not found" }, { status: 404 });
    }

    // Only approved garages can modify services
    if (garage.status !== "approved") {
      return NextResponse.json(
        { error: "Garage must be approved to modify services" },
        { status: 403 }
      );
    }

    // Update service pricing
    const servicePricing = await GarageServicePricing.findOneAndUpdate(
      { garageId: garage._id },
      {
        $set: {
          services: body.services || [],
          acceptsManualTransmission: body.acceptsManualTransmission ?? true,
          acceptsElectricVehicles: body.acceptsElectricVehicles ?? false,
          acceptsHybridVehicles: body.acceptsHybridVehicles ?? true,
          acceptsDiesel: body.acceptsDiesel ?? true,
          drivletEnabled: body.drivletEnabled ?? true,
          drivletPickupFee: body.drivletPickupFee ?? 0,
          drivletRadius: body.drivletRadius ?? 15,
          leadTimeHours: body.leadTimeHours ?? 24,
          maxDailyBookings: body.maxDailyBookings ?? 5,
          updatedAt: new Date(),
        },
      },
      { new: true, upsert: true }
    );

    logger.info("Service pricing updated", { garageId: garage._id });

    return NextResponse.json({
      success: true,
      servicePricing,
    });
  } catch (error) {
    logger.error("Error updating service pricing", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json(
      { error: "Failed to update service pricing" },
      { status: 500 }
    );
  }
}

// POST /api/garage/services - Add a new service
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "garage") {
      return NextResponse.json({ error: "Not a garage user" }, { status: 403 });
    }

    const body = await request.json();
    const { service } = body;

    if (!service || !service.category || !service.name) {
      return NextResponse.json(
        { error: "Service category and name are required" },
        { status: 400 }
      );
    }

    await connectDB();

    const garage = await Garage.findOne({ userId: session.user.id });
    if (!garage) {
      return NextResponse.json({ error: "Garage not found" }, { status: 404 });
    }

    // Only approved garages can add services
    if (garage.status !== "approved") {
      return NextResponse.json(
        { error: "Garage must be approved to add services" },
        { status: 403 }
      );
    }

    // Add service to catalog
    const servicePricing = await GarageServicePricing.findOneAndUpdate(
      { garageId: garage._id },
      {
        $push: {
          services: {
            category: service.category,
            name: service.name,
            description: service.description || "",
            prices: service.prices || [],
            isActive: true,
            includesPickup: service.includesPickup ?? true,
            requiresBooking: service.requiresBooking ?? true,
            completedCount: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        },
      },
      { new: true, upsert: true }
    );

    logger.info("Service added", { garageId: garage._id, category: service.category });

    return NextResponse.json({
      success: true,
      servicePricing,
    });
  } catch (error) {
    logger.error("Error adding service", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json(
      { error: "Failed to add service" },
      { status: 500 }
    );
  }
}
