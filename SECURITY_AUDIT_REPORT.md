# Security Audit Report - Drivlet Platform

**Audit Date:** December 19, 2024
**Platform:** drivlet.vercel.app
**Auditor:** Claude Code Security Review

---

## Executive Summary

This security audit identified **15 vulnerabilities** across the Drivlet platform:
- **2 Critical** - Require immediate attention
- **5 High** - Should be fixed within 24-48 hours
- **5 Medium** - Should be fixed within 1 week
- **3 Low** - Should be addressed in regular maintenance

---

## Critical Vulnerabilities

### 1. CRITICAL - NoSQL Injection / ReDoS in Booking Track API

**Severity:** Critical
**Location:** [src/app/api/bookings/track/route.ts:22-24](src/app/api/bookings/track/route.ts#L22-L24)

**Description:**
User input is directly interpolated into a MongoDB RegExp query without sanitization, allowing:
1. **ReDoS (Regular Expression Denial of Service):** Malicious regex patterns can cause exponential backtracking
2. **NoSQL Injection:** Special regex characters can bypass query logic

**Vulnerable Code:**
```typescript
const booking = await Booking.findOne({
  userEmail: { $regex: new RegExp(`^${email}$`, "i") },
  vehicleRegistration: { $regex: new RegExp(`^${registration}$`, "i") },
})
```

**Exploit Scenario:**
```bash
# ReDoS attack - causes server hang
curl -X POST /api/bookings/track -d '{"email":"a]a]a]a]a]a]a]a]a]a]a]a]!","registration":"test"}'

# Query bypass with regex metacharacters
curl -X POST /api/bookings/track -d '{"email":".*","registration":".*"}'
```

**Remediation:**
```typescript
// src/app/api/bookings/track/route.ts

// Add this helper function to escape regex special characters
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Use case-insensitive string comparison instead of regex
const booking = await Booking.findOne({
  userEmail: email.toLowerCase().trim(),
  vehicleRegistration: registration.toUpperCase().trim(),
})
```

---

### 2. CRITICAL - No Rate Limiting on Authentication & Payment Endpoints

**Severity:** Critical
**Location:** All API routes in `/src/app/api/`

**Description:**
No rate limiting exists on any endpoints, exposing the platform to:
- Brute force attacks on login/registration
- Payment API abuse
- Denial of service through request flooding
- Credential stuffing attacks

**Affected Endpoints:**
- `/api/auth/[...nextauth]` - Authentication
- `/api/register` - User registration
- `/api/driver/register` - Driver registration
- `/api/garage/register` - Garage registration
- `/api/stripe/create-payment-intent` - Payment creation
- `/api/contact` - Contact form (spam target)
- `/api/bookings/track` - Information disclosure

**Remediation:**

1. Install rate limiting packages:
```bash
npm install @upstash/ratelimit @upstash/redis
# OR for simpler setup:
npm install express-rate-limit
```

2. Create rate limiting middleware:
```typescript
// src/lib/rateLimit.ts
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Strict limit for auth endpoints
export const authLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "60 s"), // 5 requests per minute
  analytics: true,
});

// Standard limit for general API
export const apiLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, "60 s"), // 30 requests per minute
  analytics: true,
});

// Strict limit for contact/registration forms
export const formLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(3, "60 s"), // 3 requests per minute
  analytics: true,
});

export async function checkRateLimit(
  limiter: Ratelimit,
  identifier: string
): Promise<{ success: boolean; remaining: number }> {
  const { success, remaining } = await limiter.limit(identifier);
  return { success, remaining };
}
```

3. Apply to sensitive endpoints:
```typescript
// In /api/auth route or registration routes
import { authLimiter, checkRateLimit } from "@/lib/rateLimit";

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for") || "unknown";
  const { success } = await checkRateLimit(authLimiter, ip);

  if (!success) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 }
    );
  }
  // ... rest of handler
}
```

---

## High Severity Vulnerabilities

### 3. HIGH - Missing Security Headers

**Severity:** High
**Location:** [next.config.ts](next.config.ts)

**Description:**
No security headers are configured, exposing the platform to:
- Clickjacking attacks
- XSS attacks (missing CSP)
- MIME sniffing attacks
- Man-in-the-middle attacks

**Current Config:**
```typescript
const nextConfig: NextConfig = {
  reactCompiler: true,
};
```

**Remediation:**
```typescript
// next.config.ts
import type { NextConfig } from "next";

const securityHeaders = [
  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "X-Frame-Options",
    value: "SAMEORIGIN",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "X-XSS-Protection",
    value: "1; mode=block",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(self), payment=(self)",
  },
  {
    key: "Content-Security-Policy",
    value: `
      default-src 'self';
      script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://maps.googleapis.com;
      style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
      img-src 'self' data: https: blob:;
      font-src 'self' https://fonts.gstatic.com;
      connect-src 'self' https://api.stripe.com https://maps.googleapis.com wss:;
      frame-src https://js.stripe.com https://hooks.stripe.com;
      object-src 'none';
      base-uri 'self';
      form-action 'self';
    `.replace(/\s{2,}/g, " ").trim(),
  },
];

const nextConfig: NextConfig = {
  reactCompiler: true,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
```

---

### 4. HIGH - Sensitive Data Exposure in Logs

**Severity:** High
**Location:** Multiple files

**Description:**
Extensive console.log statements expose sensitive data in production logs:

**Affected Files:**
- [src/app/api/stripe/webhook/route.ts:52-61](src/app/api/stripe/webhook/route.ts#L52-L61) - Logs customer email, payment amounts
- [src/app/api/stripe/create-payment-intent/route.ts:10](src/app/api/stripe/create-payment-intent/route.ts#L10) - Logs all booking data
- [src/app/api/register/route.ts:79-83](src/app/api/register/route.ts#L79-L83) - Logs user registration data
- [src/app/api/driver/register/route.ts:283](src/app/api/driver/register/route.ts#L283) - Logs bank details, TFN info

**Remediation:**

1. Create a secure logging utility:
```typescript
// src/lib/logger.ts
const isDevelopment = process.env.NODE_ENV === "development";

interface LogData {
  [key: string]: unknown;
}

// Sanitize sensitive fields
function sanitize(data: LogData): LogData {
  const sensitiveFields = [
    "password", "confirmPassword", "currentPassword", "newPassword",
    "bsb", "accountNumber", "abn", "tfn", "licenseNumber",
    "customerEmail", "userEmail", "email", "phone",
    "bankDetails", "cardNumber", "cvv"
  ];

  const sanitized = { ...data };
  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = "[REDACTED]";
    }
  }
  return sanitized;
}

export const logger = {
  info: (message: string, data?: LogData) => {
    if (isDevelopment) {
      console.log(`[INFO] ${message}`, data ? sanitize(data) : "");
    }
  },
  error: (message: string, error?: unknown) => {
    // Always log errors but sanitize
    console.error(`[ERROR] ${message}`, error instanceof Error ? error.message : "");
  },
  debug: (message: string, data?: LogData) => {
    if (isDevelopment) {
      console.log(`[DEBUG] ${message}`, data ? sanitize(data) : "");
    }
  },
};
```

2. Replace all console.log statements with the logger.

---

### 5. HIGH - Weak Password Policy

**Severity:** High
**Location:**
- [src/app/api/register/route.ts:44-49](src/app/api/register/route.ts#L44-L49)
- [src/app/api/driver/register/route.ts:87-91](src/app/api/driver/register/route.ts#L87-L91)
- [src/app/api/garage/register/route.ts:139-143](src/app/api/garage/register/route.ts#L139-L143)

**Description:**
Password requirements are too weak (only 6 characters minimum), making accounts vulnerable to:
- Dictionary attacks
- Rainbow table attacks
- Brute force attacks

**Current Validation:**
```typescript
if (password.length < 6) {
  return NextResponse.json(
    { error: "Password must be at least 6 characters" },
    { status: 400 }
  );
}
```

**Remediation:**
```typescript
// src/lib/validation.ts
export function validatePassword(password: string): { valid: boolean; error?: string } {
  if (password.length < 8) {
    return { valid: false, error: "Password must be at least 8 characters" };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: "Password must contain at least one uppercase letter" };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, error: "Password must contain at least one lowercase letter" };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, error: "Password must contain at least one number" };
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return { valid: false, error: "Password must contain at least one special character" };
  }

  // Check against common passwords
  const commonPasswords = ["password", "12345678", "qwerty123"];
  if (commonPasswords.some(p => password.toLowerCase().includes(p))) {
    return { valid: false, error: "Password is too common" };
  }

  return { valid: true };
}

// Usage in registration routes:
import { validatePassword } from "@/lib/validation";

const passwordCheck = validatePassword(password);
if (!passwordCheck.valid) {
  return NextResponse.json({ error: passwordCheck.error }, { status: 400 });
}
```

---

### 6. HIGH - Direct MongoDB Connection in Webhook (Bypasses Mongoose)

**Severity:** High
**Location:** [src/app/api/stripe/webhook/route.ts:64](src/app/api/stripe/webhook/route.ts#L64)

**Description:**
The Stripe webhook uses a raw MongoClient connection instead of Mongoose, bypassing:
- Schema validation
- Middleware hooks
- Connection pooling
- Mongoose security features

**Vulnerable Code:**
```typescript
const client = new MongoClient(process.env.MONGODB_URI!);
await client.connect();
const db = client.db();
await db.collection('bookings').insertOne(booking);
```

**Remediation:**
```typescript
// Use Mongoose instead of raw MongoClient
import { connectDB } from "@/lib/mongodb";
import Booking from "@/models/Booking";

// In the webhook handler:
await connectDB();

const booking = await Booking.create({
  userId: null,
  userName: metadata.customerName,
  userEmail: metadata.customerEmail,
  // ... rest of fields
});
```

---

### 7. HIGH - Missing CSRF Protection

**Severity:** High
**Location:** All mutating API endpoints

**Description:**
No CSRF tokens are implemented on state-changing requests. While Next.js API routes with proper authentication provide some protection, CSRF tokens add defense-in-depth.

**Remediation:**

1. For the contact form and other public forms, add a simple token:
```typescript
// src/lib/csrf.ts
import { cookies } from "next/headers";
import crypto from "crypto";

export async function generateCsrfToken(): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");
  const cookieStore = await cookies();
  cookieStore.set("csrf_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 60, // 1 hour
  });
  return token;
}

export async function validateCsrfToken(token: string): Promise<boolean> {
  const cookieStore = await cookies();
  const storedToken = cookieStore.get("csrf_token")?.value;
  return storedToken === token;
}
```

---

## Medium Severity Vulnerabilities

### 8. MEDIUM - Insecure Cookie Configuration for Sessions

**Severity:** Medium
**Location:** [src/app/api/auth/[...nextauth]/route.ts](src/app/api/auth/%5B...nextauth%5D/route.ts)

**Description:**
NextAuth session configuration doesn't explicitly set secure cookie options.

**Remediation:**
```typescript
// Add to authOptions
export const authOptions: NextAuthOptions = {
  // ... existing config
  cookies: {
    sessionToken: {
      name: `__Secure-next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
};
```

---

### 9. MEDIUM - Missing Input Sanitization (XSS Potential)

**Severity:** Medium
**Location:** Various form inputs stored without sanitization

**Description:**
User inputs are trimmed but not sanitized for HTML/script content:
- Contact form messages
- Business names
- Service notes
- Booking notes

**Affected Files:**
- [src/app/api/contact/route.ts:56-62](src/app/api/contact/route.ts#L56-L62)
- [src/app/api/garage/register/route.ts:230](src/app/api/garage/register/route.ts#L230)

**Remediation:**
```typescript
// src/lib/sanitize.ts
import DOMPurify from "isomorphic-dompurify";

export function sanitizeInput(input: string): string {
  if (!input) return "";

  // Remove HTML tags and sanitize
  const sanitized = DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [], // No HTML allowed
    ALLOWED_ATTR: [],
  });

  // Trim and normalize whitespace
  return sanitized.trim().replace(/\s+/g, " ");
}

export function sanitizeEmail(email: string): string {
  return email.toLowerCase().trim().slice(0, 254);
}

// Usage:
import { sanitizeInput, sanitizeEmail } from "@/lib/sanitize";

const contact = new Contact({
  name: sanitizeInput(name),
  email: sanitizeEmail(email),
  message: sanitizeInput(message),
});
```

Install the package:
```bash
npm install isomorphic-dompurify
```

---

### 10. MEDIUM - Potential Information Disclosure in Error Messages

**Severity:** Medium
**Location:** Multiple API routes

**Description:**
Some error responses may leak implementation details:

**Examples:**
- Mongoose validation errors exposed directly
- Stack traces in development mode
- Database connection errors

**Remediation:**
```typescript
// src/lib/errorHandler.ts
export function handleApiError(error: unknown): { message: string; status: number } {
  // Log full error for debugging
  console.error("[API Error]", error);

  // Return generic message to client
  if (error instanceof Error) {
    if (error.name === "ValidationError") {
      return { message: "Invalid input data", status: 400 };
    }
    if (error.name === "MongoServerError") {
      return { message: "Database error", status: 500 };
    }
  }

  return { message: "An unexpected error occurred", status: 500 };
}
```

---

### 11. MEDIUM - No Account Lockout Mechanism

**Severity:** Medium
**Location:** [src/app/api/auth/[...nextauth]/route.ts](src/app/api/auth/%5B...nextauth%5D/route.ts)

**Description:**
No account lockout after failed login attempts, enabling unlimited password guessing.

**Remediation:**
Add to User model:
```typescript
// In User schema
failedLoginAttempts: { type: Number, default: 0 },
lockoutUntil: { type: Date },

// In auth handler
if (user.lockoutUntil && user.lockoutUntil > new Date()) {
  throw new Error("Account temporarily locked. Try again later.");
}

if (!isPasswordValid) {
  user.failedLoginAttempts += 1;
  if (user.failedLoginAttempts >= 5) {
    user.lockoutUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 min lockout
  }
  await user.save();
  throw new Error("Invalid password");
}

// Reset on successful login
user.failedLoginAttempts = 0;
user.lockoutUntil = undefined;
await user.save();
```

---

### 12. MEDIUM - Missing Audit Logging

**Severity:** Medium
**Location:** All admin operations

**Description:**
No audit trail for critical operations:
- Admin approvals/rejections
- Booking status changes
- User role modifications
- Payment events

**Remediation:**
```typescript
// src/models/AuditLog.ts
import mongoose, { Schema, Document } from "mongoose";

export interface IAuditLog extends Document {
  action: string;
  performedBy: mongoose.Types.ObjectId;
  targetType: "user" | "driver" | "garage" | "booking" | "payment";
  targetId: mongoose.Types.ObjectId;
  details: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>({
  action: { type: String, required: true, index: true },
  performedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  targetType: { type: String, enum: ["user", "driver", "garage", "booking", "payment"], required: true },
  targetId: { type: Schema.Types.ObjectId, required: true },
  details: { type: Schema.Types.Mixed, default: {} },
  ipAddress: String,
  userAgent: String,
}, { timestamps: true });

// Index for efficient queries
AuditLogSchema.index({ createdAt: -1 });
AuditLogSchema.index({ performedBy: 1, createdAt: -1 });

export default mongoose.models.AuditLog || mongoose.model<IAuditLog>("AuditLog", AuditLogSchema);
```

---

## Low Severity Vulnerabilities

### 13. LOW - Debug Console Logs in Production

**Severity:** Low
**Location:** Multiple files with emoji-prefixed logs

**Description:**
Extensive debug logging (with emojis like 🔔, ✅, ❌) remains in production code.

**Remediation:**
Remove or conditionally enable based on environment. See logging utility in #4.

---

### 14. LOW - Missing Subresource Integrity (SRI)

**Severity:** Low
**Location:** External script loading (Stripe, Google Maps)

**Description:**
External scripts loaded without SRI hashes could be tampered with.

**Remediation:**
This is partially mitigated by CSP. For Stripe and Google Maps, SRI is not directly applicable as they dynamically load scripts.

---

### 15. LOW - Email Enumeration via Registration

**Severity:** Low
**Location:**
- [src/app/api/register/route.ts:58-62](src/app/api/register/route.ts#L58-L62)
- [src/app/api/driver/register/route.ts:153-158](src/app/api/driver/register/route.ts#L153-L158)

**Description:**
Different error messages for existing vs. non-existing emails enable email enumeration.

**Current Response:**
```typescript
if (existingEmail) {
  return NextResponse.json(
    { error: "Email already registered" },
    { status: 409 }
  );
}
```

**Remediation:**
Use generic error messages or implement timing-safe responses:
```typescript
// Generic response that doesn't confirm email existence
return NextResponse.json(
  { error: "Registration failed. If this email is already registered, please try logging in." },
  { status: 400 }
);
```

---

## Security Best Practices - Not Yet Implemented

### Recommended Additions:

1. **Implement 2FA for Admin/Garage/Driver accounts**
   - Use TOTP (Time-based One-Time Password)
   - Consider WebAuthn for stronger authentication

2. **Add Security Headers Middleware**
   - Already covered in #3 above

3. **Implement Request Signing for Webhooks**
   - Already implemented for Stripe (good!)
   - Consider for any future webhook integrations

4. **Add Input Length Limits to All Fields**
   - Most fields have limits, but verify all models

5. **Implement Dependency Scanning**
   ```bash
   npm audit --audit-level=moderate
   npx snyk test
   ```

6. **Set Up Security Monitoring**
   - Consider Sentry for error tracking
   - Set up alerts for unusual patterns

---

## Implementation Priority Checklist

### Immediate (Within 24 Hours):
- [ ] Fix NoSQL injection in booking track API (#1)
- [ ] Implement rate limiting on auth endpoints (#2)
- [ ] Add security headers to next.config.ts (#3)
- [ ] Remove sensitive console.log statements (#4)

### High Priority (Within 48 Hours):
- [ ] Strengthen password policy (#5)
- [ ] Fix webhook MongoDB connection (#6)
- [ ] Add CSRF protection to forms (#7)

### Medium Priority (Within 1 Week):
- [ ] Secure cookie configuration (#8)
- [ ] Add input sanitization (#9)
- [ ] Implement generic error messages (#10)
- [ ] Add account lockout (#11)
- [ ] Implement audit logging (#12)

### Low Priority (Regular Maintenance):
- [ ] Clean up debug logs (#13)
- [ ] Review SRI implementation (#14)
- [ ] Fix email enumeration (#15)

---

## Security Testing Recommendations

### Automated Testing:
```bash
# Dependency audit
npm audit --audit-level=moderate

# Security linting
npm install -D eslint-plugin-security
# Add to .eslintrc: plugins: ["security"]

# SAST scanning
npx snyk code test
```

### Manual Testing:
1. Test all forms with XSS payloads: `<script>alert('XSS')</script>`
2. Test authentication with SQL/NoSQL injection patterns
3. Test rate limiting by sending rapid requests
4. Verify error messages don't leak sensitive info
5. Check browser dev tools for exposed secrets

### Penetration Testing:
Consider engaging a professional penetration testing firm for a comprehensive assessment of the production environment.

---

## Conclusion

The Drivlet platform has a solid foundation with proper authentication via NextAuth, secure password hashing (bcrypt with 12 rounds), and Stripe webhook signature verification. However, critical vulnerabilities in input validation and missing rate limiting require immediate attention.

The most urgent fixes are:
1. Sanitizing regex input in the booking track API
2. Implementing rate limiting across all endpoints
3. Adding security headers

Once these are addressed, the platform's security posture will be significantly improved.

---

*Report generated by Claude Code Security Audit*
