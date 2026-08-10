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

    // Grouped by booking (2026-08-09): the pickup and return forms of one
    // booking travel together as a group. Grouping + pagination happen in
    // the SAME aggregate so a booking's forms can never split across pages.
    // Forms without a bookingId become single-form groups keyed by form id.
    // Groups sort by their most recent activity; forms within a group sort
    // chronologically (pickup naturally precedes return).
    // The heavy base64 signatures are excluded — the per-form PDF route
    // serves the full record.
    const [result] = await SignedForm.aggregate([
      { $match: query },
      { $sort: { submittedAt: 1 } },
      {
        $project: {
          formType: 1,
          formVersion: 1,
          submittedBy: 1,
          submittedByName: 1,
          submittedAt: 1,
          bookingId: 1,
          customerRefused: { $eq: ["$formData.customerRefusedToSign", true] },
        },
      },
      {
        $group: {
          _id: { $ifNull: ["$bookingId", "$_id"] },
          bookingId: { $first: "$bookingId" },
          forms: { $push: "$$ROOT" },
          lastActivity: { $max: "$submittedAt" },
          hasDispute: { $max: { $cond: ["$customerRefused", 1, 0] } },
        },
      },
      { $sort: { lastActivity: -1 } },
      {
        $facet: {
          groups: [{ $skip: skip }, { $limit: limit }],
          meta: [{ $count: "total" }],
        },
      },
    ]);

    const rawGroups: Array<{
      bookingId: Types.ObjectId | null;
      forms: Array<{
        _id: Types.ObjectId;
        formType: FormType;
        formVersion: string;
        submittedBy: string;
        submittedByName: string;
        submittedAt: Date;
        customerRefused: boolean;
      }>;
      lastActivity: Date;
      hasDispute: number;
    }> = result?.groups || [];
    const total: number = result?.meta?.[0]?.total || 0;

    // Attach booking context (tracking code, rego, customer) per group.
    // Type guard so ObjectId $in gets string[] (undefined filtered out)
    const bookingIds = Array.from(
      new Set(
        rawGroups
          .map((g) => g.bookingId?.toString())
          .filter((id): id is string => Boolean(id))
      )
    );
    const bookings = await Booking.find({ _id: { $in: bookingIds } })
      .select("trackingCode vehicleRegistration vehicleState userName status")
      .lean();
    const bookingMap = new Map(bookings.map((b) => [b._id.toString(), b]));

    const groups = rawGroups.map((g) => {
      const b = bookingMap.get(g.bookingId?.toString() || "");
      return {
        bookingId: g.bookingId?.toString() || null,
        trackingCode: b?.trackingCode || null,
        vehicleRegistration: b?.vehicleRegistration || null,
        vehicleState: b?.vehicleState || null,
        customerName: b?.userName || null,
        bookingStatus: b?.status || null,
        lastActivity: g.lastActivity,
        hasDispute: g.hasDispute === 1,
        forms: g.forms.map((f) => ({
          _id: f._id.toString(),
          formType: f.formType,
          formVersion: f.formVersion,
          submittedByName: f.submittedByName,
          submittedBy: f.submittedBy,
          submittedAt: f.submittedAt,
          customerRefused: f.customerRefused === true,
        })),
      };
    });

    return NextResponse.json({
      groups,
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
