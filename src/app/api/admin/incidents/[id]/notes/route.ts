// src/app/api/admin/incidents/[id]/notes/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { connectDB } from "@/lib/mongodb";
import Incident from "@/models/Incident";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

// POST /api/admin/incidents/[id]/notes — Add admin note
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminCheck = await requireAdmin();
  if (!adminCheck.authorized) return adminCheck.response;

  try {
    await connectDB();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid incident ID" }, { status: 400 });
    }

    const body = await request.json();
    const { note } = body;

    if (!note?.trim()) {
      return NextResponse.json({ error: "Note is required" }, { status: 400 });
    }

    const incident = await Incident.findByIdAndUpdate(
      id,
      {
        $push: {
          adminNotes: {
            note: note.trim(),
            addedBy: adminCheck.session.user.id,
            addedAt: new Date(),
          },
        },
      },
      { new: true }
    ).populate("adminNotes.addedBy", "username email");

    if (!incident) {
      return NextResponse.json({ error: "Incident not found" }, { status: 404 });
    }

    return NextResponse.json({ incident });
  } catch (error) {
    console.error("Error adding note:", error);
    return NextResponse.json({ error: "Failed to add note" }, { status: 500 });
  }
}
