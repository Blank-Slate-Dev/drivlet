// src/app/api/driver/register/route.ts
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import Driver from "@/models/Driver";
import Contact from "@/models/Contact";
import bcrypt from "bcryptjs";

// Validate Australian phone number (relaxed for initial registration)
function validatePhone(phone: string): boolean {
  const cleanPhone = phone.replace(/[\s-]/g, "");
  // Accept various formats during registration
  return cleanPhone.length >= 8 && /^[\d+]+$/.test(cleanPhone);
}

// Validate email format
function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Validate BSB format (6 digits)
function validateBSB(bsb: string): boolean {
  const cleanBSB = bsb.replace(/[\s-]/g, "");
  return /^\d{6}$/.test(cleanBSB);
}

// Validate ABN format (11 digits) - optional
function validateABN(abn: string): boolean {
  if (!abn) return true;
  const cleanABN = abn.replace(/\s/g, "");
  return /^\d{11}$/.test(cleanABN);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Destructure fields from the simple registration form
    const {
      firstName,
      lastName,
      email,
      phone,
      password,
      confirmPassword,
      licenseNumber,
      licenseState,
      licenseExpiry,
      bsb,
      accountNumber,
      accountName,
      abn,
    } = body;

    // ===== VALIDATION =====

    // Personal information validation
    if (!firstName || firstName.trim().length < 2) {
      return NextResponse.json(
        { error: "First name is required" },
        { status: 400 }
      );
    }

    if (!lastName || lastName.trim().length < 2) {
      return NextResponse.json(
        { error: "Last name is required" },
        { status: 400 }
      );
    }

    // Account validation
    if (!email || !validateEmail(email)) {
      return NextResponse.json(
        { error: "Valid email address is required" },
        { status: 400 }
      );
    }

    if (!phone || !validatePhone(phone)) {
      return NextResponse.json(
        { error: "Valid phone number is required" },
        { status: 400 }
      );
    }

    if (!password || password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    if (password !== confirmPassword) {
      return NextResponse.json(
        { error: "Passwords do not match" },
        { status: 400 }
      );
    }

    // License validation
    if (!licenseNumber || licenseNumber.trim().length < 3) {
      return NextResponse.json(
        { error: "License number is required" },
        { status: 400 }
      );
    }

    if (!licenseExpiry) {
      return NextResponse.json(
        { error: "License expiry date is required" },
        { status: 400 }
      );
    }

    const expiryDate = new Date(licenseExpiry);
    if (expiryDate <= new Date()) {
      return NextResponse.json(
        { error: "Your license must not be expired" },
        { status: 400 }
      );
    }

    // Bank details validation
    if (!bsb || !validateBSB(bsb)) {
      return NextResponse.json(
        { error: "Valid BSB (6 digits) is required" },
        { status: 400 }
      );
    }

    if (!accountNumber || accountNumber.trim().length < 6) {
      return NextResponse.json(
        { error: "Valid account number is required" },
        { status: 400 }
      );
    }

    if (!accountName || accountName.trim().length < 2) {
      return NextResponse.json(
        { error: "Account holder name is required" },
        { status: 400 }
      );
    }

    // NOTE: ABN is no longer accepted - all drivers must be employees, not contractors

    // ===== DATABASE OPERATIONS =====

    await connectDB();

    // Check if email already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 400 }
      );
    }

    // Check if license number already registered
    const existingDriver = await Driver.findOne({
      "license.number": licenseNumber.trim().toUpperCase(),
      "license.state": licenseState,
    });
    if (existingDriver) {
      return NextResponse.json(
        { error: "A driver with this license is already registered" },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Generate username from name
    const baseUsername = `${firstName}${lastName}`
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .substring(0, 20);
    let username = baseUsername;
    let counter = 1;

    // Ensure unique username
    while (await User.findOne({ username })) {
      username = `${baseUsername}${counter}`;
      counter++;
    }

    // Create user
    const user = await User.create({
      username,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: "driver",
      isApproved: false, // Drivers need manual approval
    });

    // Format phone number
    const cleanPhone = phone.replace(/[\s-]/g, "");
    const formattedPhone = cleanPhone.startsWith("0") ? cleanPhone : `0${cleanPhone}`;

    // Default availability
    const defaultAvailability = {
      monday: { available: true, startTime: "07:00", endTime: "18:00" },
      tuesday: { available: true, startTime: "07:00", endTime: "18:00" },
      wednesday: { available: true, startTime: "07:00", endTime: "18:00" },
      thursday: { available: true, startTime: "07:00", endTime: "18:00" },
      friday: { available: true, startTime: "07:00", endTime: "18:00" },
      saturday: { available: false, startTime: "08:00", endTime: "14:00" },
      sunday: { available: false, startTime: "08:00", endTime: "14:00" },
    };

    // Create driver profile with required fields
    // Using placeholder values for fields that will be collected during onboarding
    const driver = await Driver.create({
      userId: user._id,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      dateOfBirth: new Date("1990-01-01"), // Placeholder - will be updated during verification
      phone: formattedPhone,
      address: {
        street: "PENDING - To be verified",
        suburb: "Newcastle",
        state: "NSW",
        postcode: "2300",
      },
      license: {
        number: licenseNumber.trim().toUpperCase(),
        state: licenseState || "NSW",
        class: "C", // Default to standard car license
        expiryDate: new Date(licenseExpiry),
      },
      hasOwnVehicle: false,
      availability: defaultAvailability,
      maxJobsPerDay: 10,
      preferredAreas: ["Newcastle", "Lake Macquarie", "Maitland"],
      // ENFORCED: All drivers are employees, not contractors
      employmentType: "employee",
      bankDetails: {
        accountName: accountName.trim(),
        bsb: bsb.replace(/[\s-]/g, ""),
        accountNumber: accountNumber.replace(/\s/g, ""),
      },
      emergencyContact: {
        name: "PENDING - To be provided",
        relationship: "PENDING",
        phone: "0400000000", // Placeholder - valid format, to be updated during onboarding
      },
      // Application status
      status: "pending",
      submittedAt: new Date(),
      
      // ========== ONBOARDING STATE MACHINE INITIAL VALUES ==========
      // Driver starts with onboarding not started
      onboardingStatus: "not_started",
      // Contracts not yet signed
      contracts: {},
      // Cannot accept jobs until fully onboarded
      canAcceptJobs: false,
      // NOTE: insuranceEligible is now a VIRTUAL (derived) field
      // It will be false until onboardingStatus === "active"
      // =================================================================
      
      isActive: true,
      metrics: {
        totalJobs: 0,
        completedJobs: 0,
        cancelledJobs: 0,
        averageRating: 0,
        totalRatings: 0,
      },
    });

    // Link driver profile to user
    await User.findByIdAndUpdate(user._id, { driverProfile: driver._id });

    // Create inquiry for admin review
    await Contact.create({
      name: `${firstName.trim()} ${lastName.trim()}`,
      email: email.toLowerCase(),
      phone: formattedPhone,
      message: `🚗 NEW DRIVER APPLICATION\n\nDriver: ${firstName.trim()} ${lastName.trim()}\nEmail: ${email.toLowerCase()}\nPhone: ${formattedPhone}\nLicense: ${licenseNumber.trim().toUpperCase()} (${licenseState})\nLicense Expiry: ${licenseExpiry}\n${abn ? `ABN: ${abn}\n` : ''}\nBank Account: ${accountName.trim()} (BSB: ${bsb})\n\nThis driver application requires verification of:\n- Date of birth\n- Full address\n- Emergency contact details\n- License validity\n\nDriver ID: ${driver._id}`,
      status: "new",
    });

    return NextResponse.json(
      {
        message: "Registration successful! Your application is under review.",
        userId: user._id.toString(),
        driverId: driver._id.toString(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Driver registration error:", error);

    // Handle mongoose validation errors
    if (error instanceof Error && error.name === "ValidationError") {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Registration failed. Please try again." },
      { status: 500 }
    );
  }
}
