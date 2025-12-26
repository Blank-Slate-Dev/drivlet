// src/models/GarageServicePricing.ts
import mongoose, { Schema, Document, Model, Types } from "mongoose";

/**
 * Service categories that garages can offer
 */
export type ServiceCategory =
  | "logbook_service"
  | "major_service"
  | "minor_service"
  | "brake_service"
  | "tyre_service"
  | "battery"
  | "air_conditioning"
  | "diagnostics"
  | "oil_change"
  | "wheel_alignment"
  | "suspension"
  | "transmission"
  | "clutch"
  | "exhaust"
  | "electrical"
  | "roadworthy"
  | "pre_purchase_inspection"
  | "other";

/**
 * Vehicle categories for pricing tiers
 */
export type VehicleCategory =
  | "small_car"      // Hatchbacks, city cars (e.g., Toyota Yaris, Mazda 2)
  | "medium_car"     // Sedans, wagons (e.g., Toyota Camry, Mazda 3)
  | "large_car"      // Full-size sedans, luxury (e.g., BMW 5 Series)
  | "small_suv"      // Compact SUVs (e.g., Toyota RAV4, Mazda CX-5)
  | "large_suv"      // Full-size SUVs (e.g., Toyota Prado, Ford Everest)
  | "ute"            // Utility vehicles (e.g., Toyota Hilux, Ford Ranger)
  | "commercial"     // Vans, light trucks
  | "european"       // European vehicles (often higher parts cost)
  | "performance";   // Sports cars, turbo vehicles

/**
 * Individual price entry for a service + vehicle combination
 */
export interface IPriceEntry {
  vehicleCategory: VehicleCategory;
  priceFrom: number;      // Minimum price in cents
  priceTo?: number;       // Maximum price in cents (optional, for ranges)
  estimatedHours: number; // Estimated time for the service
  notes?: string;         // Optional notes (e.g., "includes parts")
}

/**
 * A service offering with its pricing matrix
 */
export interface IServiceOffering {
  category: ServiceCategory;
  name: string;                    // Custom name (e.g., "Premium Logbook Service")
  description?: string;            // Service description
  prices: IPriceEntry[];           // Price matrix by vehicle type
  isActive: boolean;               // Whether this service is currently offered
  includesPickup: boolean;         // Whether drivlet pickup is included
  requiresBooking: boolean;        // Must book in advance
  averageRating?: number;          // Average rating for this specific service
  completedCount: number;          // Number of times completed
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Complete garage service catalog
 */
export interface IGarageServicePricing extends Document {
  garageId: Types.ObjectId;
  
  // Service offerings
  services: IServiceOffering[];
  
  // Global settings
  acceptsManualTransmission: boolean;
  acceptsElectricVehicles: boolean;
  acceptsHybridVehicles: boolean;
  acceptsDiesel: boolean;
  
  // Drivlet pickup/dropoff settings
  drivletEnabled: boolean;          // Accepts drivlet pickups
  drivletPickupFee: number;         // Additional fee for drivlet service (cents)
  drivletRadius: number;            // Max radius in km for drivlet service
  
  // Booking settings
  leadTimeHours: number;            // Minimum hours notice required
  maxDailyBookings: number;         // Max drivlet bookings per day
  
  // Status
  isPublished: boolean;             // Whether catalog is visible to customers
  lastPublishedAt?: Date;
  
