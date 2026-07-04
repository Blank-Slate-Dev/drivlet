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
  IdCard,
  ShieldCheck,
  Upload,
  Calendar,
  MapPin,
  Settings2,
  Users,
  X,
} from "lucide-react";

type Step = 1 | 2 | 3 | 4 | 5;

const steps = [
  { number: 1 as Step, label: "Personal" },
  { number: 2 as Step, label: "Licence" },
  { number: 3 as Step, label: "Documents" },
  { number: 4 as Step, label: "Banking" },
  { number: 5 as Step, label: "Review" },
];

const AU_STATES = ["NSW", "QLD", "VIC", "SA", "WA", "TAS", "NT", "ACT"];

const RIGHT_TO_WORK_OPTIONS = [
  { value: "citizen", label: "Australian citizen" },
  { value: "permanent_resident", label: "Permanent resident" },
  { value: "visa_with_work_rights", label: "Visa with work rights" },
];

const MAX_FILE_BYTES = 4 * 1024 * 1024; // 4MB

// Compress an image client-side (canvas) so the multipart payload stays under
// Vercel's ~4.5MB serverless request limit. Max 1600px longest edge, JPEG q0.8.
async function compressImage(file: File, maxEdge = 1600, quality = 0.8): Promise<File> {
  const dataUrl: string = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const img: HTMLImageElement = await new Promise((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = dataUrl;
  });

  let { width, height } = img;
  if (width >= height && width > maxEdge) {
    height = Math.round((height * maxEdge) / width);
    width = maxEdge;
  } else if (height > width && height > maxEdge) {
    width = Math.round((width * maxEdge) / height);
    height = maxEdge;
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(img, 0, 0, width, height);

  const blob: Blob | null = await new Promise((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", quality)
  );
  if (!blob) return file;

  const baseName = file.name.replace(/\.[^.]+$/, "") || "image";
  return new File([blob], `${baseName}.jpg`, { type: "image/jpeg" });
}

// Age in whole years from a yyyy-mm-dd string
function ageFromString(dob: string): number {
  const d = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const monthDiff = today.getMonth() - d.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < d.getDate())) age--;
  return age;
}

// Is a yyyy-mm-dd date within the last 12 months (and not in the future)?
function isWithinLast12Months(dateStr: string): boolean {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return false;
  const now = new Date();
  if (d > now) return false;
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - 12);
  return d >= cutoff;
}

