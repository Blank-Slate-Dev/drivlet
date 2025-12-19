// src/lib/rateLimit.ts
// Simple in-memory rate limiter for development/MVP
// For production, replace with Redis-based solution (Upstash)

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Clean every minute

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

export const RATE_LIMITS = {
  // Strict: Auth endpoints
  auth: { maxRequests: 5, windowMs: 60 * 1000 }, // 5 per minute
  // Moderate: Registration/forms
  form: { maxRequests: 3, windowMs: 60 * 1000 }, // 3 per minute
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

export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const key = identifier;

  const entry = rateLimitStore.get(key);

  // No existing entry or expired
  if (!entry || entry.resetTime < now) {
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + config.windowMs,
    });
    return {
      success: true,
      remaining: config.maxRequests - 1,
      resetIn: config.windowMs,
    };
  }

  // Increment count
  entry.count += 1;

  // Check if over limit
  if (entry.count > config.maxRequests) {
    return {
      success: false,
      remaining: 0,
      resetIn: entry.resetTime - now,
    };
  }

  return {
    success: true,
    remaining: config.maxRequests - entry.count,
    resetIn: entry.resetTime - now,
  };
}

/**
 * Get client identifier from request
 * Uses X-Forwarded-For for proxied requests (Vercel)
 */
export function getClientIdentifier(request: Request): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) {
    // Get the first IP (client IP)
    return xff.split(",")[0].trim();
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }

  return "unknown";
}

/**
 * Helper to apply rate limiting to an API route
 */
export function withRateLimit(
  request: Request,
  config: RateLimitConfig,
  prefix = ""
): RateLimitResult {
  const clientId = getClientIdentifier(request);
  const key = prefix ? `${prefix}:${clientId}` : clientId;
  return checkRateLimit(key, config);
}
