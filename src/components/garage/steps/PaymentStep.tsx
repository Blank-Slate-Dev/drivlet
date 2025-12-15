// src/components/garage/steps/PaymentStep.tsx
"use client";

import { CreditCard, Building, Hash, Receipt } from "lucide-react";

const PAYMENT_TERMS = [
  { value: "immediate", label: "Immediate Payment" },
  { value: "7_days", label: "7 Days" },
  { value: "14_days", label: "14 Days" },
  { value: "30_days", label: "30 Days" },
];

interface PaymentStepProps {
  data: {
    paymentTerms: string;
    bankDetails: {
      accountName: string;
      bsb: string;
      accountNumber: string;
    };
    gstRegistered: boolean;
  };
  onChange: (data: Partial<PaymentStepProps["data"]>) => void;
  errors: Record<string, string>;
}

export default function PaymentStep({ data, onChange, errors }: PaymentStepProps) {
  const handleBankDetailsChange = (field: string, value: string) => {
    onChange({
      bankDetails: {
        ...data.bankDetails,
        [field]: value,
      },
    });
  };

  // Format BSB with hyphen (123-456)
  const formatBSB = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 6);
    if (digits.length > 3) {
      return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    }
    return digits;
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">Payment & Billing</h3>
        <p className="mt-1 text-sm text-slate-600">
          Set up how you&apos;ll receive payments from Drivlet.
        </p>
      </div>

      {/* Payment Terms */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-3">
          <div className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-slate-400" />
            Preferred Payment Terms <span className="text-red-500">*</span>
          </div>
        </label>
        <div className="space-y-2">
          {PAYMENT_TERMS.map((term) => (
            <label
              key={term.value}
              className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition ${
                data.paymentTerms === term.value
                  ? "border-emerald-500 bg-emerald-50"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <input
                type="radio"
                name="paymentTerms"
                value={term.value}
                checked={data.paymentTerms === term.value}
                onChange={(e) => onChange({ paymentTerms: e.target.value })}
                className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-slate-300"
              />
              <span className="text-sm text-slate-700">{term.label}</span>
            </label>
          ))}
        </div>
        {errors.paymentTerms && (
          <p className="mt-1 text-sm text-red-600">{errors.paymentTerms}</p>
        )}
        <p className="mt-2 text-xs text-slate-500">
          This determines when you&apos;ll receive payment after completing a service.
        </p>
      </div>

      {/* Bank Details */}
      <div className="space-y-4 p-4 border border-slate-200 rounded-xl">
        <div className="flex items-center gap-2">
          <Building className="h-5 w-5 text-emerald-600" />
          <h4 className="text-sm font-semibold text-slate-800">
            Bank Account Details <span className="text-red-500">*</span>
          </h4>
        </div>
        <p className="text-sm text-slate-500">
          We&apos;ll use these details to pay you for completed services.
        </p>

        <div className="space-y-4">
          {/* Account Name */}
          <div>
            <label htmlFor="accountName" className="block text-sm font-medium text-slate-700">
              Account Name <span className="text-red-500">*</span>
            </label>
            <div className="mt-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <CreditCard className="h-4 w-4 text-slate-400" />
              </div>
              <input
                type="text"
                id="accountName"
                value={data.bankDetails?.accountName || ""}
                onChange={(e) => handleBankDetailsChange("accountName", e.target.value)}
                className={`block w-full pl-10 pr-3 py-3 border rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition ${
                  errors["bankDetails.accountName"] ? "border-red-300" : "border-slate-200"
                }`}
                placeholder="Account holder name"
              />
            </div>
            {errors["bankDetails.accountName"] && (
              <p className="mt-1 text-sm text-red-600">{errors["bankDetails.accountName"]}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* BSB */}
            <div>
              <label htmlFor="bsb" className="block text-sm font-medium text-slate-700">
                BSB <span className="text-red-500">*</span>
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Hash className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type="text"
                  id="bsb"
                  value={data.bankDetails?.bsb || ""}
                  onChange={(e) => handleBankDetailsChange("bsb", formatBSB(e.target.value))}
                  className={`block w-full pl-10 pr-3 py-3 border rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition ${
                    errors["bankDetails.bsb"] ? "border-red-300" : "border-slate-200"
                  }`}
                  placeholder="123-456"
                  maxLength={7}
                />
              </div>
              {errors["bankDetails.bsb"] && (
                <p className="mt-1 text-sm text-red-600">{errors["bankDetails.bsb"]}</p>
              )}
            </div>

            {/* Account Number */}
            <div>
              <label htmlFor="accountNumber" className="block text-sm font-medium text-slate-700">
                Account Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="accountNumber"
                value={data.bankDetails?.accountNumber || ""}
                onChange={(e) =>
                  handleBankDetailsChange("accountNumber", e.target.value.replace(/\D/g, ""))
                }
                className={`block w-full px-3 py-3 border rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition ${
                  errors["bankDetails.accountNumber"] ? "border-red-300" : "border-slate-200"
                }`}
                placeholder="Account number"
                maxLength={10}
              />
              {errors["bankDetails.accountNumber"] && (
                <p className="mt-1 text-sm text-red-600">{errors["bankDetails.accountNumber"]}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* GST Registration */}
      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
        <div>
          <label className="text-sm font-medium text-slate-700">
            GST Registered
          </label>
          <p className="text-xs text-slate-500 mt-1">
            Are you registered for Goods and Services Tax?
          </p>
        </div>
        <button
          type="button"
          onClick={() => onChange({ gstRegistered: !data.gstRegistered })}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            data.gstRegistered ? "bg-emerald-600" : "bg-slate-300"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              data.gstRegistered ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      {/* Security Notice */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
        <h4 className="text-sm font-semibold text-blue-800 mb-2">
          Security Notice
        </h4>
        <p className="text-sm text-blue-700">
          Your bank details are encrypted and stored securely. They are only used to process
          payments to your account for completed services.
        </p>
      </div>
    </div>
  );
}
