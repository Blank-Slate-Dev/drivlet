// src/app/api/admin/forms/route.ts
// Admin archive of ALL signed forms — independent of booking status, so a
// form can always be retrieved later (disputes, insurance, emergencies),
// even if the related booking is completed, cancelled, or hard to find.
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/admin";
import Booking from "@/models/Booking";
import SignedForm, { FormType } from "@/models/SignedForm";
import { Types } from "mongoose";

const VALID_TYPES: FormType[] = [
  "pickup_consent",
  "return_confirmation",
  "claim_lodgement",
];

// GET /api/admin/forms?search=&formType=&page=&limit=
export async function GET(request: NextRequest) {
  const check = await requireAdmin();
  if (!check.authorized) return check.response;

  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const search = (searchParams.get("search") || "").trim();
    const formType = searchParams.get("formType");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") || "25", 10) || 25)
    );

    const query: Record<string, unknown> = {};
    if (formType && VALID_TYPES.includes(formType as FormType)) {
      query.formType = formType;
    }

    // Search by booking (tracking code / rego / customer) or by submitter.
    if (search) {
      const rx = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      const matchingBookings = await Booking.find({
        $or: [
          { trackingCode: rx },
          { vehicleRegistration: rx },
          { userName: rx },
          { userEmail: rx },
        ],
      })
        .select("_id")
        .limit(500)
        .lean();

      const or: Record<string, unknown>[] = [
        { submittedByName: rx },
        { submittedBy: rx },
        { bookingId: { $in: matchingBookings.map((b) => b._id) } },
      ];
      if (Types.ObjectId.isValid(search)) {
        or.push({ bookingId: new Types.ObjectId(search) });
        or.push({ _id: new Types.ObjectId(search) });
      }
      query.$or = or;
    }

    const skip = (page - 1) * limit;
    const [forms, total] = await Promise.all([
      SignedForm.find(query)
        // Exclude the heavy base64 signatures from the list payload —
        // the per-form PDF route serves the full record.
        .select("bookingId formType formVersion submittedBy submittedByName submittedAt formData.customerRefusedToSign")
        .sort({ submittedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      SignedForm.countDocuments(query),
    ]);

    // Attach booking context (tracking code, rego, customer) for each form.
    const bookingIds = Array.from(
      new Set(forms.map((f) => f.bookingId?.toString()).filter(Boolean))
    );
    const bookings = await Booking.find({ _id: { $in: bookingIds } })
      .select("trackingCode vehicleRegistration vehicleState userName status")
      .lean();
    const bookingMap = new Map(bookings.map((b) => [b._id.toString(), b]));

    const rows = forms.map((f) => {
      const b = bookingMap.get(f.bookingId?.toString() || "");
      const fd = (f.formData || {}) as Record<string, unknown>;
      return {
        _id: f._id.toString(),
        formType: f.formType,
        formVersion: f.formVersion,
        submittedByName: f.submittedByName,
        submittedBy: f.submittedBy,
        submittedAt: f.submittedAt,
        customerRefused: fd.customerRefusedToSign === true,
        bookingId: f.bookingId?.toString() || null,
        trackingCode: b?.trackingCode || null,
        vehicleRegistration: b?.vehicleRegistration || null,
        vehicleState: b?.vehicleState || null,
        customerName: b?.userName || null,
        bookingStatus: b?.status || null,
      };
    });

    return NextResponse.json({
      forms: rows,
      total,
      page,
      pages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (error) {
    console.error("Error fetching signed forms archive:", error);
    return NextResponse.json(
      { error: "Failed to fetch forms" },
      { status: 500 }
    );
  }
}
