// src/components/TrafficTracker.tsx
"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

// Staff areas aren't website traffic. Also filtered server-side.
const IGNORED_PREFIXES = ["/admin", "/driver", "/garage"];

/**
 * Renders nothing. Fires one beacon per public page view, including
 * client-side navigations.
 */
export default function TrafficTracker() {
  const pathname = usePathname();
  const lastSent = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname) return;

    if (
      IGNORED_PREFIXES.some(
        (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
      )
    ) {
      return;
    }

    // Guards against React strict-mode double-invoke and repeat renders.
    if (lastSent.current === pathname) return;
    lastSent.current = pathname;

    // Short delay so instant bounces and link prefetches aren't counted.
    const timer = setTimeout(() => {
      fetch("/api/analytics/collect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: pathname,
          referrer: document.referrer || "",
        }),
        keepalive: true,
      }).catch(() => {
        // Analytics must never disrupt the page.
      });
    }, 300);

    return () => clearTimeout(timer);
  }, [pathname]);

  return null;
}