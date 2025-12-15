// src/app/api/garage/register/route.ts
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import Garage from "@/models/Garage";
import bcrypt from "bcrypt";

// Validate ABN format (11 digits)
function validateABN(abn: string): boolean {
  const cleanABN = abn.replace(/\s/g, "");
  return /^\d{11}$/.test(cleanABN);
}

// Validate BSB format (6 digits)
function validateBSB(bsb: string): boolean {
  const cleanBSB = bsb.replace(/[\s-]/g, "");
  return /^\d{6}$/.test(cleanBSB);
}

// Validate Australian phone number
function validatePhone(phone: string): boolean {
  const cleanPhone = phone.replace(/[\s-]/g, "");
  return /^(\+?61|0)[2-478]\d{8}$/.test(cleanPhone);
}

// Validate email format
function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Validate postcode (4 digits)
function validatePostcode(postcode: string): boolean {
  return /^\d{4}$/.test(postcode);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Destructure all fields from request body
    const {
      // Account
      email,
      password,
      // Business Information
      businessName,
      tradingName,
      abn,
      businessAddress,
      yearsInOperation,
      servicesOffered,
      // Contact Details
      primaryContact,
      afterHoursContact,
      // Operational Capacity
      operatingHours,
      serviceBays,
      vehicleTypes,
      averageTurnaroundTimes,
      appointmentPolicy,
      // Service Coverage
      serviceRadius,
      pickupDropoff,
      // Insurance & Compliance
      publicLiabilityInsurance,
      professionalIndemnityInsurance,
      certifications,
      // Payment & Billing
      paymentTerms,
      bankDetails,
      gstRegistered,
    } = body;

    // ===== VALIDATION =====

    // Account validation
    if (!email || !validateEmail(email)) {
      return NextResponse.json(
        { error: "Valid email address is required" },
        { status: 400 }
      );
    }

    if (!password || password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    // Business validation
    if (!businessName || businessName.trim().length < 2) {
      return NextResponse.json(
        { error: "Business name is required" },
        { status: 400 }
      );
    }

    if (!abn || !validateABN(abn)) {
      return NextResponse.json(
        { error: "Valid ABN (11 digits) is required" },
        { status: 400 }
      );
    }

    // Address validation
    if (
      !businessAddress ||
      !businessAddress.street ||
      !businessAddress.suburb ||
      !businessAddress.state ||
      !businessAddress.postcode
    ) {
      return NextResponse.json(
        { error: "Complete business address is required" },
        { status: 400 }
      );
    }

    if (!validatePostcode(businessAddress.postcode)) {
      return NextResponse.json(
        { error: "Valid postcode (4 digits) is required" },
        { status: 400 }
      );
    }

    // Services validation
    if (!servicesOffered || servicesOffered.length === 0) {
      return NextResponse.json(
        { error: "At least one service must be selected" },
        { status: 400 }
      );
    }

    // Contact validation
    if (
      !primaryContact ||
      !primaryContact.name ||
      !primaryContact.role ||
      !primaryContact.phone ||
      !primaryContact.email
    ) {
      return NextResponse.json(
        { error: "Complete primary contact information is required" },
        { status: 400 }
      );
    }

    if (!validatePhone(primaryContact.phone)) {
      return NextResponse.json(
        { error: "Valid Australian phone number is required" },
        { status: 400 }
      );
    }

    if (!validateEmail(primaryContact.email)) {
      return NextResponse.json(
        { error: "Valid primary contact email is required" },
        { status: 400 }
      );
    }

    // Operational validation
    if (!serviceBays || serviceBays < 1) {
      return NextResponse.json(
        { error: "Number of service bays is required" },
        { status: 400 }
      );
    }

    if (!vehicleTypes || vehicleTypes.length === 0) {
      return NextResponse.json(
        { error: "At least one vehicle type must be selected" },
        { status: 400 }
      );
    }

    // Insurance validation
    if (
      !publicLiabilityInsurance ||
      !publicLiabilityInsurance.provider ||
      !publicLiabilityInsurance.policyNumber ||
      !publicLiabilityInsurance.expiryDate ||
      !publicLiabilityInsurance.coverAmount
    ) {
      return NextResponse.json(
        { error: "Complete public liability insurance details are required" },
        { status: 400 }
      );
    }

    // Bank details validation
    if (
      !bankDetails ||
      !bankDetails.accountName ||
      !bankDetails.bsb ||
      !bankDetails.accountNumber
    ) {
      return NextResponse.json(
        { error: "Complete bank details are required" },
        { status: 400 }
      );
    }

    if (!validateBSB(bankDetails.bsb)) {
      return NextResponse.json(
        { error: "Valid BSB (6 digits) is required" },
        { status: 400 }
      );
    }

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

    // Check if ABN already exists
    const existingGarage = await Garage.findOne({
      abn: abn.replace(/\s/g, ""),
    });
    if (existingGarage) {
      return NextResponse.json(
        { error: "A garage with this ABN is already registered" },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Generate username from business name
    const baseUsername = businessName
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
      role: "garage",
      isApproved: false, // Garage accounts need manual approval
    });

    // Create garage profile
    const garage = await Garage.create({
      userId: user._id,
      businessName: businessName.trim(),
      tradingName: tradingName?.trim() || undefined,
      abn: abn.replace(/\s/g, ""),
      businessAddress: {
        street: businessAddress.street.trim(),
        suburb: businessAddress.suburb.trim(),
        state: businessAddress.state,
        postcode: businessAddress.postcode,
      },
      location: {
        type: "Point",
        coordinates: [0, 0], // Will be updated with geocoding later
      },
      yearsInOperation: yearsInOperation || 0,
      servicesOffered,
      primaryContact: {
        name: primaryContact.name.trim(),
        role: primaryContact.role.trim(),
        phone: primaryContact.phone.replace(/\s/g, ""),
        email: primaryContact.email.toLowerCase().trim(),
      },
      afterHoursContact: afterHoursContact?.name
        ? {
            name: afterHoursContact.name.trim(),
            phone: afterHoursContact.phone?.replace(/\s/g, ""),
          }
        : undefined,
      operatingHours: operatingHours || {
        monday: { open: "08:00", close: "17:00", closed: false },
        tuesday: { open: "08:00", close: "17:00", closed: false },
        wednesday: { open: "08:00", close: "17:00", closed: false },
        thursday: { open: "08:00", close: "17:00", closed: false },
        friday: { open: "08:00", close: "17:00", closed: false },
        saturday: { open: "08:00", close: "12:00", closed: false },
        sunday: { open: "08:00", close: "17:00", closed: true },
      },
      serviceBays,
      vehicleTypes,
      averageTurnaroundTimes: averageTurnaroundTimes || {},
      appointmentPolicy: appointmentPolicy || "both",
      serviceRadius: serviceRadius || 15,
      pickupDropoff: pickupDropoff || { available: false },
      publicLiabilityInsurance: {
        provider: publicLiabilityInsurance.provider.trim(),
        policyNumber: publicLiabilityInsurance.policyNumber.trim(),
        expiryDate: new Date(publicLiabilityInsurance.expiryDate),
        coverAmount: publicLiabilityInsurance.coverAmount,
      },
      professionalIndemnityInsurance: professionalIndemnityInsurance?.provider
        ? {
            provider: professionalIndemnityInsurance.provider.trim(),
            policyNumber: professionalIndemnityInsurance.policyNumber?.trim(),
            expiryDate: professionalIndemnityInsurance.expiryDate
              ? new Date(professionalIndemnityInsurance.expiryDate)
              : undefined,
            coverAmount: professionalIndemnityInsurance.coverAmount,
          }
        : undefined,
      certifications: certifications || [],
      paymentTerms: paymentTerms || "14_days",
      bankDetails: {
        accountName: bankDetails.accountName.trim(),
        bsb: bankDetails.bsb.replace(/[\s-]/g, ""),
        accountNumber: bankDetails.accountNumber.replace(/\s/g, ""),
      },
      gstRegistered: gstRegistered || false,
      status: "pending",
      submittedAt: new Date(),
    });

    // Link garage to user
    await User.findByIdAndUpdate(user._id, { garageProfile: garage._id });

    return NextResponse.json(
      {
        message: "Registration successful! Your application is under review.",
        userId: user._id.toString(),
        garageId: garage._id.toString(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Garage registration error:", error);

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
