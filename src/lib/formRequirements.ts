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

// ── Customer-side leg gating (2026-08-08) ──────────────────────────────────
// Signing happens WITH THE DRIVER PRESENT at each leg, so a customer must not
// be able to open/sign a form before that leg is underway. Shared by the
// booking-history UI and the forms POST API so the rules can't drift.
//
// Pickup consent: signable from the moment the driver is en route (the driver
// flow gates 'collected' on it, so it must be signable BEFORE car_picked_up),
// and stays signable afterwards as a catch-up.
export const PICKUP_SIGNABLE_STAGES = [
  "driver_en_route",
  "car_picked_up",
  "at_garage",
  "service_in_progress",
  "ready_for_return",
  "driver_returning",
  "delivered",
];

// Return confirmation: signable only once the car is on its way back (the
// driver flow gates 'delivered' on it, so driver_returning must qualify).
export const RETURN_SIGNABLE_STAGES = ["driver_returning", "delivered"];

/** Can the customer sign this form at the booking's current point? */
export function customerCanSignForm(
  formType: GatedFormType,
  currentStage: string | undefined,
  status: string | undefined
): boolean {
  if (status === "cancelled") return false;
  const stage = currentStage || "booking_confirmed";
  if (formType === "pickup_consent") {
    return PICKUP_SIGNABLE_STAGES.includes(stage) || status === "completed";
  }
  return RETURN_SIGNABLE_STAGES.includes(stage) || status === "completed";
}
