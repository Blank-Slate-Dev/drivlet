// src/lib/apiErrors.ts
// Shared error → response mapping for booking-mutation routes. Surfaces the
// actual reason for known, safe-to-show error classes (instead of a bare
// "Failed to X") while keeping unknown errors generic. Introduced alongside
// the corrupt-timeline-entry fixes (2026-07-24).
import { NextResponse } from "next/server";

export function bookingActionErrorResponse(error: unknown, fallback: string) {
  if (error instanceof Error) {
    if (error.name === "ValidationError") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const paths = Object.keys((error as any).errors || {}).join(", ");
      return NextResponse.json(
        {
          error: `This booking has invalid data (${paths || "unknown field"}) and couldn't be updated.`,
        },
        { status: 400 }
      );
    }
    if (error.name === "CastError") {
      return NextResponse.json(
        { error: "Invalid booking reference — please refresh and try again." },
        { status: 400 }
      );
    }
    if (error.name === "VersionError" || error.name === "ParallelSaveError") {
      return NextResponse.json(
        { error: "This booking was just updated elsewhere — please try again." },
        { status: 409 }
      );
    }
  }
  return NextResponse.json({ error: fallback }, { status: 500 });
}
