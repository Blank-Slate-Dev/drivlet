// src/components/driver/steps/BankingStep.tsx
"use client";

import { CreditCard, Building, FileText, AlertCircle } from "lucide-react";

interface BankingStepProps {
  data: {
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
  };
  onChange: (data: Partial<BankingStepProps["data"]>) => void;
  errors: Record<string, string>;
}

export default function BankingStep({ data, onChange, errors }: BankingStepProps) {
  const handleBankDetailsChange = (field: string, value: string) => {
    onChange({
      bankDetails: {
        ...data.bankDetails,
        [field]: value,
      },
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">Banking & Tax Details</h3>
        <p className="mt-1 text-sm text-slate-600">
          We need your banking details to pay you. All information is securely stored and
          encrypted.
        </p>
      </div>

      {/* Employment Type */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-slate-800 uppercase tracking-wide flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Employment Type
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => onChange({ employmentType: "employee" })}
            className={`p-4 rounded-xl border-2 text-left transition ${
              data.employmentType === "employee"
                ? "border-emerald-500 bg-emerald-50"
                : "border-slate-200 hover:border-slate-300"
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`h-4 w-4 rounded-full border-2 ${
                  data.employmentType === "employee"
                    ? "border-emerald-500 bg-emerald-500"
                    : "border-slate-300"
                }`}
              >
                {data.employmentType === "employee" && (
                  <div className="h-full w-full rounded-full bg-white scale-50" />
                )}
              </div>
              <div>
                <p className="font-medium text-slate-900">Employee</p>
                <p className="text-sm text-slate-500">PAYG with super</p>
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onChange({ employmentType: "contractor" })}
            className={`p-4 rounded-xl border-2 text-left transition ${
              data.employmentType === "contractor"
                ? "border-emerald-500 bg-emerald-50"
                : "border-slate-200 hover:border-slate-300"
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`h-4 w-4 rounded-full border-2 ${
                  data.employmentType === "contractor"
                    ? "border-emerald-500 bg-emerald-500"
                    : "border-slate-300"
                }`}
              >
                {data.employmentType === "contractor" && (
                  <div className="h-full w-full rounded-full bg-white scale-50" />
                )}
              </div>
              <div>
                <p className="font-medium text-slate-900">Contractor</p>
                <p className="text-sm text-slate-500">ABN required</p>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Tax Information */}
      <div className="space-y-4 pt-4 border-t border-slate-200">
        <h4 className="text-sm font-semibold text-slate-800 uppercase tracking-wide">
          Tax Information
        </h4>

        {data.employmentType === "employee" ? (
          <>
            <div>
              <label htmlFor="tfn" className="block text-sm font-medium text-slate-700">
                Tax File Number (TFN)
              </label>
              <input
                type="text"
                id="tfn"
                value={data.tfn}
                onChange={(e) => onChange({ tfn: e.target.value })}
                className="mt-1 block w-full px-4 py-3 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
                placeholder="XXX XXX XXX"
                maxLength={11}
              />
              <p className="mt-1 text-xs text-slate-500">
                Optional - you can provide this later via the TFN declaration form.
              </p>
            </div>

            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h5 className="text-sm font-semibold text-amber-800">
                    TFN Declaration Required
                  </h5>
                  <p className="mt-1 text-sm text-amber-700">
                    As an employee, you&apos;ll need to complete a TFN declaration form
                    before your first payday. We&apos;ll send this to you via email.
                  </p>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div>
            <label htmlFor="abn" className="block text-sm font-medium text-slate-700">
              Australian Business Number (ABN) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="abn"
              value={data.abn}
              onChange={(e) => onChange({ abn: e.target.value })}
              className={`mt-1 block w-full px-4 py-3 border rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition ${
                errors.abn ? "border-red-300" : "border-slate-200"
              }`}
              placeholder="XX XXX XXX XXX"
              maxLength={14}
            />
            {errors.abn && <p className="mt-1 text-sm text-red-600">{errors.abn}</p>}
            <p className="mt-1 text-xs text-slate-500">
              Enter your 11-digit ABN. You&apos;ll invoice us for work completed.
            </p>
          </div>
        )}
      </div>

      {/* Superannuation (Employee only) */}
      {data.employmentType === "employee" && (
        <div className="space-y-4 pt-4 border-t border-slate-200">
          <h4 className="text-sm font-semibold text-slate-800 uppercase tracking-wide flex items-center gap-2">
            <Building className="h-4 w-4" />
            Superannuation (Optional)
          </h4>
          <p className="text-sm text-slate-500">
            Provide your super fund details or we&apos;ll use our default fund.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="superFund"
                className="block text-sm font-medium text-slate-700"
              >
                Fund Name
              </label>
              <input
                type="text"
                id="superFund"
                value={data.superannuationFund}
                onChange={(e) => onChange({ superannuationFund: e.target.value })}
                className="mt-1 block w-full px-4 py-3 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
                placeholder="e.g., AustralianSuper"
              />
            </div>

            <div>
              <label
                htmlFor="superMember"
                className="block text-sm font-medium text-slate-700"
              >
                Member Number
              </label>
              <input
                type="text"
                id="superMember"
                value={data.superannuationMemberNumber}
                onChange={(e) =>
                  onChange({ superannuationMemberNumber: e.target.value })
                }
                className="mt-1 block w-full px-4 py-3 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
                placeholder="Member number"
              />
            </div>
          </div>
        </div>
      )}

      {/* Bank Details */}
      <div className="space-y-4 pt-4 border-t border-slate-200">
        <h4 className="text-sm font-semibold text-slate-800 uppercase tracking-wide flex items-center gap-2">
          <CreditCard className="h-4 w-4" />
          Bank Account for Payments
        </h4>
        <p className="text-sm text-slate-500">
          Where should we deposit your earnings? Payments are processed weekly.
        </p>

        <div>
          <label
            htmlFor="accountName"
            className="block text-sm font-medium text-slate-700"
          >
            Account Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="accountName"
            value={data.bankDetails.accountName}
            onChange={(e) => handleBankDetailsChange("accountName", e.target.value)}
            className={`mt-1 block w-full px-4 py-3 border rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition ${
              errors["bankDetails.accountName"] ? "border-red-300" : "border-slate-200"
            }`}
            placeholder="John Smith"
          />
          {errors["bankDetails.accountName"] && (
            <p className="mt-1 text-sm text-red-600">
              {errors["bankDetails.accountName"]}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="bsb" className="block text-sm font-medium text-slate-700">
              BSB <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="bsb"
              value={data.bankDetails.bsb}
              onChange={(e) => handleBankDetailsChange("bsb", e.target.value)}
              className={`mt-1 block w-full px-4 py-3 border rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition ${
                errors["bankDetails.bsb"] ? "border-red-300" : "border-slate-200"
              }`}
              placeholder="XXX-XXX"
              maxLength={7}
            />
            {errors["bankDetails.bsb"] && (
              <p className="mt-1 text-sm text-red-600">{errors["bankDetails.bsb"]}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="accountNumber"
              className="block text-sm font-medium text-slate-700"
            >
              Account Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="accountNumber"
              value={data.bankDetails.accountNumber}
              onChange={(e) => handleBankDetailsChange("accountNumber", e.target.value)}
              className={`mt-1 block w-full px-4 py-3 border rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition ${
                errors["bankDetails.accountNumber"]
                  ? "border-red-300"
                  : "border-slate-200"
              }`}
              placeholder="XXXXXXXX"
              maxLength={10}
            />
            {errors["bankDetails.accountNumber"] && (
              <p className="mt-1 text-sm text-red-600">
                {errors["bankDetails.accountNumber"]}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Security Note */}
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
        <div className="flex items-start gap-3">
          <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
            <svg
              className="h-4 w-4 text-slate-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <div>
            <h5 className="text-sm font-semibold text-slate-800">
              Your data is secure
            </h5>
            <p className="mt-1 text-sm text-slate-600">
              All sensitive information is encrypted and stored securely. We use
              bank-level security to protect your details.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
