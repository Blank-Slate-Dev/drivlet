// src/app/api/driver/onboarding/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectDB } from "@/lib/mongodb";
import Driver from "@/models/Driver";
import User from "@/models/User";

// GET /api/driver/onboarding - Get current onboarding status
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (session.user.role !== "driver") {
      return NextResponse.json(
        { error: "Only drivers can access this endpoint" },
        { status: 403 }
      );
    }

    await connectDB();

    const user = await User.findById(session.user.id);
    if (!user?.driverProfile) {
      return NextResponse.json(
        { error: "Driver profile not found" },
        { status: 404 }
      );
    }

    const driver = await Driver.findById(user.driverProfile);
    if (!driver) {
      return NextResponse.json(
        { error: "Driver not found" },
        { status: 404 }
      );
    }

    // Check if driver is approved
    if (!user.isApproved || driver.status !== "approved") {
      return NextResponse.json(
        { error: "Driver application not yet approved" },
        { status: 403 }
      );
    }

    // AUTO-FIX: If driver is approved but still has "not_started" onboarding status,
    // automatically advance them to "contracts_pending"
    // This handles legacy drivers approved before the state machine was added
    if (driver.status === "approved" && driver.onboardingStatus === "not_started") {
      driver.onboardingStatus = "contracts_pending";
      driver.canAcceptJobs = false;
      await driver.save();
    }

    return NextResponse.json({
      driver: {
        _id: driver._id.toString(),
        firstName: driver.firstName,
        lastName: driver.lastName,
        email: user.email,
        status: driver.status,
        onboardingStatus: driver.onboardingStatus,
        policeCheck: driver.policeCheck,
        // Explicitly compute derived field for consistency
        insuranceEligible: driver.employmentType === "employee" && driver.onboardingStatus === "active",
        canAcceptJobs: driver.canAcceptJobs,
        contracts: driver.contracts,
        employeeStartDate: driver.employeeStartDate,
      },
    });
  } catch (error) {
    console.error("Error fetching onboarding status:", error);
    return NextResponse.json(
      { error: "Failed to fetch onboarding status" },
      { status: 500 }
    );
  }
}

// POST /api/driver/onboarding - Sign contracts and complete onboarding
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (session.user.role !== "driver") {
      return NextResponse.json(
        { error: "Only drivers can access this endpoint" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { 
      employmentContractAccepted,
      driverAgreementAccepted,
      workHealthSafetyAccepted,
      codeOfConductAccepted,
      // Optional additional employment details
      superannuationFund,
      superannuationMemberNumber,
    } = body;

    // Validate required acceptances
    if (!employmentContractAccepted || !driverAgreementAccepted || 
        !workHealthSafetyAccepted || !codeOfConductAccepted) {
      return NextResponse.json(
        { error: "All contracts must be accepted to continue" },
        { status: 400 }
      );
    }

    await connectDB();

    const user = await User.findById(session.user.id);
    if (!user?.driverProfile) {
      return NextResponse.json(
        { error: "Driver profile not found" },
        { status: 404 }
      );
    }

    const driver = await Driver.findById(user.driverProfile);
    if (!driver) {
      return NextResponse.json(
        { error: "Driver not found" },
        { status: 404 }
      );
    }

    // CRITICAL: Verify driver is in the correct state to sign contracts
    if (driver.status !== "approved") {
      return NextResponse.json(
        { error: "Driver must be approved before signing contracts" },
        { status: 403 }
      );
    }

    // CRITICAL: Verify police check is complete
    if (!driver.policeCheck?.completed || !driver.policeCheck?.documentUrl) {
      return NextResponse.json(
        { error: "Police check must be uploaded before completing onboarding" },
        { status: 400 }
      );
    }

    // Check onboarding status - allow both "contracts_pending" and "not_started" for legacy data
    if (driver.onboardingStatus === "active") {
      return NextResponse.json(
        { error: "Contracts have already been signed" },
        { status: 400 }
      );
    }

    // Allow proceeding if status is "contracts_pending" OR "not_started" (legacy approved drivers)
    if (driver.onboardingStatus !== "contracts_pending" && driver.onboardingStatus !== "not_started") {
      return NextResponse.json(
        { error: "Invalid onboarding state" },
        { status: 400 }
      );
    }

    // Record contract signatures with timestamps
    const signatureTime = new Date();
    
    driver.contracts = {
      employmentContractSignedAt: signatureTime,
      driverAgreementSignedAt: signatureTime,
      workHealthSafetySignedAt: signatureTime,
      codeOfConductSignedAt: signatureTime,
    };

    // Update optional employment details if provided
    if (superannuationFund) {
      driver.superannuationFund = superannuationFund;
    }
    if (superannuationMemberNumber) {
      driver.superannuationMemberNumber = superannuationMemberNumber;
    }

    // CRITICAL STATE TRANSITIONS:
    // 1. Move from contracts_pending -> active
    driver.onboardingStatus = "active";
    
    // 2. Enable job acceptance
    driver.canAcceptJobs = true;
    
    // 3. Set employee start date
    driver.employeeStartDate = signatureTime;
    
    // 4. Ensure employment type is employee (enforced)
    driver.employmentType = "employee";
    
    // NOTE: insuranceEligible is now a VIRTUAL field derived from:
    //   employmentType === "employee" && onboardingStatus === "active"
    // It will automatically be true after this save

    await driver.save();

    return NextResponse.json({
      message: "Contracts signed successfully. You are now an active employee!",
      driver: {
        _id: driver._id.toString(),
        onboardingStatus: driver.onboardingStatus,
        canAcceptJobs: driver.canAcceptJobs,
        employeeStartDate: driver.employeeStartDate,
        contracts: driver.contracts,
      },
    });
  } catch (error) {
    console.error("Error completing onboarding:", error);
    return NextResponse.json(
      { error: "Failed to complete onboarding" },
      { status: 500 }
    );
  }
}