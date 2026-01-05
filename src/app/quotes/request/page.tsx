// src/app/quotes/request/page.tsx
"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Car,
  Mail,
  Phone,
  User,
  Wrench,
  MapPin,
  Calendar,
  Clock,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
} from "lucide-react";

import { SERVICE_CATEGORIES, URGENCY_LEVELS } from "@/constants/quoteRequest";

interface FormData {
  vehicleRegistration: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleYear: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  serviceCategory: string;
  serviceDescription: string;
  urgency: string;
  locationAddress: string;
  locationPlaceId: string;
  preferredDate: string;
}

interface FormErrors {
  [key: string]: string;
}

export default function RequestQuotePage() {
  const { data: session } = useSession();
  const router = useRouter();

  const [formData, setFormData] = useState<FormData>({
    vehicleRegistration: "",
    vehicleMake: "",
    vehicleModel: "",
    vehicleYear: "",
    customerName: session?.user?.username || "",
    customerEmail: session?.user?.email || "",
    customerPhone: "",
    serviceCategory: "",
    serviceDescription: "",
    urgency: "flexible",
    locationAddress: "",
    locationPlaceId: "",
    preferredDate: "",
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [quoteRequestId, setQuoteRequestId] = useState<string | null>(null);

  // Update form data when session loads
  useState(() => {
    if (session?.user) {
      setFormData((prev) => ({
        ...prev,
        customerName: session.user.username || prev.customerName,
        customerEmail: session.user.email || prev.customerEmail,
      }));
    }
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    // Transform vehicle registration to uppercase
    const newValue = name === "vehicleRegistration" ? value.toUpperCase() : value;

    setFormData((prev) => ({
      ...prev,
      [name]: newValue,
    }));

    // Clear error when field is edited
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Vehicle registration
    if (!formData.vehicleRegistration || formData.vehicleRegistration.length < 2) {
      newErrors.vehicleRegistration = "Vehicle registration is required";
    }

    // Customer name
    if (!formData.customerName || formData.customerName.length < 2) {
      newErrors.customerName = "Name is required";
    }

    // Email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.customerEmail || !emailRegex.test(formData.customerEmail)) {
      newErrors.customerEmail = "Valid email is required";
    }

    // Phone
    if (!formData.customerPhone || formData.customerPhone.length < 8) {
      newErrors.customerPhone = "Valid phone number is required";
    }

    // Service category
    if (!formData.serviceCategory) {
      newErrors.serviceCategory = "Please select a service category";
    }

    // Service description
    if (!formData.serviceDescription || formData.serviceDescription.length < 10) {
      newErrors.serviceDescription = "Please describe the service needed (min 10 characters)";
    }
    if (formData.serviceDescription.length > 2000) {
      newErrors.serviceDescription = "Description cannot exceed 2000 characters";
    }

    // Location
    if (!formData.locationAddress || formData.locationAddress.length < 5) {
      newErrors.locationAddress = "Service location is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/quotes/request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          vehicleYear: formData.vehicleYear ? parseInt(formData.vehicleYear, 10) : undefined,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        setQuoteRequestId(data.quoteRequestId);
      } else {
        if (data.errors) {
          setErrors(data.errors);
        } else {
          setErrors({ submit: data.error || "Failed to submit quote request" });
        }
      }
    } catch {
      setErrors({ submit: "Failed to submit quote request. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  // Success state
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 py-12">
        <div className="mx-auto max-w-lg px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-2xl bg-white p-8 shadow-xl text-center"
          >
            <div className="mx-auto h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center mb-6">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">
              Quote Request Submitted!
            </h1>
            <p className="text-slate-600 mb-6">
              Your request has been sent to local garages. You'll receive quotes soon.
            </p>
            <div className="bg-slate-50 rounded-xl p-4 mb-6">
              <p className="text-sm text-slate-500">Request ID</p>
              <p className="font-mono text-lg font-semibold text-slate-900">
                {quoteRequestId}
              </p>
            </div>
            <div className="space-y-3">
              <Link
                href="/quotes"
                className="block w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition"
              >
                View My Quotes
              </Link>
              <Link
                href="/"
                className="block w-full py-3 px-4 border border-slate-200 text-slate-700 font-medium rounded-xl hover:bg-slate-50 transition"
              >
                Back to Home
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 py-12">
      <div className="mx-auto max-w-2xl px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-slate-600 hover:text-emerald-600 mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-4 py-1.5 mb-4">
            <Sparkles className="h-4 w-4 text-emerald-600" />
            <span className="text-sm font-medium text-emerald-700">Free Service</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 sm:text-4xl">
            Request Service Quotes
          </h1>
          <p className="mt-3 text-lg text-slate-600">
            Get competitive quotes from local garages for your vehicle service
          </p>
        </div>

        {/* Form */}
        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleSubmit}
          className="rounded-2xl bg-white p-6 sm:p-8 shadow-xl space-y-8"
        >
          {/* Global error */}
          {errors.submit && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 border border-red-200">
              <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
              <p className="text-sm text-red-700">{errors.submit}</p>
            </div>
          )}

          {/* Vehicle Information */}
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900 mb-4">
              <Car className="h-5 w-5 text-emerald-600" />
              Vehicle Information
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="vehicleRegistration" className="block text-sm font-medium text-slate-700 mb-1">
                  Registration Number *
                </label>
                <input
                  type="text"
                  id="vehicleRegistration"
                  name="vehicleRegistration"
                  value={formData.vehicleRegistration}
                  onChange={handleChange}
                  className={`w-full rounded-xl border px-4 py-3 font-mono uppercase text-slate-900 placeholder:text-slate-400 focus:ring-2 transition ${
                    errors.vehicleRegistration
                      ? "border-red-300 focus:border-red-500 focus:ring-red-500/20"
                      : "border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20"
                  }`}
                  placeholder="ABC123"
                />
                {errors.vehicleRegistration && (
                  <p className="mt-1 text-sm text-red-600">{errors.vehicleRegistration}</p>
                )}
              </div>
              <div>
                <label htmlFor="vehicleMake" className="block text-sm font-medium text-slate-700 mb-1">
                  Make (optional)
                </label>
                <input
                  type="text"
                  id="vehicleMake"
                  name="vehicleMake"
                  value={formData.vehicleMake}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition"
                  placeholder="e.g., Toyota"
                />
              </div>
              <div>
                <label htmlFor="vehicleModel" className="block text-sm font-medium text-slate-700 mb-1">
                  Model (optional)
                </label>
                <input
                  type="text"
                  id="vehicleModel"
                  name="vehicleModel"
                  value={formData.vehicleModel}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition"
                  placeholder="e.g., Camry"
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="vehicleYear" className="block text-sm font-medium text-slate-700 mb-1">
                  Year (optional)
                </label>
                <input
                  type="number"
                  id="vehicleYear"
                  name="vehicleYear"
                  value={formData.vehicleYear}
                  onChange={handleChange}
                  min="1900"
                  max={new Date().getFullYear() + 1}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition"
                  placeholder="e.g., 2020"
                />
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900 mb-4">
              <User className="h-5 w-5 text-emerald-600" />
              Contact Information
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="customerName" className="block text-sm font-medium text-slate-700 mb-1">
                  Your Name *
                </label>
                <input
                  type="text"
                  id="customerName"
                  name="customerName"
                  value={formData.customerName}
                  onChange={handleChange}
                  className={`w-full rounded-xl border px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:ring-2 transition ${
                    errors.customerName
                      ? "border-red-300 focus:border-red-500 focus:ring-red-500/20"
                      : "border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20"
                  }`}
                  placeholder="John Smith"
                />
                {errors.customerName && (
                  <p className="mt-1 text-sm text-red-600">{errors.customerName}</p>
                )}
              </div>
              <div>
                <label htmlFor="customerEmail" className="block text-sm font-medium text-slate-700 mb-1">
                  Email Address *
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2">
                    <Mail className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="email"
                    id="customerEmail"
                    name="customerEmail"
                    value={formData.customerEmail}
                    onChange={handleChange}
                    className={`w-full rounded-xl border pl-10 pr-4 py-3 text-slate-900 placeholder:text-slate-400 focus:ring-2 transition ${
                      errors.customerEmail
                        ? "border-red-300 focus:border-red-500 focus:ring-red-500/20"
                        : "border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20"
                    }`}
                    placeholder="john@example.com"
                  />
                </div>
                {errors.customerEmail && (
                  <p className="mt-1 text-sm text-red-600">{errors.customerEmail}</p>
                )}
              </div>
              <div>
                <label htmlFor="customerPhone" className="block text-sm font-medium text-slate-700 mb-1">
                  Phone Number *
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2">
                    <Phone className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="tel"
                    id="customerPhone"
                    name="customerPhone"
                    value={formData.customerPhone}
                    onChange={handleChange}
                    className={`w-full rounded-xl border pl-10 pr-4 py-3 text-slate-900 placeholder:text-slate-400 focus:ring-2 transition ${
                      errors.customerPhone
                        ? "border-red-300 focus:border-red-500 focus:ring-red-500/20"
                        : "border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20"
                    }`}
                    placeholder="0400 000 000"
                  />
                </div>
                {errors.customerPhone && (
                  <p className="mt-1 text-sm text-red-600">{errors.customerPhone}</p>
                )}
              </div>
            </div>
          </div>

          {/* Service Details */}
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900 mb-4">
              <Wrench className="h-5 w-5 text-emerald-600" />
              Service Details
            </h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="serviceCategory" className="block text-sm font-medium text-slate-700 mb-1">
                  Service Category *
                </label>
                <select
                  id="serviceCategory"
                  name="serviceCategory"
                  value={formData.serviceCategory}
                  onChange={handleChange}
                  className={`w-full rounded-xl border px-4 py-3 text-slate-900 focus:ring-2 transition ${
                    errors.serviceCategory
                      ? "border-red-300 focus:border-red-500 focus:ring-red-500/20"
                      : "border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20"
                  }`}
                >
                  <option value="">Select a category</option>
                  {SERVICE_CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
                {errors.serviceCategory && (
                  <p className="mt-1 text-sm text-red-600">{errors.serviceCategory}</p>
                )}
              </div>
              <div>
                <label htmlFor="serviceDescription" className="block text-sm font-medium text-slate-700 mb-1">
                  Service Description *
                </label>
                <div className="relative">
                  <textarea
                    id="serviceDescription"
                    name="serviceDescription"
                    value={formData.serviceDescription}
                    onChange={handleChange}
                    rows={4}
                    maxLength={2000}
                    className={`w-full rounded-xl border px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:ring-2 transition resize-none ${
                      errors.serviceDescription
                        ? "border-red-300 focus:border-red-500 focus:ring-red-500/20"
                        : "border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20"
                    }`}
                    placeholder="Describe what service you need and any issues with your vehicle..."
                  />
                  <div className="absolute bottom-3 right-3 text-xs text-slate-400">
                    {formData.serviceDescription.length}/2000
                  </div>
                </div>
                {errors.serviceDescription && (
                  <p className="mt-1 text-sm text-red-600">{errors.serviceDescription}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Urgency *
                </label>
                <div className="grid gap-3 sm:grid-cols-3">
                  {URGENCY_LEVELS.map((level) => (
                    <label
                      key={level.value}
                      className={`relative flex cursor-pointer rounded-xl border p-4 transition ${
                        formData.urgency === level.value
                          ? "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-500/20"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <input
                        type="radio"
                        name="urgency"
                        value={level.value}
                        checked={formData.urgency === level.value}
                        onChange={handleChange}
                        className="sr-only"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <Clock className={`h-4 w-4 ${
                            formData.urgency === level.value ? "text-emerald-600" : "text-slate-400"
                          }`} />
                          <span className={`font-medium ${
                            formData.urgency === level.value ? "text-emerald-700" : "text-slate-900"
                          }`}>
                            {level.label}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">{level.description}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Location & Scheduling */}
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900 mb-4">
              <MapPin className="h-5 w-5 text-emerald-600" />
              Location & Scheduling
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="locationAddress" className="block text-sm font-medium text-slate-700 mb-1">
                  Service Location *
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2">
                    <MapPin className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    id="locationAddress"
                    name="locationAddress"
                    value={formData.locationAddress}
                    onChange={handleChange}
                    className={`w-full rounded-xl border pl-10 pr-4 py-3 text-slate-900 placeholder:text-slate-400 focus:ring-2 transition ${
                      errors.locationAddress
                        ? "border-red-300 focus:border-red-500 focus:ring-red-500/20"
                        : "border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20"
                    }`}
                    placeholder="Enter suburb or address"
                  />
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Garages will use this to estimate if they can service your area
                </p>
                {errors.locationAddress && (
                  <p className="mt-1 text-sm text-red-600">{errors.locationAddress}</p>
                )}
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="preferredDate" className="block text-sm font-medium text-slate-700 mb-1">
                  Preferred Date (optional)
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2">
                    <Calendar className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="date"
                    id="preferredDate"
                    name="preferredDate"
                    value={formData.preferredDate}
                    onChange={handleChange}
                    min={new Date().toISOString().split("T")[0]}
                    className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-3 text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-4 border-t border-slate-100">
            <button
              type="submit"
              disabled={loading}
              className="group w-full flex items-center justify-center gap-2 py-4 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/25 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <FileText className="h-5 w-5" />
                  Submit Quote Request
                  <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>
            <p className="mt-4 text-center text-sm text-slate-500">
              Your request will be visible to approved garages for 7 days
            </p>
          </div>
        </motion.form>
      </div>
    </div>
  );
}
