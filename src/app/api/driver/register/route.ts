// src/app/api/driver/register/route.ts
import { NextResponse } from "next/server";
import { put, del } from "@vercel/blob";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import Driver from "@/models/Driver";
import bcrypt from "bcryptjs";
import { notifyAdmin } from "@/lib/notifications";
import { validatePassword, validateEmail as validateEmailLib, validateBSB as validateBSBLib } from "@/lib/validation";

// Validate Australian phone number (relaxed for initial registration)
function validatePhone(phone: string): boolean {
  const cleanPhone = phone.replace(/[\s-]/g, "");
  // Accept various formats during registration
  return cleanPhone.length >= 8 && /^[\d+]+$/.test(cleanPhone);
}

// Use centralized validation functions
const validateEmail = validateEmailLib;
const validateBSB = validateBSBLib;

const AU_STATES = ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "NT", "ACT"];
const RIGHT_TO_WORK_STATUSES = ["citizen", "permanent_resident", "visa_with_work_rights"];

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const DOC_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const MAX_FILE_BYTES = 4 * 1024 * 1024; // 4MB per file

const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

// Compute age in whole years from a date of birth
function ageFrom(dob: Date): number {
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}

// Add N months to a date (used for police check expiry)
function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

export async function POST(request: Request) {
  // Track uploaded blob URLs so we can clean them up if DB creation fails
  const uploadedUrls: string[] = [];

  try {
    const formData = await request.formData();

    // ===== TEXT FIELDS =====
    const getStr = (key: string) => {
      const v = formData.get(key);
      return typeof v === "string" ? v : "";
    };

    const firstName = getStr("firstName");
    const lastName = getStr("lastName");
    const email = getStr("email");
    const phone = getStr("phone");
    const password = getStr("password");
    const confirmPassword = getStr("confirmPassword");
    const licenseNumber = getStr("licenseNumber");
    const licenseState = getStr("licenseState");
    const licenseExpiry = getStr("licenseExpiry");
    const bsb = getStr("bsb");
    const accountNumber = getStr("accountNumber");
    const accountName = getStr("accountName");

    // New personal / eligibility fields
    const dateOfBirth = getStr("dateOfBirth");
    const addressStreet = getStr("addressStreet");
    const addressSuburb = getStr("addressSuburb");
    const addressState = getStr("addressState");
    const addressPostcode = getStr("addressPostcode");
    const canDriveManual = getStr("canDriveManual") === "true";
    const emergencyContactName = getStr("emergencyContactName");
    const emergencyContactRelationship = getStr("emergencyContactRelationship");
    const emergencyContactPhone = getStr("emergencyContactPhone");
    const rightToWorkStatus = getStr("rightToWorkStatus");
    const visaSubclass = getStr("visaSubclass");
    const policeCheckCertificateNumber = getStr("policeCheckCertificateNumber");
    const policeCheckIssueDate = getStr("policeCheckIssueDate");

    // New file fields
    const licenceFront = formData.get("licenceFront");
    const licenceBack = formData.get("licenceBack");
    const policeCheckDocument = formData.get("policeCheckDocument");

    // ===== VALIDATION (text) =====

    // Personal information validation
    if (!firstName || firstName.trim().length < 2) {
      return NextResponse.json({ error: "First name is required" }, { status: 400 });
    }
    if (!lastName || lastName.trim().length < 2) {
      return NextResponse.json({ error: "Last name is required" }, { status: 400 });
    }

    // Account validation
    if (!email || !validateEmail(email)) {
      return NextResponse.json({ error: "Valid email address is required" }, { status: 400 });
    }
    if (!phone || !validatePhone(phone)) {
      return NextResponse.json({ error: "Valid phone number is required" }, { status: 400 });
    }

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return NextResponse.json({ error: passwordValidation.error }, { status: 400 });
    }
    if (password !== confirmPassword) {
      return NextResponse.json({ error: "Passwords do not match" }, { status: 400 });
    }

    // License validation
    if (!licenseNumber || licenseNumber.trim().length < 3) {
      return NextResponse.json({ error: "License number is required" }, { status: 400 });
    }
    if (!licenseExpiry) {
      return NextResponse.json({ error: "License expiry date is required" }, { status: 400 });
    }
    const expiryDate = new Date(licenseExpiry);
    if (isNaN(expiryDate.getTime()) || expiryDate <= new Date()) {
      return NextResponse.json({ error: "Your license must not be expired" }, { status: 400 });
    }

    // Date of birth — required, must be 18+
    if (!dateOfBirth) {
      return NextResponse.json({ error: "Date of birth is required" }, { status: 400 });
    }
    const dob = new Date(dateOfBirth);
    if (isNaN(dob.getTime())) {
      return NextResponse.json({ error: "Please enter a valid date of birth" }, { status: 400 });
    }
    if (ageFrom(dob) < 18) {
      return NextResponse.json({ error: "You must be at least 18 years old to drive with Drivlet" }, { status: 400 });
    }

    // Residential address — all required
    if (!addressStreet.trim()) {
      return NextResponse.json({ error: "Street address is required" }, { status: 400 });
    }
    if (!addressSuburb.trim()) {
      return NextResponse.json({ error: "Suburb is required" }, { status: 400 });
    }
    if (!AU_STATES.includes(addressState)) {
      return NextResponse.json({ error: "Please select a valid state" }, { status: 400 });
    }
    if (!/^\d{4}$/.test(addressPostcode.trim())) {
      return NextResponse.json({ error: "Postcode must be 4 digits" }, { status: 400 });
    }

    // Emergency contact — all required
    if (!emergencyContactName.trim()) {
      return NextResponse.json({ error: "Emergency contact name is required" }, { status: 400 });
    }
    if (!emergencyContactRelationship.trim()) {
      return NextResponse.json({ error: "Emergency contact relationship is required" }, { status: 400 });
    }
    if (!emergencyContactPhone.trim() || !validatePhone(emergencyContactPhone)) {
      return NextResponse.json({ error: "Valid emergency contact phone is required" }, { status: 400 });
    }

    // Right to work — required enum, visa subclass required when visa
    if (!RIGHT_TO_WORK_STATUSES.includes(rightToWorkStatus)) {
      return NextResponse.json({ error: "Please select your right to work status" }, { status: 400 });
    }
    if (rightToWorkStatus === "visa_with_work_rights" && !visaSubclass.trim()) {
      return NextResponse.json({ error: "Visa subclass is required for visa holders" }, { status: 400 });
    }

    // Bank details validation — OPTIONAL at registration.
    // Payment details are collected securely after the application is approved,
    // but if any banking field is supplied it must still be valid and complete.
    const hasBankDetails = Boolean(bsb.trim() || accountNumber.trim() || accountName.trim());
    if (hasBankDetails) {
      if (!bsb || !validateBSB(bsb)) {
        return NextResponse.json({ error: "Valid BSB (6 digits) is required" }, { status: 400 });
      }
      if (!accountNumber || accountNumber.trim().length < 6) {
        return NextResponse.json({ error: "Valid account number is required" }, { status: 400 });
      }
      if (!accountName || accountName.trim().length < 2) {
        return NextResponse.json({ error: "Account holder name is required" }, { status: 400 });
      }
    }

    // Police check details
    if (!policeCheckCertificateNumber.trim()) {
      return NextResponse.json({ error: "Police check certificate number is required" }, { status: 400 });
    }
    if (!policeCheckIssueDate) {
      return NextResponse.json({ error: "Police check issue date is required" }, { status: 400 });
    }
    const policeIssue = new Date(policeCheckIssueDate);
    if (isNaN(policeIssue.getTime())) {
      return NextResponse.json({ error: "Please enter a valid police check issue date" }, { status: 400 });
    }
    if (policeIssue > new Date()) {
      return NextResponse.json({ error: "Police check issue date cannot be in the future" }, { status: 400 });
    }
    // BUSINESS RULE: police check must have been issued within the last 12 months
    if (policeIssue < addMonths(new Date(), -12)) {
      return NextResponse.json(
        { error: "Your National Police Check must have been issued within the last 12 months" },
        { status: 400 }
      );
    }

    // ===== VALIDATION (files) =====
    const validateFile = (
      file: FormDataEntryValue | null,
      label: string,
      allowedTypes: string[]
    ): { ok: true; file: File } | { ok: false; error: string } => {
      if (!file || !(file instanceof File) || file.size === 0) {
        return { ok: false, error: `${label} is required` };
      }
      if (!allowedTypes.includes(file.type)) {
        const desc = allowedTypes.includes("application/pdf") ? "an image (JPEG, PNG, WebP) or PDF" : "an image (JPEG, PNG, WebP)";
        return { ok: false, error: `${label} must be ${desc}` };
      }
      if (file.size > MAX_FILE_BYTES) {
        return { ok: false, error: `${label} is too large (max 4MB)` };
      }
      return { ok: true, file };
    };

    const frontCheck = validateFile(licenceFront, "Front of licence", IMAGE_TYPES);
    if (!frontCheck.ok) return NextResponse.json({ error: frontCheck.error }, { status: 400 });
    const backCheck = validateFile(licenceBack, "Back of licence", IMAGE_TYPES);
    if (!backCheck.ok) return NextResponse.json({ error: backCheck.error }, { status: 400 });
    const policeCheck = validateFile(policeCheckDocument, "Police check document", DOC_TYPES);
    if (!policeCheck.ok) return NextResponse.json({ error: policeCheck.error }, { status: 400 });

    // ===== DATABASE OPERATIONS =====

    await connectDB();

    // Check if email already exists — abort BEFORE any uploads
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 400 });
    }

    // Check if license number already registered — abort BEFORE any uploads
    const existingDriver = await Driver.findOne({
      "license.number": licenseNumber.trim().toUpperCase(),
      "license.state": licenseState,
    });
    if (existingDriver) {
      return NextResponse.json({ error: "A driver with this license is already registered" }, { status: 400 });
    }

    // ===== FILE UPLOADS (after full validation + duplicate checks) =====
    const applicationId = crypto.randomUUID();
    const uploadOne = async (file: File, name: string): Promise<string> => {
      const ext = EXT_BY_TYPE[file.type] || "bin";
      const blob = await put(`driver-applications/${applicationId}/${name}.${ext}`, file, {
        access: "public",
      });
      uploadedUrls.push(blob.url);
      return blob.url;
    };

    const licenceFrontUrl = await uploadOne(frontCheck.file, "licence-front");
    const licenceBackUrl = await uploadOne(backCheck.file, "licence-back");
    const policeCheckUrl = await uploadOne(policeCheck.file, "police-check");

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Generate username from name
    const baseUsername = `${firstName}${lastName}`
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .substring(0, 20);
    let username = baseUsername;
    let counter = 1;

    // Ensure unique username — retry on duplicate key error (TOCTOU safe)
    let user;
    const MAX_RETRIES = 5;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      // Check for existing username
      while (await User.findOne({ username })) {
        username = `${baseUsername}${counter}`;
        counter++;
      }
      try {
        user = await User.create({
          username,
          email: email.toLowerCase(),
          password: hashedPassword,
          role: "driver",
          isApproved: false,
        });
        break; // success
      } catch (err: unknown) {
        const mongoErr = err as { code?: number };
        if (mongoErr.code === 11000 && attempt < MAX_RETRIES - 1) {
          // Duplicate key — try next username
          username = `${baseUsername}${counter}`;
          counter++;
          continue;
        }
        throw err;
      }
    }
    if (!user) {
      throw new Error("Failed to generate unique username");
    }

    // Format phone numbers
    const cleanPhone = phone.replace(/[\s-]/g, "");
    const formattedPhone = cleanPhone.startsWith("0") ? cleanPhone : `0${cleanPhone}`;
    const cleanEmergencyPhone = emergencyContactPhone.replace(/[\s-]/g, "");
    const formattedEmergencyPhone = cleanEmergencyPhone.startsWith("0") ? cleanEmergencyPhone : `0${cleanEmergencyPhone}`;

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

    // Create driver profile with the full applicant details now collected at registration
    const driver = await Driver.create({
      userId: user._id,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      dateOfBirth: dob,
      phone: formattedPhone,
      address: {
        street: addressStreet.trim(),
        suburb: addressSuburb.trim(),
        state: addressState,
        postcode: addressPostcode.trim(),
      },
      license: {
        number: licenseNumber.trim().toUpperCase(),
        state: licenseState || "NSW",
        class: "C", // Default to standard car license
        expiryDate: new Date(licenseExpiry),
        frontPhotoUrl: licenceFrontUrl,
        backPhotoUrl: licenceBackUrl,
      },
      canDriveManual,
      rightToWork: {
        // Validated above against RIGHT_TO_WORK_STATUSES
        status: rightToWorkStatus as "citizen" | "permanent_resident" | "visa_with_work_rights",
        ...(rightToWorkStatus === "visa_with_work_rights" && { visaSubclass: visaSubclass.trim() }),
      },
      policeCheck: {
        completed: true,
        certificateNumber: policeCheckCertificateNumber.trim(),
        issueDate: policeIssue,
        expiryDate: addMonths(policeIssue, 12),
        documentUrl: policeCheckUrl,
      },
      hasOwnVehicle: false,
      availability: defaultAvailability,
      maxJobsPerDay: 10,
      preferredAreas: ["Newcastle", "Lake Macquarie", "Maitland"],
      // ENFORCED: All drivers are employees, not contractors
      employmentType: "employee",
      // Banking is optional at registration — collected securely after approval
      ...(hasBankDetails && {
        bankDetails: {
          accountName: accountName.trim(),
          bsb: bsb.replace(/[\s-]/g, ""),
          accountNumber: accountNumber.replace(/\s/g, ""),
        },
      }),
      emergencyContact: {
        name: emergencyContactName.trim(),
        relationship: emergencyContactRelationship.trim(),
        phone: formattedEmergencyPhone,
      },
      // Application status
      status: "pending",
      submittedAt: new Date(),

      // ========== ONBOARDING STATE MACHINE INITIAL VALUES ==========
      onboardingStatus: "not_started",
      contracts: {},
      canAcceptJobs: false,
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

    // Notify admins of the new application (non-blocking — never fails registration)
    const fullName = `${firstName.trim()} ${lastName.trim()}`;
    notifyAdmin({
      type: "system",
      title: `New driver application — ${fullName}`,
      message: `${fullName} applied to drive (${email.toLowerCase()}, ${formattedPhone}). Review in the Drivers section.`,
    }).catch(console.error);

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

    // Best-effort cleanup: remove any blobs uploaded before the DB failure
    if (uploadedUrls.length > 0) {
      try {
        await del(uploadedUrls);
      } catch (cleanupErr) {
        console.error("Failed to clean up uploaded blobs after registration failure:", cleanupErr);
      }
    }

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
