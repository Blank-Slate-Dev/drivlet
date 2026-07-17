// src/lib/formRequirements.ts
// Single source of truth for compulsory signed consent forms at custody handovers.
// Used by BOTH the driver UI (src/app/driver/jobs/page.tsx) and the status-update
// API (src/app/api/driver/jobs/route.ts) so the rules can never drift apart —
// same pattern as src/lib/photoRequirements.ts.
//
// Forms live in the SignedForm collection, referenced on the booking via
// booking.signedForms[] ({ formId, formType, submittedAt }).

import type { FormType } from "@/models/SignedForm";

// The two handover forms that gate a status advance (per SOP):
//  - pickup_consent:       signed with the customer BEFORE the car is collected
//  - return_confirmation:  signed with the customer AT final delivery
export type GatedFormType = Extract<
  FormType,
  "pickup_consent" | "return_confirmation"
>;

// Maps a driver status-update action to the signed form it must satisfy first.
// Only these actions are form-gated; all other transitions are unaffected.
export const ACTION_FORM: Record<string, GatedFormType> = {
  collected: "pickup_consent",
  picked_up: "pickup_consent", // legacy alias
  delivered: "return_confirmation",
  complete: "return_confirmation", // legacy alias
};

// Human labels for UI checklists and API error messages.
export const FORM_LABELS: Record<GatedFormType, string> = {
  pickup_consent: "Pick-up Condition & Consent form",
  return_confirmation: "Return Confirmation & Acceptance form",
};

// Minimal shape both callers can satisfy (booking.signedForms refs and the
// jobs API's signedFormTypes list both expose the formType string).
export interface MinimalSignedFormRef {
  formType: string;
}

/** True when a signed form of the required type exists for the booking. */
export function hasSignedForm(
  forms: Array<MinimalSignedFormRef | string> | undefined,
  required: GatedFormType
): boolean {
  if (!forms) return false;
  return forms.some((f) =>
    typeof f === "string" ? f === required : f.formType === required
  );
}
