// src/app/api/incidents/upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { put } from "@vercel/blob";
import { requireValidOrigin } from "@/lib/validation";

export const dynamic = "force-dynamic";

// POST /api/incidents/upload — Upload incident photo
export async function POST(request: NextRequest) {
  const originCheck = requireValidOrigin(request);
  if (!originCheck.valid) {
    return NextResponse.json({ error: originCheck.error }, { status: 403 });
  }

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role !== "driver") {
      return NextResponse.json({ error: "Not a driver" }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large. Max 10MB." }, { status: 400 });
    }

    // Validate MIME type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/heic"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Allowed: JPEG, PNG, HEIC" },
        { status: 400 }
      );
    }

    // Validate magic bytes to prevent disguised file uploads
    const buffer = Buffer.from(await file.arrayBuffer());
    const isJPEG = buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF;
    const isPNG = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47;
    // HEIC files use ISO Base Media File Format (ftyp box)
    const isHEIC = buffer.length >= 12 &&
      buffer[4] === 0x66 && buffer[5] === 0x74 && buffer[6] === 0x79 && buffer[7] === 0x70;

    if (!isJPEG && !isPNG && !isHEIC) {
      return NextResponse.json(
        { error: "File content does not match an allowed image format" },
        { status: 400 }
      );
    }

    const timestamp = Date.now();
    const ext = file.type.includes("png") ? "png" : file.type.includes("heic") ? "heic" : "jpg";
    const filePath = `incidents/${session.user.id}/${timestamp}.${ext}`;

    const blob = await put(filePath, file, {
      access: "public",
      addRandomSuffix: false,
    });

    return NextResponse.json({ url: blob.url });
  } catch (error) {
    console.error("Error uploading incident photo:", error);
    return NextResponse.json({ error: "Failed to upload photo" }, { status: 500 });
  }
}
