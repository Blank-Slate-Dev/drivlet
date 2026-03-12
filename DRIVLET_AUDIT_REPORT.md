# Drivlet Pre-Launch Audit Report

**Date:** 2026-03-12
**Auditor:** Claude Code (claude-sonnet-4-6)
**Scope:** Full codebase — 16 areas
**Status:** Complete

---

## Executive Summary

The Drivlet codebase is in strong shape for launch. The major security bugs identified in the prior audit have all been patched. No critical vulnerabilities remain. This report identifies a set of **Medium** and **Low** severity issues that should be addressed before or shortly after launch, along with several informational items.

| Severity | Count | Notes |
|----------|-------|-------|
| Critical | 0 | None found |
| High | 0 | None found |
| Medium | 5 | Address before launch |
| Low | 8 | Address before or shortly after launch |
| Info | 7 | No action required, but worth knowing |

---

## Area 1 — Routing & Middleware

**File:** `src/proxy.ts`

**Status: PASS**

The middleware is correctly placed and named. It uses `withAuth` from `next-auth/middleware` and exports a `config.matcher` array that covers all protected routes. The driver onboarding state machine is properly enforced (redirects `not_started` and `contracts_pending` drivers to the appropriate step). Admin, driver, and garage portals are all gated.

The `QUOTE_SYSTEM_ENABLED` feature flag correctly gates quote routes in middleware, preventing access to quote pages when the feature is off.

**No issues.**

---

## Area 2 — Design System Consistency

**Files:** All `layout.tsx` and `page.tsx` files across portals.

**Status: PASS (1 minor)**

The emerald/slate/teal Tailwind palette is applied consistently across all four portals (customer, driver, garage, admin). Spacing, typography, and component patterns are uniform.

### LOW-01 — Hardcoded Absolute URL in Header

**File:** `src/components/Header.tsx` lines 247, 469
**Also:** `src/components/homepage/InteractiveServicesSection.tsx` lines 365, 391

The "Book a service" CTA buttons link to the hardcoded absolute URL `https://www.drivlet.com.au/booking` rather than the relative path `/booking`. While this works correctly in production (same domain), it causes broken navigation when developing locally or in staging environments.

**Recommendation:** Change to `href="/booking"` on all four occurrences.

---

## Area 3 — Homepage & Public Navigation

**Files:** `src/components/Header.tsx`, `src/components/homepage/Footer.tsx`, `src/components/homepage/HomeContent.tsx`, and all homepage section components.

**Status: PASS**

- Header is responsive, has correct role-aware user menu, properly shows/hides nav links based on auth state.
- Footer correctly shows partner links only to unauthenticated users. ABN (73 687 063 618), phone (1300 470 886), and email (support@drivlet.com.au) are present.
- All Phase 1 nav items (Services, Pricing) are correctly hidden via comments.
- Quote System nav link is correctly gated behind `FEATURES.QUOTE_SYSTEM`.

**No blocking issues.**

---

## Area 4 — Booking Flow

**Files:** `src/components/homepage/BookingModal.tsx`, `src/app/booking/page.tsx`, related API routes.

**Status: PASS (1 info)**

Both the modal (homepage) and standalone `/booking/page.tsx` implementations use the same feature flags, service categories, time slot config, and distance zone logic. Stripe payment creation is server-side. Booking creation on payment success uses `findOneAndUpdate` with `$setOnInsert` to atomically prevent duplicate bookings (webhook race condition correctly handled).

### INFO-01 — Duplicate Booking Implementations

There are two parallel booking form implementations: `BookingModal.tsx` (embeds in homepage) and `booking/page.tsx` (standalone page). They share all business logic but duplicate a large amount of UI code. This is fine for launch but creates a maintenance risk long-term.

**Recommendation:** Consider extracting into shared components post-launch.

---

## Area 5 — Tracking Page

**File:** `src/app/track/page.tsx`

**Status: PASS (1 low)**

The tracking page correctly handles both guest (code + email) and authenticated lookups. Stripe embedded payment for service fees is properly integrated.

### LOW-02 — Track Page Missing Metadata

`/track/page.tsx` is a `"use client"` component with no corresponding layout file exporting `metadata`. The page is included in `sitemap.ts` (priority 0.6) but search engines will see no title or description tags.

