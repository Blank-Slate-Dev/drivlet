// src/app/api/driver/jobs/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Booking from "@/models/Booking";
import Driver from "@/models/Driver";
import User from "@/models/User";
import { stripe } from "@/lib/stripe";
import { sendServicePaymentEmail } from "@/lib/email";
import { sendServicePaymentSMS } from "@/lib/sms";

// Get the app URL for Stripe redirects
function getAppUrl(): string {
  if (process.env.APP_URL) {
    return process.env.APP_URL;
  }
  if (process.env.VERCEL_ENV === 'production') {
    return 'https://drivlet.vercel.app';
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return 'http://localhost:3000';
}

// GET /api/driver/jobs - Get jobs for driver
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "driver") {
      return NextResponse.json({ error: "Not a driver" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "available";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);

    await connectDB();

    const user = await User.findById(session.user.id);
    if (!user?.driverProfile) {
      return NextResponse.json({ error: "Driver profile not found" }, { status: 404 });
    }

    const driver = await Driver.findById(user.driverProfile);
    if (!driver) {
      return NextResponse.json({ error: "Driver not found" }, { status: 404 });
    }

    if (!driver.canAcceptJobs) {
      return NextResponse.json({
        error: "You are not authorized to accept jobs. Please complete your onboarding.",
        canAcceptJobs: false,
      }, { status: 403 });
    }

    let query: Record<string, unknown> = {};

    if (status === "available") {
      // Jobs that are pending and not assigned to any driver
      query = {
        status: "pending",
        assignedDriverId: { $exists: false },
        "cancellation.cancelledAt": { $exists: false },
      };
    } else if (status === "accepted") {
      // Jobs assigned to this driver that are pending (not started)
      query = {
        assignedDriverId: user.driverProfile,
        status: "pending",
        "cancellation.cancelledAt": { $exists: false },
      };
    } else if (status === "in_progress") {
      // Jobs assigned to this driver that are in progress (includes awaiting payment)
      query = {
        assignedDriverId: user.driverProfile,
        status: "in_progress",
        servicePaymentStatus: { $ne: "paid" }, // Not yet paid
        "cancellation.cancelledAt": { $exists: false },
      };
    } else if (status === "awaiting_payment") {
      // Jobs where payment link exists but customer hasn't paid
      query = {
        assignedDriverId: user.driverProfile,
        servicePaymentStatus: "pending",
        servicePaymentUrl: { $exists: true, $ne: null },
        "cancellation.cancelledAt": { $exists: false },
      };
    } else if (status === "ready_for_return") {
      // Jobs where customer has paid and car is ready to return
      query = {
        assignedDriverId: user.driverProfile,
        servicePaymentStatus: "paid",
        status: { $ne: "completed" },
        "cancellation.cancelledAt": { $exists: false },
      };
    }

    const skip = (page - 1) * limit;

    const [jobs, total] = await Promise.all([
      Booking.find(query)
        .sort({ pickupTime: 1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Booking.countDocuments(query),
    ]);

    // Format jobs for response
    const formattedJobs = jobs.map((job) => {
      // Calculate payout
      let payout = 25;
      if (job.isManualTransmission) payout += 5;
      const pickupHour = parseInt(job.pickupTime?.split(":")[0] || "9");
      if (pickupHour < 7 || pickupHour > 18) payout += 10;

      return {
        _id: job._id.toString(),
        customerName: job.userName,
        customerEmail: job.userEmail,
        customerPhone: job.guestPhone,
        vehicleRegistration: job.vehicleRegistration,
        vehicleState: job.vehicleState,
        serviceType: job.serviceType,
        pickupAddress: job.pickupAddress,
        garageName: job.garageName,
        garageAddress: job.garageAddress,
        pickupTime: job.pickupTime,
        dropoffTime: job.dropoffTime,
        isManualTransmission: job.isManualTransmission || false,
        hasExistingBooking: job.hasExistingBooking,
        status: job.status,
        currentStage: job.currentStage,
        createdAt: job.createdAt,
        payout,
        // Service payment info
        servicePaymentStatus: job.servicePaymentStatus || null,
        servicePaymentAmount: job.servicePaymentAmount || null,
        servicePaymentUrl: job.servicePaymentUrl || null,
        // Preferred area check
        isPreferredArea: driver.preferredAreas?.some((area: string) =>
          job.pickupAddress?.toLowerCase().includes(area.toLowerCase())
        ) || false,
      };
    });

    // Sort preferred area jobs first for available jobs
    if (status === "available") {
      formattedJobs.sort((a, b) => {
        if (a.isPreferredArea && !b.isPreferredArea) return -1;
        if (!a.isPreferredArea && b.isPreferredArea) return 1;
        return 0;
      });
    }

    return NextResponse.json({
      jobs: formattedJobs,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      canAcceptJobs: driver.canAcceptJobs,
    });
  } catch (error) {
    console.error("Error fetching driver jobs:", error);
    return NextResponse.json(
      { error: "Failed to fetch jobs" },
      { status: 500 }
    );
  }
}

// POST /api/driver/jobs - Job actions (accept, decline, start, generate-payment, complete)
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

    const { bookingId, action, serviceAmount } = body;

    if (!bookingId || !action) {
      return NextResponse.json(
        { error: "Booking ID and action are required" },
        { status: 400 }
      );
    }

    const validActions = ["accept", "decline", "start", "picked_up", "at_garage", "generate_payment", "complete"];
    if (!validActions.includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    await connectDB();

    const user = await User.findById(session.user.id);
    if (!user?.driverProfile) {
      return NextResponse.json({ error: "Driver profile not found" }, { status: 404 });
    }

    const driver = await Driver.findById(user.driverProfile);
    if (!driver || !driver.canAcceptJobs) {
      return NextResponse.json(
        { error: "You are not authorized to accept jobs" },
        { status: 403 }
      );
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const now = new Date();

    // ========== ACCEPT JOB ==========
    if (action === "accept") {
      // Check daily limit
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const todaysJobs = await Booking.countDocuments({
        assignedDriverId: user.driverProfile,
        createdAt: { $gte: today, $lt: tomorrow },
        status: { $ne: "cancelled" },
      });

      if (todaysJobs >= (driver.maxJobsPerDay || 10)) {
        return NextResponse.json(
          { error: "You have reached your daily job limit" },
          { status: 400 }
        );
      }

      // Atomic update to prevent race conditions
      const result = await Booking.findOneAndUpdate(
        {
          _id: bookingId,
          assignedDriverId: { $exists: false },
          status: "pending",
        },
        {
          $set: {
            assignedDriverId: user.driverProfile,
            driverAssignedAt: now,
            driverAcceptedAt: now,
          },
          $push: {
            updates: {
              stage: "driver_assigned",
              timestamp: now,
              message: `Driver ${driver.firstName} ${driver.lastName} accepted the job.`,
              updatedBy: "driver",
            },
          },
        },
        { new: true }
      );

      if (!result) {
        return NextResponse.json(
          { error: "This job is no longer available" },
          { status: 400 }
        );
      }

      // Update driver metrics
      driver.metrics = driver.metrics || { totalJobs: 0, completedJobs: 0, cancelledJobs: 0, averageRating: 0, totalRatings: 0 };
      driver.metrics.totalJobs += 1;
      await driver.save();

      return NextResponse.json({
        success: true,
        message: "Job accepted successfully",
      });
    }

    // ========== DECLINE JOB ==========
    if (action === "decline") {
      if (booking.assignedDriverId?.toString() === user.driverProfile.toString()) {
        booking.assignedDriverId = undefined;
        booking.driverAssignedAt = undefined;
        booking.driverAcceptedAt = undefined;
        booking.updates.push({
          stage: "driver_declined",
          timestamp: now,
          message: "Driver declined the job.",
          updatedBy: "driver",
        });
        await booking.save();
      }

      return NextResponse.json({ success: true, message: "Job declined" });
    }

    // For remaining actions, verify driver is assigned
    if (booking.assignedDriverId?.toString() !== user.driverProfile.toString()) {
      return NextResponse.json(
        { error: "You are not assigned to this job" },
        { status: 403 }
      );
    }

    // ========== START (En route to pickup) ==========
    if (action === "start") {
      booking.status = "in_progress";
      booking.currentStage = "driver_en_route";
      booking.overallProgress = 20;
      booking.driverStartedAt = now;
      booking.updates.push({
        stage: "driver_en_route",
        timestamp: now,
        message: "Driver is on the way to pick up the vehicle.",
        updatedBy: "driver",
      });
      await booking.save();

      return NextResponse.json({ success: true, message: "Job started" });
    }

    // ========== PICKED UP ==========
    if (action === "picked_up") {
      booking.currentStage = "car_picked_up";
      booking.overallProgress = 35;
      booking.updates.push({
        stage: "car_picked_up",
        timestamp: now,
        message: "Vehicle has been picked up. Heading to garage.",
        updatedBy: "driver",
      });
      await booking.save();

      return NextResponse.json({ success: true, message: "Pickup confirmed" });
    }

    // ========== AT GARAGE ==========
    if (action === "at_garage") {
      booking.currentStage = "at_garage";
      booking.overallProgress = 50;
      booking.updates.push({
        stage: "at_garage",
        timestamp: now,
        message: "Vehicle has arrived at the garage.",
        updatedBy: "driver",
      });
      await booking.save();

      return NextResponse.json({ success: true, message: "Arrived at garage" });
    }

    // ========== GENERATE PAYMENT LINK ==========
    if (action === "generate_payment") {
      // Validate service amount
      if (!serviceAmount || typeof serviceAmount !== "number" || serviceAmount <= 0) {
        return NextResponse.json(
          { error: "Service amount is required (in cents)" },
          { status: 400 }
        );
      }

      // Validate amount is within reasonable range ($150 - $800)
      const MIN_SERVICE_AMOUNT = 15000; // $150 in cents
      const MAX_SERVICE_AMOUNT = 80000; // $800 in cents

      if (serviceAmount < MIN_SERVICE_AMOUNT) {
        return NextResponse.json(
          { error: "Please double check the price - it seems too low. Minimum is $150." },
          { status: 400 }
        );
      }

      if (serviceAmount > MAX_SERVICE_AMOUNT) {
        return NextResponse.json(
          { error: "Please double check the price - it seems too high. Maximum is $800." },
          { status: 400 }
        );
      }

      // Check if payment link already exists
      if (booking.servicePaymentUrl && booking.servicePaymentStatus === "pending") {
        return NextResponse.json({
          success: true,
          message: "Payment link already exists",
          paymentLink: booking.servicePaymentUrl,
          paymentAmount: booking.servicePaymentAmount,
        });
      }

      // Create Stripe Checkout Session
      const appUrl = getAppUrl();

      try {
        const checkoutSession = await stripe.checkout.sessions.create({
          payment_method_types: ['card'],
          mode: 'payment',
          customer_email: booking.userEmail,
          line_items: [
            {
              price_data: {
                currency: 'aud',
                product_data: {
                  name: `Service Payment - ${booking.vehicleRegistration}`,
                  description: `${booking.serviceType}${booking.garageName ? ` at ${booking.garageName}` : ''}`,
                },
                unit_amount: serviceAmount,
              },
              quantity: 1,
            },
          ],
          metadata: {
            bookingId: bookingId,
            type: 'service_payment',
            vehicleRegistration: booking.vehicleRegistration,
            garageName: booking.garageName || '',
          },
          success_url: `${appUrl}/payment/success?booking=${bookingId}&type=service`,
          cancel_url: `${appUrl}/payment/cancelled?booking=${bookingId}`,
        });

        // Update booking with payment link
        booking.servicePaymentAmount = serviceAmount;
        booking.servicePaymentUrl = checkoutSession.url || undefined;
        booking.servicePaymentStatus = "pending";
        booking.currentStage = "awaiting_payment";
        booking.overallProgress = 70;
        booking.updates.push({
          stage: "payment_link_generated",
          timestamp: now,
          message: `Payment link generated for $${(serviceAmount / 100).toFixed(2)}. Waiting for customer payment.`,
          updatedBy: "driver",
        });
        await booking.save();

        console.log('💳 Service payment link created:', checkoutSession.url);
        console.log('📦 Booking:', bookingId);
        console.log('💰 Amount:', serviceAmount / 100, 'AUD');

        // Send email notification (async, don't block)
        sendServicePaymentEmail(
          booking.userEmail,
          booking.userName,
          booking.vehicleRegistration,
          serviceAmount,
          checkoutSession.url!,
          booking.garageName
        ).then(sent => {
          if (sent) console.log('📧 Payment email sent to:', booking.userEmail);
          else console.log('⚠️ Failed to send payment email');
        });

        // Send SMS notification if phone number exists (async, don't block)
        const phoneNumber = booking.guestPhone;
        if (phoneNumber) {
          sendServicePaymentSMS(
            phoneNumber,
            booking.userName,
            booking.vehicleRegistration,
            serviceAmount,
            checkoutSession.url!
          ).then(sent => {
            if (sent) console.log('📱 Payment SMS sent to:', phoneNumber);
            else console.log('⚠️ Failed to send payment SMS');
          });
        }

        return NextResponse.json({
          success: true,
          message: "Payment link generated",
          paymentLink: checkoutSession.url,
          paymentAmount: serviceAmount,
        });

      } catch (stripeError) {
        console.error('❌ Failed to create payment link:', stripeError);
        return NextResponse.json(
          { error: "Failed to create payment link" },
          { status: 500 }
        );
      }
    }

    // ========== COMPLETE DELIVERY ==========
    if (action === "complete") {
      // Check if payment received
      if (booking.servicePaymentStatus !== "paid") {
        return NextResponse.json(
          { error: "Cannot complete - customer has not paid for service yet" },
          { status: 400 }
        );
      }

      booking.status = "completed";
      booking.currentStage = "delivered";
      booking.overallProgress = 100;
      booking.driverCompletedAt = now;
      booking.updates.push({
        stage: "delivered",
        timestamp: now,
        message: "Vehicle has been delivered back to the customer.",
        updatedBy: "driver",
      });
      await booking.save();

      // Update driver metrics
      driver.metrics = driver.metrics || { totalJobs: 0, completedJobs: 0, cancelledJobs: 0, averageRating: 0, totalRatings: 0 };
      driver.metrics.completedJobs += 1;
      await driver.save();

      return NextResponse.json({
        success: true,
        message: "Job completed successfully",
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Error processing job action:", error);
    return NextResponse.json(
      { error: "Failed to process job action" },
      { status: 500 }
    );
  }
}
