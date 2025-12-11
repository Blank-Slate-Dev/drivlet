// src/lib/admin.ts
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { NextResponse } from "next/server";

/**
 * Check if the current user is an admin
 * Use this in API routes to protect admin-only endpoints
 */
export async function isAdmin(): Promise<boolean> {
  const session = await getServerSession(authOptions);
  return session?.user?.role === "admin";
}

/**
 * Get the current session and verify admin status
 * Returns the session if user is admin, null otherwise
 */
export async function getAdminSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "admin") {
    return null;
  }
  return session;
}

/**
 * Middleware helper for API routes
 * Returns a 403 response if user is not an admin
 */
export async function requireAdmin() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      ),
    };
  }

  if (session.user.role !== "admin") {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      ),
    };
  }

  return {
    authorized: true,
    session,
    response: null,
  };
}

/**
 * Helper to check if session user is admin (for client components)
 */
export function isUserAdmin(session: { user?: { role?: string } } | null): boolean {
  return session?.user?.role === "admin";
}