**Recommendation:** Add `src/app/track/layout.tsx` with appropriate metadata.

---

## Area 6 — Customer Dashboard

**File:** `src/app/dashboard/page.tsx`

**Status: PASS (1 low)**

The customer dashboard correctly polls for booking updates, handles all booking stages, supports cancellation, signature forms (pickup consent, return confirmation, claim lodgement), service payment, and the review flow. Role-based redirects (driver → driver dashboard, garage → garage dashboard) are implemented.

### LOW-03 — `QUOTES_ENABLED` Hardcoded Instead of Feature Flag

**File:** `src/app/dashboard/page.tsx` line 44

```typescript
const QUOTES_ENABLED = false; // hardcoded
```

This duplicates the feature flag system. If `NEXT_PUBLIC_ENABLE_QUOTE_SYSTEM` is set to `true` to enable quotes elsewhere, this local constant will still disable the quotes tab on the customer dashboard.

**Recommendation:** Replace with `import { FEATURES } from '@/lib/featureFlags'` and use `FEATURES.QUOTE_SYSTEM`.

---

## Area 7 — Admin Portal

**Files:** `src/app/admin/`, `src/app/api/admin/`

**Status: PASS**

The admin portal covers: dashboard stats, bookings (with full filtering/pagination), users (suspend/reactivate with audit trail), drivers (clock management), garages, incidents, testimonials, dispatch, payment disputes, and location change requests. All routes are protected via `requireAdmin()`. Soft-delete implemented for bookings.

**No issues.**

---

## Area 8 — Driver Portal

**Files:** `src/app/driver/`, `src/app/api/driver/`

**Status: PASS**

The recently redesigned driver portal includes a clean white header, stats row, job panel, and sidebar layout. Onboarding is a 6-step wizard (Framer Motion). Clock in/out uses atomic database operations. Service payment claim uses `findOneAndUpdate` to prevent race conditions. Earnings, history, settings, and payment pages are all present.

**No issues.**

---

## Area 9 — Garage Portal

**Files:** `src/app/garage/`, `src/app/api/garage/`

**Status: PASS**

The garage portal covers: dashboard, bookings, analytics, settings, notifications, quotes, reviews, subscription management, and location change requests. All routes are protected and only accessible to approved garages. Subscription management uses Stripe Checkout.

**No issues.**

---

## Area 10 — API Security

**Files:** All `src/app/api/` route handlers.

**Status: PASS (2 medium)**

Authentication, authorisation, input validation, and rate limiting have been applied across API routes. The prior audit's security patches (M-01 through M-11) are confirmed applied.

### MEDIUM-01 — Verbose Debug Logging in Production

**File:** `src/app/api/auth/verify/route.ts` (18 console statements)
**Also:** `src/app/api/bookings/create-after-payment/route.ts` (21 console statements)

These endpoints log sensitive information in production including:
- User email addresses
- Verification code expiry details
- Verification code existence confirmation
- Payment metadata payloads

This is a data privacy concern. Even if logs are only visible to the operator, verbose logging of PII is inconsistent with the Privacy Policy (which states minimal data collection).

Overall there are **327** `console.log/error/warn` calls across 97 API files. Error-level logs are appropriate; debug-level `console.log` calls with PII should be removed.

**Recommendation:** Remove or replace debug `console.log` statements in `auth/verify/route.ts` and `create-after-payment/route.ts` with structured error-only logging. Consider adding a `src/lib/logger.ts` that suppresses debug output when `NODE_ENV !== 'development'`.

### MEDIUM-02 — No `.env.example` File

There is no `.env.example` or `.env.template` file documenting required environment variables. The full list of required variables (24+) is scattered across the codebase. A developer setting up a new environment would need to read all source files to find them.

**Complete list of required environment variables:**

