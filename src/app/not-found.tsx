// src/app/not-found.tsx
// Branded 404 (added 2026-09-11): unknown URLs previously fell through the
// [city] catch-all to Next's unbranded default with no way home.
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 text-center">
      <p className="text-sm font-semibold uppercase tracking-wide text-emerald-600">404</p>
      <h1 className="mt-2 text-3xl font-bold text-slate-900 sm:text-4xl">
        We couldn&apos;t find that page
      </h1>
      <p className="mt-3 max-w-md text-slate-600">
        The page may have moved, or the link might be out of date. Your car,
        thankfully, is easier to track down.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="rounded-full bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500"
        >
          Back to home
        </Link>
        <Link
          href="/track"
          className="rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          Track your car
        </Link>
        <Link
          href="/contact"
          className="rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          Contact us
        </Link>
      </div>
    </div>
  );
}
