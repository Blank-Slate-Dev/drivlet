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
      className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100 active:scale-95"
    >
      <AlertTriangle className="h-4 w-4" />
      Report Incident
    </button>
  );
}
