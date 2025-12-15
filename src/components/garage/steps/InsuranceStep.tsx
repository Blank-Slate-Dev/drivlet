// src/components/garage/steps/InsuranceStep.tsx
"use client";

import { Shield, FileText, Calendar, DollarSign, Award } from "lucide-react";

interface InsuranceDetails {
  provider: string;
  policyNumber: string;
  expiryDate: string;
  coverAmount: number;
}

interface InsuranceStepProps {
  data: {
    publicLiabilityInsurance: InsuranceDetails;
    professionalIndemnityInsurance: InsuranceDetails;
    certifications: string[];
  };
  onChange: (data: Partial<InsuranceStepProps["data"]>) => void;
  errors: Record<string, string>;
}

export default function InsuranceStep({ data, onChange, errors }: InsuranceStepProps) {
  const handlePublicLiabilityChange = (field: string, value: string | number) => {
    onChange({
      publicLiabilityInsurance: {
        ...data.publicLiabilityInsurance,
        [field]: value,
      },
    });
  };

  const handleProfessionalIndemnityChange = (field: string, value: string | number) => {
    onChange({
      professionalIndemnityInsurance: {
        ...data.professionalIndemnityInsurance,
        [field]: value,
      },
    });
  };

  const handleCertificationsChange = (value: string) => {
    // Split by newlines and filter empty lines
    const certs = value.split("\n").filter((c) => c.trim());
    onChange({ certifications: certs });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">Insurance & Compliance</h3>
        <p className="mt-1 text-sm text-slate-600">
          Provide your insurance details and certifications.
        </p>
      </div>

      {/* Public Liability Insurance - Required */}
      <div className="space-y-4 p-4 border border-slate-200 rounded-xl">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-emerald-600" />
          <h4 className="text-sm font-semibold text-slate-800">
            Public Liability Insurance <span className="text-red-500">*</span>
          </h4>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Insurance Provider <span className="text-red-500">*</span>
            </label>
            <div className="mt-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FileText className="h-4 w-4 text-slate-400" />
              </div>
              <input
                type="text"
                value={data.publicLiabilityInsurance?.provider || ""}
                onChange={(e) => handlePublicLiabilityChange("provider", e.target.value)}
                className={`block w-full pl-10 pr-3 py-3 border rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition ${
                  errors["publicLiabilityInsurance.provider"] ? "border-red-300" : "border-slate-200"
                }`}
                placeholder="e.g., Allianz, QBE"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">
              Policy Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={data.publicLiabilityInsurance?.policyNumber || ""}
              onChange={(e) => handlePublicLiabilityChange("policyNumber", e.target.value)}
              className={`block w-full px-3 py-3 border rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition ${
                errors["publicLiabilityInsurance.policyNumber"] ? "border-red-300" : "border-slate-200"
              }`}
              placeholder="Policy number"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4 text-slate-400" />
                Expiry Date <span className="text-red-500">*</span>
              </div>
            </label>
            <input
              type="date"
              value={data.publicLiabilityInsurance?.expiryDate || ""}
              onChange={(e) => handlePublicLiabilityChange("expiryDate", e.target.value)}
              className={`block w-full px-3 py-3 border rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition ${
                errors["publicLiabilityInsurance.expiryDate"] ? "border-red-300" : "border-slate-200"
              }`}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">
              <div className="flex items-center gap-1">
                <DollarSign className="h-4 w-4 text-slate-400" />
                Cover Amount <span className="text-red-500">*</span>
              </div>
            </label>
            <div className="mt-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-slate-400">$</span>
              </div>
              <input
                type="number"
                min="0"
                value={data.publicLiabilityInsurance?.coverAmount || ""}
                onChange={(e) => handlePublicLiabilityChange("coverAmount", parseInt(e.target.value) || 0)}
                className={`block w-full pl-8 pr-3 py-3 border rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition ${
                  errors["publicLiabilityInsurance.coverAmount"] ? "border-red-300" : "border-slate-200"
                }`}
                placeholder="e.g., 20000000"
              />
            </div>
          </div>
        </div>
        {errors.publicLiabilityInsurance && (
          <p className="text-sm text-red-600">{errors.publicLiabilityInsurance}</p>
        )}
      </div>

      {/* Professional Indemnity Insurance - Optional */}
      <div className="space-y-4 p-4 border border-slate-200 rounded-xl">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-slate-400" />
          <h4 className="text-sm font-semibold text-slate-800">
            Professional Indemnity Insurance (Optional)
          </h4>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Insurance Provider</label>
            <input
              type="text"
              value={data.professionalIndemnityInsurance?.provider || ""}
              onChange={(e) => handleProfessionalIndemnityChange("provider", e.target.value)}
              className="block w-full px-3 py-3 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
              placeholder="e.g., Allianz, QBE"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Policy Number</label>
            <input
              type="text"
              value={data.professionalIndemnityInsurance?.policyNumber || ""}
              onChange={(e) => handleProfessionalIndemnityChange("policyNumber", e.target.value)}
              className="block w-full px-3 py-3 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
              placeholder="Policy number"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Expiry Date</label>
            <input
              type="date"
              value={data.professionalIndemnityInsurance?.expiryDate || ""}
              onChange={(e) => handleProfessionalIndemnityChange("expiryDate", e.target.value)}
              className="block w-full px-3 py-3 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Cover Amount</label>
            <div className="mt-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-slate-400">$</span>
              </div>
              <input
                type="number"
                min="0"
                value={data.professionalIndemnityInsurance?.coverAmount || ""}
                onChange={(e) => handleProfessionalIndemnityChange("coverAmount", parseInt(e.target.value) || 0)}
                className="block w-full pl-8 pr-3 py-3 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
                placeholder="e.g., 5000000"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Certifications */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          <div className="flex items-center gap-2">
            <Award className="h-5 w-5 text-slate-400" />
            Certifications & Accreditations (Optional)
          </div>
        </label>
        <textarea
          rows={4}
          value={data.certifications?.join("\n") || ""}
          onChange={(e) => handleCertificationsChange(e.target.value)}
          className="block w-full px-3 py-3 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
          placeholder="Enter one certification per line&#10;e.g., VACC Member&#10;RACV Approved Repairer&#10;Licensed Motor Vehicle Repairer"
        />
        <p className="mt-1 text-xs text-slate-500">
          Enter each certification or accreditation on a new line
        </p>
      </div>
    </div>
  );
}
