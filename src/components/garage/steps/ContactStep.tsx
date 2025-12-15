// src/components/garage/steps/ContactStep.tsx
"use client";

import { User, Briefcase, Phone, Mail } from "lucide-react";

interface ContactStepProps {
  data: {
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
  };
  onChange: (data: Partial<ContactStepProps["data"]>) => void;
  errors: Record<string, string>;
}

export default function ContactStep({ data, onChange, errors }: ContactStepProps) {
  const handlePrimaryContactChange = (field: string, value: string) => {
    onChange({
      primaryContact: {
        ...data.primaryContact,
        [field]: value,
      },
    });
  };

  const handleAfterHoursContactChange = (field: string, value: string) => {
    onChange({
      afterHoursContact: {
        ...data.afterHoursContact,
        [field]: value,
      },
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">Contact Details</h3>
        <p className="mt-1 text-sm text-slate-600">
          Provide contact information for your business.
        </p>
      </div>

      {/* Primary Contact Section */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-slate-800 uppercase tracking-wide">
          Primary Contact
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Name */}
          <div>
            <label htmlFor="primaryName" className="block text-sm font-medium text-slate-700">
              Contact Name <span className="text-red-500">*</span>
            </label>
            <div className="mt-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="text"
                id="primaryName"
                value={data.primaryContact.name}
                onChange={(e) => handlePrimaryContactChange("name", e.target.value)}
                className={`block w-full pl-10 pr-3 py-3 border rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition ${
                  errors["primaryContact.name"] ? "border-red-300" : "border-slate-200"
                }`}
                placeholder="Full name"
              />
            </div>
            {errors["primaryContact.name"] && (
              <p className="mt-1 text-sm text-red-600">{errors["primaryContact.name"]}</p>
            )}
          </div>

          {/* Role */}
          <div>
            <label htmlFor="primaryRole" className="block text-sm font-medium text-slate-700">
              Role/Position <span className="text-red-500">*</span>
            </label>
            <div className="mt-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Briefcase className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="text"
                id="primaryRole"
                value={data.primaryContact.role}
                onChange={(e) => handlePrimaryContactChange("role", e.target.value)}
                className={`block w-full pl-10 pr-3 py-3 border rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition ${
                  errors["primaryContact.role"] ? "border-red-300" : "border-slate-200"
                }`}
                placeholder="e.g., Owner, Manager"
              />
            </div>
            {errors["primaryContact.role"] && (
              <p className="mt-1 text-sm text-red-600">{errors["primaryContact.role"]}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Phone */}
          <div>
            <label htmlFor="primaryPhone" className="block text-sm font-medium text-slate-700">
              Phone Number <span className="text-red-500">*</span>
            </label>
            <div className="mt-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Phone className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="tel"
                id="primaryPhone"
                value={data.primaryContact.phone}
                onChange={(e) => handlePrimaryContactChange("phone", e.target.value)}
                className={`block w-full pl-10 pr-3 py-3 border rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition ${
                  errors["primaryContact.phone"] ? "border-red-300" : "border-slate-200"
                }`}
                placeholder="04XX XXX XXX"
              />
            </div>
            {errors["primaryContact.phone"] && (
              <p className="mt-1 text-sm text-red-600">{errors["primaryContact.phone"]}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label htmlFor="primaryEmail" className="block text-sm font-medium text-slate-700">
              Email Address <span className="text-red-500">*</span>
            </label>
            <div className="mt-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="email"
                id="primaryEmail"
                value={data.primaryContact.email}
                onChange={(e) => handlePrimaryContactChange("email", e.target.value)}
                className={`block w-full pl-10 pr-3 py-3 border rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition ${
                  errors["primaryContact.email"] ? "border-red-300" : "border-slate-200"
                }`}
                placeholder="contact@garage.com"
              />
            </div>
            {errors["primaryContact.email"] && (
              <p className="mt-1 text-sm text-red-600">{errors["primaryContact.email"]}</p>
            )}
          </div>
        </div>
      </div>

      {/* After Hours Contact Section */}
      <div className="space-y-4 pt-4 border-t border-slate-200">
        <h4 className="text-sm font-semibold text-slate-800 uppercase tracking-wide">
          After Hours Contact (Optional)
        </h4>
        <p className="text-sm text-slate-500">
          Provide alternative contact details for urgent matters outside business hours.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* After Hours Name */}
          <div>
            <label htmlFor="afterHoursName" className="block text-sm font-medium text-slate-700">
              Contact Name
            </label>
            <div className="mt-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="text"
                id="afterHoursName"
                value={data.afterHoursContact.name}
                onChange={(e) => handleAfterHoursContactChange("name", e.target.value)}
                className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
                placeholder="After hours contact name"
              />
            </div>
          </div>

          {/* After Hours Phone */}
          <div>
            <label htmlFor="afterHoursPhone" className="block text-sm font-medium text-slate-700">
              Phone Number
            </label>
            <div className="mt-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Phone className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="tel"
                id="afterHoursPhone"
                value={data.afterHoursContact.phone}
                onChange={(e) => handleAfterHoursContactChange("phone", e.target.value)}
                className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
                placeholder="04XX XXX XXX"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
