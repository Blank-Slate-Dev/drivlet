// src/app/api/admin/drivers/[id]/documents/route.ts
// Authenticated streaming proxy for driver identity documents (licence
// front/back, police check). These live in Vercel Blob, which only supports
// public access — so the raw blob URLs must never reach a client. This route
// checks authorisation (admin, or the driver viewing their own documents) and
// streams the bytes through, keeping the underlying URL server-side.
// Added 2026-08-02 (pre-launch audit LB-3).
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Driver from "@/models/Driver";
import User from "@/models/User";
import mongoose from "mongoose";
import { DRIVER_DOC_TYPES, DriverDocType } from "@/lib/driverDocuments";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: driverId } = await params;
    if (!mongoose.Types.ObjectId.isValid(driverId)) {
      return NextResponse.json({ error: "Invalid driver ID" }, { status: 400 });
    }

    const doc = request.nextUrl.searchParams.get("doc") as DriverDocType | null;
    if (!doc || !DRIVER_DOC_TYPES.includes(doc)) {
      return NextResponse.json({ error: "Invalid document type" }, { status: 400 });
    }

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    // Admin, or the driver viewing their own documents
    let authorised = session.user.role === "admin";
    if (!authorised && session.user.role === "driver") {
      const user = await User.findById(session.user.id).select("driverProfile");
      authorised = user?.driverProfile?.toString() === driverId;
    }
    if (!authorised) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const driver = await Driver.findById(driverId)
      .select("license.frontPhotoUrl license.backPhotoUrl license.photoUrl policeCheck.documentUrl")
      .lean();
    if (!driver) {
      return NextResponse.json({ error: "Driver not found" }, { status: 404 });
    }

    const urlByDoc: Record<DriverDocType, string | undefined> = {
      "licence-front": driver.license?.frontPhotoUrl,
      "licence-back": driver.license?.backPhotoUrl,
      "licence-legacy": driver.license?.photoUrl,
      "police-check": driver.policeCheck?.documentUrl,
    };

    const cloudUrl = urlByDoc[doc];
    if (!cloudUrl) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const blobResponse = await fetch(cloudUrl);
    if (!blobResponse.ok || !blobResponse.body) {
      return NextResponse.json(
        { error: "Document file not available" },
        { status: 404 }
      );
    }

    return new NextResponse(blobResponse.body, {
      headers: {
        "Content-Type":
          blobResponse.headers.get("content-type") || "application/octet-stream",
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (error) {
    console.error("Error serving driver document:", error);
    return NextResponse.json(
      { error: "Failed to serve document" },
      { status: 500 }
    );
  }
}