  createdAt: Date;
  updatedAt: Date;
}

// Schema definitions
const PriceEntrySchema = new Schema<IPriceEntry>(
  {
    vehicleCategory: {
      type: String,
      enum: [
        "small_car",
        "medium_car",
        "large_car",
        "small_suv",
        "large_suv",
        "ute",
        "commercial",
        "european",
        "performance",
      ],
      required: true,
    },
    priceFrom: {
      type: Number,
      required: true,
      min: 0,
    },
    priceTo: {
      type: Number,
      min: 0,
    },
    estimatedHours: {
      type: Number,
      required: true,
      min: 0.5,
      default: 2,
    },
    notes: {
      type: String,
      maxlength: 200,
    },
  },
  { _id: false }
);

const ServiceOfferingSchema = new Schema<IServiceOffering>(
  {
    category: {
      type: String,
      enum: [
        "logbook_service",
        "major_service",
        "minor_service",
        "brake_service",
        "tyre_service",
        "battery",
        "air_conditioning",
        "diagnostics",
        "oil_change",
        "wheel_alignment",
        "suspension",
        "transmission",
        "clutch",
        "exhaust",
        "electrical",
        "roadworthy",
        "pre_purchase_inspection",
        "other",
      ],
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    prices: {
      type: [PriceEntrySchema],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    includesPickup: {
      type: Boolean,
      default: true,
    },
    requiresBooking: {
      type: Boolean,
      default: true,
    },
    averageRating: {
      type: Number,
      min: 0,
      max: 5,
    },
    completedCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

const GarageServicePricingSchema = new Schema<IGarageServicePricing>(
  {
    garageId: {
      type: Schema.Types.ObjectId,
      ref: "Garage",
      required: true,
      unique: true,
      index: true,
    },
    services: {
      type: [ServiceOfferingSchema],
      default: [],
    },
    acceptsManualTransmission: {
      type: Boolean,
      default: true,
    },
    acceptsElectricVehicles: {
      type: Boolean,
      default: false,
    },
    acceptsHybridVehicles: {
      type: Boolean,
      default: true,
    },
    acceptsDiesel: {
      type: Boolean,
      default: true,
    },
    drivletEnabled: {
      type: Boolean,
      default: true,
    },
    drivletPickupFee: {
      type: Number,
      default: 0,
      min: 0,
    },
    drivletRadius: {
      type: Number,
      default: 15,
      min: 5,
      max: 50,
    },
    leadTimeHours: {
      type: Number,
      default: 24,
      min: 2,
    },
    maxDailyBookings: {
      type: Number,
      default: 5,
      min: 1,
    },
    isPublished: {
      type: Boolean,
      default: false,
    },
    lastPublishedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

// Indexes for efficient queries
GarageServicePricingSchema.index({ isPublished: 1 });
GarageServicePricingSchema.index({ "services.category": 1 });
GarageServicePricingSchema.index({ drivletEnabled: 1, isPublished: 1 });

// Prevent OverwriteModelError
const GarageServicePricing: Model<IGarageServicePricing> =
  mongoose.models.GarageServicePricing ||
  mongoose.model<IGarageServicePricing>("GarageServicePricing", GarageServicePricingSchema);

export default GarageServicePricing;

// Helper constants for UI
export const SERVICE_CATEGORY_LABELS: Record<ServiceCategory, string> = {
  logbook_service: "Logbook Service",
  major_service: "Major Service",
  minor_service: "Minor Service",
  brake_service: "Brake Service",
  tyre_service: "Tyre Service",
  battery: "Battery Replacement",
  air_conditioning: "Air Conditioning",
  diagnostics: "Diagnostics",
  oil_change: "Oil Change",
  wheel_alignment: "Wheel Alignment",
  suspension: "Suspension",
  transmission: "Transmission",
  clutch: "Clutch",
  exhaust: "Exhaust",
  electrical: "Electrical",
  roadworthy: "Roadworthy Certificate",
  pre_purchase_inspection: "Pre-Purchase Inspection",
  other: "Other Services",
};

export const VEHICLE_CATEGORY_LABELS: Record<VehicleCategory, string> = {
  small_car: "Small Car",
  medium_car: "Medium Car",
  large_car: "Large Car",
  small_suv: "Small SUV",
  large_suv: "Large SUV",
  ute: "Ute",
  commercial: "Commercial",
  european: "European",
  performance: "Performance",
};

export const VEHICLE_CATEGORY_EXAMPLES: Record<VehicleCategory, string> = {
  small_car: "Toyota Yaris, Mazda 2, VW Polo",
  medium_car: "Toyota Camry, Mazda 3, Honda Civic",
  large_car: "BMW 5 Series, Mercedes E-Class",
  small_suv: "Toyota RAV4, Mazda CX-5, Honda CR-V",
  large_suv: "Toyota Prado, Ford Everest, Nissan Patrol",
  ute: "Toyota Hilux, Ford Ranger, Isuzu D-Max",
  commercial: "Toyota Hiace, Ford Transit",
  european: "Audi, BMW, Mercedes, VW",
  performance: "Golf GTI, WRX, Sports cars",
};
