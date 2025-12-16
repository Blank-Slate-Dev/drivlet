// src/components/driver/RegistrationForm.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Loader2, CheckCircle } from "lucide-react";
import StepIndicator from "./StepIndicator";
import AccountStep from "./steps/AccountStep";
import PersonalInfoStep from "./steps/PersonalInfoStep";
import LicenseStep from "./steps/LicenseStep";
import VehicleStep from "./steps/VehicleStep";
import AvailabilityStep from "./steps/AvailabilityStep";
import BankingStep from "./steps/BankingStep";
import ReviewStep from "./steps/ReviewStep";

const STEPS = [
  { id: 1, name: "Account Setup", shortName: "Account" },
  { id: 2, name: "Personal Information", shortName: "Personal" },
  { id: 3, name: "License Details", shortName: "License" },
  { id: 4, name: "Vehicle Information", shortName: "Vehicle" },
  { id: 5, name: "Availability", shortName: "Availability" },
  { id: 6, name: "Banking & Tax", shortName: "Banking" },
  { id: 7, name: "Review & Submit", shortName: "Review" },
];

const LOCAL_STORAGE_KEY = "drivlet_driver_registration";

interface FormData {
  // Account
  email: string;
  password: string;
  confirmPassword: string;
  // Personal Information
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  phone: string;
  address: {
    street: string;
    suburb: string;
    state: string;
    postcode: string;
  };
  // License
  license: {
    number: string;
    state: string;
    class: string;
    expiryDate: string;
  };
  // Vehicle
  hasOwnVehicle: boolean;
  vehicle: {
    make: string;
    model: string;
    year: string;
    color: string;
    registration: string;
    registrationState: string;
    registrationExpiry: string;
    insuranceProvider: string;
    insurancePolicyNumber: string;
    insuranceExpiry: string;
  };
  // Availability
  availability: Record<string, { available: boolean; startTime: string; endTime: string }>;
  maxJobsPerDay: number;
  preferredAreas: string[];
  // Employment & Banking
  employmentType: string;
  tfn: string;
  abn: string;
  superannuationFund: string;
  superannuationMemberNumber: string;
  bankDetails: {
    accountName: string;
    bsb: string;
    accountNumber: string;
  };
  // Emergency Contact
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
  };
}

const defaultAvailability = {
  monday: { available: true, startTime: "07:00", endTime: "18:00" },
  tuesday: { available: true, startTime: "07:00", endTime: "18:00" },
  wednesday: { available: true, startTime: "07:00", endTime: "18:00" },
  thursday: { available: true, startTime: "07:00", endTime: "18:00" },
  friday: { available: true, startTime: "07:00", endTime: "18:00" },
  saturday: { available: false, startTime: "08:00", endTime: "14:00" },
  sunday: { available: false, startTime: "08:00", endTime: "14:00" },
};

const initialFormData: FormData = {
  email: "",
  password: "",
  confirmPassword: "",
  firstName: "",
  lastName: "",
  dateOfBirth: "",
  phone: "",
  address: {
    street: "",
    suburb: "",
    state: "",
    postcode: "",
  },
  license: {
    number: "",
    state: "",
    class: "C",
    expiryDate: "",
  },
  hasOwnVehicle: false,
  vehicle: {
    make: "",
    model: "",
    year: "",
    color: "",
    registration: "",
    registrationState: "",
    registrationExpiry: "",
    insuranceProvider: "",
    insurancePolicyNumber: "",
    insuranceExpiry: "",
  },
  availability: defaultAvailability,
  maxJobsPerDay: 10,
  preferredAreas: [],
  employmentType: "employee",
  tfn: "",
  abn: "",
  superannuationFund: "",
  superannuationMemberNumber: "",
  bankDetails: {
    accountName: "",
    bsb: "",
    accountNumber: "",
  },
  emergencyContact: {
    name: "",
    relationship: "",
    phone: "",
  },
};