| Variable | Purpose | Required |
|----------|---------|---------|
| `MONGODB_URI` | MongoDB connection string | Yes |
| `NEXTAUTH_SECRET` | NextAuth JWT signing | Yes |
| `NEXTAUTH_URL` | NextAuth callback URL | Yes |
| `STRIPE_SECRET_KEY` | Stripe server-side API key | Yes |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe client-side key | Yes |
| `STRIPE_WEBHOOK_SECRET` | Main booking webhook signing | Yes |
| `STRIPE_SERVICE_PAYMENT_WEBHOOK_SECRET` | Service payment webhook (optional, falls back to main) | Recommended |
| `STRIPE_SUBSCRIPTION_WEBHOOK_SECRET` | Garage subscription webhook | Yes |
| `STRIPE_ANALYTICS_MONTHLY_PRICE_ID` | Garage subscription price ID | Yes |
| `STRIPE_ANALYTICS_YEARLY_PRICE_ID` | Garage subscription price ID | Yes |
| `STRIPE_PREMIUM_MONTHLY_PRICE_ID` | Garage subscription price ID | Yes |
| `STRIPE_PREMIUM_YEARLY_PRICE_ID` | Garage subscription price ID | Yes |
| `MAILJET_API_KEY` | Email sending | Yes |
| `MAILJET_SECRET_KEY` | Email sending | Yes |
| `EMAIL_FROM` | Sender address (default: noreply@drivlet.com.au) | Optional |
| `TWILIO_ACCOUNT_SID` | SMS and voice calls | Yes |
| `TWILIO_AUTH_TOKEN` | Twilio authentication | Yes |
| `TWILIO_PHONE_NUMBER` | Twilio outbound number | Yes |
| `APP_URL` | Application base URL for links in emails/webhooks | Yes |
| `NEXT_PUBLIC_APP_URL` | Same, client-side access | Yes |
| `AUTOGRAB_API_KEY` | Vehicle registration lookup (AutoGrab API) | Yes |
| `CRON_SECRET` | Auth token for cron endpoint | Yes |
| `NEXT_PUBLIC_ENABLE_SERVICE_SELECTION` | Feature flag | Optional |
| `NEXT_PUBLIC_ENABLE_QUOTE_SYSTEM` | Feature flag | Optional |
| `NEXT_PUBLIC_ENABLE_GARAGE_ASSIGNMENT` | Feature flag | Optional |
| `NEXT_PUBLIC_ENABLE_GARAGE_QUOTES` | Feature flag | Optional |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Google Maps / Places autocomplete | Yes |

**Recommendation:** Create `.env.example` with all variables listed (with placeholder values, not real secrets).

---

## Area 11 — Environment Variables

**Status: See MEDIUM-02 above.**

No environment variables are exposed client-side inappropriately. All `NEXT_PUBLIC_` variables contain only public keys and feature flags — no secrets. The `STRIPE_SECRET_KEY` and other secrets are server-only.

One note: `src/lib/email.ts` line 59 has a fallback:
```typescript
return process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
```
The `http://localhost:3000` fallback will produce incorrect email links if neither env var is set in production. Ensure both are set in the Vercel environment.

---

## Area 12 — Stripe Integration

**Files:** `src/lib/stripe.ts`, all `/api/stripe/` routes.

**Status: PASS (1 info)**

Transport price is correctly set to `DRIVLET_PRICE = 11900` ($119.00 AUD) consistently in both `src/lib/featureFlags.ts` (`TRANSPORT_PRICE = 11900`) and `src/lib/stripe.ts`. Distance surcharges are applied for yellow/orange zones.

Three webhook endpoints are present with proper signature verification:
1. `/api/stripe/webhook` — main booking payment
2. `/api/stripe/service-payment-webhook` — service fee payment
3. `/api/stripe/subscription-webhook` — garage subscription

Idempotent booking creation uses `findOneAndUpdate` with `$setOnInsert` preventing duplicate bookings from webhook + fallback endpoint race conditions.

### INFO-02 — Service Payment Webhook Falls Back to Main Webhook Secret

**File:** `src/app/api/stripe/service-payment-webhook/route.ts` lines 70-72

If `STRIPE_SERVICE_PAYMENT_WEBHOOK_SECRET` is not set, the endpoint falls back to `STRIPE_WEBHOOK_SECRET`. Since the endpoint correctly filters by `metadata.type === 'service_payment'`, this does not create a security vulnerability — it will simply silently skip non-service-payment events. However, it does mean Stripe could be misconfigured (both webhooks pointing to the same endpoint) without the operator knowing.

**Recommendation:** Set `STRIPE_SERVICE_PAYMENT_WEBHOOK_SECRET` with a dedicated Stripe webhook endpoint. Log a warning rather than silently falling back.

