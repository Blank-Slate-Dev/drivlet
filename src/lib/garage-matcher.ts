// src/lib/garage-matcher.ts
import { connectDB } from "@/lib/mongodb";
import Garage from "@/models/Garage";
import { Types } from "mongoose";

/**
 * Normalize a garage name for fuzzy matching
 */
function normalizeGarageName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w\s]/g, "") // Remove punctuation
    .replace(/\s+/g, " ") // Normalize whitespace
    .replace(/\bpty\b|\bltd\b|\bco\b|\binc\b/g, "") // Remove business suffixes
    .trim();
}

/**
 * Match customer-selected garage to a registered garage account
 * Returns the garage ObjectId if found, null otherwise
 */
export async function findGarageByNameOrPlaceId(
  garageName: string,
  placeId?: string
): Promise<Types.ObjectId | null> {
  await connectDB();

  // Strategy 1: Exact match on Google Place ID (most reliable)
  if (placeId) {
    const garage = await Garage.findOne({
      linkedGaragePlaceId: placeId,
      status: "approved",
    });

    if (garage) {
      console.log("✅ Matched by Place ID:", garage.businessName);
      return garage._id as Types.ObjectId;
    }
  }

  // Strategy 2: Exact match on linked garage name (case-insensitive)
  if (garageName) {
    const garage = await Garage.findOne({
      linkedGarageName: { $regex: new RegExp(`^${garageName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, "i") },
      status: "approved",
    });

    if (garage) {
      console.log("✅ Matched by exact name:", garage.businessName);
      return garage._id as Types.ObjectId;
    }
  }

  // Strategy 3: Fuzzy match on normalized name
  if (garageName) {
    const normalized = normalizeGarageName(garageName);

    // Get all approved garages and check normalized names
    const garages = await Garage.find({ status: "approved" });

    for (const garage of garages) {
      const normalizedLinkedName = normalizeGarageName(garage.linkedGarageName || "");
      const normalizedBusinessName = normalizeGarageName(garage.businessName || "");

      if (normalizedLinkedName === normalized || normalizedBusinessName === normalized) {
        console.log("✅ Matched by normalized name:", garage.businessName);
        return garage._id as Types.ObjectId;
      }

      // Partial match - if one contains the other
      if (
        (normalizedLinkedName && normalized.includes(normalizedLinkedName)) ||
        (normalizedLinkedName && normalizedLinkedName.includes(normalized)) ||
        (normalizedBusinessName && normalized.includes(normalizedBusinessName)) ||
        (normalizedBusinessName && normalizedBusinessName.includes(normalized))
      ) {
        console.log("✅ Matched by partial name:", garage.businessName);
        return garage._id as Types.ObjectId;
      }
    }
  }

  // No match found
  console.log("⚠️ No garage account found for:", garageName);
  return null;
}

/**
 * Assign a booking to a garage
 */
export async function assignBookingToGarage(
  bookingId: Types.ObjectId | string,
  garageId: Types.ObjectId | string,
  garageName: string
) {
  await connectDB();

  const Booking = (await import("@/models/Booking")).default;
  const now = new Date();

  await Booking.findByIdAndUpdate(bookingId, {
    assignedGarageId: garageId,
    assignedAt: now,
    garageNotifiedAt: now,
    garageStatus: "new",
    $push: {
      updates: {
        stage: "garage_assigned",
        timestamp: now,
        message: `Booking automatically assigned to ${garageName}`,
        updatedBy: "system",
      },
    },
  });

  console.log("✅ Booking assigned to garage:", garageName);
  return true;
}