export default function DriverRegistrationForm() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Load saved form data from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setFormData((prev) => ({ ...prev, ...parsed.data }));
        setCurrentStep(parsed.step || 1);
      } catch {
        // Ignore parse errors
      }
    }
  }, []);

  // Save form data to localStorage
  useEffect(() => {
    if (formData.email) {
      localStorage.setItem(
        LOCAL_STORAGE_KEY,
        JSON.stringify({ data: formData, step: currentStep })
      );
    }
  }, [formData, currentStep]);

  const updateFormData = (updates: Partial<FormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
    // Clear related errors when data changes
    const errorKeys = Object.keys(updates);
    if (errorKeys.length > 0) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        errorKeys.forEach((key) => delete newErrors[key]);
        return newErrors;
      });
    }
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    switch (step) {
      case 1: // Account
        if (!formData.email) newErrors.email = "Email is required";
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))
          newErrors.email = "Please enter a valid email";
        if (!formData.password) newErrors.password = "Password is required";
        else if (formData.password.length < 6)
          newErrors.password = "Password must be at least 6 characters";
        if (!formData.confirmPassword)
          newErrors.confirmPassword = "Please confirm your password";
        else if (formData.password !== formData.confirmPassword)
          newErrors.confirmPassword = "Passwords do not match";
        break;

      case 2: // Personal Info
        if (!formData.firstName) newErrors.firstName = "First name is required";
        if (!formData.lastName) newErrors.lastName = "Last name is required";
        if (!formData.dateOfBirth) newErrors.dateOfBirth = "Date of birth is required";
        else {
          const dob = new Date(formData.dateOfBirth);
          const today = new Date();
          const age = today.getFullYear() - dob.getFullYear();
          if (age < 18) newErrors.dateOfBirth = "You must be at least 18 years old";
        }
        if (!formData.phone) newErrors.phone = "Phone number is required";
        if (!formData.address.street)
          newErrors["address.street"] = "Street address is required";
        if (!formData.address.suburb)
          newErrors["address.suburb"] = "Suburb is required";
        if (!formData.address.state)
          newErrors["address.state"] = "State is required";
        if (!formData.address.postcode)
          newErrors["address.postcode"] = "Postcode is required";
        else if (!/^\d{4}$/.test(formData.address.postcode))
          newErrors["address.postcode"] = "Postcode must be 4 digits";
        // Emergency contact
        if (!formData.emergencyContact.name)
          newErrors["emergencyContact.name"] = "Emergency contact name is required";
        if (!formData.emergencyContact.relationship)
          newErrors["emergencyContact.relationship"] = "Relationship is required";
        if (!formData.emergencyContact.phone)
          newErrors["emergencyContact.phone"] = "Emergency contact phone is required";
        break;

      case 3: // License
        if (!formData.license.number)
          newErrors["license.number"] = "License number is required";
        if (!formData.license.state)
          newErrors["license.state"] = "License state is required";
        if (!formData.license.expiryDate)
          newErrors["license.expiryDate"] = "Expiry date is required";
        else if (new Date(formData.license.expiryDate) <= new Date())
          newErrors["license.expiryDate"] = "License must not be expired";
        break;

      case 4: // Vehicle
        if (formData.hasOwnVehicle) {
          if (!formData.vehicle.make)
            newErrors["vehicle.make"] = "Vehicle make is required";
          if (!formData.vehicle.model)
            newErrors["vehicle.model"] = "Vehicle model is required";
          if (!formData.vehicle.year)
            newErrors["vehicle.year"] = "Vehicle year is required";
          if (!formData.vehicle.registration)
            newErrors["vehicle.registration"] = "Registration is required";
          if (!formData.vehicle.registrationExpiry)
            newErrors["vehicle.registrationExpiry"] = "Registration expiry is required";
          else if (new Date(formData.vehicle.registrationExpiry) <= new Date())
            newErrors["vehicle.registrationExpiry"] = "Registration must not be expired";
        }
        break;

      case 5: // Availability
        // Check at least one day is available
        const availableDays = Object.values(formData.availability).filter(
          (day) => day.available
        );
        if (availableDays.length === 0) {
          newErrors.availability = "Select at least one available day";
        }
        break;

      case 6: // Banking
        if (!formData.bankDetails.accountName)
          newErrors["bankDetails.accountName"] = "Account name is required";
        if (!formData.bankDetails.bsb)
          newErrors["bankDetails.bsb"] = "BSB is required";
        else if (!/^\d{3}-?\d{3}$/.test(formData.bankDetails.bsb.replace(/\s/g, "")))
          newErrors["bankDetails.bsb"] = "BSB must be 6 digits";
        if (!formData.bankDetails.accountNumber)
          newErrors["bankDetails.accountNumber"] = "Account number is required";
        else if (!/^\d{6,10}$/.test(formData.bankDetails.accountNumber))
          newErrors["bankDetails.accountNumber"] = "Account number must be 6-10 digits";
        // If contractor, ABN is recommended
        if (formData.employmentType === "contractor" && formData.abn) {
          if (!/^\d{11}$/.test(formData.abn.replace(/\s/g, "")))
            newErrors.abn = "ABN must be 11 digits";
        }
        break;

      case 7: // Review
        if (!termsAccepted) newErrors.terms = "You must accept the terms and conditions";
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, STEPS.length));
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handlePrevious = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return;

    setLoading(true);
    setErrors({});

    try {
      const response = await fetch("/api/driver/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!response.ok) {
        setErrors({ submit: result.error || "Registration failed" });
        setLoading(false);
        return;
      }

      // Clear localStorage on success
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      setSuccess(true);

      // Redirect to pending page after short delay
      setTimeout(() => {
        router.push("/driver/pending");
      }, 2000);
    } catch {
      setErrors({ submit: "An error occurred. Please try again." });
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
          <CheckCircle className="h-8 w-8 text-emerald-600" />
        </div>
        <h2 className="mt-4 text-2xl font-bold text-slate-900">
          Application Submitted!
        </h2>
        <p className="mt-2 text-slate-600">
          Redirecting you to check your application status...
        </p>
      </div>
    );
  }

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <AccountStep
            data={{
              email: formData.email,
              password: formData.password,
              confirmPassword: formData.confirmPassword,
            }}
            onChange={updateFormData}
            errors={errors}
          />
        );
      case 2:
        return (
          <PersonalInfoStep
            data={{
              firstName: formData.firstName,
              lastName: formData.lastName,
              dateOfBirth: formData.dateOfBirth,
              phone: formData.phone,
              address: formData.address,
              emergencyContact: formData.emergencyContact,
            }}
            onChange={updateFormData}
            errors={errors}
          />
        );
      case 3:
        return (
          <LicenseStep
            data={{
              license: formData.license,
            }}
            onChange={updateFormData}
            errors={errors}
          />
        );
      case 4:
        return (
          <VehicleStep
            data={{
              hasOwnVehicle: formData.hasOwnVehicle,
              vehicle: formData.vehicle,
            }}
            onChange={updateFormData}
            errors={errors}
          />
        );
      case 5:
        return (
          <AvailabilityStep
            data={{
              availability: formData.availability,
              maxJobsPerDay: formData.maxJobsPerDay,
              preferredAreas: formData.preferredAreas,
            }}
            onChange={updateFormData}
            errors={errors}
          />
        );
      case 6:
        return (
          <BankingStep
            data={{
              employmentType: formData.employmentType,
              tfn: formData.tfn,
              abn: formData.abn,
              superannuationFund: formData.superannuationFund,
              superannuationMemberNumber: formData.superannuationMemberNumber,
              bankDetails: formData.bankDetails,
            }}
            onChange={updateFormData}
            errors={errors}
          />
        );
      case 7:
        return (
          <ReviewStep
            data={formData}
            termsAccepted={termsAccepted}
            onTermsChange={setTermsAccepted}
            errors={errors}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div>
      <StepIndicator steps={STEPS} currentStep={currentStep} />

      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 sm:p-8">
        {renderStep()}

        {/* Error message */}
        {errors.submit && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-sm text-red-700">{errors.submit}</p>
          </div>
        )}

        {/* Navigation buttons */}
        <div className="mt-8 flex justify-between">
          <button
            type="button"
            onClick={handlePrevious}
            disabled={currentStep === 1}
            className="flex items-center gap-2 px-6 py-3 text-sm font-semibold text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowLeft className="h-4 w-4" />
            Previous
          </button>

          {currentStep < STEPS.length ? (
            <button
              type="button"
              onClick={handleNext}
              className="flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition"
            >
              Next
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="flex items-center gap-2 px-8 py-3 text-sm font-semibold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  Submit Application
                  <CheckCircle className="h-4 w-4" />
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
