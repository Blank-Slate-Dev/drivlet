// src/app/policies/layout.tsx
// Metadata wrapper for the (client-component) policies page — per-page
// canonical so it no longer collapses to the homepage (re-audit 2026-09-11).
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Policies | drivlet",
  description:
    "drivlet's customer policies: cancellations and refunds, privacy, insurance, and damage claims.",
  alternates: {
    canonical: "https://drivlet.com.au/policies",
  },
};

export default function PoliciesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
