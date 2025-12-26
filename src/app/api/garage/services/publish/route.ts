// src/app/api/garage/services/publish/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Garage from "@/models/Garage";
import GarageServicePricing from "@/models/GarageServicePricing";
import { logger } from "@/lib/logger";

// POST /api/garage/services/publish - Toggle publish status
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
    const { publish } = body;

    await connectDB();

    const garage = await Garage.findOne({ userId: session.user.id });
    if (!garage) {
      return NextResponse.json({ error: "Garage not found" }, { status: 404 });
    }

    // Get service pricing
    const servicePricing = await GarageServicePricing.findOne({ garageId: garage._id });

    if (!servicePricing) {
      return NextResponse.json(
        { error: "No service catalog found. Create services first." },
        { status: 400 }
      );
    }

    // Validation before publishing
    if (publish) {
      // Must have at least one active service
      const activeServices = servicePricing.services.filter((s: { isActive: boolean }) => s.isActive);
      if (activeServices.length === 0) {
        return NextResponse.json(
          { error: "Add at least one active service before publishing." },
          { status: 400 }
        );
      }

      // Each active service should have at least one price
      const servicesWithoutPrices = activeServices.filter(
        (s: { prices: unknown[] }) => s.prices.length === 0
      );
      if (servicesWithoutPrices.length > 0) {
        return NextResponse.json(
          { error: "All active services must have at least one price set." },
          { status: 400 }
        );
      }
    }

    // Update publish status
    servicePricing.isPublished = publish;
    if (publish) {
      servicePricing.lastPublishedAt = new Date();
    }
    await servicePricing.save();

    logger.info("Service catalog publish status changed", {
      garageId: garage._id,
      isPublished: publish,
    });

    return NextResponse.json({
      success: true,
      isPublished: servicePricing.isPublished,
      message: publish
        ? "Service catalog published! Customers can now see your services."
        : "Service catalog unpublished. Customers will not see your services.",
    });
  } catch (error) {
    logger.error("Error publishing service catalog", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json(
      { error: "Failed to update publish status" },
      { status: 500 }
    );
  }
}
