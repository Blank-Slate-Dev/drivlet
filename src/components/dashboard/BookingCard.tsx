// src/components/dashboard/BookingCard.tsx
"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Car,
  MapPin,
  Calendar,
  Clock,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertTriangle,
  Wrench,
  Building2,
  Camera,
  Star,
  User,
  Briefcase,
  FileWarning,
  ClipboardCheck,
  PackageCheck,
} from "lucide-react";
import VehiclePhotosViewer from "@/components/customer/VehiclePhotosViewer";
import PickupConsentForm from "@/components/forms/PickupConsentForm";
import ReturnConfirmationForm from "@/components/forms/ReturnConfirmationForm";
import ClaimLodgementForm from "@/components/forms/ClaimLodgementForm";

interface IUpdate {
  stage: string;
  timestamp: string;
  message: string;
  updatedBy: string;
}

interface IFlag {
  type: "manual_transmission" | "high_value_vehicle" | "other";
  reason: string;
  createdAt: string;
}

interface DriverInfo {
  firstName: string;
  profilePhoto: string | null;
  rating: number;
  totalRatings: number;
  completedJobs: number;
  memberSince: string;
}

interface SignedFormRef {
  formId: string;
  formType: "pickup_consent" | "return_confirmation" | "claim_lodgement";
  submittedAt: string;
}

interface BookingData {
  _id: string;
  pickupTime: string;
  dropoffTime: string;
  pickupAddress: string;
  vehicleRegistration: string;
  vehicleState: string;
  vehicleYear?: string;
  vehicleModel?: string;
  vehicleColor?: string;
  serviceType: string;
  hasExistingBooking: boolean;
  garageName?: string;
  garageAddress?: string;
  existingBookingRef?: string;
  transmissionType: "automatic" | "manual";
  isManualTransmission: boolean;
  flags: IFlag[];
  currentStage: string;
  overallProgress: number;
  status: "pending" | "in_progress" | "completed" | "cancelled";
  updates: IUpdate[];
  createdAt: string;
  paymentAmount?: number;
  driver?: DriverInfo | null;
  userName?: string;
  userEmail?: string;
  signedForms?: SignedFormRef[];
}

interface BookingCardProps {
  booking: BookingData;
  onFormsUpdated?: () => void;
}

const statusConfig = {
  pending: {
    icon: Clock,
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
    label: "Pending",
  },
  in_progress: {
    icon: Loader2,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    label: "In Progress",
  },
  completed: {
    icon: CheckCircle2,
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-200",
    label: "Completed",
  },
  cancelled: {
    icon: XCircle,
    color: "text-red-600",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    label: "Cancelled",
  },
};

const stageLabels: Record<string, string> = {
  booking_confirmed: "Booking Confirmed",
  driver_assigned: "Driver Assigned",
  en_route_to_pickup: "En Route to Pickup",
  arrived_at_pickup: "Arrived at Pickup",
  vehicle_collected: "Vehicle Collected",
  at_service_center: "At Service Center",
  service_in_progress: "Service in Progress",
  service_completed: "Service Completed",
  en_route_to_dropoff: "En Route to Drop-off",
  arrived_at_dropoff: "Arrived at Drop-off",
  vehicle_delivered: "Vehicle Delivered",
  completed: "Completed",
};

