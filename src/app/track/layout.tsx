// src/app/track/layout.tsx
// Metadata wrapper for the (client-component) tracking page. Without a
// per-page canonical, the root layout's canonical pointed /track at the
// homepage — contradicting the sitemap and suppressing indexing
// (re-audit 2026-09-11).
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Track Your Car | drivlet",
  description:
    "Follow your car's service journey live — pickup, workshop, and return — with your drivlet tracking code.",
  alternates: {
    canonical: "https://drivlet.com.au/track",
  },
};

export default function TrackLayout({ children }: { children: React.ReactNode }) {
  return children;
}
