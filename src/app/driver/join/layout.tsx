// src/app/driver/join/layout.tsx
// Metadata wrapper for the (client-component) driver recruitment page —
// per-page canonical so it no longer collapses to the homepage
// (re-audit 2026-09-11).
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Drive with drivlet | drivlet",
  description:
    "Join drivlet as a driver in Newcastle or Canberra — flexible hours moving customers' cars to and from their service appointments.",
  alternates: {
    canonical: "https://drivlet.com.au/driver/join",
  },
};

export default function DriverJoinLayout({ children }: { children: React.ReactNode }) {
  return children;
}