export default function BookingCard({ booking, onFormsUpdated }: BookingCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [showPhotos, setShowPhotos] = useState(false);
  const [showPickupForm, setShowPickupForm] = useState(false);
  const [showReturnForm, setShowReturnForm] = useState(false);
  const [showClaimForm, setShowClaimForm] = useState(false);
  const config = statusConfig[booking.status];
  const StatusIcon = config.icon;

  const hasPickupConsent = booking.signedForms?.some(
    (f) => f.formType === "pickup_consent"
  );
  const hasReturnConfirmation = booking.signedForms?.some(
    (f) => f.formType === "return_confirmation"
  );
  const hasClaimLodged = booking.signedForms?.some(
    (f) => f.formType === "claim_lodgement"
  );

  const bookingForForms = {
    _id: booking._id,
    userName: booking.userName || "",
    userEmail: booking.userEmail || "",
    vehicleRegistration: booking.vehicleRegistration,
    vehicleState: booking.vehicleState,
    vehicleModel: booking.vehicleModel,
    vehicleYear: booking.vehicleYear,
    vehicleColor: booking.vehicleColor,
    pickupAddress: booking.pickupAddress,
    garageName: booking.garageName,
    garageAddress: booking.garageAddress,
    transmissionType: booking.transmissionType,
    pickupTime: booking.pickupTime,
    dropoffTime: booking.dropoffTime,
    createdAt: booking.createdAt,
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-AU", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-AU", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("en-AU", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleFormSuccess = () => {
    setShowPickupForm(false);
    setShowReturnForm(false);
    setShowClaimForm(false);
    onFormsUpdated?.();
  };

  return (
    <div
      className={`rounded-2xl border ${config.borderColor} ${config.bgColor} overflow-hidden transition-all`}
    >
      {/* Main Card Content */}
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-4">
          {/* Left Side - Booking Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${config.bgColor} ${config.color} border ${config.borderColor}`}
              >
                <StatusIcon
                  className={`h-3.5 w-3.5 ${
                    booking.status === "in_progress" ? "animate-spin" : ""
                  }`}
                />
                {config.label}
              </span>
              {booking.isManualTransmission && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 border border-amber-300 px-2 py-0.5 text-xs font-medium text-amber-700">
                  <AlertTriangle className="h-3 w-3" />
                  Manual
                </span>
              )}
              {booking.hasExistingBooking && (
                <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 border border-purple-300 px-2 py-0.5 text-xs font-medium text-purple-700">
                  <Building2 className="h-3 w-3" />
                  Garage Booking
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 text-slate-900">
              <Car className="h-4 w-4 text-slate-500 flex-shrink-0" />
              <span className="font-semibold truncate">
                {booking.vehicleRegistration}
              </span>
              <span className="text-slate-400">•</span>
              <span className="text-sm text-slate-600 truncate">
                {booking.vehicleState}
              </span>
            </div>

            <div className="mt-2 flex items-start gap-2 text-sm text-slate-600">
              <MapPin className="h-4 w-4 text-slate-400 flex-shrink-0 mt-0.5" />
              <span className="truncate">{booking.pickupAddress}</span>
            </div>

            <div className="mt-2 flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1.5 text-slate-600">
                <Calendar className="h-4 w-4 text-slate-400" />
                <span>{formatDate(booking.pickupTime)}</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-600">
                <Clock className="h-4 w-4 text-slate-400" />
                <span>{formatTime(booking.pickupTime)}</span>
              </div>
            </div>

            {booking.garageName && (
              <div className="mt-2 flex items-center gap-2 text-sm text-purple-600">
                <Wrench className="h-4 w-4" />
                <span>{booking.garageName}</span>
                {booking.existingBookingRef && (
                  <span className="text-purple-400">
                    (Ref: {booking.existingBookingRef})
                  </span>
                )}
              </div>
            )}

            {/* Driver Info - Compact view */}
            {booking.driver && (booking.status === "in_progress" || booking.status === "completed") && (
              <div className="mt-3 flex items-center gap-3 p-2 bg-white/60 rounded-lg border border-slate-200/50">
                <div className="h-10 w-10 overflow-hidden rounded-full bg-slate-100 ring-2 ring-white">
                  {booking.driver.profilePhoto ? (
                    <Image
                      src={booking.driver.profilePhoto}
                      alt={booking.driver.firstName}
                      width={40}
                      height={40}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <User className="h-5 w-5 text-slate-400" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-900">
                      {booking.driver.firstName}
                    </span>
                    <span className="text-xs text-slate-500">Driver</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    {booking.driver.totalRatings > 0 ? (
                      <span className="flex items-center gap-1 text-amber-600">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                        {booking.driver.rating.toFixed(1)}
                        <span className="text-slate-400">
                          ({booking.driver.totalRatings})
                        </span>
                      </span>
                    ) : (
                      <span className="text-slate-500">New driver</span>
                    )}
                    <span className="text-slate-300">•</span>
                    <span className="flex items-center gap-1 text-slate-500">
                      <Briefcase className="h-3 w-3" />
                      {booking.driver.completedJobs} jobs
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons Row - Forms & Photos */}
            {(booking.status === "in_progress" || booking.status === "completed") && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setShowPhotos(true)}
                  className="inline-flex items-center gap-2 rounded-lg bg-slate-100 hover:bg-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition"
                >
                  <Camera className="h-4 w-4" />
                  View Photos
                </button>

                {!hasPickupConsent ? (
                  <button
                    onClick={() => setShowPickupForm(true)}
                    className="inline-flex items-center gap-2 rounded-lg bg-emerald-100 hover:bg-emerald-200 px-3 py-2 text-sm font-medium text-emerald-700 transition"
                  >
                    <ClipboardCheck className="h-4 w-4" />
                    Pickup Form
                  </button>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs font-medium text-emerald-600">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Pickup Signed
                  </span>
                )}

                {!hasReturnConfirmation ? (
                  <button
                    onClick={() => setShowReturnForm(true)}
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-100 hover:bg-blue-200 px-3 py-2 text-sm font-medium text-blue-700 transition"
                  >
                    <PackageCheck className="h-4 w-4" />
                    Return Form
                  </button>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 border border-blue-200 px-3 py-2 text-xs font-medium text-blue-600">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Return Signed
                  </span>
                )}

                <button
                  onClick={() => setShowClaimForm(true)}
                  className="inline-flex items-center gap-2 rounded-lg bg-amber-100 hover:bg-amber-200 px-3 py-2 text-sm font-medium text-amber-700 transition"
                >
                  <FileWarning className="h-4 w-4" />
                  {hasClaimLodged ? "View / New Claim" : "Lodge Claim"}
                </button>
              </div>
            )}
          </div>

          {/* Right Side - Progress & Expand */}
          <div className="flex flex-col items-end gap-2">
            {booking.status === "in_progress" && (
              <div className="text-right">
                <div className="text-xs text-slate-500 mb-1">Progress</div>
                <div className="flex items-center gap-2">
                  <div className="w-16 h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all"
                      style={{ width: `${booking.overallProgress}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-slate-700">
                    {booking.overallProgress}%
                  </span>
                </div>
              </div>
            )}
            {booking.paymentAmount && (
              <div className="text-sm font-medium text-slate-700">
                ${(booking.paymentAmount / 100).toFixed(2)}
              </div>
            )}
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 transition"
            >
              {expanded ? (
                <>
                  <span>Less</span>
                  <ChevronUp className="h-4 w-4" />
                </>
              ) : (
                <>
                  <span>Details</span>
                  <ChevronDown className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="border-t border-slate-200 bg-white p-4 sm:p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Booking Details */}
            <div>
              <h4 className="text-sm font-semibold text-slate-900 mb-3">
                Booking Details
              </h4>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-slate-500">Service Type</dt>
                  <dd className="font-medium text-slate-900 capitalize">
                    {booking.serviceType.replace(/_/g, " ")}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Transmission</dt>
                  <dd className="font-medium text-slate-900 capitalize">
                    {booking.transmissionType}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Pickup</dt>
                  <dd className="font-medium text-slate-900">
                    {formatDateTime(booking.pickupTime)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Drop-off</dt>
                  <dd className="font-medium text-slate-900">
                    {formatDateTime(booking.dropoffTime)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Booked On</dt>
                  <dd className="font-medium text-slate-900">
                    {formatDate(booking.createdAt)}
                  </dd>
                </div>
                {booking.status !== "pending" && (
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Current Stage</dt>
                    <dd className="font-medium text-slate-900">
                      {stageLabels[booking.currentStage] || booking.currentStage}
                    </dd>
                  </div>
                )}
              </dl>

              {/* Driver Details in Expanded View */}
              {booking.driver && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <h4 className="text-sm font-semibold text-slate-900 mb-3">
                    Your Driver
                  </h4>
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 overflow-hidden rounded-full bg-slate-100 ring-2 ring-emerald-100">
                      {booking.driver.profilePhoto ? (
                        <Image
                          src={booking.driver.profilePhoto}
                          alt={booking.driver.firstName}
                          width={48}
                          height={48}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <User className="h-6 w-6 text-slate-400" />
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">
                        {booking.driver.firstName}
                      </p>
                      <div className="flex items-center gap-2 text-xs">
                        {booking.driver.totalRatings > 0 ? (
                          <span className="flex items-center gap-1 text-amber-600">
                            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                            {booking.driver.rating.toFixed(1)} ({booking.driver.totalRatings} reviews)
                          </span>
                        ) : (
                          <span className="text-slate-500">New driver</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {booking.driver.completedJobs} jobs completed
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Signed Forms Status in Expanded View */}
              {booking.signedForms && booking.signedForms.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <h4 className="text-sm font-semibold text-slate-900 mb-3">
                    Signed Forms
                  </h4>
                  <div className="space-y-2">
                    {booking.signedForms.map((form, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between text-sm"
                      >
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          <span className="text-slate-700 capitalize">
                            {form.formType.replace(/_/g, " ")}
                          </span>
                        </div>
                        <span className="text-xs text-slate-400">
                          {formatDateTime(form.submittedAt)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Activity Timeline */}
            {booking.updates && booking.updates.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-slate-900 mb-3">
                  Recent Updates
                </h4>
                <div className="space-y-3">
                  {booking.updates.slice(-4).reverse().map((update, index) => (
                    <div key={index} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className="h-2 w-2 rounded-full bg-emerald-500" />
                        {index < Math.min(booking.updates.length - 1, 3) && (
                          <div className="w-0.5 flex-1 bg-slate-200" />
                        )}
                      </div>
                      <div className="flex-1 pb-3">
                        <p className="text-sm font-medium text-slate-900">
                          {stageLabels[update.stage] || update.stage}
                        </p>
                        {update.message && (
                          <p className="text-xs text-slate-500 mt-0.5">
                            {update.message}
                          </p>
                        )}
                        <p className="text-xs text-slate-400 mt-0.5">
                          {formatDateTime(update.timestamp)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Vehicle Photos Viewer Modal */}
      <VehiclePhotosViewer
        bookingId={booking._id}
        vehicleRegistration={`${booking.vehicleRegistration} (${booking.vehicleState})`}
        isOpen={showPhotos}
        onClose={() => setShowPhotos(false)}
      />

      {/* Form Modals */}
      <PickupConsentForm
        booking={bookingForForms}
        isOpen={showPickupForm}
        onClose={() => setShowPickupForm(false)}
        onSuccess={handleFormSuccess}
        driverName={booking.driver?.firstName || ""}
      />

      <ReturnConfirmationForm
        booking={bookingForForms}
        isOpen={showReturnForm}
        onClose={() => setShowReturnForm(false)}
        onSuccess={handleFormSuccess}
        driverName={booking.driver?.firstName || ""}
      />

      <ClaimLodgementForm
        booking={bookingForForms}
        isOpen={showClaimForm}
        onClose={() => setShowClaimForm(false)}
        onSuccess={handleFormSuccess}
      />
    </div>
  );
}
