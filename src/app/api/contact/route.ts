// src/app/api/contact/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Contact from "@/models/Contact";
import { withRateLimit, RATE_LIMITS } from "@/lib/rateLimit";
import { sanitizeString } from "@/lib/validation";
import { sendEmail } from "@/lib/email";
import { SUPPORT_EMAIL } from "@/lib/policy";

export async function POST(request: NextRequest) {
  // Apply rate limiting - prevent spam
  const rateLimit = await withRateLimit(request, RATE_LIMITS.form, "contact");
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

    // Copy the inquiry to the support inbox so the team sees it without
    // checking the admin dashboard. Awaited (Vercel can kill fire-and-forget
    // work) but non-fatal — the inquiry is already saved above.
    try {
      const cleanName = sanitizeString(name, 100);
      const cleanEmail = email.toLowerCase().trim();
      const cleanPhone = phone ? sanitizeString(phone, 20) : "";
      const cleanMessage = sanitizeString(message, 1000);
      await sendEmail({
        to: SUPPORT_EMAIL,
        toName: "Drivlet Support",
        subject: `New website inquiry from ${cleanName}`,
        textContent: [
          `New inquiry via the contact form:`,
          ``,
          `Name: ${cleanName}`,
          `Email: ${cleanEmail}`,
          cleanPhone ? `Phone: ${cleanPhone}` : null,
          ``,
          `Message:`,
          cleanMessage,
          ``,
          `Reply directly to the customer, and mark it handled in Admin → Inquiries.`,
        ]
          .filter((l) => l !== null)
          .join("\n"),
        htmlContent: [
          `<p style="color:#475569;font-size:15px;"><strong>New inquiry via the contact form</strong></p>`,
          `<table style="font-size:14px;color:#1e293b;">`,
          `<tr><td style="padding:2px 12px 2px 0;color:#64748b;">Name</td><td>${cleanName.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</td></tr>`,
          `<tr><td style="padding:2px 12px 2px 0;color:#64748b;">Email</td><td><a href="mailto:${cleanEmail}">${cleanEmail}</a></td></tr>`,
          cleanPhone ? `<tr><td style="padding:2px 12px 2px 0;color:#64748b;">Phone</td><td>${cleanPhone.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</td></tr>` : "",
          `</table>`,
          `<div style="margin-top:12px;padding:12px 16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;color:#334155;font-size:14px;white-space:pre-wrap;">${cleanMessage.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>`,
          `<p style="margin-top:16px;color:#94a3b8;font-size:12px;">Reply directly to the customer, and mark it handled in Admin → Inquiries.</p>`,
        ].join(""),
      });
    } catch (emailErr) {
      console.error("Failed to email inquiry to support inbox:", emailErr);
    }

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
