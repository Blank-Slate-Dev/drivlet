// scripts/seed-test-booking.ts
// Run with: npx tsx --env-file=.env.local scripts/seed-test-booking.ts

import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI!;

if (!process.env.MONGODB_URI) {
  console.error("❌ MONGODB_URI not found");
  console.error("   Run with: npx tsx --env-file=.env.local scripts/seed-test-booking.ts");
  process.exit(1);
}

// Define Booking schema inline for the script
const BookingSchema = new mongoose.Schema(
  {
    userEmail: String,
    vehicleRegistration: String,
    vehicleState: String,
    vehicleMake: String,
    vehicleModel: String,
    vehicleYear: Number,
    vehicleColor: String,
    serviceType: String,
    pickupAddress: String,
    pickupSuburb: String,
    pickupState: String,
    pickupPostcode: String,
    pickupCoordinates: {
      lat: Number,
      lng: Number,
    },
    pickupTime: String,
    dropoffTime: String,
    garageId: mongoose.Schema.Types.ObjectId,
    garageName: String,
    status: {
      type: String,
      enum: ["pending", "confirmed", "in_progress", "completed", "cancelled"],
      default: "confirmed",
    },
    currentStage: {
      type: String,
      default: "booking_confirmed",
    },
    overallProgress: {
      type: Number,
      default: 10,
    },
    paymentStatus: String,
    paymentIntentId: String,
    amountPaid: Number,
    servicePaymentStatus: String,
    servicePaymentAmount: Number,
    checkpointStatus: {
      pre_pickup: { type: Number, default: 0 },
      service_dropoff: { type: Number, default: 0 },
      service_pickup: { type: Number, default: 0 },
      final_delivery: { type: Number, default: 0 },
    },
    updates: [
      {
        stage: String,
        timestamp: Date,
        message: String,
        updatedBy: String,
      },
    ],
  },
  { timestamps: true }
);

async function seedTestBooking() {
  try {
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    const Booking = mongoose.models.Booking || mongoose.model("Booking", BookingSchema);

    // Test booking data
    const testBooking = {
      userEmail: "test@example.com",
      vehicleRegistration: "TEST123",
      vehicleState: "NSW",
      vehicleMake: "Toyota",
      vehicleModel: "Camry",
      vehicleYear: 2022,
      vehicleColor: "Silver",
      serviceType: "general_service",
      pickupAddress: "123 Test Street, Sydney NSW 2000",
      pickupSuburb: "Sydney",
      pickupState: "NSW",
      pickupPostcode: "2000",
      pickupCoordinates: {
        lat: -33.8688,
        lng: 151.2093,
      },
      pickupTime: "9:00 AM",
      dropoffTime: "5:00 PM",
      garageName: "Test Auto Service",
      status: "in_progress",
      currentStage: "service_in_progress",
      overallProgress: 50,
      paymentStatus: "paid",
      amountPaid: 5000, // $50.00
      servicePaymentStatus: "pending",
      servicePaymentAmount: 35000, // $350.00
      checkpointStatus: {
        pre_pickup: 3, // 3 of 5 photos taken
        service_dropoff: 0,
        service_pickup: 0,
        final_delivery: 0,
      },
      updates: [
        {
          stage: "booking_confirmed",
          timestamp: new Date(Date.now() - 86400000 * 2), // 2 days ago
          message: "Booking confirmed. We'll pick up your vehicle soon.",
          updatedBy: "system",
        },
        {
          stage: "driver_en_route",
          timestamp: new Date(Date.now() - 86400000), // 1 day ago
          message: "Driver is on the way to pick up your vehicle.",
          updatedBy: "driver",
        },
        {
          stage: "car_picked_up",
          timestamp: new Date(Date.now() - 43200000), // 12 hours ago
          message: "Your vehicle has been picked up and is heading to the service center.",
          updatedBy: "driver",
        },
        {
          stage: "service_in_progress",
          timestamp: new Date(Date.now() - 3600000), // 1 hour ago
          message: "Your vehicle is now being serviced.",
          updatedBy: "garage",
        },
      ],
    };

    // Check if test booking already exists
    const existing = await Booking.findOne({
      userEmail: "test@example.com",
      vehicleRegistration: "TEST123",
    });

    if (existing) {
      console.log("⚠️  Test booking already exists!");
      console.log("   Booking ID:", existing._id.toString());
    } else {
      const booking = await Booking.create(testBooking);
      console.log("✅ Test booking created!");
      console.log("   Booking ID:", booking._id.toString());
    }

    console.log("\n📋 Test Credentials:");
    console.log("   Email: test@example.com");
    console.log("   Registration: TEST123");
    console.log("\n🔗 Track at: http://localhost:3000/track");
    console.log("   Or with params: http://localhost:3000/track?email=test@example.com&rego=TEST123");
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 Disconnected from MongoDB");
  }
}

seedTestBooking();
