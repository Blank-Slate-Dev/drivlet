// src/app/api/contact/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Contact from "@/models/Contact";
import { withRateLimit, RATE_LIMITS } from "@/lib/rateLimit";
import { sanitizeString } from "@/lib/validation";

export async function POST(request: NextRequest) {
  // Apply rate limiting - prevent spam
  const rateLimit = withRateLimit(request, RATE_LIMITS.form, "contact");
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil(rateLimit.resetIn / 1000)),
        },
      }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON in request body" },
      { status: 400 }
    );
  }

  try {
    const { name, email, phone, message } = body;

    // Validate required fields
    if (!name || !email || !message) {
      return NextResponse.json(
        { error: "Name, email, and message are required" },
        { status: 400 }
      );
    }

    // Validate name length
    if (name.length > 100) {
      return NextResponse.json(
        { error: "Name cannot exceed 100 characters" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Please enter a valid email address" },
        { status: 400 }
      );
    }

    // Validate phone length if provided
    if (phone && phone.length > 20) {
      return NextResponse.json(
        { error: "Phone number cannot exceed 20 characters" },
        { status: 400 }
      );
    }

    // Validate message length
    if (message.length > 1000) {
      return NextResponse.json(
        { error: "Message cannot exceed 1000 characters" },
        { status: 400 }
      );
    }

    // Connect to database
    await connectDB();

    // Create new contact submission with sanitized inputs
    const contact = new Contact({
      name: sanitizeString(name, 100),
      email: email.toLowerCase().trim(),
      phone: phone ? sanitizeString(phone, 20) : undefined,
      message: sanitizeString(message, 1000),
      status: "new",
    });

    await contact.save();

    return NextResponse.json(
      { success: true, message: "Message sent successfully" },
      { status: 201 }
    );
  } catch (error) {
    console.error("Contact form error:", error);
    return NextResponse.json(
      { error: "Failed to send message. Please try again." },
      { status: 500 }
    );
  }
}