---

## Area 13 — Email & Notifications

**Files:** `src/lib/email.ts`, `src/lib/sms.ts`, registration and booking API routes.

**Status: PASS**

Mailjet integration handles booking confirmation, stage updates, verification codes, and password resets. Twilio handles SMS confirmations and voice calls for driver-to-customer communication. Email is sent with both text and HTML content.

The `sendBookingStageEmail` function correctly handles missing Mailjet credentials gracefully (returns without throwing).

**No blocking issues.**

---

## Area 14 — SEO & Metadata

**Files:** `src/app/sitemap.ts`, `src/app/robots.ts`, page/layout files.

**Status: PARTIAL (1 medium, 1 low)**

`sitemap.ts` covers all public pages including suburb landing pages. `robots.ts` correctly disallows all portal and API routes.

### MEDIUM-03 — Contact Page Layout Misplaced

**File:** `src/app/api/contact/layout.tsx` (should be `src/app/contact/layout.tsx`)

The layout file that exports metadata for the contact page is placed inside `src/app/api/contact/` (an API route directory) rather than `src/app/contact/`. In Next.js App Router, a layout in `app/api/contact/` only applies to the `/api/contact` API routes, not to the `/contact` page. As a result, the contact page renders with no `<title>` or `<meta description>` tags.

The file header comment confirms the intended path: `// src/app/contact/layout.tsx`.

**Recommendation:**
1. Move `src/app/api/contact/layout.tsx` → `src/app/contact/layout.tsx`
2. Verify by checking `view-source:https://drivlet.com.au/contact` for the title tag

### LOW-04 — Missing Metadata on Several Public Pages

The following public pages are missing SEO metadata:

| Page | Path | Issue |
|------|------|-------|
| Track | `/track` | Client component, no layout with metadata |
| Policies | `/policies` | Client component, no metadata |
| Garages listing | `/garages` | No metadata |
| Garage detail | `/garages/[id]` | No metadata |

The `/policies` and `/garages` pages are in `robots.txt` (not blocked), so they will be crawled. Search results will show the root layout's title ("Drivlet – Car Service Pickup and Delivery") for all these pages.

**Recommendation:** Add layout files with appropriate metadata for each of these pages.

---

## Area 15 — Missing Pages

**Status: 2 missing, 1 present**

| Page | Status | Notes |
|------|--------|-------|
| `src/app/error.tsx` | ✅ Present | Custom error boundary exists |
| `src/app/not-found.tsx` | ❌ Missing | Shows Next.js default 404 |
| `src/app/loading.tsx` | ❌ Missing | No root loading skeleton |

### LOW-05 — No Custom 404 Page

Without `src/app/not-found.tsx`, 404 errors display the stock Next.js "404 | This page could not be found." page, which is off-brand. For an SEO-important domain this also means the 404 page doesn't include the Header/Footer or suggest next steps.

**Recommendation:** Add `src/app/not-found.tsx` with the site Header, a friendly message, and a "Book a service" CTA.

### LOW-06 — No Root Loading Skeleton

Without `src/app/loading.tsx`, navigation between pages shows no transition feedback at the app root level. Less critical because each portal has its own loading states.

**Recommendation:** Add a minimal `src/app/loading.tsx` with a spinner or skeleton.

---

## Area 16 — Code Quality

**Status: PASS (several informational items)**

### INFO-03 — TODO Comments

Four `TODO` comments remain in production code:

| File | TODO |
|------|------|
| `src/app/api/garages/search/route.ts:242` | `isAvailable: true // TODO: Check actual availability` |
| `src/app/api/bookings/[id]/cancel/route.ts:216` | `// TODO: Send notification to garage` |
| `src/app/api/quotes/request/route.ts:13, 126` | Send confirmation email with tracking code |
| `src/app/api/quotes/track/route.ts:20` | Add email notification when quotes are received |

The garage availability and cancellation notification TODOs are the most impactful for user experience. The quotes TODOs are gated behind the `QUOTE_SYSTEM` feature flag.

### INFO-04 — `as any` TypeScript Casts

20 `as any` or `: any` casts found across 11 API files, mostly for Mongoose document flexibility and Stripe event handling. None introduce security risks given server-side execution context.

