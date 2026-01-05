// src/constants/quoteRequest.ts
// Shared constants for quote requests - safe to import in client components

export type ServiceCategory = "mechanical" | "electrical" | "bodywork" | "tyres" | "servicing" | "other";
export type UrgencyLevel = "immediate" | "this_week" | "flexible";

export const SERVICE_CATEGORIES: { value: ServiceCategory; label: string }[] = [
  { value: "mechanical", label: "Mechanical Repairs" },
  { value: "electrical", label: "Electrical Systems" },
  { value: "bodywork", label: "Bodywork & Paint" },
  { value: "tyres", label: "Tyres & Wheels" },
  { value: "servicing", label: "Regular Servicing" },
  { value: "other", label: "Other" },
];

export const URGENCY_LEVELS: { value: UrgencyLevel; label: string; description: string }[] = [
  { value: "immediate", label: "Immediate", description: "I need this done ASAP" },
  { value: "this_week", label: "This Week", description: "Within the next 7 days" },
  { value: "flexible", label: "Flexible", description: "No rush, whenever convenient" },
];