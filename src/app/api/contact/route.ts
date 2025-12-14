// src/app/api/contact/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Contact from "@/models/Contact";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
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

    // Create new contact submission
    const contact = new Contact({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone?.trim() || undefined,
      message: message.trim(),
      status: "new",
    });

    await contact.save();
    console.log("Contact form submission saved:", contact._id);

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
