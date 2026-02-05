// src/app/api/admin/testimonials/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Testimonial from "@/models/Testimonial";
import { sanitizeString } from "@/lib/validation";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// PATCH - Update testimonial
export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  const { id } = await context.params;

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
    await connectDB();

    const testimonial = await Testimonial.findById(id);
    if (!testimonial) {
      return NextResponse.json({ error: "Testimonial not found" }, { status: 404 });
    }

    const {
      isApproved,
      isDisplayed,
      customerName,
      customerLocation,
      rating,
      review,
      vehicleType,
      serviceType,
    } = body;

    if (isApproved !== undefined) {
      testimonial.isApproved = isApproved;
      if (isApproved && !testimonial.approvedAt) {
        testimonial.approvedAt = new Date();
        testimonial.approvedBy = new mongoose.Types.ObjectId(session.user.id);
      }
    }

    if (isDisplayed !== undefined) {
      testimonial.isDisplayed = isDisplayed;
    }

    if (customerName !== undefined) {
      testimonial.customerName = sanitizeString(customerName, 100);
    }

    if (customerLocation !== undefined) {
      testimonial.customerLocation = customerLocation
        ? sanitizeString(customerLocation, 100)
        : undefined;
    }

    if (rating !== undefined) {
      const parsedRating = Number(rating);
      if (!Number.isInteger(parsedRating) || parsedRating < 1 || parsedRating > 5) {
        return NextResponse.json({ error: "Rating must be between 1 and 5" }, { status: 400 });
      }
      testimonial.rating = parsedRating;
    }

    if (review !== undefined) {
      testimonial.review = sanitizeString(review, 500);
    }

    if (vehicleType !== undefined) {
      testimonial.vehicleType = vehicleType
        ? sanitizeString(vehicleType, 50)
        : undefined;
    }

    if (serviceType !== undefined) {
      testimonial.serviceType = serviceType
        ? sanitizeString(serviceType, 100)
        : undefined;
    }

    await testimonial.save();

    return NextResponse.json({ success: true, testimonial });
  } catch (error) {
    console.error("Error updating testimonial:", error);
    return NextResponse.json(
      { error: "Failed to update testimonial" },
      { status: 500 }
    );
  }
}

// DELETE - Remove testimonial
export async function DELETE(
  _request: NextRequest,
  context: RouteContext
) {
  const { id } = await context.params;

  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();

    const testimonial = await Testimonial.findByIdAndDelete(id);
    if (!testimonial) {
      return NextResponse.json({ error: "Testimonial not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting testimonial:", error);
    return NextResponse.json(
      { error: "Failed to delete testimonial" },
      { status: 500 }
    );
  }
}
