// src/app/api/incidents/driver/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Incident from "@/models/Incident";
import User from "@/models/User";

export const dynamic = "force-dynamic";

// GET /api/incidents/driver — Get driver's own incidents
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role !== "driver") {
      return NextResponse.json({ error: "Not a driver" }, { status: 403 });
    }

    await connectDB();

    const user = await User.findById(session.user.id);
    if (!user?.driverProfile) {
      return NextResponse.json({ error: "Driver profile not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const bookingId = searchParams.get("bookingId");

    const query: Record<string, unknown> = { driverId: user.driverProfile };
    if (bookingId) {
      query.bookingId = bookingId;
    }

    const incidents = await Incident.find(query)
      .sort({ createdAt: -1 })
      .populate("bookingId", "vehicleRegistration garageName currentStage")
      .lean();

    return NextResponse.json({ incidents });
  } catch (error) {
    console.error("Error fetching driver incidents:", error);
    return NextResponse.json({ error: "Failed to fetch incidents" }, { status: 500 });
  }
}
