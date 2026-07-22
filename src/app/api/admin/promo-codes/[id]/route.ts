// src/app/api/admin/promo-codes/[id]/route.ts
// PATCH: disable / re-activate a promo code. Used codes stay used — the
// redemption record is the audit trail (release happens automatically when
// the related request/booking is declined or cancelled).
import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/admin";
import PromoCode from "@/models/PromoCode";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const check = await requireAdmin();
  if (!check.authorized) return check.response;

  try {
    const { id } = await params;
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid promo code id" }, { status: 400 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const action = body.action as string;
    if (!["disable", "activate"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    await connectDB();
    const promo = await PromoCode.findById(id);
    if (!promo) {
      return NextResponse.json({ error: "Promo code not found" }, { status: 404 });
    }

    if (promo.status === "used") {
      return NextResponse.json(
        { error: "This code has been redeemed — it can't be changed. It frees up automatically if the related booking is cancelled." },
        { status: 400 }
      );
    }

    promo.status = action === "disable" ? "disabled" : "active";
    await promo.save();

    return NextResponse.json({ success: true, status: promo.status });
  } catch (error) {
    console.error("Error updating promo code:", error);
    return NextResponse.json({ error: "Failed to update promo code" }, { status: 500 });
  }
}