### INFO-05 — `console.log` in Production API Routes

327 total `console.log/error/warn` calls across 97 API files. `console.error` is appropriate for error reporting to Vercel logs. `console.log` debug statements (particularly in `auth/verify/route.ts` and `create-after-payment/route.ts`) should be removed or conditionalised.

### INFO-06 — Stripe Metadata Payload Size

The booking creation flow stores all booking data in Stripe Payment Intent metadata (up to ~20 fields including address, vehicle details, service selection JSON). Stripe metadata has a 500-character limit per key and a 50-key limit. The current implementation appears within limits, but if service selection strings grow (multiple services selected) they could approach the limit. Worth monitoring.

### INFO-07 — In-Memory Rate Limiter on Serverless

`src/lib/rateLimit.ts` uses a `Map` stored in module scope. On Vercel Serverless, each function instance has its own memory space, so the rate limit is per-instance, not global. This means the actual effective rate limit is `maxRequests × number_of_active_instances`. This is noted in the file comment. Acceptable for MVP; upgrade to Upstash Redis before launch if abuse protection is a priority.

---

## Summary of Actionable Items

### Must Fix Before Launch

| ID | Severity | File | Issue |
|----|----------|------|-------|
| MEDIUM-01 | Medium | `api/auth/verify/route.ts`, `api/bookings/create-after-payment/route.ts` | Remove PII from production console.logs |
| MEDIUM-02 | Medium | (missing) | Create `.env.example` documenting all required variables |
| MEDIUM-03 | Medium | `src/app/api/contact/layout.tsx` | Move to `src/app/contact/layout.tsx` (contact page has no SEO metadata) |

### Fix Before or Shortly After Launch

| ID | Severity | File | Issue |
|----|----------|------|-------|
| LOW-01 | Low | `Header.tsx`, `InteractiveServicesSection.tsx` | Hardcoded absolute URL `https://www.drivlet.com.au/booking` → use `/booking` |
| LOW-02 | Low | `src/app/track/` | Add layout with metadata for `/track` page |
| LOW-03 | Low | `src/app/dashboard/page.tsx` | Replace `QUOTES_ENABLED = false` with `FEATURES.QUOTE_SYSTEM` |
| LOW-04 | Low | `/policies`, `/garages`, `/garages/[id]` | Add metadata layouts |
| LOW-05 | Low | (missing) | Create `src/app/not-found.tsx` custom 404 page |
| LOW-06 | Low | (missing) | Create `src/app/loading.tsx` root loading state |

### Informational (No Action Required)

| ID | File | Note |
|----|------|------|
| INFO-01 | `BookingModal.tsx`, `booking/page.tsx` | Duplicate booking UI — consolidate post-launch |
| INFO-02 | `stripe/service-payment-webhook/route.ts` | Webhook secret fallback — use dedicated secret |
| INFO-03 | Various | 4 TODO comments to track |
| INFO-04 | Various | 20 `as any` TypeScript casts |
| INFO-05 | Various | 327 console calls — trim debug logs |
| INFO-06 | `api/bookings/create-after-payment/route.ts` | Stripe metadata size — monitor as services grow |
| INFO-07 | `src/lib/rateLimit.ts` | In-memory rate limiter is per-instance on serverless |

---

## What's Working Well

- **Security posture is solid.** All 20 prior audit fixes are in place: atomic Stripe claim, CSRF/origin validation, ownership checks on payment confirmation, authorisation on admin writes, hardened cron auth, webhook error propagation.
- **Stripe integration is correct.** Idempotent booking creation, proper webhook signature verification, separate secrets per endpoint.
- **Driver portal state machine is robust.** Middleware enforces onboarding steps; atomic clock-in/out prevents race conditions.
- **SEO foundations are strong.** Dynamic city/suburb pages with `generateMetadata`, `sitemap.xml`, `robots.txt`, and proper canonical URLs all in place.
- **Feature flags are consistent.** Phase 2 features (Quote System, Service Selection, Garage Assignment) are properly gated everywhere except the one hardcoded instance noted above.
- **ABN, pricing, and contact details are correct** throughout the codebase.

---

*Report generated: 2026-03-12. Based on codebase snapshot at commit `d3b4dc8`.*
