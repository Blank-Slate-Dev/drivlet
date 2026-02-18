// src/app/driver/register/page.tsx
"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  Car,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  User,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  FileText,
  CreditCard,
  AlertCircle,
  Loader2,
} from "lucide-react";

type Step = 1 | 2 | 3 | 4;

const steps = [
  { number: 1 as Step, label: "Personal" },
  { number: 2 as Step, label: "License" },
  { number: 3 as Step, label: "Banking" },
  { number: 4 as Step, label: "Review" },
];

export default function DriverRegisterPage() {
  const router = useRouter();
  const formRef = useRef<HTMLDivElement>(null);
  
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    firstName: "", lastName: "", email: "", phone: "", password: "", confirmPassword: "",
    licenseNumber: "", licenseState: "NSW", licenseExpiry: "",
    bsb: "", accountNumber: "", accountName: "", abn: "",
  });

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (error) setError("");
  };

  const validateStep = (step: Step): boolean => {
    switch (step) {
      case 1:
        if (!formData.firstName.trim()) { setError("Please enter your first name"); return false; }
        if (!formData.lastName.trim()) { setError("Please enter your last name"); return false; }
        if (!formData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) { setError("Please enter a valid email address"); return false; }
        if (!formData.phone.trim()) { setError("Please enter your phone number"); return false; }
        if (formData.password.length < 6) { setError("Password must be at least 6 characters"); return false; }
        if (formData.password !== formData.confirmPassword) { setError("Passwords do not match"); return false; }
        return true;
      case 2:
        if (!formData.licenseNumber.trim()) { setError("Please enter your license number"); return false; }
        if (!formData.licenseExpiry) { setError("Please enter your license expiry date"); return false; }
        return true;
      case 3:
        if (!formData.bsb.trim() || formData.bsb.length !== 6) { setError("Please enter a valid 6-digit BSB"); return false; }
        if (!formData.accountNumber.trim()) { setError("Please enter your account number"); return false; }
        if (!formData.accountName.trim()) { setError("Please enter the account holder name"); return false; }
        return true;
      default: return true;
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goToStep = (step: Step) => {
    if (step > currentStep) {
      for (let s = currentStep; s < step; s++) { if (!validateStep(s as Step)) return; }
    }
    setError("");
    setCurrentStep(step);
    scrollToTop();
  };

  const nextStep = () => { if (validateStep(currentStep)) { setCurrentStep((prev) => Math.min(prev + 1, 4) as Step); scrollToTop(); } };
  const prevStep = () => { setError(""); setCurrentStep((prev) => Math.max(prev - 1, 1) as Step); scrollToTop(); };

  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/driver/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Registration failed"); return; }
      router.push("/driver/login?registered=true");
    } catch { setError("Something went wrong. Please try again."); }
    finally { setLoading(false); }
  };

  const isStepComplete = (step: Step): boolean => {
    switch (step) {
      case 1: return !!(formData.firstName && formData.lastName && formData.email && formData.phone && formData.password && formData.confirmPassword);
      case 2: return !!(formData.licenseNumber && formData.licenseExpiry);
      case 3: return !!(formData.bsb && formData.accountNumber && formData.accountName);
      default: return false;
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-700 relative">
      {/* Pattern overlay — matching join/login pages */}
      <div className="absolute inset-0 z-0 opacity-10">
        <div
          className="h-full w-full"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
      </div>

      {/* Header — matching join/login pages */}
      <header className="sticky top-0 z-50">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="relative h-12 w-40 sm:h-14 sm:w-48">
              <Image
                src="/logo.png"
                alt="drivlet"
                fill
                className="object-contain brightness-0 invert"
                priority
              />
            </div>
          </Link>
          <div className="flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-sm px-4 py-2 border border-white/20">
            <Car className="h-5 w-5 text-emerald-300" />
            <span className="text-sm font-medium text-white">Driver Portal</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="relative z-10 px-4 py-8 sm:py-12">
        <div className="mx-auto max-w-2xl">
          {/* Page Title */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-8"
          >
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Become a driver</h1>
            <p className="mt-2 text-emerald-100 text-sm">Takes less than 5 minutes. Start earning soon.</p>
          </motion.div>

          {/* Step Indicator */}
          <div className="mb-8">
            <div className="flex items-center justify-between max-w-md mx-auto">
              {steps.map((step, index) => (
                <div key={step.number} className="flex items-center flex-1">
                  {index > 0 && (
                    <div className={`flex-1 h-px transition-colors ${currentStep >= step.number ? "bg-emerald-300" : "bg-white/20"}`} />
                  )}
                  <button
                    type="button"
                    onClick={() => goToStep(step.number)}
                    disabled={step.number > currentStep && !isStepComplete((step.number - 1) as Step)}
                    className="flex flex-col items-center gap-1.5"
                  >
                    <div className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold transition-all ${
                      currentStep === step.number
                        ? "bg-white text-emerald-700 shadow-lg shadow-black/10"
                        : currentStep > step.number
                        ? "bg-emerald-400 text-white"
                        : "bg-white/15 text-white/50"
                    }`}>
                      {currentStep > step.number ? <CheckCircle2 className="h-4 w-4" /> : step.number}
                    </div>
                    <span className={`text-[11px] font-medium ${
                      currentStep === step.number ? "text-white" : currentStep > step.number ? "text-emerald-200" : "text-white/40"
                    }`}>{step.label}</span>
                  </button>
                  {index < steps.length - 1 && (
                    <div className={`flex-1 h-px transition-colors ${currentStep > step.number ? "bg-emerald-300" : "bg-white/20"}`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Form Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div ref={formRef} className="rounded-3xl border border-white/20 bg-white/95 backdrop-blur-sm shadow-2xl overflow-hidden">
              <div className="p-6 sm:p-8">
                {error && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-red-600 text-sm">{error}</p>
                  </motion.div>
                )}

                {/* Step 1: Personal Details */}
                {currentStep === 1 && (
                  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
                    <div className="flex items-center gap-3 mb-6">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-md shadow-emerald-500/20">
                        <User className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-slate-900">Personal Details</h2>
                        <p className="text-sm text-slate-500">Tell us about yourself</p>
                      </div>
                    </div>
                    <div className="space-y-5">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1.5">First name *</label>
                          <input type="text" value={formData.firstName} onChange={(e) => updateField("firstName", e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition" placeholder="John" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1.5">Last name *</label>
                          <input type="text" value={formData.lastName} onChange={(e) => updateField("lastName", e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition" placeholder="Smith" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Email address *</label>
                        <div className="relative">
                          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                          <input type="email" value={formData.email} onChange={(e) => updateField("email", e.target.value)} className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition" placeholder="john@example.com" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Phone number *</label>
                        <div className="relative">
                          <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                          <input type="tel" value={formData.phone} onChange={(e) => updateField("phone", e.target.value)} className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition" placeholder="0412 345 678" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Password *</label>
                        <div className="relative">
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                          <input type={showPassword ? "text" : "password"} value={formData.password} onChange={(e) => updateField("password", e.target.value)} className="w-full pl-12 pr-12 py-3 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition" placeholder="At least 6 characters" />
                          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Confirm password *</label>
                        <div className="relative">
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                          <input type={showPassword ? "text" : "password"} value={formData.confirmPassword} onChange={(e) => updateField("confirmPassword", e.target.value)} className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition" placeholder="Confirm your password" />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Step 2: License Details */}
                {currentStep === 2 && (
                  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
                    <div className="flex items-center gap-3 mb-6">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-md shadow-emerald-500/20">
                        <FileText className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-slate-900">License Details</h2>
                        <p className="text-sm text-slate-500">Your driver&apos;s license information</p>
                      </div>
                    </div>
                    <div className="space-y-5">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">License number *</label>
                        <input type="text" value={formData.licenseNumber} onChange={(e) => updateField("licenseNumber", e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition" placeholder="Enter your license number" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1.5">State issued *</label>
                          <select value={formData.licenseState} onChange={(e) => updateField("licenseState", e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition">
                            <option value="NSW">NSW</option>
                            <option value="QLD">QLD</option>
                            <option value="VIC">VIC</option>
                            <option value="SA">SA</option>
                            <option value="WA">WA</option>
                            <option value="TAS">TAS</option>
                            <option value="NT">NT</option>
                            <option value="ACT">ACT</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1.5">Expiry date *</label>
                          <input type="date" value={formData.licenseExpiry} onChange={(e) => updateField("licenseExpiry", e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition" />
                        </div>
                      </div>
                      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                        <p className="text-sm text-amber-800"><strong>Note:</strong> You must have a valid Australian driver&apos;s license with no major infringements in the last 3 years.</p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Step 3: Banking Details */}
                {currentStep === 3 && (
                  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
                    <div className="flex items-center gap-3 mb-6">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-md shadow-emerald-500/20">
                        <CreditCard className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-slate-900">Banking Details</h2>
                        <p className="text-sm text-slate-500">For receiving your payments</p>
                      </div>
                    </div>
                    <div className="space-y-5">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1.5">BSB *</label>
                          <input type="text" value={formData.bsb} onChange={(e) => updateField("bsb", e.target.value.replace(/\D/g, "").slice(0, 6))} className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition" placeholder="000-000" maxLength={6} />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1.5">Account number *</label>
                          <input type="text" value={formData.accountNumber} onChange={(e) => updateField("accountNumber", e.target.value.replace(/\D/g, ""))} className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition" placeholder="Account number" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Account holder name *</label>
                        <input type="text" value={formData.accountName} onChange={(e) => updateField("accountName", e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition" placeholder="Name on account" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">ABN (optional)</label>
                        <input type="text" value={formData.abn} onChange={(e) => updateField("abn", e.target.value.replace(/\D/g, "").slice(0, 11))} className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition" placeholder="11 digit ABN (if you have one)" maxLength={11} />
                        <p className="mt-1.5 text-xs text-slate-500">Don&apos;t have an ABN? You can add it later.</p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Step 4: Review */}
                {currentStep === 4 && (
                  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
                    <div className="flex items-center gap-3 mb-6">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-md shadow-emerald-500/20">
                        <CheckCircle2 className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-slate-900">Review & Submit</h2>
                        <p className="text-sm text-slate-500">Please confirm your details</p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                        <h3 className="text-sm font-semibold text-slate-700 mb-3">Personal Details</h3>
                        <div className="grid grid-cols-2 gap-y-2 text-sm">
                          <div className="text-slate-500">Name:</div><div className="text-slate-900 font-medium">{formData.firstName} {formData.lastName}</div>
                          <div className="text-slate-500">Email:</div><div className="text-slate-900 font-medium">{formData.email}</div>
                          <div className="text-slate-500">Phone:</div><div className="text-slate-900 font-medium">{formData.phone}</div>
                        </div>
                      </div>
                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                        <h3 className="text-sm font-semibold text-slate-700 mb-3">License Details</h3>
                        <div className="grid grid-cols-2 gap-y-2 text-sm">
                          <div className="text-slate-500">License:</div><div className="text-slate-900 font-medium">{formData.licenseNumber}</div>
                          <div className="text-slate-500">State:</div><div className="text-slate-900 font-medium">{formData.licenseState}</div>
                          <div className="text-slate-500">Expiry:</div><div className="text-slate-900 font-medium">{formData.licenseExpiry}</div>
                        </div>
                      </div>
                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                        <h3 className="text-sm font-semibold text-slate-700 mb-3">Banking Details</h3>
                        <div className="grid grid-cols-2 gap-y-2 text-sm">
                          <div className="text-slate-500">BSB:</div><div className="text-slate-900 font-medium">{formData.bsb}</div>
                          <div className="text-slate-500">Account:</div><div className="text-slate-900 font-medium">••••{formData.accountNumber.slice(-4)}</div>
                          <div className="text-slate-500">Name:</div><div className="text-slate-900 font-medium">{formData.accountName}</div>
                          {formData.abn && <><div className="text-slate-500">ABN:</div><div className="text-slate-900 font-medium">{formData.abn}</div></>}
                        </div>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                        <p className="text-xs text-slate-500 leading-relaxed">By submitting, you agree to our Terms of Service and Privacy Policy. Your application will be reviewed within 1-2 business days.</p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Navigation Buttons */}
                <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-200">
                  {currentStep > 1 ? (
                    <button type="button" onClick={prevStep} className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition">
                      <ArrowLeft className="h-4 w-4" /> Back
                    </button>
                  ) : <div />}
                  {currentStep < 4 ? (
                    <button type="button" onClick={nextStep} className="group inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/25 transition">
                      Continue <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </button>
                  ) : (
                    <button type="button" onClick={handleSubmit} disabled={loading} className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/25 transition disabled:opacity-50">
                      {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Submitting...</> : <>Submit Application <CheckCircle2 className="h-4 w-4" /></>}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Footer Links */}
          <div className="mt-8 text-center space-y-3">
            <p className="text-emerald-100 text-sm">
              Already have an account?{" "}
              <Link href="/driver/login" className="font-semibold text-white hover:text-emerald-200 transition">Sign in</Link>
            </p>
            <Link href="/" className="inline-flex items-center gap-2 text-sm text-white/70 hover:text-white transition">
              <ArrowLeft className="h-4 w-4" /> Back to home
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
