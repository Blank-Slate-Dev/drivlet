// src/app/api/garage/register/route.ts
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import Garage, { ServiceType, VehicleType } from "@/models/Garage";
import Contact from "@/models/Contact";
import bcrypt from "bcryptjs";
import { validatePassword, validateEmail as validateEmailLib, validatePostcode as validatePostcodeLib, validateABN as validateABNLib } from "@/lib/validation";

// Use centralized validation functions
const validateEmail = validateEmailLib;
const validatePostcode = validatePostcodeLib;
const validateABN = validateABNLib;

// Map user-friendly service names to ServiceType enum values
function mapServicesToServiceTypes(services: string[]): ServiceType[] {
  const serviceMap: Record<string, ServiceType> = {
    "Logbook Service": "mechanical",
    "Major Service": "mechanical",
    "Minor Service": "mechanical",
    "Brake Service": "mechanical",
    "Tyre Service": "tyres",
    "Diagnostics": "electrical",
    "Air Conditioning": "aircon",
    "Electrical": "electrical",
    "Transmission": "mechanical",
    "Detailing": "detailing",
  };

  const mapped = services.map(s => serviceMap[s] || "other");
  // Remove duplicates
  return [...new Set(mapped)] as ServiceType[];
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Destructure fields from the simple registration form
    const {
      businessName,
      abn,
      address,
      suburb,
      postcode,
      state,
      // Linked garage fields (the physical garage they represent)
      linkedGarageName,
      linkedGarageAddress,
      linkedGaragePlaceId,
      linkedGarageLat,
      linkedGarageLng,
      contactName,
      email,
      phone,
      password,
      confirmPassword,
      website,
      services,
      openingHours,
      capacity,
    } = body;

    // ===== VALIDATION =====

    // Business validation
    if (!businessName || businessName.trim().length < 2) {
      return NextResponse.json(
        { error: "Business name is required" },
        { status: 400 }
      );
    }

    // ABN is required by the Garage model
    if (!abn || !validateABN(abn)) {
      return NextResponse.json(
        { error: "Valid ABN (11 digits) is required" },
        { status: 400 }
      );
    }

    // Linked garage validation - this is the physical garage they represent
    if (!linkedGarageName || linkedGarageName.trim().length < 2) {
      return NextResponse.json(
        { error: "Please select the garage/mechanic you represent" },
        { status: 400 }
      );
    }

    // Address validation
    if (!address || address.trim().length < 3) {
      return NextResponse.json(
        { error: "Street address is required" },
        { status: 400 }
      );
    }

    if (!suburb || suburb.trim().length < 2) {
      return NextResponse.json(
        { error: "Suburb is required" },
        { status: 400 }
      );
    }

    if (!postcode || !validatePostcode(postcode)) {
      return NextResponse.json(
        { error: "Valid postcode (4 digits) is required" },
        { status: 400 }
      );
    }

    if (!state) {
      return NextResponse.json(
        { error: "State is required" },
        { status: 400 }
      );
    }

    // Contact validation
    if (!contactName || contactName.trim().length < 2) {
      return NextResponse.json(
        { error: "Contact name is required" },
        { status: 400 }
      );
    }

    if (!email || !validateEmail(email)) {
      return NextResponse.json(
        { error: "Valid email address is required" },
        { status: 400 }
      );
    }

    if (!phone || phone.trim().length < 8) {
      return NextResponse.json(
        { error: "Phone number is required" },
        { status: 400 }
      );
    }

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { error: passwordValidation.error },
        { status: 400 }
      );
    }

    if (password !== confirmPassword) {
      return NextResponse.json(
        { error: "Passwords do not match" },
        { status: 400 }
      );
    }

    // Services validation
    if (!services || services.length === 0) {
      return NextResponse.json(
        { error: "At least one service must be selected" },
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
    const cleanABN = abn.replace(/\s/g, "");
    const existingGarage = await Garage.findOne({ abn: cleanABN });
    if (existingGarage) {
      return NextResponse.json(
        { error: "A garage with this ABN is already registered" },
        { status: 400 }
      );
    }

    // Check if linked garage (placeId) is already registered
    // This prevents multiple accounts for the same physical garage
    if (linkedGaragePlaceId) {
      const existingGarageByPlaceId = await Garage.findOne({
        linkedGaragePlaceId: linkedGaragePlaceId,
      });
      if (existingGarageByPlaceId) {
        return NextResponse.json(
          { error: "This garage location is already registered with another account. Please contact support if you believe this is an error." },
          { status: 400 }
        );
      }
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

    // Parse capacity to get serviceBays number
    const capacityMap: Record<string, number> = {
      "1-5": 2,
      "6-10": 4,
      "11-20": 6,
      "20+": 10,
    };

    // Format phone number (ensure it passes validation)
    const cleanPhone = phone.replace(/[\s-]/g, "");
    const formattedPhone = cleanPhone.startsWith("0") ? cleanPhone : `0${cleanPhone}`;

    // Default vehicle types that most garages handle
    const defaultVehicleTypes: VehicleType[] = ["sedan", "suv", "ute", "commercial"];

    // Map services to ServiceType enum
    const mappedServices = mapServicesToServiceTypes(services);

    // Create garage profile with all required fields
    // Using placeholder values for fields that will be collected during onboarding
    const garage = await Garage.create({
      userId: user._id,
      // Linked garage (the physical garage they represent for booking matching)
      linkedGarageName: linkedGarageName?.trim() || "",
      linkedGarageAddress: linkedGarageAddress?.trim() || "",
      linkedGaragePlaceId: linkedGaragePlaceId || "",
      linkedGarageCoordinates: linkedGarageLat && linkedGarageLng ? {
        lat: linkedGarageLat,
        lng: linkedGarageLng,
      } : undefined,
      businessName: businessName.trim(),
      abn: cleanABN,
      businessAddress: {
        street: address.trim(),
        suburb: suburb.trim(),
        state: state,
        postcode: postcode,
      },
      location: {
        type: "Point",
        coordinates: [0, 0], // Will be updated with geocoding later
      },
      yearsInOperation: 0, // Will be updated during onboarding
      servicesOffered: mappedServices,
      primaryContact: {
        name: contactName.trim(),
        role: "Owner/Manager",
        phone: formattedPhone,
        email: email.toLowerCase().trim(),
      },
      operatingHours: {
        monday: { open: openingHours?.split(" - ")[0] || "08:00", close: openingHours?.split(" - ")[1]?.replace("pm", ":00").replace("am", ":00") || "17:00", closed: false },
        tuesday: { open: "08:00", close: "17:00", closed: false },
        wednesday: { open: "08:00", close: "17:00", closed: false },
        thursday: { open: "08:00", close: "17:00", closed: false },
        friday: { open: "08:00", close: "17:00", closed: false },
        saturday: { open: "08:00", close: "12:00", closed: false },
        sunday: { open: "08:00", close: "17:00", closed: true },
      },
      serviceBays: capacityMap[capacity] || 2,
      vehicleTypes: defaultVehicleTypes,
      appointmentPolicy: "both",
      serviceRadius: 15,
      pickupDropoff: { available: false },
      // Placeholder insurance - will need to be updated during onboarding/verification
      publicLiabilityInsurance: {
        provider: "PENDING - To be verified",
        policyNumber: "PENDING",
        expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
        coverAmount: 0,
      },
      certifications: [],
      paymentTerms: "14_days",
      // Placeholder bank details - will need to be updated during onboarding
      bankDetails: {
        accountName: "PENDING - To be verified",
        bsb: "000000",
        accountNumber: "00000000",
      },
      gstRegistered: false,
      status: "pending",
      submittedAt: new Date(),
    });

    // Link garage to user
    await User.findByIdAndUpdate(user._id, { garageProfile: garage._id });

    // Create inquiry for admin review
    await Contact.create({
      name: `${businessName.trim()} (${contactName.trim()})`,
      email: email.toLowerCase(),
      phone: formattedPhone,
      message: `🔧 NEW GARAGE APPLICATION\n\nBusiness: ${businessName.trim()}\nABN: ${cleanABN}\n\n🏪 LINKED GARAGE (for booking matching):\n${linkedGarageName || "Not specified"}\n${linkedGarageAddress || ""}\nPlace ID: ${linkedGaragePlaceId || "None"}\n\nContact: ${contactName.trim()}\nEmail: ${email.toLowerCase()}\nPhone: ${formattedPhone}\n${website ? `Website: ${website}\n` : ''}\nAddress: ${address.trim()}, ${suburb.trim()} ${state} ${postcode}\n\nServices: ${services.join(", ")}\nCapacity: ${capacity || "Not specified"}\nOpening Hours: ${openingHours || "Not specified"}\n\nThis garage application requires verification of:\n- Public liability insurance\n- Bank details\n- ABN verification\n- Business credentials\n\nGarage ID: ${garage._id}`,
      status: "new",
    });

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
