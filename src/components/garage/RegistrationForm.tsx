// src/components/garage/RegistrationForm.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Loader2, CheckCircle } from "lucide-react";
import StepIndicator from "./StepIndicator";
import AccountStep from "./steps/AccountStep";
import BusinessInfoStep from "./steps/BusinessInfoStep";
import ContactStep from "./steps/ContactStep";
import OperationalStep from "./steps/OperationalStep";
import CoverageStep from "./steps/CoverageStep";
import InsuranceStep from "./steps/InsuranceStep";
import PaymentStep from "./steps/PaymentStep";
import ReviewStep from "./steps/ReviewStep";

const STEPS = [
  { id: 1, name: "Account Setup", shortName: "Account" },
  { id: 2, name: "Business Information", shortName: "Business" },
  { id: 3, name: "Contact Details", shortName: "Contact" },
  { id: 4, name: "Operational Capacity", shortName: "Operations" },
  { id: 5, name: "Service Coverage", shortName: "Coverage" },
  { id: 6, name: "Insurance & Compliance", shortName: "Insurance" },
  { id: 7, name: "Payment & Billing", shortName: "Payment" },
  { id: 8, name: "Review & Submit", shortName: "Review" },
];

const LOCAL_STORAGE_KEY = "drivlet_garage_registration";

interface FormData {
  // Account
  email: string;
  password: string;
  confirmPassword: string;
  // Business
  businessName: string;
  tradingName: string;
  abn: string;
  businessAddress: {
    street: string;
    suburb: string;
    state: string;
    postcode: string;
  };
  yearsInOperation: number;
  servicesOffered: string[];
  // Contact
  primaryContact: {
    name: string;
    role: string;
    phone: string;
    email: string;
  };
  afterHoursContact: {
    name: string;
    phone: string;
  };
  // Operational
  operatingHours: Record<string, { open: string; close: string; closed: boolean }>;
  serviceBays: number;
  vehicleTypes: string[];
  averageTurnaroundTimes: {
    standardService: string;
    majorService: string;
    logbookService: string;
    other: string;
  };
  appointmentPolicy: string;
  // Coverage
  serviceRadius: number;
  pickupDropoff: {
    available: boolean;
    additionalFee: number;
    maxDistance: number;
  };
  // Insurance
  publicLiabilityInsurance: {
    provider: string;
    policyNumber: string;
    expiryDate: string;
    coverAmount: number;
  };
  professionalIndemnityInsurance: {
    provider: string;
    policyNumber: string;
    expiryDate: string;
    coverAmount: number;
  };
  certifications: string[];
  // Payment
  paymentTerms: string;
  bankDetails: {
    accountName: string;
    bsb: string;
    accountNumber: string;
  };
  gstRegistered: boolean;
}

const defaultOperatingHours = {
  monday: { open: "08:00", close: "17:00", closed: false },
  tuesday: { open: "08:00", close: "17:00", closed: false },
  wednesday: { open: "08:00", close: "17:00", closed: false },
  thursday: { open: "08:00", close: "17:00", closed: false },
  friday: { open: "08:00", close: "17:00", closed: false },
  saturday: { open: "08:00", close: "12:00", closed: false },
  sunday: { open: "08:00", close: "17:00", closed: true },
};

const initialFormData: FormData = {
  email: "",
  password: "",
  confirmPassword: "",
  businessName: "",
  tradingName: "",
  abn: "",
  businessAddress: {
    street: "",
    suburb: "",
    state: "",
    postcode: "",
  },
  yearsInOperation: 0,
  servicesOffered: [],
  primaryContact: {
    name: "",
    role: "",
    phone: "",
    email: "",
  },
  afterHoursContact: {
    name: "",
    phone: "",
  },
  operatingHours: defaultOperatingHours,
  serviceBays: 1,
  vehicleTypes: [],
  averageTurnaroundTimes: {
    standardService: "",
    majorService: "",
    logbookService: "",
    other: "",
  },
  appointmentPolicy: "both",
  serviceRadius: 15,
  pickupDropoff: {
    available: false,
    additionalFee: 0,
    maxDistance: 0,
  },
  publicLiabilityInsurance: {
    provider: "",
    policyNumber: "",
    expiryDate: "",
    coverAmount: 0,
  },
  professionalIndemnityInsurance: {
    provider: "",
    policyNumber: "",
    expiryDate: "",
    coverAmount: 0,
  },
  certifications: [],
  paymentTerms: "14_days",
  bankDetails: {
    accountName: "",
    bsb: "",
    accountNumber: "",
  },
  gstRegistered: false,
};

