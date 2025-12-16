// src/app/api/driver/register/route.ts
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import Driver from "@/models/Driver";
import bcrypt from "bcrypt";

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

// Validate BSB format (6 digits)
function validateBSB(bsb: string): boolean {
  const cleanBSB = bsb.replace(/[\s-]/g, "");
  return /^\d{6}$/.test(cleanBSB);
}

// Validate ABN format (11 digits) - optional for contractors
function validateABN(abn: string): boolean {
  if (!abn) return true;
  const cleanABN = abn.replace(/\s/g, "");
  return /^\d{11}$/.test(cleanABN);
}

// Calculate age from date of birth
function calculateAge(dob: Date): number {
  const today = new Date();
  const birthDate = new Date(dob);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      // Account
      email,
      password,
      // Personal Information
      firstName,
      lastName,
      dateOfBirth,
      phone,
      address,
      // License Information
      license,
      // Vehicle Information
      hasOwnVehicle,
      vehicle,
      // Availability
      availability,
      maxJobsPerDay,
      preferredAreas,
      // Employment Details
      employmentType,
      tfn,
      abn,
      superannuationFund,
      superannuationMemberNumber,
      // Banking
      bankDetails,
      // Emergency Contact
      emergencyContact,
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

    if (!dateOfBirth) {
      return NextResponse.json(
        { error: "Date of birth is required" },
        { status: 400 }
      );
    }

    const age = calculateAge(new Date(dateOfBirth));
    if (age < 18) {
      return NextResponse.json(
        { error: "You must be at least 18 years old to register as a driver" },
        { status: 400 }
      );
    }

    if (!phone || !validatePhone(phone)) {
      return NextResponse.json(
        { error: "Valid Australian phone number is required" },
        { status: 400 }
      );
    }

    // Address validation
    if (
      !address ||
      !address.street ||
      !address.suburb ||
      !address.state ||
      !address.postcode
    ) {
      return NextResponse.json(
        { error: "Complete address is required" },
        { status: 400 }
      );
    }

    if (!validatePostcode(address.postcode)) {
      return NextResponse.json(
        { error: "Valid postcode (4 digits) is required" },
        { status: 400 }
      );
    }

    // License validation
    if (
      !license ||
      !license.number ||
      !license.state ||
      !license.class ||
      !license.expiryDate
    ) {
      return NextResponse.json(
        { error: "Complete license information is required" },
        { status: 400 }
      );
    }

    const licenseExpiry = new Date(license.expiryDate);
    if (licenseExpiry <= new Date()) {
      return NextResponse.json(
        { error: "Your license must not be expired" },
        { status: 400 }
      );
    }

    // Vehicle validation (if they have one)
    if (hasOwnVehicle) {
      if (
        !vehicle ||
        !vehicle.make ||
        !vehicle.model ||
        !vehicle.year ||
        !vehicle.registration ||
        !vehicle.registrationExpiry
      ) {
        return NextResponse.json(
          { error: "Complete vehicle information is required if you have your own vehicle" },
          { status: 400 }
        );
      }

      const regoExpiry = new Date(vehicle.registrationExpiry);
      if (regoExpiry <= new Date()) {
        return NextResponse.json(
          { error: "Vehicle registration must not be expired" },
          { status: 400 }
        );
      }
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

    // Emergency contact validation
    if (
      !emergencyContact ||
      !emergencyContact.name ||
      !emergencyContact.relationship ||
      !emergencyContact.phone
    ) {
      return NextResponse.json(
        { error: "Emergency contact information is required" },
        { status: 400 }
      );
    }

    if (!validatePhone(emergencyContact.phone)) {
      return NextResponse.json(
        { error: "Valid emergency contact phone number is required" },
        { status: 400 }
      );
    }

    // Contractor ABN validation
    if (employmentType === "contractor" && abn && !validateABN(abn)) {
      return NextResponse.json(
        { error: "Valid ABN (11 digits) is required for contractors" },
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

    // Check if license number already registered
    const existingDriver = await Driver.findOne({
      "license.number": license.number,
      "license.state": license.state,
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

    // Prepare availability with defaults
    const defaultAvailability = {
      monday: { available: true, startTime: "07:00", endTime: "18:00" },
      tuesday: { available: true, startTime: "07:00", endTime: "18:00" },
      wednesday: { available: true, startTime: "07:00", endTime: "18:00" },
      thursday: { available: true, startTime: "07:00", endTime: "18:00" },
      friday: { available: true, startTime: "07:00", endTime: "18:00" },
      saturday: { available: false, startTime: "08:00", endTime: "14:00" },
      sunday: { available: false, startTime: "08:00", endTime: "14:00" },
    };

    // Create driver profile
    const driver = await Driver.create({
      userId: user._id,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      dateOfBirth: new Date(dateOfBirth),
      phone: phone.replace(/[\s-]/g, ""),
      address: {
        street: address.street.trim(),
        suburb: address.suburb.trim(),
        state: address.state,
        postcode: address.postcode,
      },
      license: {
        number: license.number.trim().toUpperCase(),
        state: license.state,
        class: license.class,
        expiryDate: new Date(license.expiryDate),
        photoUrl: license.photoUrl || undefined,
      },
      hasOwnVehicle: hasOwnVehicle || false,
      vehicle: hasOwnVehicle && vehicle
        ? {
            make: vehicle.make.trim(),
            model: vehicle.model.trim(),
            year: vehicle.year,
            color: vehicle.color?.trim(),
            registration: vehicle.registration.trim().toUpperCase(),
            registrationState: vehicle.registrationState,
            registrationExpiry: new Date(vehicle.registrationExpiry),
            insuranceProvider: vehicle.insuranceProvider?.trim(),
            insurancePolicyNumber: vehicle.insurancePolicyNumber?.trim(),
            insuranceExpiry: vehicle.insuranceExpiry
              ? new Date(vehicle.insuranceExpiry)
              : undefined,
          }
        : undefined,
      availability: availability || defaultAvailability,
      maxJobsPerDay: maxJobsPerDay || 10,
      preferredAreas: preferredAreas || [],
      employmentType: employmentType || "employee",
      tfn: tfn?.trim() || undefined,
      abn: abn?.replace(/\s/g, "") || undefined,
      superannuationFund: superannuationFund?.trim() || undefined,
      superannuationMemberNumber: superannuationMemberNumber?.trim() || undefined,
      bankDetails: {
        accountName: bankDetails.accountName.trim(),
        bsb: bankDetails.bsb.replace(/[\s-]/g, ""),
        accountNumber: bankDetails.accountNumber.replace(/\s/g, ""),
      },
      emergencyContact: {
        name: emergencyContact.name.trim(),
        relationship: emergencyContact.relationship.trim(),
        phone: emergencyContact.phone.replace(/[\s-]/g, ""),
      },
      status: "pending",
      submittedAt: new Date(),
      isActive: true,
      canAcceptJobs: false, // Will be set to true after approval
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
