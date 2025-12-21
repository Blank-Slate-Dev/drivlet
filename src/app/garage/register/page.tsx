// src/app/garage/register/page.tsx
"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  Building2,
  Users,
  TrendingUp,
  Shield,
  MapPin,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  Wrench,
  Globe,
} from "lucide-react";
import AddressAutocomplete, { PlaceDetails } from "@/components/AddressAutocomplete";
import GarageAutocomplete, { GarageDetails } from "@/components/GarageAutocomplete";

type Step = 1 | 2 | 3 | 4;

const steps = [
  { number: 1 as Step, label: "Business" },
  { number: 2 as Step, label: "Contact" },
  { number: 3 as Step, label: "Services" },
  { number: 4 as Step, label: "Review" },
];

const serviceOptions = [
  "Logbook Service", "Major Service", "Minor Service", "Brake Service",
  "Tyre Service", "Diagnostics", "Air Conditioning", "Electrical",
  "Transmission", "Detailing",
];

export default function GarageRegisterPage() {
  const router = useRouter();
  const formRef = useRef<HTMLDivElement>(null);
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Address autocomplete state
  const [addressInput, setAddressInput] = useState("");

  // Garage autocomplete state (for linking to a physical garage)
  const [garageSearchInput, setGarageSearchInput] = useState("");

  const [formData, setFormData] = useState({
    businessName: "",
    abn: "",
    address: "",
    suburb: "",
    postcode: "",
    state: "NSW",
    // Linked garage business (what physical garage they represent)
    linkedGarageName: "",
    linkedGarageAddress: "",
    linkedGaragePlaceId: "",
    linkedGarageLat: 0,
    linkedGarageLng: 0,
    contactName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    website: "",
    services: [] as string[],
    openingHours: "8am - 5pm",
    capacity: "1-5",
  });

  const updateField = (field: string, value: string | string[]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (error) setError("");
  };

  // Handle linked garage selection
  const handleGarageSelect = (details: GarageDetails) => {
    if (details.name) {
      setGarageSearchInput(details.name);
      setFormData((prev) => ({
        ...prev,
        linkedGarageName: details.name,
        linkedGarageAddress: details.formattedAddress || "",
        linkedGaragePlaceId: details.placeId || "",
        linkedGarageLat: details.lat || 0,
        linkedGarageLng: details.lng || 0,
      }));
    }
  };

  const handleAddressSelect = (details: PlaceDetails) => {
    if (details.formattedAddress) {
      // Build street address from components
      const streetAddress = [details.streetNumber, details.streetName].filter(Boolean).join(" ");
      
      // Update the address input to show the full formatted address
      setAddressInput(details.formattedAddress);
      
      // Map full state names to abbreviations
      const stateAbbreviations: Record<string, string> = {
        "New South Wales": "NSW",
        "Queensland": "QLD",
        "Victoria": "VIC",
        "South Australia": "SA",
        "Western Australia": "WA",
        "Tasmania": "TAS",
        "Northern Territory": "NT",
        "Australian Capital Territory": "ACT",
      };
      
      const stateValue = details.state || "";
      const stateAbbr = stateAbbreviations[stateValue] || stateValue || "NSW";
      
      setFormData((prev) => ({
        ...prev,
        address: streetAddress || details.formattedAddress.split(",")[0] || "",
        suburb: details.suburb || "",
        postcode: details.postcode || "",
        state: stateAbbr,
      }));
    }
  };

  const toggleService = (service: string) => {
    const current = formData.services;
    updateField("services", current.includes(service) ? current.filter((s) => s !== service) : [...current, service]);
  };

  // Validate ABN format (11 digits)
  const isValidABN = (abn: string): boolean => {
    const cleanABN = abn.replace(/\s/g, "");
    return /^\d{11}$/.test(cleanABN);
  };

  const validateStep = (step: Step): boolean => {
    switch (step) {
      case 1:
        if (!formData.businessName.trim()) { setError("Please enter your business name"); return false; }
        if (!formData.abn.trim()) { setError("ABN is required for garage registration"); return false; }
        if (!isValidABN(formData.abn)) { setError("Please enter a valid 11-digit ABN"); return false; }
        if (!formData.linkedGarageName.trim()) { setError("Please select the garage/mechanic you represent from the search"); return false; }
        if (!formData.address.trim()) { setError("Please select your business address"); return false; }
        if (!formData.suburb.trim()) { setError("Please select a valid address with suburb"); return false; }
        if (!formData.postcode.trim() || formData.postcode.length !== 4) { setError("Please select a valid address with postcode"); return false; }
        return true;
      case 2:
        if (!formData.contactName.trim()) { setError("Please enter a contact name"); return false; }
        if (!formData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) { setError("Please enter a valid email address"); return false; }
        if (!formData.phone.trim()) { setError("Please enter your phone number"); return false; }
        if (formData.password.length < 6) { setError("Password must be at least 6 characters"); return false; }
        if (formData.password !== formData.confirmPassword) { setError("Passwords do not match"); return false; }
        return true;
      case 3:
        if (formData.services.length === 0) { setError("Please select at least one service you offer"); return false; }
        return true;
      default: return true;
    }
  };

  const goToStep = (step: Step) => {
    if (step > currentStep) {
      for (let s = currentStep; s < step; s++) { if (!validateStep(s as Step)) return; }
    }
    setError("");
    setCurrentStep(step);
  };

  const nextStep = () => { if (validateStep(currentStep)) setCurrentStep((prev) => Math.min(prev + 1, 4) as Step); };
  const prevStep = () => { setError(""); setCurrentStep((prev) => Math.max(prev - 1, 1) as Step); };

  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    try {
      // Step 1: Register the garage
      const res = await fetch("/api/garage/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) { 
        setError(data.error || "Registration failed"); 
        setLoading(false);
        return; 
      }

      // Step 2: Auto-login the user after successful registration
      const signInResult = await signIn("credentials", {
        email: formData.email,
        password: formData.password,
        redirect: false,
      });

      if (signInResult?.error) {
        // If auto-login fails, redirect to login page with success message
        router.push("/garage/login?registered=true");
        return;
      }

      // Step 3: Redirect to pending page
      router.push("/garage/pending");
    } catch { 
      setError("Something went wrong. Please try again."); 
      setLoading(false);
    }
  };

  const isStepComplete = (step: Step): boolean => {
    switch (step) {
      case 1: return !!(formData.businessName && formData.abn && isValidABN(formData.abn) && formData.linkedGarageName && formData.address && formData.suburb && formData.postcode);
      case 2: return !!(formData.contactName && formData.email && formData.phone && formData.password && formData.confirmPassword);
      case 3: return formData.services.length > 0;
      default: return false;
    }
  };

  return (
    <main className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="relative h-12 w-40 sm:h-14 sm:w-48">
              <Image
                src="/logo.png"
                alt="drivlet"
                fill
                className="object-contain"
                priority
              />
            </div>
          </Link>
          <div className="flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-sm px-4 py-2 border border-white/20">
            <Building2 className="h-5 w-5 text-emerald-300" />
            <span className="text-sm font-medium text-[#082340]">Garage Portal</span>
          </div>
        </div>
      </header>

      {/* Benefits Banner */}
      <div className="bg-gradient-to-r from-emerald-700 to-teal-700 py-6">
        <div className="mx-auto max-w-4xl px-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { icon: Users, value: "New Customers", label: "Steady referrals" },
              { icon: TrendingUp, value: "Grow Revenue", label: "Increase bookings" },
              { icon: Shield, value: "Vetted Partners", label: "Quality assured" },
              { icon: MapPin, value: "Newcastle", label: "& surrounds" },
            ].map((item) => (
              <div key={item.label} className="text-center">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white/10 mb-2">
                  <item.icon className="h-5 w-5 text-emerald-200" />
                </div>
                <div className="text-lg font-bold text-white">{item.value}</div>
                <div className="text-xs text-emerald-100">{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="py-8 px-4">
        <div className="mx-auto max-w-2xl">
          {/* Step Indicator */}
          <div className="mb-8">
            <div className="flex items-start justify-between">
              {steps.map((step, index) => (
                <div key={step.number} className="flex flex-col items-center flex-1">
                  <div className="flex items-center w-full">
                    {index > 0 && <div className={`flex-1 h-1 ${currentStep > step.number - 1 ? "bg-emerald-500" : "bg-slate-200"}`} />}
                    <button
                      type="button"
                      onClick={() => goToStep(step.number)}
                      disabled={step.number > currentStep && !isStepComplete((step.number - 1) as Step)}
                      className={`relative flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold transition-all ${
                        currentStep === step.number ? "bg-emerald-600 text-white ring-4 ring-emerald-100"
                        : currentStep > step.number ? "bg-emerald-500 text-white cursor-pointer hover:bg-emerald-600"
                        : "bg-slate-200 text-slate-500 cursor-not-allowed"
                      }`}
                    >
                      {currentStep > step.number ? <CheckCircle2 className="h-5 w-5" /> : step.number}
                    </button>
                    {index < steps.length - 1 && <div className={`flex-1 h-1 ${currentStep > step.number ? "bg-emerald-500" : "bg-slate-200"}`} />}
                  </div>
                  <span className={`mt-2 text-xs font-medium text-center ${currentStep === step.number ? "text-emerald-600" : "text-slate-500"}`}>{step.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Form Card */}
          <div ref={formRef} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 sm:p-8">
              {error && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-red-600 text-sm">{error}</p>
                </motion.div>
              )}

              {/* Step 1: Business Details */}
              {currentStep === 1 && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
                      <Building2 className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900">Business Details</h2>
                      <p className="text-sm text-slate-500">Tell us about your garage</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Business name *</label>
                      <input 
                        type="text" 
                        value={formData.businessName} 
                        onChange={(e) => updateField("businessName", e.target.value)} 
                        className="w-full px-4 py-3 rounded-xl border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition" 
                        placeholder="e.g. Smith's Auto Care" 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">ABN *</label>
                      <input 
                        type="text" 
                        value={formData.abn} 
                        onChange={(e) => updateField("abn", e.target.value.replace(/\D/g, "").slice(0, 11))} 
                        className={`w-full px-4 py-3 rounded-xl border text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition ${
                          formData.abn && !isValidABN(formData.abn) ? "border-red-300 bg-red-50" : "border-slate-300"
                        }`}
                        placeholder="11 digit ABN" 
                        maxLength={11} 
                      />
                      {formData.abn && !isValidABN(formData.abn) && (
                        <p className="mt-1 text-xs text-red-500">ABN must be exactly 11 digits</p>
                      )}
                      {formData.abn && isValidABN(formData.abn) && (
                        <p className="mt-1 text-xs text-emerald-600 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Valid ABN format
                        </p>
                      )}
                      <p className="mt-1 text-xs text-slate-500">
                        Don&apos;t have an ABN? <a href="https://www.abr.gov.au/business-super-funds-702s/applying-abn" target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline">Apply here</a>
                      </p>
                    </div>

                    {/* Linked Garage Selection */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Which garage do you represent? *</label>
                      <p className="text-xs text-slate-500 mb-2">
                        Search and select the garage/mechanic you represent. You will only receive bookings for this garage.
                      </p>
                      <GarageAutocomplete
                        value={garageSearchInput}
                        onChange={setGarageSearchInput}
                        onSelect={handleGarageSelect}
                        placeholder="Search for your garage (e.g. Westlakes Motor Group)..."
                        disabled={loading}
                        biasToNewcastle={true}
                      />
                    </div>

                    {/* Show selected garage confirmation */}
                    {formData.linkedGarageName && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl"
                      >
                        <div className="flex items-start gap-3">
                          <Wrench className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-emerald-900">Linked Garage</p>
                            <p className="text-sm text-emerald-700 mt-1">{formData.linkedGarageName}</p>
                            <p className="text-xs text-emerald-600">{formData.linkedGarageAddress}</p>
                            <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" />
                              You will only receive bookings for this garage location
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {/* Address Autocomplete */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Business address *</label>
                      <AddressAutocomplete
                        value={addressInput}
                        onChange={setAddressInput}
                        onSelect={handleAddressSelect}
                        placeholder="Start typing your business address..."
                        disabled={loading}
                        biasToNewcastle={true}
                      />
                    </div>

                    {/* Show selected address details */}
                    {formData.address && (
                      <motion.div 
                        initial={{ opacity: 0, y: -10 }} 
                        animate={{ opacity: 1, y: 0 }}
                        className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl"
                      >
                        <div className="flex items-start gap-3">
                          <MapPin className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-emerald-900">Selected Address</p>
                            <p className="text-sm text-emerald-700 mt-1">{formData.address}</p>
                            <p className="text-sm text-emerald-600">{formData.suburb}, {formData.state} {formData.postcode}</p>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Step 2: Contact Details */}
              {currentStep === 2 && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
                      <Phone className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900">Contact Details</h2>
                      <p className="text-sm text-slate-500">How can we reach you?</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Contact name *</label>
                      <input type="text" value={formData.contactName} onChange={(e) => updateField("contactName", e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition" placeholder="John Smith" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Email address *</label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                        <input type="email" value={formData.email} onChange={(e) => updateField("email", e.target.value)} className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition" placeholder="garage@example.com" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Phone number *</label>
                      <div className="relative">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                        <input type="tel" value={formData.phone} onChange={(e) => updateField("phone", e.target.value)} className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition" placeholder="02 1234 5678" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Website (optional)</label>
                      <div className="relative">
                        <Globe className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                        <input type="url" value={formData.website} onChange={(e) => updateField("website", e.target.value)} className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition" placeholder="https://www.yourgarage.com.au" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Password *</label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                        <input type={showPassword ? "text" : "password"} value={formData.password} onChange={(e) => updateField("password", e.target.value)} className="w-full pl-12 pr-12 py-3 rounded-xl border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition" placeholder="At least 6 characters" />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                          {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Confirm password *</label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                        <input type={showPassword ? "text" : "password"} value={formData.confirmPassword} onChange={(e) => updateField("confirmPassword", e.target.value)} className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition" placeholder="Confirm your password" />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Step 3: Services */}
              {currentStep === 3 && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
                      <Wrench className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900">Services Offered</h2>
                      <p className="text-sm text-slate-500">What services do you provide?</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-3">Select your services *</label>
                      <div className="grid grid-cols-2 gap-2">
                        {serviceOptions.map((service) => (
                          <button key={service} type="button" onClick={() => toggleService(service)} className={`p-3 rounded-xl border text-sm font-medium text-left transition ${formData.services.includes(service) ? "bg-emerald-50 border-emerald-500 text-emerald-700" : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"}`}>
                            <div className="flex items-center gap-2">
                              <div className={`w-4 h-4 rounded border flex items-center justify-center ${formData.services.includes(service) ? "bg-emerald-500 border-emerald-500" : "border-slate-300"}`}>
                                {formData.services.includes(service) && <CheckCircle2 className="h-3 w-3 text-white" />}
                              </div>
                              {service}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Opening hours</label>
                        <select value={formData.openingHours} onChange={(e) => updateField("openingHours", e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition">
                          <option value="7am - 4pm">7am - 4pm</option>
                          <option value="8am - 5pm">8am - 5pm</option>
                          <option value="9am - 6pm">9am - 6pm</option>
                          <option value="7am - 6pm">7am - 6pm</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Daily capacity</label>
                        <select value={formData.capacity} onChange={(e) => updateField("capacity", e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition">
                          <option value="1-5">1-5 cars/day</option>
                          <option value="6-10">6-10 cars/day</option>
                          <option value="11-20">11-20 cars/day</option>
                          <option value="20+">20+ cars/day</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Step 4: Review */}
              {currentStep === 4 && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900">Review & Submit</h2>
                      <p className="text-sm text-slate-500">Please confirm your details</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    {/* Linked Garage Highlight */}
                    <div className="p-4 bg-emerald-50 rounded-xl border-2 border-emerald-300">
                      <div className="flex items-center gap-2 mb-2">
                        <Wrench className="h-5 w-5 text-emerald-600" />
                        <h3 className="text-sm font-semibold text-emerald-800">Linked Garage</h3>
                      </div>
                      <p className="text-base font-medium text-emerald-900">{formData.linkedGarageName}</p>
                      <p className="text-sm text-emerald-700">{formData.linkedGarageAddress}</p>
                      <p className="text-xs text-amber-700 mt-2">You will only receive bookings for this garage location</p>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                      <h3 className="text-sm font-semibold text-slate-700 mb-3">Business Details</h3>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="text-slate-500">Business:</div>
                        <div className="text-slate-900 font-medium">{formData.businessName}</div>
                        <div className="text-slate-500">ABN:</div>
                        <div className="text-slate-900 font-medium">{formData.abn}</div>
                        <div className="text-slate-500">Address:</div>
                        <div className="text-slate-900 font-medium">{formData.address}, {formData.suburb} {formData.state} {formData.postcode}</div>
                      </div>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                      <h3 className="text-sm font-semibold text-slate-700 mb-3">Contact Details</h3>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="text-slate-500">Contact:</div>
                        <div className="text-slate-900 font-medium">{formData.contactName}</div>
                        <div className="text-slate-500">Email:</div>
                        <div className="text-slate-900 font-medium">{formData.email}</div>
                        <div className="text-slate-500">Phone:</div>
                        <div className="text-slate-900 font-medium">{formData.phone}</div>
                        {formData.website && (
                          <>
                            <div className="text-slate-500">Website:</div>
                            <div className="text-slate-900 font-medium">{formData.website}</div>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                      <h3 className="text-sm font-semibold text-slate-700 mb-3">Services</h3>
                      <div className="flex flex-wrap gap-2">
                        {formData.services.map((service) => (
                          <span key={service} className="px-3 py-1 bg-emerald-100 text-emerald-700 text-sm rounded-full">{service}</span>
                        ))}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm mt-3">
                        <div className="text-slate-500">Hours:</div>
                        <div className="text-slate-900 font-medium">{formData.openingHours}</div>
                        <div className="text-slate-500">Capacity:</div>
                        <div className="text-slate-900 font-medium">{formData.capacity} cars/day</div>
                      </div>
                    </div>
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                      <p className="text-sm text-amber-800">
                        <strong>Note:</strong> After registration, you&apos;ll need to provide additional details including insurance and banking information during the verification process.
                      </p>
                    </div>
                    <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                      <p className="text-sm text-emerald-800">By submitting, you agree to our Terms of Service and Privacy Policy. Your application will be reviewed within 1-2 business days.</p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Navigation Buttons */}
              <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-200">
                {currentStep > 1 ? (
                  <button type="button" onClick={prevStep} className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition">
                    <ArrowLeft className="h-4 w-4" /> Back
                  </button>
                ) : <div />}
                {currentStep < 4 ? (
                  <button type="button" onClick={nextStep} className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-sm transition">
                    Continue <ArrowRight className="h-4 w-4" />
                  </button>
                ) : (
                  <button type="button" onClick={handleSubmit} disabled={loading} className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-sm transition disabled:opacity-50">
                    {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Submitting...</> : <>Submit Application <CheckCircle2 className="h-4 w-4" /></>}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Footer Links */}
          <div className="mt-6 text-center space-y-3">
            <p className="text-slate-600 text-sm">Already have an account? <Link href="/garage/login" className="font-semibold text-emerald-600 hover:text-emerald-700 transition">Sign in</Link></p>
            <Link href="/" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition"><ArrowLeft className="h-4 w-4" /> Back to home</Link>
          </div>
        </div>
      </div>
    </main>
  );
}
