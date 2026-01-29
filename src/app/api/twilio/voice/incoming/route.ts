// src/app/api/twilio/voice/incoming/route.ts
// Webhook called by Twilio when someone calls the business number
// Looks up caller's active booking and connects them to their driver

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Booking from "@/models/Booking";
import Driver from "@/models/Driver";

const TWILIO_PHONE_NUMBER = '+61259416665';

// Format phone number to E.164
function formatPhoneNumber(phone: string): string {
  let formatted = phone.replace(/[\s\-()]/g, '');
  if (formatted.startsWith('0')) {
    formatted = '+61' + formatted.substring(1);
  } else if (!formatted.startsWith('+')) {
    formatted = '+61' + formatted;
  }
  return formatted;
}

export async function POST(request: NextRequest) {
  console.log('🔵 INCOMING CALL WEBHOOK HIT');
  
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
      return new NextResponse(
        `<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="alice">Sorry, we could not identify your phone number. Goodbye.</Say></Response>`,
        { status: 200, headers: { 'Content-Type': 'application/xml' } }
      );
    }

    await connectDB();

    // Normalize the caller's phone number for matching
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
    }).sort({ createdAt: -1 });

    if (!booking) {
      console.log('❌ No active booking found for caller:', callerNumber);
      return new NextResponse(
        `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Sorry, we couldn't find an active booking for your phone number. If you need assistance, please contact us through our website. Goodbye.</Say>
</Response>`,
        { status: 200, headers: { 'Content-Type': 'application/xml' } }
      );
    }

    console.log('✅ Found booking:', {
      bookingId: booking._id,
      customerName: booking.userName,
      driverId: booking.assignedDriverId,
    });

    // Get the assigned driver
    const driver = await Driver.findById(booking.assignedDriverId);

    if (!driver || !driver.phone) {
      console.error('❌ Driver not found or has no phone:', booking.assignedDriverId);
      return new NextResponse(
        `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Sorry, we couldn't connect you to your driver at this time. Please try again in a few minutes. Goodbye.</Say>
</Response>`,
        { status: 200, headers: { 'Content-Type': 'application/xml' } }
      );
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
    
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Thank you for calling Drivlet. Connecting you to your driver now.</Say>
  <Dial callerId="${TWILIO_PHONE_NUMBER}" timeout="30">
    <Number>${driverPhone}</Number>
  </Dial>
  <Say voice="alice">Your driver did not answer. Please try again in a few minutes. Goodbye.</Say>
</Response>`;

    return new NextResponse(twiml, {
      status: 200,
      headers: { 'Content-Type': 'application/xml' },
    });

  } catch (error) {
    console.error('❌ Error in incoming call webhook:', error);
    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="alice">Sorry, we encountered an error. Please try again later. Goodbye.</Say></Response>`,
      { status: 200, headers: { 'Content-Type': 'application/xml' } }
    );
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}