function formatBytes(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export default function DriverRegisterPage() {
  const router = useRouter();
  const formRef = useRef<HTMLDivElement>(null);

  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    firstName: "", lastName: "", email: "", phone: "", password: "", confirmPassword: "",
    dateOfBirth: "",
    addressStreet: "", addressSuburb: "", addressState: "NSW", addressPostcode: "",
    licenseNumber: "", licenseState: "NSW", licenseExpiry: "",
    policeCheckCertificateNumber: "", policeCheckIssueDate: "",
    rightToWorkStatus: "", visaSubclass: "",
    emergencyContactName: "", emergencyContactRelationship: "", emergencyContactPhone: "",
    bsb: "", accountNumber: "", accountName: "",
  });
  const [canDriveManual, setCanDriveManual] = useState(false);

  // File state + previews (object URLs for images)
  const [licenceFront, setLicenceFront] = useState<File | null>(null);
  const [licenceBack, setLicenceBack] = useState<File | null>(null);
  const [policeDoc, setPoliceDoc] = useState<File | null>(null);
  const [licenceFrontPreview, setLicenceFrontPreview] = useState<string | null>(null);
  const [licenceBackPreview, setLicenceBackPreview] = useState<string | null>(null);

  const frontInputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);
  const policeInputRef = useRef<HTMLInputElement>(null);

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (error) setError("");
  };

  const handleImageSelect = (
    e: React.ChangeEvent<HTMLInputElement>,
    setFile: (f: File | null) => void,
    setPreview: (url: string | null) => void,
    prevPreview: string | null
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file (JPEG, PNG or WebP)");
      return;
    }
    if (prevPreview) URL.revokeObjectURL(prevPreview);
    setFile(file);
    setPreview(URL.createObjectURL(file));
    setError("");
  };

  const handlePoliceSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isImage = file.type.startsWith("image/");
    const isPdf = file.type === "application/pdf";
    if (!isImage && !isPdf) {
      setError("Police check must be an image or PDF");
      return;
    }
    // PDFs are not compressed — enforce the 4MB limit up front
    if (isPdf && file.size > MAX_FILE_BYTES) {
      setError("Police check PDF is too large (max 4MB)");
      return;
    }
    setPoliceDoc(file);
    setError("");
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
        if (!formData.dateOfBirth) { setError("Please enter your date of birth"); return false; }
        if (ageFromString(formData.dateOfBirth) < 18) { setError("You must be at least 18 years old"); return false; }
        if (!formData.addressStreet.trim()) { setError("Please enter your street address"); return false; }
        if (!formData.addressSuburb.trim()) { setError("Please enter your suburb"); return false; }
        if (!/^\d{4}$/.test(formData.addressPostcode.trim())) { setError("Postcode must be 4 digits"); return false; }
        return true;
      case 2:
        if (!formData.licenseNumber.trim()) { setError("Please enter your license number"); return false; }
        if (!formData.licenseExpiry) { setError("Please enter your license expiry date"); return false; }
        if (!licenceFront) { setError("Please upload the front of your licence"); return false; }
        if (!licenceBack) { setError("Please upload the back of your licence"); return false; }
        return true;
      case 3:
        if (!formData.policeCheckCertificateNumber.trim()) { setError("Please enter your police check certificate number"); return false; }
        if (!formData.policeCheckIssueDate) { setError("Please enter your police check issue date"); return false; }
        if (!isWithinLast12Months(formData.policeCheckIssueDate)) { setError("Your police check must have been issued within the last 12 months"); return false; }
        if (!policeDoc) { setError("Please upload your police check document"); return false; }
        if (!formData.rightToWorkStatus) { setError("Please select your right to work status"); return false; }
        if (formData.rightToWorkStatus === "visa_with_work_rights" && !formData.visaSubclass.trim()) { setError("Please enter your visa subclass"); return false; }
        if (!formData.emergencyContactName.trim()) { setError("Please enter your emergency contact name"); return false; }
        if (!formData.emergencyContactRelationship.trim()) { setError("Please enter your emergency contact relationship"); return false; }
        if (!formData.emergencyContactPhone.trim()) { setError("Please enter your emergency contact phone"); return false; }
        return true;
      case 4:
        if (!formData.bsb.trim() || formData.bsb.length !== 6) { setError("Please enter a valid 6-digit BSB"); return false; }
        if (!formData.accountNumber.trim()) { setError("Please enter your account number"); return false; }
        if (!formData.accountName.trim()) { setError("Please enter the account holder name"); return false; }
        return true;
      default: return true;
    }
  };

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  const goToStep = (step: Step) => {
    if (step > currentStep) {
      for (let s = currentStep; s < step; s++) { if (!validateStep(s as Step)) return; }
    }
    setError("");
    setCurrentStep(step);
    scrollToTop();
  };

  const nextStep = () => { if (validateStep(currentStep)) { setCurrentStep((prev) => Math.min(prev + 1, 5) as Step); scrollToTop(); } };
  const prevStep = () => { setError(""); setCurrentStep((prev) => Math.max(prev - 1, 1) as Step); scrollToTop(); };

  const handleSubmit = async () => {
    // Re-run all step validations before submitting
    for (let s = 1 as Step; s <= 4; s = (s + 1) as Step) {
      if (!validateStep(s)) { setCurrentStep(s); scrollToTop(); return; }
    }
    if (!licenceFront || !licenceBack || !policeDoc) {
      setError("Please attach all required documents");
      return;
    }

    setLoading(true);
    setError("");
    try {
      // Compress images before upload; PDFs pass through untouched
      const [frontOut, backOut] = await Promise.all([
        compressImage(licenceFront),
        compressImage(licenceBack),
      ]);
      const policeOut = policeDoc.type.startsWith("image/") ? await compressImage(policeDoc) : policeDoc;

      const body = new FormData();
      Object.entries(formData).forEach(([key, value]) => body.append(key, value));
      body.append("canDriveManual", canDriveManual ? "true" : "false");
      body.append("licenceFront", frontOut, frontOut.name);
      body.append("licenceBack", backOut, backOut.name);
      body.append("policeCheckDocument", policeOut, policeOut.name);

      const res = await fetch("/api/driver/register", {
        method: "POST",
        // NOTE: no Content-Type header — the browser sets the multipart boundary
        body,
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Registration failed"); return; }
      router.push("/driver/login?registered=true");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const isStepComplete = (step: Step): boolean => {
    switch (step) {
      case 1: return !!(formData.firstName && formData.lastName && formData.email && formData.phone && formData.password && formData.confirmPassword && formData.dateOfBirth && formData.addressStreet && formData.addressSuburb && formData.addressPostcode);
      case 2: return !!(formData.licenseNumber && formData.licenseExpiry && licenceFront && licenceBack);
      case 3: return !!(formData.policeCheckCertificateNumber && formData.policeCheckIssueDate && policeDoc && formData.rightToWorkStatus && formData.emergencyContactName && formData.emergencyContactRelationship && formData.emergencyContactPhone);
      case 4: return !!(formData.bsb && formData.accountNumber && formData.accountName);
      default: return false;
    }
  };

  const inputCls = "w-full px-4 py-3 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition";

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
            <p className="mt-2 text-emerald-100 text-sm">A few details and documents to get you road-ready.</p>
          </motion.div>

          {/* Step Indicator */}
          <div className="mb-8">
            <div className="flex items-center justify-between max-w-lg mx-auto">
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
                          <input type="text" value={formData.firstName} onChange={(e) => updateField("firstName", e.target.value)} className={inputCls} placeholder="John" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1.5">Last name *</label>
                          <input type="text" value={formData.lastName} onChange={(e) => updateField("lastName", e.target.value)} className={inputCls} placeholder="Smith" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Email address *</label>
                        <div className="relative">
                          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                          <input type="email" value={formData.email} onChange={(e) => updateField("email", e.target.value)} className={`${inputCls} pl-12`} placeholder="john@example.com" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1.5">Phone number *</label>
                          <div className="relative">
                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                            <input type="tel" value={formData.phone} onChange={(e) => updateField("phone", e.target.value)} className={`${inputCls} pl-12`} placeholder="0412 345 678" />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1.5">Date of birth *</label>
                          <div className="relative">
                            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
                            <input type="date" value={formData.dateOfBirth} onChange={(e) => updateField("dateOfBirth", e.target.value)} className={`${inputCls} pl-12`} />
                          </div>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Password *</label>
                        <div className="relative">
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                          <input type={showPassword ? "text" : "password"} value={formData.password} onChange={(e) => updateField("password", e.target.value)} className={`${inputCls} pl-12 pr-12`} placeholder="At least 6 characters" />
                          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Confirm password *</label>
                        <div className="relative">
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                          <input type={showPassword ? "text" : "password"} value={formData.confirmPassword} onChange={(e) => updateField("confirmPassword", e.target.value)} className={`${inputCls} pl-12`} placeholder="Confirm your password" />
                        </div>
                      </div>

                      {/* Residential address */}
                      <div className="border-t border-slate-200 pt-5">
                        <div className="flex items-center gap-2 mb-3">
                          <MapPin className="h-4 w-4 text-emerald-600" />
                          <h3 className="text-sm font-semibold text-slate-800">Residential address</h3>
                        </div>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Street address *</label>
                            <input type="text" value={formData.addressStreet} onChange={(e) => updateField("addressStreet", e.target.value)} className={inputCls} placeholder="12 Example St" />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1.5">Suburb *</label>
                              <input type="text" value={formData.addressSuburb} onChange={(e) => updateField("addressSuburb", e.target.value)} className={inputCls} placeholder="Newcastle" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">State *</label>
                                <select value={formData.addressState} onChange={(e) => updateField("addressState", e.target.value)} className={inputCls}>
                                  {AU_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                                </select>
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Postcode *</label>
                                <input type="text" inputMode="numeric" value={formData.addressPostcode} onChange={(e) => updateField("addressPostcode", e.target.value.replace(/\D/g, "").slice(0, 4))} className={inputCls} placeholder="2300" maxLength={4} />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Step 2: Licence Details + Photos */}
                {currentStep === 2 && (
                  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
                    <div className="flex items-center gap-3 mb-6">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-md shadow-emerald-500/20">
                        <IdCard className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-slate-900">Driver Licence</h2>
                        <p className="text-sm text-slate-500">Your licence details and photos</p>
                      </div>
                    </div>
                    <div className="space-y-5">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Licence number *</label>
                        <input type="text" value={formData.licenseNumber} onChange={(e) => updateField("licenseNumber", e.target.value)} className={inputCls} placeholder="Enter your licence number" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1.5">State issued *</label>
                          <select value={formData.licenseState} onChange={(e) => updateField("licenseState", e.target.value)} className={inputCls}>
                            {AU_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1.5">Expiry date *</label>
                          <input type="date" value={formData.licenseExpiry} onChange={(e) => updateField("licenseExpiry", e.target.value)} className={inputCls} />
                        </div>
                      </div>

                      {/* Licence photos */}
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Licence photos *</label>
                        <div className="grid grid-cols-2 gap-4">
                          <PhotoSlot
                            label="Front of licence"
                            file={licenceFront}
                            preview={licenceFrontPreview}
                            onSelect={() => frontInputRef.current?.click()}
                            onRemove={() => {
                              if (licenceFrontPreview) URL.revokeObjectURL(licenceFrontPreview);
                              setLicenceFront(null); setLicenceFrontPreview(null);
                            }}
                          />
                          <PhotoSlot
                            label="Back of licence"
                            file={licenceBack}
                            preview={licenceBackPreview}
                            onSelect={() => backInputRef.current?.click()}
                            onRemove={() => {
                              if (licenceBackPreview) URL.revokeObjectURL(licenceBackPreview);
                              setLicenceBack(null); setLicenceBackPreview(null);
                            }}
                          />
                        </div>
                        <input ref={frontInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleImageSelect(e, setLicenceFront, setLicenceFrontPreview, licenceFrontPreview)} />
                        <input ref={backInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleImageSelect(e, setLicenceBack, setLicenceBackPreview, licenceBackPreview)} />
                        <p className="mt-2 text-xs text-slate-500">Photos are automatically compressed before upload.</p>
                      </div>

                      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                        <p className="text-sm text-amber-800"><strong>Note:</strong> You must have a valid Australian driver&apos;s licence with no major infringements in the last 3 years.</p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Step 3: Documents & Work */}
                {currentStep === 3 && (
                  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
                    <div className="flex items-center gap-3 mb-6">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-md shadow-emerald-500/20">
                        <ShieldCheck className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-slate-900">Documents &amp; Work</h2>
                        <p className="text-sm text-slate-500">Police check, work rights and emergency contact</p>
                      </div>
                    </div>

                    <div className="space-y-6">
                      {/* Police check */}
                      <div>
                        <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-600" /> Police check</h3>
                        <p className="text-xs text-slate-500 mb-3">Your National Police Check must have been issued within the last 12 months.</p>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Certificate number *</label>
                            <input type="text" value={formData.policeCheckCertificateNumber} onChange={(e) => updateField("policeCheckCertificateNumber", e.target.value)} className={inputCls} placeholder="e.g. NPC123456789" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Issue date *</label>
                            <input type="date" value={formData.policeCheckIssueDate} onChange={(e) => updateField("policeCheckIssueDate", e.target.value)} className={inputCls} />
                            {formData.policeCheckIssueDate && !isWithinLast12Months(formData.policeCheckIssueDate) && (
                              <p className="mt-1.5 text-xs text-red-600">This police check is more than 12 months old. Please provide a current one.</p>
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Police check document *</label>
                            <input ref={policeInputRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handlePoliceSelect} />
                            {policeDoc ? (
                              <div className="flex items-center justify-between p-4 rounded-xl border border-emerald-200 bg-emerald-50">
                                <div className="flex items-center gap-3 min-w-0">
                                  <FileText className="h-8 w-8 text-emerald-600 flex-shrink-0" />
                                  <div className="min-w-0">
                                    <p className="font-medium text-slate-900 truncate">{policeDoc.name}</p>
                                    <p className="text-xs text-slate-500">{formatBytes(policeDoc.size)}</p>
                                  </div>
                                </div>
                                <button type="button" onClick={() => setPoliceDoc(null)} className="p-2 text-slate-400 hover:text-red-500 transition flex-shrink-0"><X className="h-5 w-5" /></button>
                              </div>
                            ) : (
                              <button type="button" onClick={() => policeInputRef.current?.click()} className="w-full flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 hover:border-emerald-400 hover:bg-emerald-50/50 transition">
                                <Upload className="h-8 w-8 text-slate-400" />
                                <p className="text-sm font-medium text-slate-700">Upload certificate (image or PDF)</p>
                                <p className="text-xs text-slate-500">Max 4MB</p>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Work details */}
                      <div className="border-t border-slate-200 pt-5">
                        <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2"><Settings2 className="h-4 w-4 text-emerald-600" /> Work details</h3>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Can you drive a manual transmission? *</label>
                            <div className="grid grid-cols-2 gap-3">
                              {[{ v: true, l: "Yes" }, { v: false, l: "No" }].map((opt) => (
                                <button key={opt.l} type="button" onClick={() => setCanDriveManual(opt.v)} className={`rounded-xl border-2 px-4 py-3 text-sm font-medium text-center transition-all ${canDriveManual === opt.v ? "border-emerald-500 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-500/20" : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"}`}>{opt.l}</button>
                              ))}
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Right to work status *</label>
                            <select value={formData.rightToWorkStatus} onChange={(e) => updateField("rightToWorkStatus", e.target.value)} className={inputCls}>
                              <option value="">Select…</option>
                              {RIGHT_TO_WORK_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                          </div>
                          {formData.rightToWorkStatus === "visa_with_work_rights" && (
                            <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1.5">Visa subclass *</label>
                              <input type="text" value={formData.visaSubclass} onChange={(e) => updateField("visaSubclass", e.target.value)} className={inputCls} placeholder="e.g. 482" />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Emergency contact */}
                      <div className="border-t border-slate-200 pt-5">
                        <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2"><Users className="h-4 w-4 text-emerald-600" /> Emergency contact</h3>
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1.5">Name *</label>
                              <input type="text" value={formData.emergencyContactName} onChange={(e) => updateField("emergencyContactName", e.target.value)} className={inputCls} placeholder="Jane Smith" />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1.5">Relationship *</label>
                              <input type="text" value={formData.emergencyContactRelationship} onChange={(e) => updateField("emergencyContactRelationship", e.target.value)} className={inputCls} placeholder="Partner" />
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Phone *</label>
                            <div className="relative">
                              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                              <input type="tel" value={formData.emergencyContactPhone} onChange={(e) => updateField("emergencyContactPhone", e.target.value)} className={`${inputCls} pl-12`} placeholder="0412 345 678" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Step 4: Banking Details */}
                {currentStep === 4 && (
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
                          <input type="text" value={formData.bsb} onChange={(e) => updateField("bsb", e.target.value.replace(/\D/g, "").slice(0, 6))} className={inputCls} placeholder="000000" maxLength={6} />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1.5">Account number *</label>
                          <input type="text" value={formData.accountNumber} onChange={(e) => updateField("accountNumber", e.target.value.replace(/\D/g, ""))} className={inputCls} placeholder="Account number" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Account holder name *</label>
                        <input type="text" value={formData.accountName} onChange={(e) => updateField("accountName", e.target.value)} className={inputCls} placeholder="Name on account" />
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Step 5: Review */}
                {currentStep === 5 && (
                  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
                    <div className="flex items-center gap-3 mb-6">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-md shadow-emerald-500/20">
                        <CheckCircle2 className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-slate-900">Review &amp; Submit</h2>
                        <p className="text-sm text-slate-500">Please confirm your details</p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <ReviewBlock title="Personal Details">
                        <ReviewRow label="Name" value={`${formData.firstName} ${formData.lastName}`} />
                        <ReviewRow label="Email" value={formData.email} />
                        <ReviewRow label="Phone" value={formData.phone} />
                        <ReviewRow label="Date of birth" value={formData.dateOfBirth} />
                        <ReviewRow label="Address" value={`${formData.addressStreet}, ${formData.addressSuburb} ${formData.addressState} ${formData.addressPostcode}`} />
                      </ReviewBlock>
                      <ReviewBlock title="Licence">
                        <ReviewRow label="Licence" value={`${formData.licenseNumber} (${formData.licenseState})`} />
                        <ReviewRow label="Expiry" value={formData.licenseExpiry} />
                        <ReviewRow label="Photos" value={`${licenceFront ? "Front ✓" : "Front ✗"}  ·  ${licenceBack ? "Back ✓" : "Back ✗"}`} />
                      </ReviewBlock>
                      <ReviewBlock title="Documents & Work">
                        <ReviewRow label="Police cert." value={formData.policeCheckCertificateNumber} />
                        <ReviewRow label="Issued" value={formData.policeCheckIssueDate} />
                        <ReviewRow label="Document" value={policeDoc?.name || "—"} />
                        <ReviewRow label="Manual capable" value={canDriveManual ? "Yes" : "No"} />
                        <ReviewRow label="Right to work" value={RIGHT_TO_WORK_OPTIONS.find((o) => o.value === formData.rightToWorkStatus)?.label || "—"} />
                        {formData.rightToWorkStatus === "visa_with_work_rights" && <ReviewRow label="Visa subclass" value={formData.visaSubclass} />}
                        <ReviewRow label="Emergency" value={`${formData.emergencyContactName} (${formData.emergencyContactRelationship}) · ${formData.emergencyContactPhone}`} />
                      </ReviewBlock>
                      <ReviewBlock title="Banking">
                        <ReviewRow label="BSB" value={formData.bsb} />
                        <ReviewRow label="Account" value={`••••${formData.accountNumber.slice(-4)}`} />
                        <ReviewRow label="Name" value={formData.accountName} />
                      </ReviewBlock>
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                        <p className="text-xs text-slate-500 leading-relaxed">By submitting, you agree to our Terms of Service and Privacy Policy. Your application will be reviewed within 1-2 business days.</p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Navigation Buttons */}
                <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-200">
                  {currentStep > 1 ? (
                    <button type="button" onClick={prevStep} disabled={loading} className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition disabled:opacity-50">
                      <ArrowLeft className="h-4 w-4" /> Back
                    </button>
                  ) : <div />}
                  {currentStep < 5 ? (
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

function PhotoSlot({ label, file, preview, onSelect, onRemove }: {
  label: string;
  file: File | null;
  preview: string | null;
  onSelect: () => void;
  onRemove: () => void;
}) {
  if (file && preview) {
    return (
      <div className="relative rounded-xl border border-emerald-200 bg-emerald-50 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={preview} alt={label} className="aspect-video w-full object-cover" />
        <button type="button" onClick={onRemove} className="absolute top-2 right-2 rounded-full bg-white/90 p-1.5 text-slate-500 hover:text-red-500 shadow"><X className="h-4 w-4" /></button>
        <div className="p-2">
          <p className="text-xs font-medium text-slate-700 truncate">{label}</p>
          <p className="text-[11px] text-slate-500 truncate">{file.name} · {formatBytes(file.size)}</p>
          <button type="button" onClick={onSelect} className="mt-1 text-[11px] font-medium text-emerald-600 hover:underline">Replace</button>
        </div>
      </div>
    );
  }
  return (
    <button type="button" onClick={onSelect} className="aspect-video w-full flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 hover:border-emerald-400 hover:bg-emerald-50/50 transition p-3 text-center">
      <Upload className="h-6 w-6 text-slate-400" />
      <span className="text-xs font-medium text-slate-700">{label}</span>
      <span className="text-[11px] text-slate-500">Tap to select</span>
    </button>
  );
}

function ReviewBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
      <h3 className="text-sm font-semibold text-slate-700 mb-3">{title}</h3>
      <div className="grid grid-cols-3 gap-y-2 text-sm">{children}</div>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <>
      <div className="text-slate-500">{label}:</div>
      <div className="col-span-2 text-slate-900 font-medium break-words">{value}</div>
    </>
  );
}
