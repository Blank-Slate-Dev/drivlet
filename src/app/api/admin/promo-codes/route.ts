// src/app/api/admin/promo-codes/route.ts
// Admin promo-code management: list + create.
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/admin";
import PromoCode from "@/models/PromoCode";
import { generatePromoCode, normalisePromoCode } from "@/lib/promoCodes";

export const dynamic = "force-dynamic";

// GET /api/admin/promo-codes — newest first
export async function GET() {
  const check = await requireAdmin();
  if (!check.authorized) return check.response;

  try {
    await connectDB();
    const codes = await PromoCode.find({}).sort({ createdAt: -1 }).limit(500).lean();
    return NextResponse.json({
      codes: codes.map((c) => ({
        _id: c._id.toString(),
        code: c.code,
        percentOff: c.percentOff,
        status: c.status,
        notes: c.notes || null,
        createdBy: c.createdBy || null,
        createdAt: c.createdAt,
        usedAt: c.usedAt || null,
        usedByReference: c.usedByReference || null,
        usedByBookingId: c.usedByBookingId?.toString() || null,
        discountAmount: c.discountAmount ?? null,
      })),
    });
  } catch (error) {
    console.error("Error listing promo codes:", error);
    return NextResponse.json({ error: "Failed to list promo codes" }, { status: 500 });
  }
}

// POST /api/admin/promo-codes — create { code?, percentOff, notes? }
export async function POST(request: NextRequest) {
  const check = await requireAdmin();
  if (!check.authorized) return check.response;

  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const percentOff = Number(body.percentOff);
    if (!Number.isInteger(percentOff) || percentOff < 1 || percentOff > 100) {
      return NextResponse.json(
        { error: "Discount must be a whole number between 1 and 100" },
        { status: 400 }
      );
    }

    let code: string;
    if (typeof body.code === "string" && body.code.trim()) {
      code = normalisePromoCode(body.code);
      if (!/^[A-Z0-9-]{3,24}$/.test(code)) {
        return NextResponse.json(
          { error: "Custom codes must be 3-24 characters (letters, numbers, dashes)" },
          { status: 400 }
        );
      }
      const existing = await (async () => {
        await connectDB();
        return PromoCode.findOne({ code }).lean();
      })();
      if (existing) {
        return NextResponse.json(
          { error: `Code ${code} already exists` },
          { status: 409 }
        );
      }
    } else {
      await connectDB();
      // Auto-generate, retrying on the (unlikely) collision
      code = generatePromoCode();
      for (let i = 0; i < 3 && (await PromoCode.exists({ code })); i++) {
        code = generatePromoCode();
      }
    }

    await connectDB();
    const promo = await PromoCode.create({
      code,
      percentOff,
      status: "active",
      notes: typeof body.notes === "string" ? body.notes.trim().slice(0, 500) : undefined,
      createdBy: check.session?.user?.email || undefined,
    });

    return NextResponse.json(
      {
        success: true,
        code: {
          _id: promo._id.toString(),
          code: promo.code,
          percentOff: promo.percentOff,
          status: promo.status,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating promo code:", error);
    return NextResponse.json({ error: "Failed to create promo code" }, { status: 500 });
  }
}
