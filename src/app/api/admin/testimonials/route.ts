// src/app/api/admin/testimonials/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Testimonial from "@/models/Testimonial";
import { sanitizeString } from "@/lib/validation";

// GET - Admin: list all testimonials with filtering/pagination
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20")));
    const status = searchParams.get("status") || "all";
    const search = searchParams.get("search") || "";

    await connectDB();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: any = {};

    if (status === "pending") {
      filter.isApproved = false;
    } else if (status === "approved") {
      filter.isApproved = true;
      filter.isDisplayed = false;
    } else if (status === "displayed") {
      filter.isApproved = true;
      filter.isDisplayed = true;
    }

    if (search) {
      filter.customerName = { $regex: search, $options: "i" };
    }

    const total = await Testimonial.countDocuments(filter);
    const testimonials = await Testimonial.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    // Get counts for stats
    const totalCount = await Testimonial.countDocuments();
    const pendingCount = await Testimonial.countDocuments({ isApproved: false });
    const approvedCount = await Testimonial.countDocuments({ isApproved: true });
    const displayedCount = await Testimonial.countDocuments({ isApproved: true, isDisplayed: true });

    return NextResponse.json({
      testimonials,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      stats: {
        total: totalCount,
        pending: pendingCount,
        approved: approvedCount,
        displayed: displayedCount,
      },
    });
  } catch (error) {
    console.error("Error fetching testimonials:", error);
    return NextResponse.json(
      { error: "Failed to fetch testimonials" },
      { status: 500 }
    );
  }
}

// POST - Admin: create a new testimonial
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const { customerName, customerLocation, rating, review, vehicleType, serviceType } = body;

    if (!customerName || !rating || !review) {
      return NextResponse.json(
        { error: "Name, rating, and review are required" },
        { status: 400 }
      );
    }

    const parsedRating = Number(rating);
    if (!Number.isInteger(parsedRating) || parsedRating < 1 || parsedRating > 5) {
      return NextResponse.json({ error: "Rating must be between 1 and 5" }, { status: 400 });
    }

    await connectDB();

    const testimonial = new Testimonial({
      customerName: sanitizeString(customerName, 100),
      customerLocation: customerLocation ? sanitizeString(customerLocation, 100) : undefined,
      rating: parsedRating,
      review: sanitizeString(review, 500),
      vehicleType: vehicleType ? sanitizeString(vehicleType, 50) : undefined,
      serviceType: serviceType ? sanitizeString(serviceType, 100) : undefined,
      source: "admin_created",
      isApproved: true,
      isDisplayed: true,
      approvedAt: new Date(),
      approvedBy: new mongoose.Types.ObjectId(session.user.id),
    });

    await testimonial.save();

    return NextResponse.json({ success: true, testimonial }, { status: 201 });
  } catch (error) {
    console.error("Error creating testimonial:", error);
    return NextResponse.json(
      { error: "Failed to create testimonial" },
      { status: 500 }
    );
  }
}