export default function RegistrationForm() {
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

      case 2: // Business Info
        if (!formData.businessName) newErrors.businessName = "Business name is required";
        if (!formData.abn) newErrors.abn = "ABN is required";
        else if (!/^\d{11}$/.test(formData.abn.replace(/\s/g, "")))
          newErrors.abn = "ABN must be 11 digits";
        if (!formData.businessAddress.street)
          newErrors["businessAddress.street"] = "Street address is required";
        if (!formData.businessAddress.suburb)
          newErrors["businessAddress.suburb"] = "Suburb is required";
        if (!formData.businessAddress.state)
          newErrors["businessAddress.state"] = "State is required";
        if (!formData.businessAddress.postcode)
          newErrors["businessAddress.postcode"] = "Postcode is required";
        else if (!/^\d{4}$/.test(formData.businessAddress.postcode))
          newErrors["businessAddress.postcode"] = "Postcode must be 4 digits";
        if (formData.servicesOffered.length === 0)
          newErrors.servicesOffered = "Select at least one service";
        break;

      case 3: // Contact
        if (!formData.primaryContact.name)
          newErrors["primaryContact.name"] = "Contact name is required";
        if (!formData.primaryContact.role)
          newErrors["primaryContact.role"] = "Role is required";
        if (!formData.primaryContact.phone)
          newErrors["primaryContact.phone"] = "Phone number is required";
        if (!formData.primaryContact.email)
          newErrors["primaryContact.email"] = "Email is required";
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.primaryContact.email))
          newErrors["primaryContact.email"] = "Please enter a valid email";
        break;

      case 4: // Operational
        if (!formData.serviceBays || formData.serviceBays < 1)
          newErrors.serviceBays = "At least 1 service bay is required";
        if (formData.vehicleTypes.length === 0)
          newErrors.vehicleTypes = "Select at least one vehicle type";
        break;

      case 5: // Coverage
        // Service radius has a default, no validation needed
        break;

      case 6: // Insurance
        if (!formData.publicLiabilityInsurance.provider)
          newErrors["publicLiabilityInsurance.provider"] = "Insurance provider is required";
        if (!formData.publicLiabilityInsurance.policyNumber)
          newErrors["publicLiabilityInsurance.policyNumber"] = "Policy number is required";
        if (!formData.publicLiabilityInsurance.expiryDate)
          newErrors["publicLiabilityInsurance.expiryDate"] = "Expiry date is required";
        if (!formData.publicLiabilityInsurance.coverAmount)
          newErrors["publicLiabilityInsurance.coverAmount"] = "Cover amount is required";
        break;

      case 7: // Payment
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
        break;

      case 8: // Review
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
      const response = await fetch("/api/garage/register", {
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
        router.push("/garage/pending");
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
          Registration Submitted!
        </h2>
        <p className="mt-2 text-slate-600">
          Redirecting you to the next steps...
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
          <BusinessInfoStep
            data={{
              businessName: formData.businessName,
              tradingName: formData.tradingName,
              abn: formData.abn,
              businessAddress: formData.businessAddress,
              yearsInOperation: formData.yearsInOperation,
              servicesOffered: formData.servicesOffered,
            }}
            onChange={updateFormData}
            errors={errors}
          />
        );
      case 3:
        return (
          <ContactStep
            data={{
              primaryContact: formData.primaryContact,
              afterHoursContact: formData.afterHoursContact,
            }}
            onChange={updateFormData}
            errors={errors}
          />
        );
      case 4:
        return (
          <OperationalStep
            data={{
              operatingHours: formData.operatingHours,
              serviceBays: formData.serviceBays,
              vehicleTypes: formData.vehicleTypes,
              averageTurnaroundTimes: formData.averageTurnaroundTimes,
              appointmentPolicy: formData.appointmentPolicy,
            }}
            onChange={updateFormData}
            errors={errors}
          />
        );
      case 5:
        return (
          <CoverageStep
            data={{
              serviceRadius: formData.serviceRadius,
              pickupDropoff: formData.pickupDropoff,
            }}
            onChange={updateFormData}
            errors={errors}
          />
        );
      case 6:
        return (
          <InsuranceStep
            data={{
              publicLiabilityInsurance: formData.publicLiabilityInsurance,
              professionalIndemnityInsurance: formData.professionalIndemnityInsurance,
              certifications: formData.certifications,
            }}
            onChange={updateFormData}
            errors={errors}
          />
        );
      case 7:
        return (
          <PaymentStep
            data={{
              paymentTerms: formData.paymentTerms,
              bankDetails: formData.bankDetails,
              gstRegistered: formData.gstRegistered,
            }}
            onChange={updateFormData}
            errors={errors}
          />
        );
      case 8:
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
