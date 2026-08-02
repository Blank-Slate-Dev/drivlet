// src/lib/rateLimit.ts
// Distributed rate limiter backed by MongoDB (atomic $inc on a TTL
// collection), with an in-memory fast path for bursts within a warm lambda.
//
// The previous implementation was a plain in-process Map — on Vercel each
// lambda instance had its own map and instances recycle constantly, so the
// limits were largely illusory under real traffic (pre-launch audit LB-4,
// fixed 2026-08-02). Counters now live in the shared database, using a fixed
// window keyed by `identifier + window start`, incremented atomically so
// concurrent lambdas cannot race past the limit.
//
// Fail-open by design: if the DB is unreachable the request is allowed (and
// the error logged) — a database hiccup must not take down the whole site.

import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory fast path: catches rapid bursts hitting the same warm instance
// without a DB round trip. NOT the source of truth.
const localStore = new Map<string, RateLimitEntry>();

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of localStore.entries()) {
    if (entry.resetTime < now) {
      localStore.delete(key);
    }
  }
}, 60000);

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

export const RATE_LIMITS = {
  // Strict: Auth endpoints
  auth: { maxRequests: 5, windowMs: 60 * 1000 }, // 5 per minute
  // Moderate: Registration/forms
  form: { maxRequests: 16, windowMs: 60 * 1000 }, // 16 per minute
  // Standard: General API
  api: { maxRequests: 30, windowMs: 60 * 1000 }, // 30 per minute
  // Loose: Read operations
  read: { maxRequests: 60, windowMs: 60 * 1000 }, // 60 per minute
} as const;

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetIn: number; // milliseconds
}

const COLLECTION = "ratelimits";
let indexEnsured = false;

interface RateLimitDoc {
  _id: string;
  count: number;
  expiresAt: Date;
}

async function getCollection() {
  await connectDB();
  const db = mongoose.connection.db;
  if (!db) throw new Error("Database connection not available");
  const collection = db.collection<RateLimitDoc>(COLLECTION);
  if (!indexEnsured) {
    indexEnsured = true;
    // TTL cleanup: docs expire at their window end (best-effort, once per
    // warm instance; Mongo ignores createIndex if it already exists)
    collection
      .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })
      .catch((err) => {
        indexEnsured = false;
        console.error("rateLimit: failed to ensure TTL index:", err);
      });
  }
  return collection;
}

function checkLocal(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  const entry = localStore.get(key);

  if (!entry || entry.resetTime < now) {
    localStore.set(key, { count: 1, resetTime: now + config.windowMs });
    return {
      success: true,
      remaining: config.maxRequests - 1,
      resetIn: config.windowMs,
    };
  }

  entry.count += 1;
  if (entry.count > config.maxRequests) {
    return { success: false, remaining: 0, resetIn: entry.resetTime - now };
  }
  return {
    success: true,
    remaining: config.maxRequests - entry.count,
    resetIn: entry.resetTime - now,
  };
}

/**
 * Distributed check: atomically increments the counter for the current fixed
 * window in MongoDB. Safe across lambda instances. Fails open on DB errors.
 */
export async function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const now = Date.now();

  // Fast local rejection first (free, and protects the DB itself)
  const local = checkLocal(identifier, config);
  if (!local.success) return local;

  try {
    const collection = await getCollection();
    const windowStart = Math.floor(now / config.windowMs) * config.windowMs;
    const windowEnd = windowStart + config.windowMs;
    const docId = `${identifier}:${windowStart}`;

    const result = await collection.findOneAndUpdate(
      { _id: docId },
      {
        $inc: { count: 1 },
        $setOnInsert: { expiresAt: new Date(windowEnd) },
      },
      { upsert: true, returnDocument: "after" }
    );

    const count: number = result?.count ?? 1;
    if (count > config.maxRequests) {
      return { success: false, remaining: 0, resetIn: windowEnd - now };
    }
    return {
      success: true,
      remaining: config.maxRequests - count,
      resetIn: windowEnd - now,
    };
  } catch (error) {
    // Fail open: an unavailable DB must not block the site. The local check
    // above still applies within each warm instance.
    console.error("rateLimit: distributed check failed, allowing request:", error);
    return local;
  }
}

/**
 * Get client identifier from request
 * Prefers x-real-ip (set by Vercel infrastructure, cannot be spoofed by clients)
 */
export function getClientIdentifier(request: Request): string {
  // x-real-ip is set by Vercel infrastructure and cannot be spoofed by clients
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;

  // Fallback: x-forwarded-for (first IP in chain, but can be spoofed)
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();

  return "unknown";
}

/**
 * Helper to apply rate limiting to an API route. Async since 2026-08-02 —
 * callers must await (the counter lives in MongoDB).
 */
export async function withRateLimit(
  request: Request,
  config: RateLimitConfig,
  prefix = ""
): Promise<RateLimitResult> {
  const clientId = getClientIdentifier(request);
  const key = prefix ? `${prefix}:${clientId}` : clientId;
  return checkRateLimit(key, config);
}
