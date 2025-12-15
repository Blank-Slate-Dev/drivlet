// src/middleware.ts
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;

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

    // Admin routes require admin role
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

        // Public garage routes - allow without auth
        if (pathname === "/garage/login" || pathname === "/garage/register") {
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
    "/garage/dashboard/:path*",
    "/garage/bookings/:path*",
    "/garage/settings/:path*",
    "/garage/pending",
    "/admin/:path*",
  ],
};
