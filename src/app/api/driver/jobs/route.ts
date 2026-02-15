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
import { notifyBookingUpdate } from "@/lib/emit-booking-update";

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

// GET /api/driver/jobs - Get jobs assigned to this driver by admin
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
    const status = searchParams.get("status") || "all";

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

    const driverProfileId = user.driverProfile;

    // ========== STATUS=ALL: Unified fetch for admin-assigned jobs ==========
    if (status === "all") {
      const baseFilter: Record<string, unknown> = { "cancellation.cancelledAt": { $exists: false } };

      const [
        myInProgress,
        myAwaitingPayment,
        myReadyForReturn,
        myAccepted,
      ] = await Promise.all([
        // In progress: pickup or return started but not completed
        Booking.find({
          ...baseFilter,
          $or: [
            {
              assignedDriverId: driverProfileId,
              "pickupDriver.startedAt": { $exists: true },
              "pickupDriver.completedAt": { $exists: false },
            },
            {
              returnDriverId: driverProfileId,
              "returnDriver.startedAt": { $exists: true },
              "returnDriver.completedAt": { $exists: false },
            },
          ],
        }).sort({ pickupTime: 1 }).limit(30).lean(),

        // Awaiting payment: pickup complete, not yet paid
        Booking.find({
          ...baseFilter,
          "pickupDriver.completedAt": { $exists: true },
          servicePaymentStatus: { $ne: "paid" },
          status: { $ne: "completed" },
          $or: [
            { assignedDriverId: driverProfileId },
            { returnDriverId: driverProfileId },
          ],
        }).sort({ updatedAt: -1 }).limit(30).lean(),

        // Ready for return: return assigned to me, pickup complete, paid, not started
        Booking.find({
          ...baseFilter,
          returnDriverId: driverProfileId,
          "returnDriver.startedAt": { $exists: false },
          "pickupDriver.completedAt": { $exists: true },
          servicePaymentStatus: "paid",
          status: { $ne: "completed" },
        }).sort({ updatedAt: -1 }).limit(30).lean(),

        // Accepted: assigned to me but not started (pickup or return)
        Booking.find({
          ...baseFilter,
          $or: [
            {
              assignedDriverId: driverProfileId,
              "pickupDriver.startedAt": { $exists: false },
              "pickupDriver.completedAt": { $exists: false },
            },
            {
              returnDriverId: driverProfileId,
              "returnDriver.startedAt": { $exists: false },
              "returnDriver.completedAt": { $exists: false },
            },
          ],
        }).sort({ pickupTime: 1 }).limit(30).lean(),
      ]);

      // Format helper
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const formatJob = (job: any) => {
        let payout = 25;
        if (job.isManualTransmission) payout += 5;
        const pickupHour = parseInt(job.pickupTime?.split(":")[0] || "9");
        if (pickupHour < 7 || pickupHour > 18) payout += 10;

        const driverProfileStr = driverProfileId?.toString();

        // Pickup driver state
        let pickupDriverState: string | null = null;
        if (job.pickupDriver) {
          if (job.pickupDriver.completedAt) pickupDriverState = "completed";
          else if (job.pickupDriver.collectedAt) pickupDriverState = "collected";
          else if (job.pickupDriver.arrivedAt) pickupDriverState = "arrived";
          else if (job.pickupDriver.startedAt) pickupDriverState = "started";
          else pickupDriverState = "assigned";
        }

        // Return driver state
        let returnDriverState: string | null = null;
        if (job.returnDriver) {
          if (job.returnDriver.completedAt) returnDriverState = "completed";
          else if (job.returnDriver.arrivedAt) returnDriverState = "delivering";
          else if (job.returnDriver.collectedAt) returnDriverState = "collected";
          else if (job.returnDriver.startedAt) returnDriverState = "started";
          else returnDriverState = "assigned";
        }

        const canStartReturn = !!(
          job.pickupDriver?.completedAt &&
          job.servicePaymentStatus === "paid"
        );

        let returnWaitingReason: string | null = null;
        if (job.returnDriver && !job.returnDriver.startedAt) {
          if (!job.pickupDriver?.completedAt) {
            returnWaitingReason = "Waiting for pickup to complete";
          } else if (job.servicePaymentStatus !== "paid") {
            returnWaitingReason = "Waiting for customer payment";
          }
        }

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
          servicePaymentStatus: job.servicePaymentStatus || null,
          servicePaymentAmount: job.servicePaymentAmount || null,
          servicePaymentUrl: job.servicePaymentUrl || null,
          checkpointStatus: job.checkpointStatus || {
            pre_pickup: 0, service_dropoff: 0, service_pickup: 0, final_delivery: 0,
          },
          isPreferredArea: driver.preferredAreas?.some((area: string) =>
            job.pickupAddress?.toLowerCase().includes(area.toLowerCase())
          ) || false,
          pickupDriverState,
          returnDriverState,
          pickupClaimedByMe: job.assignedDriverId?.toString() === driverProfileStr,
          returnClaimedByMe: job.returnDriverId?.toString() === driverProfileStr,
          canStartReturn,
          returnWaitingReason,
        };
      };

      // Deduplicate: a booking appears only in its highest-priority category
      const seenIds = new Set<string>();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const dedupAndFormat = (jobs: any[]) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result: any[] = [];
        for (const job of jobs) {
          const id = job._id.toString();
          if (!seenIds.has(id)) {
            seenIds.add(id);
            result.push(formatJob(job));
          }
        }
        return result;
      };

      const myInProgressFormatted = dedupAndFormat(myInProgress);
      const myAwaitingPaymentFormatted = dedupAndFormat(myAwaitingPayment);
      const myReadyForReturnFormatted = dedupAndFormat(myReadyForReturn);
      const myAcceptedFormatted = dedupAndFormat(myAccepted);

      return NextResponse.json({
        myJobs: {
          accepted: myAcceptedFormatted,
          in_progress: myInProgressFormatted,
          awaiting_payment: myAwaitingPaymentFormatted,
          ready_for_return: myReadyForReturnFormatted,
        },
        canAcceptJobs: driver.canAcceptJobs,
      });
    }

    // Default: return empty for unrecognized status
    return NextResponse.json({
      myJobs: {
        accepted: [],
        in_progress: [],
        awaiting_payment: [],
        ready_for_return: [],
      },
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

// POST /api/driver/jobs - Job actions (admin-assigned only, no accept/decline)
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

    // Valid actions: progression + payment only (no accept/decline)
    const validActions = [
      // Pickup leg actions
      "start_pickup",
      "arrived_pickup",
      "collected",
      "dropped_at_workshop",
      // Return leg actions
      "start_return",
      "collected_from_workshop",
      "delivering",
      "delivered",
      // Legacy aliases
      "start",
      "picked_up",
      "at_garage",
      "generate_payment",
      "complete",
    ];

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
        { error: "You are not authorized to perform this action" },
        { status: 403 }
      );
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const now = new Date();

    // Verify driver is assigned to appropriate leg
    const isPickupDriver = booking.assignedDriverId?.toString() === user.driverProfile.toString();
    const isReturnDriver = booking.returnDriverId?.toString() === user.driverProfile.toString();

    // ========== PICKUP LEG ACTIONS ==========

    // Start pickup (en route to customer)
    if (action === "start_pickup" || (action === "start" && isPickupDriver)) {
      if (!isPickupDriver) {
        return NextResponse.json({ error: "You are not assigned to pickup" }, { status: 403 });
      }

      booking.status = "in_progress";
      booking.currentStage = "driver_en_route";
      booking.overallProgress = 28;

      if (booking.pickupDriver) {
        booking.pickupDriver.startedAt = now;
      }
      booking.driverStartedAt = now;

      booking.updates.push({
        stage: "driver_en_route",
        timestamp: now,
        message: "Driver is on the way to pick up the vehicle.",
        updatedBy: "driver",
      });
      await booking.save();
      notifyBookingUpdate(booking);

      return NextResponse.json({ success: true, message: "En route to pickup" });
    }

    // Arrived at customer
    if (action === "arrived_pickup") {
      if (!isPickupDriver) {
        return NextResponse.json({ error: "You are not assigned to pickup" }, { status: 403 });
      }

      if (booking.pickupDriver) {
        booking.pickupDriver.arrivedAt = now;
      }

      booking.updates.push({
        stage: "arrived_at_customer",
        timestamp: now,
        message: "Driver has arrived at the customer location.",
        updatedBy: "driver",
      });
      await booking.save();
      notifyBookingUpdate(booking);

      return NextResponse.json({ success: true, message: "Arrived at customer" });
    }

    // Vehicle collected (picked up from customer)
    if (action === "collected" || action === "picked_up") {
      if (!isPickupDriver) {
        return NextResponse.json({ error: "You are not assigned to pickup" }, { status: 403 });
      }

      booking.currentStage = "car_picked_up";
      booking.overallProgress = 42;

      if (booking.pickupDriver) {
        booking.pickupDriver.collectedAt = now;
      }

      booking.updates.push({
        stage: "car_picked_up",
        timestamp: now,
        message: "Vehicle has been picked up. Heading to garage.",
        updatedBy: "driver",
      });
      await booking.save();
      notifyBookingUpdate(booking);

      return NextResponse.json({ success: true, message: "Vehicle collected" });
    }

    // Dropped at workshop (completes pickup leg)
    if (action === "dropped_at_workshop" || action === "at_garage") {
      if (!isPickupDriver) {
        return NextResponse.json({ error: "You are not assigned to pickup" }, { status: 403 });
      }

      booking.currentStage = "at_garage";
      booking.overallProgress = 57;

      if (booking.pickupDriver) {
        booking.pickupDriver.completedAt = now;
      }

      booking.updates.push({
        stage: "at_garage",
        timestamp: now,
        message: "Vehicle has arrived at the garage. Pickup leg complete.",
        updatedBy: "driver",
      });
      await booking.save();
      notifyBookingUpdate(booking);

      return NextResponse.json({ success: true, message: "Dropped at workshop - pickup complete" });
    }

    // ========== RETURN LEG ACTIONS ==========

    // Start return (en route to workshop for collection)
    if (action === "start_return") {
      if (!isReturnDriver) {
        return NextResponse.json({ error: "You are not assigned to return" }, { status: 403 });
      }

      // Gate: pickup must be complete
      if (!booking.pickupDriver?.completedAt) {
        return NextResponse.json(
          { error: "Cannot start return yet - pickup is not complete" },
          { status: 400 }
        );
      }

      // Gate: service payment must be received
      if (booking.servicePaymentStatus !== "paid") {
        return NextResponse.json(
          { error: "Cannot start return yet - waiting for customer to pay for service" },
          { status: 400 }
        );
      }

      booking.currentStage = "driver_returning";
      booking.overallProgress = 86;

      if (booking.returnDriver) {
        booking.returnDriver.startedAt = now;
      }

      booking.updates.push({
        stage: "driver_returning",
        timestamp: now,
        message: "Return driver is on the way to collect the vehicle.",
        updatedBy: "driver",
      });
      await booking.save();
      notifyBookingUpdate(booking);

      return NextResponse.json({ success: true, message: "En route to workshop" });
    }

    // Collected from workshop
    if (action === "collected_from_workshop") {
      if (!isReturnDriver) {
        return NextResponse.json({ error: "You are not assigned to return" }, { status: 403 });
      }

      if (booking.returnDriver) {
        booking.returnDriver.collectedAt = now;
      }

      booking.updates.push({
        stage: "collected_from_workshop",
        timestamp: now,
        message: "Vehicle collected from workshop. Heading to customer.",
        updatedBy: "driver",
      });
      await booking.save();
      notifyBookingUpdate(booking);

      return NextResponse.json({ success: true, message: "Collected from workshop" });
    }

    // Delivering (in transit to customer)
    if (action === "delivering") {
      if (!isReturnDriver) {
        return NextResponse.json({ error: "You are not assigned to return" }, { status: 403 });
      }

      if (booking.returnDriver) {
        booking.returnDriver.arrivedAt = now;
      }

      booking.updates.push({
        stage: "delivering",
        timestamp: now,
        message: "Driver is delivering the vehicle back to the customer.",
        updatedBy: "driver",
      });
      await booking.save();
      notifyBookingUpdate(booking);

      return NextResponse.json({ success: true, message: "Delivering to customer" });
    }

    // Delivered (completes return leg and booking)
    if (action === "delivered" || action === "complete") {
      // Check payment status
      if (booking.servicePaymentStatus !== "paid") {
        return NextResponse.json(
          { error: "Cannot complete - customer has not paid for service yet" },
          { status: 400 }
        );
      }

      // Must be return driver OR pickup driver (if same driver doing both)
      if (!isReturnDriver && !isPickupDriver) {
        return NextResponse.json({ error: "You are not assigned to this delivery" }, { status: 403 });
      }

      booking.status = "completed";
      booking.currentStage = "delivered";
      booking.overallProgress = 100;

      if (booking.returnDriver) {
        booking.returnDriver.completedAt = now;
      }
      booking.driverCompletedAt = now;

      booking.updates.push({
        stage: "delivered",
        timestamp: now,
        message: "Vehicle has been delivered. Thanks for choosing drivlet!",
        updatedBy: "driver",
      });
      await booking.save();
      notifyBookingUpdate(booking);

      // Update driver metrics
      driver.metrics = driver.metrics || { totalJobs: 0, completedJobs: 0, cancelledJobs: 0, averageRating: 0, totalRatings: 0 };
      driver.metrics.completedJobs += 1;
      await driver.save();

      return NextResponse.json({
        success: true,
        message: "Job completed successfully",
      });
    }

    // ========== GENERATE PAYMENT LINK ==========
    if (action === "generate_payment") {
      // Can be triggered by pickup driver after workshop drop-off
      if (!isPickupDriver) {
        return NextResponse.json(
          { error: "Only the pickup driver can generate payment link" },
          { status: 403 }
        );
      }

      // Validate service amount
      if (!serviceAmount || typeof serviceAmount !== "number" || serviceAmount <= 0) {
        return NextResponse.json(
          { error: "Service amount is required (in cents)" },
          { status: 400 }
        );
      }

      // Validate amount range ($150 - $800)
      const MIN_SERVICE_AMOUNT = 15000;
      const MAX_SERVICE_AMOUNT = 80000;

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
        booking.currentStage = "service_in_progress";
        booking.overallProgress = 72;
        booking.updates.push({
          stage: "payment_link_generated",
          timestamp: now,
          message: `Payment link generated for $${(serviceAmount / 100).toFixed(2)}. Waiting for customer payment.`,
          updatedBy: "driver",
        });
        await booking.save();
        notifyBookingUpdate(booking);

        console.log('Payment link created:', checkoutSession.url);

        // Send email notification (async)
        sendServicePaymentEmail(
          booking.userEmail,
          booking.userName,
          booking.vehicleRegistration,
          serviceAmount,
          checkoutSession.url!,
          booking.garageName
        ).then(sent => {
          if (sent) console.log('Payment email sent to:', booking.userEmail);
        });

        // Send SMS if phone exists (async)
        const phoneNumber = booking.guestPhone;
        if (phoneNumber) {
          sendServicePaymentSMS(
            phoneNumber,
            booking.userName,
            booking.vehicleRegistration,
            serviceAmount,
            checkoutSession.url!
          ).then(sent => {
            if (sent) console.log('Payment SMS sent to:', phoneNumber);
          });
        }

        return NextResponse.json({
          success: true,
          message: "Payment link generated",
          paymentLink: checkoutSession.url,
          paymentAmount: serviceAmount,
        });

      } catch (stripeError) {
        console.error('Failed to create payment link:', stripeError);
        return NextResponse.json(
          { error: "Failed to create payment link" },
          { status: 500 }
        );
      }
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
