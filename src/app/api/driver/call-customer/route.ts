// src/app/api/driver/call-customer/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Booking from "@/models/Booking";
import Driver from "@/models/Driver";
import User from "@/models/User";
import { 
  initiateDriverToCustomerCall, 
  isValidPhoneNumber 
} from "@/lib/twilio-voice";

// POST /api/driver/call-customer - Initiate a masked call to customer
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "driver") {
      return NextResponse.json({ error: "Not a driver" }, { status: 403 });
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

    const { bookingId } = body;

    if (!bookingId) {
      return NextResponse.json(
        { error: "Booking ID is required" },
        { status: 400 }
      );
    }

    await connectDB();

    // Get driver profile
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

    // Validate driver has a phone number
    if (!driver.phone || !isValidPhoneNumber(driver.phone)) {
      return NextResponse.json(
        { error: "Your phone number is not configured correctly. Please update your profile." },
        { status: 400 }
      );
    }

    // Get the booking
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    // Verify driver is assigned to this booking
    if (booking.assignedDriverId?.toString() !== user.driverProfile.toString()) {
      return NextResponse.json(
        { error: "You are not assigned to this booking" },
        { status: 403 }
      );
    }

    // Check booking is in a valid state for calling
    if (booking.status === "cancelled") {
      return NextResponse.json(
        { error: "Cannot call - this booking has been cancelled" },
        { status: 400 }
      );
    }

    if (booking.status === "completed") {
      return NextResponse.json(
        { error: "Cannot call - this booking has been completed" },
        { status: 400 }
      );
    }

    // Get customer phone number
    const customerPhone = booking.guestPhone;
    if (!customerPhone || !isValidPhoneNumber(customerPhone)) {
      return NextResponse.json(
        { error: "Customer phone number is not available for this booking" },
        { status: 400 }
      );
    }

    // Initiate the masked call
    const result = await initiateDriverToCustomerCall({
      toPhoneNumber: driver.phone,
      customerPhoneNumber: customerPhone,
      bookingId: bookingId,
      driverName: `${driver.firstName} ${driver.lastName}`,
      customerName: booking.userName || 'the customer',
    });

    if (!result.success) {
      console.error('❌ Failed to initiate call:', result.error);
      return NextResponse.json(
        { error: result.error || "Failed to initiate call" },
        { status: 500 }
      );
    }

    console.log('📞 Masked call initiated:', {
      callSid: result.callSid,
      bookingId,
      driverName: `${driver.firstName} ${driver.lastName}`,
      customerName: booking.userName,
    });

    // Optionally: Log the call initiation to the booking updates
    booking.updates.push({
      stage: "driver_called_customer",
      timestamp: new Date(),
      message: `Driver ${driver.firstName} initiated a call to the customer.`,
      updatedBy: "driver",
    });
    await booking.save();

    return NextResponse.json({
      success: true,
      message: "Call initiated. Your phone will ring shortly.",
      callSid: result.callSid,
    });

  } catch (error) {
    console.error("Error initiating call:", error);
    return NextResponse.json(
      { error: "Failed to initiate call" },
      { status: 500 }
    );
  }
}
