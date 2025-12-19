// src/app/driver/onboarding/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  CheckCircle,
  Shield,
  Briefcase,
  Heart,
  Users,
  ArrowRight,
  ArrowLeft,
  LogOut,
  Loader2,
  AlertCircle,
  Car,
  Check,
  Building2,
} from "lucide-react";

interface DriverOnboarding {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  onboardingStatus: string;
  insuranceEligible: boolean;
  canAcceptJobs: boolean;
  contracts?: {
    employmentContractSignedAt?: string;
    driverAgreementSignedAt?: string;
    workHealthSafetySignedAt?: string;
    codeOfConductSignedAt?: string;
  };
}

type Step = 1 | 2 | 3 | 4 | 5;

export default function DriverOnboardingPage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  
  const [driver, setDriver] = useState<DriverOnboarding | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [currentStep, setCurrentStep] = useState<Step>(1);
  
  // Contract acceptances
  const [employmentContractAccepted, setEmploymentContractAccepted] = useState(false);
  const [driverAgreementAccepted, setDriverAgreementAccepted] = useState(false);
  const [workHealthSafetyAccepted, setWorkHealthSafetyAccepted] = useState(false);
  const [codeOfConductAccepted, setCodeOfConductAccepted] = useState(false);
  
  // Optional employment details
  const [superannuationFund, setSuperannuationFund] = useState("");
  const [superannuationMemberNumber, setSuperannuationMemberNumber] = useState("");

  useEffect(() => {
    if (status === "authenticated" && session?.user?.role === "driver") {
      fetchOnboardingStatus();
    }
  }, [session, status]);

  const fetchOnboardingStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/driver/onboarding");
      
      if (!response.ok) {
        if (response.status === 403) {
          // Not approved yet
          router.push("/driver/pending");
          return;
        }
        throw new Error("Failed to fetch onboarding status");
      }
      
      const data = await response.json();
      setDriver(data.driver);
      
      // If already active, redirect to dashboard
      if (data.driver.onboardingStatus === "active") {
        router.push("/driver/dashboard");
      }
    } catch {
      setError("Failed to load onboarding status");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitContracts = async () => {
    if (!employmentContractAccepted || !driverAgreementAccepted || 
        !workHealthSafetyAccepted || !codeOfConductAccepted) {
      setError("Please accept all contracts to continue");
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      
      const response = await fetch("/api/driver/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employmentContractAccepted,
          driverAgreementAccepted,
          workHealthSafetyAccepted,
          codeOfConductAccepted,
          superannuationFund: superannuationFund || undefined,
          superannuationMemberNumber: superannuationMemberNumber || undefined,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to complete onboarding");
      }

      // Move to success step
      setCurrentStep(5);
      
      // Update session to reflect new status
      await update();
      
      // Redirect to dashboard after a short delay
      setTimeout(() => {
        router.push("/driver/dashboard");
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to complete onboarding");
    } finally {
      setSubmitting(false);
    }
  };

  const canProceedToNext = (step: Step): boolean => {
    switch (step) {
      case 1: return true; // Welcome - always can proceed
      case 2: return employmentContractAccepted; // Employment contract
      case 3: return driverAgreementAccepted && workHealthSafetyAccepted; // Driver agreements
      case 4: return codeOfConductAccepted; // Code of conduct
      default: return false;
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900">
        <div className="flex items-center gap-2 text-white">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading...
        </div>
      </div>
    );
  }

  const steps = [
    { num: 1, title: "Welcome", icon: Briefcase },
    { num: 2, title: "Employment Contract", icon: FileText },
    { num: 3, title: "Driver Agreements", icon: Shield },
    { num: 4, title: "Code of Conduct", icon: Heart },
    { num: 5, title: "Complete", icon: CheckCircle },
  ];

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute inset-0 z-0 opacity-20">
        <div
          className="h-full w-full"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
      </div>

      <div className="absolute top-20 right-20 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-20 left-20 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-white/5 backdrop-blur-sm">
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
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 rounded-full bg-emerald-500/20 px-4 py-2 border border-emerald-500/30">
              <Shield className="h-5 w-5 text-emerald-400" />
              <span className="text-sm font-medium text-emerald-100">Employee Onboarding</span>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/driver/login" })}
              className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Progress Steps */}
      <div className="relative z-10 mx-auto max-w-4xl px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          {steps.map((step, index) => (
            <div key={step.num} className="flex items-center">
              <div className={`flex flex-col items-center ${index !== steps.length - 1 ? 'flex-1' : ''}`}>
                <div className={`flex h-12 w-12 items-center justify-center rounded-full border-2 transition-all ${
                  currentStep >= step.num 
                    ? 'bg-emerald-500 border-emerald-500 text-white' 
                    : 'bg-white/10 border-white/20 text-white/50'
                }`}>
                  {currentStep > step.num ? (
                    <Check className="h-6 w-6" />
                  ) : (
                    <step.icon className="h-5 w-5" />
                  )}
                </div>
                <span className={`mt-2 text-xs font-medium hidden sm:block ${
                  currentStep >= step.num ? 'text-emerald-400' : 'text-white/50'
                }`}>
                  {step.title}
                </span>
              </div>
              {index !== steps.length - 1 && (
                <div className={`h-0.5 w-full mx-2 sm:mx-4 ${
                  currentStep > step.num ? 'bg-emerald-500' : 'bg-white/20'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 mx-auto max-w-3xl px-4 pb-12">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <div className="rounded-3xl border border-white/20 bg-white/95 backdrop-blur-sm shadow-2xl overflow-hidden">
              
              {/* Step 1: Welcome */}
              {currentStep === 1 && (
                <div className="p-8">
                  <div className="text-center mb-8">
                    <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 mb-4">
                      <Briefcase className="h-10 w-10 text-emerald-600" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900">
                      Welcome to Drivlet, {driver?.firstName}!
                    </h1>
                    <p className="text-slate-600 mt-2">
                      Your application has been approved. Before you can start accepting jobs, 
                      you need to complete your employee onboarding.
                    </p>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 mb-8">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-6 w-6 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h3 className="font-semibold text-amber-900">Important: Employee Status</h3>
                        <p className="text-amber-800 text-sm mt-1">
                          All Drivlet drivers are employed as <strong>employees</strong>, not contractors. 
                          This means you&apos;ll be covered by our insurance policy while on the job and 
                          entitled to employee benefits. You must sign the employment contracts to proceed.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 mb-8">
                    <h3 className="font-semibold text-slate-800">What you&apos;ll need to complete:</h3>
                    {[
                      { icon: FileText, title: "Employment Contract", desc: "Review and sign your employment agreement" },
                      { icon: Car, title: "Driver Agreement", desc: "Acknowledge vehicle operation responsibilities" },
                      { icon: Shield, title: "Work Health & Safety", desc: "Confirm safety protocols understanding" },
                      { icon: Heart, title: "Code of Conduct", desc: "Agree to professional standards" },
                    ].map((item, index) => (
                      <div key={index} className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
                          <item.icon className="h-5 w-5 text-emerald-600" />
                        </div>
                        <div>
                          <h4 className="font-medium text-slate-900">{item.title}</h4>
                          <p className="text-sm text-slate-500">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => setCurrentStep(2)}
                    className="w-full flex items-center justify-center gap-2 px-6 py-4 text-sm font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl shadow-lg shadow-emerald-500/25 hover:from-emerald-500 hover:to-teal-500 transition"
                  >
                    Begin Onboarding
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              )}

              {/* Step 2: Employment Contract */}
              {currentStep === 2 && (
                <div className="p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                      <FileText className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">Employment Contract</h2>
                      <p className="text-slate-500 text-sm">Review your terms of employment</p>
                    </div>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 mb-6 max-h-80 overflow-y-auto">
                    <h3 className="font-semibold text-slate-900 mb-4">DRIVLET PTY LTD - EMPLOYMENT AGREEMENT</h3>
                    
                    <div className="space-y-4 text-sm text-slate-700">
                      <p><strong>1. EMPLOYMENT STATUS</strong></p>
                      <p>By signing this agreement, you acknowledge that you are being employed as a casual employee of Drivlet Pty Ltd. This is not a contractor arrangement.</p>
                      
                      <p><strong>2. DUTIES</strong></p>
                      <p>Your role will involve the safe transportation of customer vehicles between designated locations. You agree to perform these duties with care and professionalism.</p>
                      
                      <p><strong>3. COMPENSATION</strong></p>
                      <p>You will be paid at the applicable casual rate for each job completed. Payment will be processed fortnightly to your nominated bank account.</p>
                      
                      <p><strong>4. SUPERANNUATION</strong></p>
                      <p>Superannuation contributions will be made in accordance with Australian law to your nominated fund.</p>
                      
                      <p><strong>5. INSURANCE</strong></p>
                      <p>While performing duties for Drivlet, you will be covered by the company&apos;s insurance policy. This coverage is only valid while you are an active employee with signed contracts.</p>
                      
                      <p><strong>6. TERMINATION</strong></p>
                      <p>Either party may terminate this employment with appropriate notice as required by law.</p>
                      
                      <p><strong>7. CONFIDENTIALITY</strong></p>
                      <p>You agree to keep confidential all business information, customer data, and company operations.</p>
                    </div>
                  </div>

                  <label className="flex items-start gap-3 p-4 rounded-xl border border-slate-200 bg-white cursor-pointer hover:border-emerald-300 transition">
                    <input
                      type="checkbox"
                      checked={employmentContractAccepted}
                      onChange={(e) => setEmploymentContractAccepted(e.target.checked)}
                      className="mt-1 h-5 w-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <div>
                      <p className="font-medium text-slate-900">I accept the Employment Contract</p>
                      <p className="text-sm text-slate-500">I have read and understood the terms of employment</p>
                    </div>
                  </label>

                  {error && (
                    <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                      {error}
                    </div>
                  )}

                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={() => setCurrentStep(1)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Back
                    </button>
                    <button
                      onClick={() => {
                        if (canProceedToNext(2)) {
                          setError("");
                          setCurrentStep(3);
                        } else {
                          setError("Please accept the employment contract to continue");
                        }
                      }}
                      disabled={!employmentContractAccepted}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl shadow-lg shadow-emerald-500/25 hover:from-emerald-500 hover:to-teal-500 transition disabled:opacity-50"
                    >
                      Continue
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Driver Agreements */}
              {currentStep === 3 && (
                <div className="p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100">
                      <Shield className="h-6 w-6 text-purple-600" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">Driver Agreements</h2>
                      <p className="text-slate-500 text-sm">Safety and operational requirements</p>
                    </div>
                  </div>

                  {/* Driver Agreement */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 mb-4 max-h-48 overflow-y-auto">
                    <h3 className="font-semibold text-slate-900 mb-3">DRIVER AGREEMENT</h3>
                    <div className="space-y-3 text-sm text-slate-700">
                      <p>As a Drivlet driver, I agree to:</p>
                      <ul className="list-disc pl-5 space-y-1">
                        <li>Hold a valid Australian driver&apos;s license at all times</li>
                        <li>Never drive under the influence of alcohol or drugs</li>
                        <li>Treat all customer vehicles with care and respect</li>
                        <li>Report any incidents or damage immediately</li>
                        <li>Follow all traffic laws and regulations</li>
                        <li>Maintain professional conduct at all times</li>
                      </ul>
                    </div>
                  </div>

                  <label className="flex items-start gap-3 p-4 rounded-xl border border-slate-200 bg-white cursor-pointer hover:border-emerald-300 transition mb-4">
                    <input
                      type="checkbox"
                      checked={driverAgreementAccepted}
                      onChange={(e) => setDriverAgreementAccepted(e.target.checked)}
                      className="mt-1 h-5 w-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <div>
                      <p className="font-medium text-slate-900">I accept the Driver Agreement</p>
                      <p className="text-sm text-slate-500">I understand my responsibilities as a driver</p>
                    </div>
                  </label>

                  {/* Work Health & Safety */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 mb-4 max-h-48 overflow-y-auto">
                    <h3 className="font-semibold text-slate-900 mb-3">WORK HEALTH & SAFETY ACKNOWLEDGMENT</h3>
                    <div className="space-y-3 text-sm text-slate-700">
                      <p>I acknowledge that I have been informed of:</p>
                      <ul className="list-disc pl-5 space-y-1">
                        <li>Safe driving practices and fatigue management</li>
                        <li>Hazard identification and reporting procedures</li>
                        <li>Emergency procedures and contacts</li>
                        <li>My rights and responsibilities under WHS legislation</li>
                        <li>The process for reporting workplace injuries</li>
                      </ul>
                    </div>
                  </div>

                  <label className="flex items-start gap-3 p-4 rounded-xl border border-slate-200 bg-white cursor-pointer hover:border-emerald-300 transition">
                    <input
                      type="checkbox"
                      checked={workHealthSafetyAccepted}
                      onChange={(e) => setWorkHealthSafetyAccepted(e.target.checked)}
                      className="mt-1 h-5 w-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <div>
                      <p className="font-medium text-slate-900">I acknowledge the WHS requirements</p>
                      <p className="text-sm text-slate-500">I understand workplace health and safety protocols</p>
                    </div>
                  </label>

                  {error && (
                    <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                      {error}
                    </div>
                  )}

                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={() => setCurrentStep(2)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Back
                    </button>
                    <button
                      onClick={() => {
                        if (canProceedToNext(3)) {
                          setError("");
                          setCurrentStep(4);
                        } else {
                          setError("Please accept both agreements to continue");
                        }
                      }}
                      disabled={!driverAgreementAccepted || !workHealthSafetyAccepted}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl shadow-lg shadow-emerald-500/25 hover:from-emerald-500 hover:to-teal-500 transition disabled:opacity-50"
                    >
                      Continue
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Step 4: Code of Conduct + Superannuation */}
              {currentStep === 4 && (
                <div className="p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-pink-100">
                      <Heart className="h-6 w-6 text-pink-600" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">Code of Conduct</h2>
                      <p className="text-slate-500 text-sm">Professional standards and final details</p>
                    </div>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 mb-4 max-h-48 overflow-y-auto">
                    <h3 className="font-semibold text-slate-900 mb-3">DRIVLET CODE OF CONDUCT</h3>
                    <div className="space-y-3 text-sm text-slate-700">
                      <p>As a representative of Drivlet, I will:</p>
                      <ul className="list-disc pl-5 space-y-1">
                        <li>Treat all customers, colleagues, and partners with respect</li>
                        <li>Maintain a professional appearance while on duty</li>
                        <li>Protect customer privacy and personal information</li>
                        <li>Never engage in discrimination or harassment</li>
                        <li>Represent the company honestly and ethically</li>
                        <li>Report any concerns or misconduct</li>
                      </ul>
                    </div>
                  </div>

                  <label className="flex items-start gap-3 p-4 rounded-xl border border-slate-200 bg-white cursor-pointer hover:border-emerald-300 transition mb-6">
                    <input
                      type="checkbox"
                      checked={codeOfConductAccepted}
                      onChange={(e) => setCodeOfConductAccepted(e.target.checked)}
                      className="mt-1 h-5 w-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <div>
                      <p className="font-medium text-slate-900">I agree to the Code of Conduct</p>
                      <p className="text-sm text-slate-500">I will uphold these professional standards</p>
                    </div>
                  </label>

                  {/* Superannuation Details (Optional) */}
                  <div className="border-t border-slate-200 pt-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Building2 className="h-5 w-5 text-slate-600" />
                      <h3 className="font-semibold text-slate-800">Superannuation Details (Optional)</h3>
                    </div>
                    <p className="text-sm text-slate-500 mb-4">
                      If you have an existing super fund, enter the details below. Otherwise, we&apos;ll use the default fund.
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Fund Name</label>
                        <input
                          type="text"
                          value={superannuationFund}
                          onChange={(e) => setSuperannuationFund(e.target.value)}
                          placeholder="e.g., Australian Super"
                          className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Member Number</label>
                        <input
                          type="text"
                          value={superannuationMemberNumber}
                          onChange={(e) => setSuperannuationMemberNumber(e.target.value)}
                          placeholder="Your member number"
                          className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                        />
                      </div>
                    </div>
                  </div>

                  {error && (
                    <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                      {error}
                    </div>
                  )}

                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={() => setCurrentStep(3)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Back
                    </button>
                    <button
                      onClick={handleSubmitContracts}
                      disabled={!codeOfConductAccepted || submitting}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl shadow-lg shadow-emerald-500/25 hover:from-emerald-500 hover:to-teal-500 transition disabled:opacity-50"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Completing...
                        </>
                      ) : (
                        <>
                          Complete Onboarding
                          <CheckCircle className="h-4 w-4" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Step 5: Success */}
              {currentStep === 5 && (
                <div className="p-8 text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 15 }}
                    className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-emerald-100 mb-6"
                  >
                    <CheckCircle className="h-12 w-12 text-emerald-600" />
                  </motion.div>
                  
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">
                    Welcome to the Team! 🎉
                  </h2>
                  <p className="text-slate-600 mb-6">
                    You&apos;ve successfully completed your employee onboarding. 
                    You&apos;re now an active Drivlet driver and can start accepting jobs.
                  </p>

                  <div className="grid grid-cols-3 gap-4 mb-8">
                    {[
                      { icon: Shield, label: "Insured", desc: "You're now covered" },
                      { icon: Car, label: "Active", desc: "Ready for jobs" },
                      { icon: Users, label: "Employee", desc: "Official status" },
                    ].map((item, index) => (
                      <div key={index} className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                        <item.icon className="h-8 w-8 text-emerald-600 mx-auto mb-2" />
                        <p className="font-semibold text-emerald-900">{item.label}</p>
                        <p className="text-xs text-emerald-700">{item.desc}</p>
                      </div>
                    ))}
                  </div>

                  <p className="text-sm text-slate-500 mb-4">
                    Redirecting to your dashboard...
                  </p>
                  
                  <div className="flex items-center justify-center">
                    <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </main>
  );
}
