// src/proxy.ts
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

// Check if quote system is enabled (Phase 1: disabled)
const QUOTE_SYSTEM_ENABLED = process.env.NEXT_PUBLIC_ENABLE_QUOTE_SYSTEM === 'true';

// PHASE 1: the whole garage portal is hidden (signup, login, join page,
// dashboard, public /garages directory). See src/lib/garagePortal.ts for
// the MUST-FIX-BEFORE-PHASE-2 checklist gating re-enablement.
const GARAGE_PORTAL_ENABLED = process.env.NEXT_PUBLIC_ENABLE_GARAGE_PORTAL === 'true';

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;

    // ========== PHASE 1: BLOCK QUOTE ROUTES ==========
    // Quote routes are disabled until marketplace features are enabled
    if (!QUOTE_SYSTEM_ENABLED && pathname.startsWith("/quotes")) {
      // Redirect to homepage with a message
      return NextResponse.redirect(new URL("/?feature=coming-soon", req.url));
    }

    // ========== PHASE 1: BLOCK ALL GARAGE PAGES ==========
    if (
      !GARAGE_PORTAL_ENABLED &&
      (pathname === "/garages" ||
        pathname.startsWith("/garages/") ||
        pathname === "/garage" ||
        pathname.startsWith("/garage/"))
    ) {
      return NextResponse.redirect(new URL("/?feature=coming-soon", req.url));
    }

    // ========== GARAGE ROUTES ==========
    // Garage dashboard routes require garage role and approval
    if (
      pathname.startsWith("/garage/dashboard") ||
      pathname.startsWith("/garage/bookings") ||
      pathname.startsWith("/garage/settings")
    ) {
      if (token?.role !== "garage") {
        return NextResponse.redirect(new URL("/garage/login", req.url));
      }
      if (!token?.isApproved) {
        return NextResponse.redirect(new URL("/garage/pending", req.url));
      }
    }

    // Garage pending page - allow garage users who are not approved
    if (pathname === "/garage/pending") {
      if (token?.role !== "garage") {
        return NextResponse.redirect(new URL("/garage/login", req.url));
      }
      // If approved, redirect to dashboard
      if (token?.isApproved) {
        return NextResponse.redirect(new URL("/garage/dashboard", req.url));
      }
    }

    // ========== DRIVER ROUTES - STATE MACHINE ENFORCEMENT ==========
    
    // Driver dashboard routes require:
    // 1. role === "driver"
    // 2. isApproved === true (admin approved)
    // 3. onboardingStatus === "active" (contracts signed, fully activated)
    // NOTE: insuranceEligible is derived from onboardingStatus === "active", so we don't check it separately
    if (
      pathname.startsWith("/driver/dashboard") ||
      pathname.startsWith("/driver/jobs") ||
      pathname.startsWith("/driver/payments") ||
      pathname.startsWith("/driver/settings")
    ) {
      // Not a driver? Go to driver login
      if (token?.role !== "driver") {
        return NextResponse.redirect(new URL("/driver/login", req.url));
      }
      
      // Not approved by admin? Go to pending page
      if (!token?.isApproved) {
        return NextResponse.redirect(new URL("/driver/pending", req.url));
      }
      
      // Approved but not fully onboarded? Go to onboarding
      // This is the key enforcement: approved ≠ can work
      if (token?.onboardingStatus !== "active") {
        return NextResponse.redirect(new URL("/driver/onboarding", req.url));
      }
    }

    // Driver pending page - for drivers awaiting admin approval
    if (pathname === "/driver/pending") {
      if (token?.role !== "driver") {
        return NextResponse.redirect(new URL("/driver/login", req.url));
      }
      
      // If approved by admin, check onboarding status
      if (token?.isApproved) {
        // If not fully onboarded, go to onboarding
        if (token?.onboardingStatus !== "active") {
          return NextResponse.redirect(new URL("/driver/onboarding", req.url));
        }
        // Fully onboarded? Go to dashboard
        return NextResponse.redirect(new URL("/driver/dashboard", req.url));
      }
      // Otherwise, stay on pending page (not yet approved)
    }

    // Driver onboarding page - for approved drivers who need to sign contracts
    if (pathname.startsWith("/driver/onboarding")) {
      if (token?.role !== "driver") {
        return NextResponse.redirect(new URL("/driver/login", req.url));
      }
      
      // Not approved yet? Go to pending
      if (!token?.isApproved) {
        return NextResponse.redirect(new URL("/driver/pending", req.url));
      }
      
      // Already fully onboarded? Go to dashboard
      if (token?.onboardingStatus === "active") {
        return NextResponse.redirect(new URL("/driver/dashboard", req.url));
      }
      // Otherwise, stay on onboarding page
    }

    // ========== ADMIN ROUTES ==========
    if (pathname.startsWith("/admin")) {
      if (token?.role !== "admin") {
        return NextResponse.redirect(new URL("/", req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;

        // Garage routes: always let the middleware function decide — in
        // Phase 1 it redirects everything garage-related away, and in
        // Phase 2 its role checks take over (login/register stay public).
        if (pathname.startsWith("/garage")) {
          return true;
        }

        // Public driver routes - allow without auth
        if (pathname === "/driver/login" || pathname === "/driver/register") {
          return true;
        }

        // Quote routes - public when enabled (will be blocked by middleware if disabled)
        if (pathname.startsWith("/quotes")) {
          return true;
        }

        // All other protected routes require authentication
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    // Phase 1: every garage page (and the public /garages directory) is
    // intercepted; in Phase 2 the per-path role checks below still apply
    "/garage/:path*",
    "/garages",
    "/garages/:path*",
    "/driver/dashboard/:path*",
    "/driver/jobs/:path*",
    "/driver/payments/:path*",
    "/driver/settings/:path*",
    "/driver/pending",
    "/driver/onboarding/:path*",
    "/admin/:path*",
    "/quotes/:path*", // Phase 1: blocked when QUOTE_SYSTEM disabled
  ],
};
