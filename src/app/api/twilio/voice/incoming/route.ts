// src/app/api/twilio/voice/incoming/route.ts
// Webhook called by Twilio when someone calls the business number
// Looks up caller's active booking and connects them to their driver

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Booking from "@/models/Booking";
import Driver from "@/models/Driver";
import { 
  generateConnectToDriverTwiML,
  generateNoBookingFoundTwiML,
  generateNoDriverAssignedTwiML,
  generateErrorTwiML,
  formatPhoneNumber,
} from "@/lib/twilio-voice";

export async function POST(request: NextRequest) {
  try {
    // Twilio sends form data
    const formData = await request.formData();
    
    // Get caller information from Twilio
    const callerNumber = formData.get('From') as string;
    const calledNumber = formData.get('To') as string;
    const callSid = formData.get('CallSid') as string;

    console.log('📞 Incoming call received:', {
      callSid,
      from: callerNumber,
      to: calledNumber,
    });

    if (!callerNumber) {
      console.error('❌ No caller number provided');
      const twiml = generateErrorTwiML();
      return new NextResponse(twiml, {
        status: 200,
        headers: { 'Content-Type': 'application/xml' },
      });
    }

    await connectDB();

    // Normalize the caller's phone number for matching
    // Try multiple formats since storage might vary
    const normalizedCaller = formatPhoneNumber(callerNumber);
    const callerWithoutPlus = normalizedCaller.replace('+', '');
    const callerLocal = callerNumber.startsWith('+61') 
      ? '0' + callerNumber.substring(3) 
      : callerNumber;

    console.log('🔍 Looking up booking for caller:', {
      original: callerNumber,
      normalized: normalizedCaller,
      local: callerLocal,
    });

    // Find active booking for this caller
    // Check multiple phone formats and look for non-completed, non-cancelled bookings
    const booking = await Booking.findOne({
      $or: [
        { guestPhone: callerNumber },
        { guestPhone: normalizedCaller },
        { guestPhone: callerWithoutPlus },
        { guestPhone: callerLocal },
        { guestPhone: callerLocal.replace(/[\s\-]/g, '') },
      ],
      status: { $in: ['pending', 'in_progress'] },
      assignedDriverId: { $exists: true },
    }).sort({ createdAt: -1 }); // Get most recent matching booking

    if (!booking) {
      console.log('❌ No active booking found for caller:', callerNumber);
      const twiml = generateNoBookingFoundTwiML();
      return new NextResponse(twiml, {
        status: 200,
        headers: { 'Content-Type': 'application/xml' },
      });
    }

    console.log('✅ Found booking:', {
      bookingId: booking._id,
      customerName: booking.userName,
      driverId: booking.assignedDriverId,
    });

    // Get the assigned driver
    const driver = await Driver.findById(booking.assignedDriverId);

    if (!driver) {
      console.error('❌ Driver not found for booking:', booking._id);
      const twiml = generateNoDriverAssignedTwiML();
      return new NextResponse(twiml, {
        status: 200,
        headers: { 'Content-Type': 'application/xml' },
      });
    }

    if (!driver.phone) {
      console.error('❌ Driver has no phone number:', driver._id);
      const twiml = generateNoDriverAssignedTwiML();
      return new NextResponse(twiml, {
        status: 200,
        headers: { 'Content-Type': 'application/xml' },
      });
    }

    console.log('📞 Connecting caller to driver:', {
      driverName: `${driver.firstName} ${driver.lastName}`,
      driverPhone: driver.phone,
    });

    // Log the incoming call to the booking
    booking.updates.push({
      stage: "customer_called_driver",
      timestamp: new Date(),
      message: `Customer called and was connected to driver ${driver.firstName}.`,
      updatedBy: "system",
    });
    await booking.save();

    // Generate TwiML to connect to driver
    const driverPhone = formatPhoneNumber(driver.phone);
    const twiml = generateConnectToDriverTwiML(
      driverPhone, 
      driver.firstName
    );

    return new NextResponse(twiml, {
      status: 200,
      headers: { 'Content-Type': 'application/xml' },
    });

  } catch (error) {
    console.error('❌ Error in incoming call webhook:', error);
    const errorTwiML = generateErrorTwiML();
    return new NextResponse(errorTwiML, {
      status: 200, // Must return 200 for Twilio to process TwiML
      headers: { 'Content-Type': 'application/xml' },
    });
  }
}

// Twilio may also send GET requests
export async function GET(request: NextRequest) {
  return POST(request);
}
