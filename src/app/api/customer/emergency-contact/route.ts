// src/app/api/customer/emergency-contact/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";

// GET /api/customer/emergency-contact
export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();

    const user = await User.findById(session.user.id).select("emergencyContact");

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      emergencyContact: user.emergencyContact || null,
    });
  } catch (error) {
    console.error("Error fetching emergency contact:", error);
    return NextResponse.json(
      { error: "Failed to fetch emergency contact" },
      { status: 500 }
    );
  }
}

// PUT /api/customer/emergency-contact
export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { name, relationship, phone } = await request.json();

    // Validate required fields
    if (!name || !relationship || !phone) {
      return NextResponse.json(
        { error: "Name, relationship, and phone are required" },
        { status: 400 }
      );
    }

    // Validate name length
    if (name.length > 100) {
      return NextResponse.json(
        { error: "Name must be 100 characters or less" },
        { status: 400 }
      );
    }

    // Validate relationship length
    if (relationship.length > 50) {
      return NextResponse.json(
        { error: "Relationship must be 50 characters or less" },
        { status: 400 }
      );
    }

    // Validate phone (Australian format)
    const cleanPhone = phone.replace(/\s/g, "");
    if (!/^0[2-9]\d{8}$/.test(cleanPhone) && !/^04\d{8}$/.test(cleanPhone)) {
      return NextResponse.json(
        { error: "Please enter a valid Australian phone number" },
        { status: 400 }
      );
    }

    await connectDB();

    const user = await User.findByIdAndUpdate(
      session.user.id,
      {
        $set: {
          emergencyContact: {
            name: name.trim(),
            relationship: relationship.trim(),
            phone: cleanPhone,
          },
        },
      },
      { new: true, runValidators: true }
    ).select("emergencyContact");

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Emergency contact saved",
      emergencyContact: user.emergencyContact,
    });
  } catch (error) {
    console.error("Error saving emergency contact:", error);
    return NextResponse.json(
      { error: "Failed to save emergency contact" },
      { status: 500 }
    );
  }
}

// DELETE /api/customer/emergency-contact
export async function DELETE() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();

    const user = await User.findByIdAndUpdate(
      session.user.id,
      { $unset: { emergencyContact: 1 } },
      { new: true }
    );

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Emergency contact removed",
    });
  } catch (error) {
    console.error("Error removing emergency contact:", error);
    return NextResponse.json(
      { error: "Failed to remove emergency contact" },
      { status: 500 }
    );
  }
}
