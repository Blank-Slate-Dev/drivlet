// src/app/admin/booking-requests/page.tsx
/* HIDDEN — merged into /admin/bookings on 2026-07-07.
   This standalone Booking Requests page is retired: requests and bookings now live
   together on the unified /admin/bookings pipeline. The reusable pieces
   (RequestDetailModal, StatCard, STATUS_CONFIG) were moved to
   src/components/admin/RequestDetailModal.tsx and are imported by the unified page.
   The API routes this page used are unchanged and still in service.
   This file is preserved as a redirect (not deleted) per the rollback plan. */
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function RetiredBookingRequestsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/bookings");
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        Redirecting to Bookings…
      </div>
    </div>
  );
}
