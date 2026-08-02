// src/app/api/analytics/collect/route.ts
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { connectDB } from "@/lib/mongodb";
import PageView, { DeviceType } from "@/models/PageView";
import { withRateLimit, RATE_LIMITS, getClientIdentifier } from "@/lib/rateLimit";

// Needs Node (crypto + mongoose) and must never be statically cached.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Public endpoint. Called by <TrafficTracker /> on every public page view.
 *
 * It always returns 204, even on failure — analytics must never surface an
 * error to a customer, and a silent response gives a scraper nothing to probe.
 */

const BOT_PATTERN =
  /bot|crawl|spider|slurp|bing|yandex|baidu|duckduck|facebookexternalhit|whatsapp|telegram|preview|lighthouse|headless|pingdom|uptime|monitor|curl|wget|python-requests|axios|node-fetch|semrush|ahrefs|mj12|dotbot|petal|gptbot|claudebot|ccbot|applebot|chatgpt|perplexity/i;

// Staff-facing areas are never counted as website traffic.
const IGNORED_PREFIXES = ["/admin", "/driver", "/garage", "/api", "/_next"];

function decodeHeader(value: string | null): string | undefined {
  if (!value) return undefined;
  try {
    // Vercel URL-encodes these, so "Coffs Harbour" arrives as "Coffs%20Harbour".
    return decodeURIComponent(value).trim() || undefined;
  } catch {
    return value.trim() || undefined;
  }
}

function detectDevice(userAgent: string): DeviceType {
  if (/ipad|tablet|playbook|silk/i.test(userAgent)) return "tablet";
  if (/mobi|iphone|ipod|android.*mobile|windows phone/i.test(userAgent)) {
    return "mobile";
  }
  return "desktop";
}

function extractReferrerHost(
  referrer: string,
  host: string | null
): string | undefined {
  if (!referrer) return undefined;
  try {
    const hostname = new URL(referrer).hostname.replace(/^www\./, "");
    // Internal navigation isn't a referrer.
    if (host && hostname === host.replace(/^www\./, "").split(":")[0]) {
      return undefined;
    }
    return hostname;
  } catch {
    return undefined;
  }
}

export async function POST(request: NextRequest) {
  try {
    const rate = await withRateLimit(request, RATE_LIMITS.read, "analytics");
    if (!rate.success) {
      return new NextResponse(null, { status: 204 });
    }

    const userAgent = request.headers.get("user-agent") || "";
    if (!userAgent || BOT_PATTERN.test(userAgent)) {
      return new NextResponse(null, { status: 204 });
    }

    const body = await request.json().catch(() => null);
    const rawPath = typeof body?.path === "string" ? body.path : "";
    if (!rawPath.startsWith("/")) {
      return new NextResponse(null, { status: 204 });
    }

    const path = (rawPath.split("?")[0].split("#")[0] || "/").slice(0, 300);
    if (
      IGNORED_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`))
    ) {
      return new NextResponse(null, { status: 204 });
    }

    // Geo headers are only populated on real Vercel deployments. Locally we
    // label the row "Local Dev" so the dashboard isn't mysteriously empty.
    const isDeployed = Boolean(process.env.VERCEL);
    const visitorCity =
      decodeHeader(request.headers.get("x-vercel-ip-city")) ||
      (isDeployed ? "Unknown" : "Local Dev");
    const visitorRegion = decodeHeader(
      request.headers.get("x-vercel-ip-country-region")
    );
    const visitorCountry = decodeHeader(
      request.headers.get("x-vercel-ip-country")
    );

    // Daily-rotating anonymous fingerprint. No IP address is ever stored, and
    // the hash is unrecoverable and changes every day at UTC midnight.
    const salt = process.env.NEXTAUTH_SECRET || "drivlet-analytics-fallback";
    const day = new Date().toISOString().slice(0, 10);
    const visitorHash = crypto
      .createHash("sha256")
      .update(`${getClientIdentifier(request)}|${userAgent}|${day}|${salt}`)
      .digest("hex")
      .slice(0, 32);

    await connectDB();
    await PageView.create({
      path,
      visitorCity,
      visitorRegion,
      visitorCountry,
      visitorHash,
      referrerHost: extractReferrerHost(
        typeof body?.referrer === "string" ? body.referrer : "",
        request.headers.get("host")
      ),
      deviceType: detectDevice(userAgent),
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Analytics collect error:", error);
    return new NextResponse(null, { status: 204 });
  }
}