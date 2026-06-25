import { NextRequest, NextResponse } from "next/server";
import { requireValidOrigin } from "@/lib/validation";
import { calculateDistance, getDistanceZone } from "@/lib/distanceZones";
import { DRIVLET_PRICE } from "@/lib/stripe";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import BookingRequest from "@/models/BookingRequest";
import { notifyAdminOfNewRequest } from "@/lib/notifications";

export async function POST(request: NextRequest) {
  const originCheck = requireValidOrigin(request);
  if (!originCheck.valid) {
    return NextResponse.json({ error: originCheck.error }, { status: 403 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  try {
    const {
      customerName,
      customerEmail,
      customerPhone,
      pickupAddress,
      serviceType,
      serviceDate,
      vehicleRegistration,
      vehicleState,
      earliestPickup,
      latestDropoff,
      hasExistingBooking,
      garageName,
      garageAddress,
      garagePlaceId,
      existingBookingRef,
      transmissionType,
      isManualTransmission,
      selectedServices,
      primaryServiceCategory,
      serviceNotes,
      pickupTimeSlot,
      dropoffTimeSlot,
      estimatedServiceDuration,
      vehicleYear,
      vehicleModel,
      pickupLat,
      pickupLng,
      garageLat,
      garageLng,
    } = body;

    if (!customerEmail || !customerName || !pickupAddress || !vehicleRegistration) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const session = await getServerSession(authOptions);
    const isGuest = !session?.user?.id;
    const userId = session?.user?.id || null;

    // Server-side distance & zone verification (mirrors create-payment-intent)
    let verifiedZone = "green";
    let verifiedSurcharge = 0;
    let verifiedDistanceKm = 0;

    if (
      typeof pickupLat === "number" && pickupLat !== 0 &&
      typeof pickupLng === "number" && pickupLng !== 0 &&
      typeof garageLat === "number" && garageLat !== 0 &&
      typeof garageLng === "number" && garageLng !== 0
    ) {
      const serverDistance = calculateDistance(pickupLat, pickupLng, garageLat, garageLng);
      const serverZoneInfo = getDistanceZone(serverDistance);

      verifiedZone = serverZoneInfo.zone;
      verifiedSurcharge = serverZoneInfo.surchargeAmount;
      verifiedDistanceKm = serverZoneInfo.distance;

      if (verifiedZone === "red") {
        return NextResponse.json(
          { error: "Your pickup address is too far from the selected garage (over 18 km). Please contact our team for assistance." },
          { status: 400 }
        );
      }
    }

    const quotedAmount = DRIVLET_PRICE + verifiedSurcharge;

    // Build flags
    const flags: { type: "manual_transmission" | "high_value_vehicle" | "other"; reason: string; createdAt: Date }[] = [];
    if (isManualTransmission) {
      flags.push({
        type: "manual_transmission",
        reason: "Customer selected manual transmission - requires manual-capable driver",
        createdAt: new Date(),
      });
    }

    // Parse selected services
    let parsedServices = [];
    try {
      parsedServices = typeof selectedServices === "string" ? JSON.parse(selectedServices) : selectedServices || [];
    } catch {
      parsedServices = [];
    }

    await connectDB();

    const bookingRequest = await BookingRequest.create({
      userName: customerName,
      userEmail: customerEmail,
      userId,
      isGuest,
      customerPhone: customerPhone || "",
      vehicleRegistration: vehicleRegistration.trim().toUpperCase(),
      vehicleState: vehicleState || "NSW",
      vehicleYear: vehicleYear || "",
      vehicleModel: vehicleModel || "",
      transmissionType: transmissionType || "automatic",
      isManualTransmission: !!isManualTransmission,
      pickupAddress: pickupAddress.trim(),
      serviceType: serviceType || "regular_service",
      serviceDate: serviceDate ? new Date(serviceDate) : new Date(),
      earliestPickup: earliestPickup || "",
      latestDropoff: latestDropoff || "",
      pickupTimeSlot: pickupTimeSlot || "",
      dropoffTimeSlot: dropoffTimeSlot || "",
      estimatedServiceDuration: estimatedServiceDuration ? parseInt(String(estimatedServiceDuration)) : null,
      hasExistingBooking: !!hasExistingBooking,
      garageName: garageName || null,
      garageAddress: garageAddress || null,
      garagePlaceId: garagePlaceId || null,
      existingBookingRef: existingBookingRef || null,
      selectedServices: parsedServices,
      primaryServiceCategory: primaryServiceCategory || null,
      serviceNotes: serviceNotes || "",
      distanceZone: verifiedZone,
      distanceSurcharge: verifiedSurcharge,
      distanceKm: verifiedDistanceKm,
      quotedAmount,
      pickupLat: pickupLat || 0,
      pickupLng: pickupLng || 0,
      garageLat: garageLat || 0,
      garageLng: garageLng || 0,
      flags,
      status: "pending_review",
    });

    // Non-blocking admin notification
    notifyAdminOfNewRequest({
      _id: bookingRequest._id,
      userName: customerName,
      vehicleRegistration: bookingRequest.vehicleRegistration,
      pickupAddress: bookingRequest.pickupAddress,
      quotedAmount,
      garageName: garageName || null,
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      requestId: bookingRequest._id,
      quotedAmount,
      distanceZone: verifiedZone,
    });
  } catch (error) {
    console.error("Booking request error:", error);
    return NextResponse.json({ error: "Failed to submit booking request" }, { status: 500 });
  }
}
