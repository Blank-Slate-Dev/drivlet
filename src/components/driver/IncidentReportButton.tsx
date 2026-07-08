// src/components/driver/IncidentReportButton.tsx
"use client";

import { AlertTriangle } from "lucide-react";

export default function IncidentReportButton({
  onClick,
}: {
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="inline-flex min-h-[44px] items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-600 transition hover:text-red-700"
    >
      <AlertTriangle className="h-4 w-4" />
      Report Incident
    </button>
  );
}
