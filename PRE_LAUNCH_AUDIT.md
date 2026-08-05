# Drivlet Pre-Launch Audit

## ⚠️ MUST FIX BEFORE PHASE 2 (garage portal re-enable checklist)

Added 2026-08-06. The entire garage portal is now hidden and inert for
Phase 1 (`NEXT_PUBLIC_ENABLE_GARAGE_PORTAL`, see `src/lib/garagePortal.ts`).
That neutralises the following known bugs FOR LAUNCH ONLY — they are NOT
fixed, and the flag must not be enabled until they are:

1. **Cross-garage booking seizure** — `garage/acknowledge-booking` normalises
   names on the first " - " segment; chain branches can claim each other's
   bookings and receive the customer's contact details. Require
   `garagePlaceId` equality / full-name match.
2. **Garage data over-sharing** — `garage/bookings`, `garage/bookings/[id]`,
   `garage/dashboard/incoming` return full booking documents (customer
   email/phone/address, payment fields, internal timeline) with no
   projection, contradicting the privacy policy. Add `.select()` whitelists.
3. **Legacy `garage/booking-action`** still writes top-level
   `status: "completed"` (tracker 410 / dispatch-vanish regression) via the
   older weaker auth. Retire it.
4. **Garage "Start Service" from `acknowledged`** sets `status:"in_progress"`
   before a pickup driver exists — booking vanishes from the dispatch board
   and the customer's free-cancellation window is voided.
5. **Garage analytics vs stats** count "completed" on different fields
   (`status` vs `garageStatus`) and will disagree.
6. Quote units: legacy Quote docs stored dollars, new code stores cents —
   migrate or purge before quotes go live; quote-request projection drops
   `selectedServices`/`additionalNotes`/`vehicleVin`; "contacts released on
   accept" flow is unimplemented (accepting a quote is a dead end).

Date: 2026-08-02 · Scope: all flows, ~140 API routes, security, config/ops, data/privacy. Read-only audit — no code was changed. Findings are deduplicated across four parallel audits (flows, security, config/ops, privacy).

**Bottom line:** the core booking → payment → dispatch → driver → delivery pipeline is solid and well-guarded. The launch risks cluster in four places: (1) legacy booking paths that bypass the approval flow are still live, (2) identity documents and photos sit on permanently public URLs, (3) rate limiting doesn't actually work on Vercel, and (4) a handful of env vars / Stripe registrations that, if missed, mean customers pay and no booking is created.

---

## LAUNCH BLOCKERS

### LB-1. Return driver can't upload photos → two-driver jobs are undeliverable
`src/app/api/driver/bookings/[id]/photos/route.ts` (POST L64, GET L329, DELETE L433, PATCH L523)
All four handlers authorise against `assignedDriverId` only, never `returnDriverId`. A return driver who isn't the pickup driver gets 403 on every photo action, but `collected_from_workshop` in `driver/jobs/route.ts:656` hard-gates on `service_pickup` photos — so the return leg can never proceed. Same gap in `photos/[id]/route.ts:60` (viewing) and `driver/call-customer/route.ts:83`.
**Fix:** accept `assignedDriverId OR returnDriverId`, exactly as `bookings/[id]/forms/route.ts:15-23` already does.

### LB-2. Legacy booking creation paths still reachable — bookings without payment or approval
- `src/app/api/bookings/route.ts:110-292` — POST creates a `pending` Booking with **no payment**, no consent, no review (guest allowed; only an origin check). Violates "bookings only after payment". No frontend calls it.
- `src/app/api/stripe/create-payment-intent/route.ts` + booking-creation branches in `src/app/api/stripe/webhook/route.ts:49-379, 382-679` + `src/app/api/bookings/create-after-payment/route.ts` — the old pay-then-book pipeline. Anyone can POST arbitrary booking metadata, pay $119, and get a confirmed Booking that skips admin review, slot capacity, and consent. Only frontend reference is dead/commented code (`booking/page.tsx:314-341`).
**Fix (hide-don't-delete convention):** return 410 from `POST /api/bookings`, `create-payment-intent`, `create-checkout-session` (if unused), and `create-after-payment`; comment out the booking-creation branches of `stripe/webhook` behind a dated marker, keeping only the `service_payment`/`extra_charge` delegation. Note: touching `stripe/webhook` needs your explicit approval per house rules.

### LB-3. Identity documents and photos on permanent, public URLs
- `src/app/api/driver/register/route.ts:271-273` and `src/app/api/upload/police-check/route.ts:87-89` — **driver licence front/back and police-check certificates** uploaded to Vercel Blob with `access: "public"`. World-readable forever, no auth, no expiry.
- `src/lib/storage.ts:81-84` — vehicle/incident/profile photos also public, with deterministic paths (`vehicle-photos/{bookingId}/{checkpoint}/...`, `addRandomSuffix: false`).
- `src/app/api/photos/[id]/route.ts:82` — the access-controlled proxy does a correct ACL check, then **redirects to the permanent public URL**, so anyone the URL leaks to keeps access forever. `admin/tracking/route.ts:224` returns raw `cloudUrl` too.
**Fix:** store with `access: "private"` and stream bytes through the authenticated route (never redirect to the raw blob URL). Prioritise licences/police checks; photos next.

### LB-4. Rate limiting is non-functional on Vercel
`src/lib/rateLimit.ts:10` — in-process `Map`, per-lambda, wiped on recycle. Every brute-force/enumeration control (tracking-code guessing, feedback, promo validation, rego lookups, analytics, auth flows) silently depends on it.
**Fix:** back it with Upstash Redis or a MongoDB TTL collection (no new npm dependency needed for the Mongo option).

### LB-5. Login: no rate limit + account-enumeration oracle
`src/lib/auth.ts:96-119` — `authorize()` has no throttle (unlimited password guessing via `/api/auth/callback/credentials`), and "No user found with this email" vs "Invalid password" reveals which emails have accounts.
**Fix:** throttle by email+IP inside `authorize()`; collapse both errors to "Invalid email or password". (NextAuth config change — flagging for your approval.)

### LB-6. Public route leaks customer PII by booking ID
`src/app/api/bookings/[id]/review-info/route.ts:23-67` — any valid booking ObjectId returns `userName`, `userEmail`, `vehicleRegistration`, garage, service type. No session, no code/email/rego proof, no rate limit; ObjectIds are semi-sequential.
**Fix:** require the same tracking-code + email + rego proof as `/api/bookings/track`; drop `userEmail` from the response.

### LB-7. Stored XSS in the admin signed-form PDF/HTML view
`src/app/api/admin/forms/[formId]/pdf/route.ts` — driver/customer-supplied form values and signature data-URLs are interpolated into an HTML response with no escaping. A malicious form value executes JS in an admin's browser on your origin.
**Fix:** HTML-escape every interpolated value; validate signatures start with `data:image/`.

### LB-8. Ops: env vars and Stripe registrations that break revenue if missed
- `STRIPE_REQUEST_WEBHOOK_SECRET` is used at `request-payment-webhook/route.ts:19` with **no fallback** and is **missing from `.env.example`** — if unset in Vercel, customers pay and no booking is ever created.
- All 4 webhook endpoints must be registered in the Stripe Dashboard (see checklist below).
- `APP_URL` + `NEXT_PUBLIC_APP_URL` must be set in Vercel production — 12 code paths fall back to `http://localhost:3000` in customer emails, SMS, and Stripe redirects (`email.ts:185`, `requestConfirmationEmail.ts:17`, `forgot-password/route.ts:14`, `driver/jobs/route.ts:26`, and 8 more).
- `STRIPE_TEST_MODE` / `STRIPE_TEST_MODE_ALLOW_PRODUCTION` must **not** exist in any Vercel environment (the $1 override guard only covers `VERCEL_ENV === "production"` — previews with the flag still charge $1).
- Confirm live `sk_live_`/`pk_live_` keys, `BLOB_READ_WRITE_TOKEN` (Blob store connected), `CRON_SECRET` (hourly auto-clockout in `vercel.json`), Mailjet keys + verified sender, `MONGODB_URI` (you're already changing this one).

---

## SHOULD-FIX

### Flows
1. **Declined request can still convert to a paid booking** — `admin/booking-requests/[id]/decline/route.ts:82` nulls the token but never cancels the Stripe PI; `request-payment-webhook/route.ts:69` idempotency doesn't check `declined`. A customer with `/pay` open can pay after decline. Fix: cancel the PI on decline; webhook refuses conversion for declined requests.
2. **100% promo → $0 quote → charged full $119** — `create-request-payment-intent/route.ts:48-51` treats `quotedAmount === 0` as "missing" and falls back to full price. Fix: cap promos at 99% (`admin/promo-codes/route.ts:54`) or distinguish 0 from undefined.
3. **`generate_payment` rewrites `currentStage` to `service_in_progress` unconditionally** — `driver/jobs/route.ts:1062-1063`. Generating a link during pickup jumps the tracker forward; after return starts, it regresses it. Fix: only set stage from `at_garage`/`service_in_progress` (same guard as `servicePayment.ts:58`).
4. **Duplicate stage emails/SMS** — `driver/jobs/route.ts:498` (`arrived_pickup`) and `:712` (`delivering`) call `notifyBookingUpdate` without `suppressCustomerNotifications` while the stage is unchanged → same stage email/SMS sent twice. Fix: pass the suppress flag on sub-step actions.
5. **`ready_for_return` unknown to the customer tracker** — `servicePayment.ts:61` sets it; `track/page.tsx:111-128` has no mapping → tracker shows "Booking Confirmed" at 85%. Fix: map it (display as service in progress / ready).
6. **Two driver-assignment endpoints drifted apart** — booking-modal route (`admin/bookings/[id]/assign-driver`) skips `driver.isActive`, doesn't touch `metrics.totalJobs`, doesn't emit SSE, and pickup-unassign doesn't auto-clear the return driver (dispatch route does all four: `admin/dispatch/route.ts:239,304,441-452,472`). Fix: extract one shared assign/unassign helper.
7. **`undo_last` can corrupt state across the leg boundary** — `driver/jobs/route.ts:775-881`: pickup driver undoing `dropped_at_workshop` isn't blocked when the return driver already started. Fix: reject that undo when `returnDriver?.startedAt` exists.
8. **Dead 24h/50% refund logic contradicts the live 3-hour policy** — `lib/refund-calculator.ts:144-172` still served by `GET /api/bookings/[id]/cancel` (no UI calls it). Fix: 410 the GET; comment out the calculator with a dated marker.

### Security
9. **Registration endpoints unthrottled** — `register`, `driver/register`, `garage/register`: add `withRateLimit` (matters once LB-4 is fixed).
10. **Contact route injects unescaped email into support-notification HTML** — `contact/route.ts:123`. Escape `cleanEmail`.
11. **`autoLoginToken` not string-coerced** — `lib/auth.ts:26`: wrap in `String()` before the query.
12. **Guest email+rego in GET query params** — `photos/[id]/route.ts:45-46`, `bookings/[id]/stream`: PII lands in server/CDN logs. Move to POST or token.
13. **Driver photo DELETE hard-deletes custody evidence, at any stage** — `photos/route.ts:399-491` (also flows finding): switch to soft-delete/supersede and block after leg completion.
14. **Police-check/profile uploads trust client MIME** — `upload/police-check/route.ts:49-55`: reuse the magic-byte validation from `storage.ts`; allow `%PDF`.
15. **`quotes/track` + `garages/search` unthrottled/unbounded** — add rate limits; `.limit()` the garage query (`garages/search/route.ts:129`).
16. **`rego` route forwards unvalidated input to the paid AutoGrab API** — `rego/route.ts:33-77`: validate `/^[A-Z0-9]{1,10}$/`, whitelist region.
17. **No `src/middleware.ts`** — page protection for `/admin`, `/driver`, `/garage` is client-side only (`admin/layout.tsx:170-181` etc.). API routes are guarded, so no direct leak, but there's zero defence-in-depth. Fix: add middleware with role checks (needs your approval — auth-adjacent).

### Privacy / data
18. **Garage APIs return full booking documents** — `garage/bookings/route.ts:75-102`, `garage/dashboard/incoming/route.ts:99-117`: customer email, phone, address, `paymentId`, `paymentAmount`, internal timeline — the privacy policy explicitly promises "We do not share your payment details with the workshop" (`policies/page.tsx:203`). Fix: `.select()` whitelist (name, rego, vehicle, service, timing, stage). Near-blocker if garage accounts are approved at launch; Phase 1 mitigates it only if none are.
19. **Consent not carried to Booking** — `request-payment-webhook/route.ts:115-168` doesn't copy `policiesAgreedAt`/`marketingOptIn`; `Booking.ts` has no fields; no admin surface reads `marketingOptIn`. Fix: add fields, copy in the webhook, expose opt-in in admin.
20. **PII in production logs (~20 call sites)** — customer emails/phones/addresses and **driver personal phone numbers** logged in `stripe/webhook` (L92-94, 239-240, 545-546), `register/route.ts:87-92,113`, `emit-booking-update.ts:118,138`, `driver/jobs/route.ts:1088,1101`, all four `twilio/voice/*` routes, `twilio-voice.ts:147-151`, `create-payment-intent/route.ts:71,82-87`, `bookings/[id]/forms/route.ts:247`. Fix: one sweep replacing PII with IDs/tracking codes.
21. **No retention/deletion mechanism** — policy promises deletion/de-identification (`policies/page.tsx:212`) but only PageView has a TTL. Fix: documented retention schedule + a cron purge (pattern exists at `cron/auto-clockout`); delete blobs alongside records (`deleteFromStorage` exists).

### Config / copy
22. **Fake support phone 1300 123 456** — `driver/pending/page.tsx:221-227`, `garage/pending/page.tsx:316-322` (real: 1300 470 886).
23. **Wrong domains** — `twilio-voice.ts:214` says "drivlet.com"; `garage/pending/page.tsx:307-313` `partners@drivlet.com`; `garage/subscription/cancelled|success` pages `support@drivlet.com`.
24. **Delete `/api/debug/email-test`** — marked "TEMPORARY — REMOVE"; admin-gated but echoes env-var presence.
25. **Check prod Atlas for seed leftovers** — `scripts/seed-test-booking.ts` writes `test@example.com` / rego `TEST123`; verify no such docs exist in the production DB.

---

## NICE-TO-HAVE

1. Booking stepper still shows a "Pay" step that never happens; `renderPayment`/`handlePaymentSuccess` are dead (`booking/page.tsx:63-69, 343-352, 795-826`).
2. `mark_paid_phone` doesn't advance `at_garage` → `ready_for_return` like the Stripe path does (`driver/jobs/route.ts:887-937`).
3. Driver actions lack API-level sequence enforcement (UI-only ordering).
4. Duplicate change-password endpoints (`api/auth/change-password` vs `api/account/change-password`) — consolidate.
5. Orphaned `/admin/booking-requests` page (nav link commented out) — redirect or remove.
6. Public tracker exposes the full internal `updates` timeline incl. driver full names and admin audit notes (`bookings/track/route.ts:162`) — filter to customer-relevant stages.
7. CSP allows `unsafe-inline`/`unsafe-eval` (`next.config.js:9`) — nonce-based CSP later; other headers (HSTS preload, frame, nosniff) are solid.
8. `confirm-service-payment` leaks booking existence/stage to unauthenticated callers (not a payment hole — Stripe-verified) — return uniform responses.
9. Non-string body fields throw unhandled 500s in `bookings/feedback/route.ts:61`, `time-change-request/route.ts:46` — add type guards.
10. Promo validate 404-vs-409 and `pay/[token]` status-only expiry are mild oracles.
11. `bookings/track/photos` verifies with email+rego only (no tracking code) and matches the latest booking — align with the track endpoint.
12. Disclose per-photo GPS capture in the privacy policy (`VehiclePhoto.ts:99-116` stores lat/lng); add ABN to email footers.
13. Absolute `https://www.drivlet.com.au/booking` links in `InteractiveServicesSection.tsx:365,391` break preview deploys — use relative.
14. Dead env vars in `.env.local` (`MAILJET_FROM_EMAIL/NAME`, `EMAIL_FROM_NAME`) — remove; `validation.ts:168` still allows `drivlet.vercel.app` origin.
15. ~152 `console.log` calls in `src/` — general noise trim (beyond the PII sweep above).

---

## VERIFIED SOLID (no action)

- Booking-request flow: consent enforced client + server, server-side price/zone recomputation, red-zone rejection, atomic promo claim/release with audit linking.
- Approve → pay: double-approve guard, slot capacity check, resend path, decline releases promo + invalidates token; pay tokens are 256-bit; webhook is signature-verified and dual-idempotent.
- All 4 Stripe webhooks verify signatures; all 4 Twilio voice webhooks validate signatures (timing-safe, fail closed); prices computed server-side.
- Driver gating: photo/form requirements are single-source (shared by UI + API), re-validated on every action; leg ownership enforced on jobs/forms/calls; undo is window-limited and evidence-preserving (single-leg).
- Service payment: `markServicePaymentPaid` idempotent + regression-guarded; atomic link claim; $1–$800 bounds; phone-paid double-mark guard.
- Auth: enumeration-safe forgot-password (hashed 1h single-use tokens), suspension enforced at login, per-session, per-request, and in the driver layout.
- Cancellation: 3-hour policy from one source, admin-only refunds with remaining-refundable cap, promo released in all three cancel paths.
- Analytics: stores path only (query stripped), hashed rotating visitor ID, no IP/UA, 400-day TTL, bots filtered. No stored XSS in the traffic dashboard (React escapes).
- No hard-coded secrets in source; all `NEXT_PUBLIC_*` vars are non-sensitive; card data limited to Stripe refs/last4/brand.
- Feature flags: all four marketplace flags default false; `/quotes` blocked in `proxy.ts`; `TRANSPORT_PRICE` = 11900 matches server-side.

---

## VERCEL PRODUCTION ENV CHECKLIST

| Var | Required | Notes |
|---|---|---|
| `MONGODB_URI` | YES | New Atlas URI (you're on this) |
| `NEXTAUTH_SECRET` / `NEXTAUTH_URL` | YES | URL = https://drivlet.com.au |
| `STRIPE_SECRET_KEY` / `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | YES | Must be `sk_live_` / `pk_live_` |
| `STRIPE_WEBHOOK_SECRET` | YES | Main webhook |
| `STRIPE_REQUEST_WEBHOOK_SECRET` | YES | **No fallback — top miss risk; not in .env.example** |
| `STRIPE_SERVICE_PAYMENT_WEBHOOK_SECRET` | Recommended | Falls back to main secret |
| `STRIPE_SUBSCRIPTION_WEBHOOK_SECRET` + 4 price IDs | Only if garage subs live | |
| `STRIPE_TEST_MODE` / `STRIPE_TEST_MODE_ALLOW_PRODUCTION` | **MUST NOT EXIST** | $1 override |
| `MAILJET_API_KEY` / `MAILJET_SECRET_KEY` / `EMAIL_FROM` | YES | Verify `noreply@drivlet.com.au` in Mailjet + SPF/DKIM; support@ must be a real inbox |
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_PHONE_NUMBER` | YES | SMS + masked calls |
| `APP_URL` + `NEXT_PUBLIC_APP_URL` | YES | Else localhost links in emails |
| `BLOB_READ_WRITE_TOKEN` | YES | Via Blob store connection |
| `AUTOGRAB_API_KEY` | YES | Rego lookup |
| `CRON_SECRET` | YES | Hourly auto-clockout |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | YES | Address autocomplete |
| `NEXT_PUBLIC_GA_ID` | Recommended | Build-time; GA silently absent without it |
| `ADMIN_NOTIFICATION_EMAIL` / `ANALYTICS_ADMIN_EMAILS` | Optional | Default support@drivlet.com.au |
| `NEXT_PUBLIC_ENABLE_*` flags (x4) | Leave unset | Build-time inlined; redeploy to change |

**Stripe Dashboard — register these endpoints:**

| Endpoint | Events |
|---|---|
| `/api/stripe/webhook` | `payment_intent.succeeded`, `checkout.session.completed`, `payment_intent.payment_failed` |
| `/api/stripe/request-payment-webhook` | `payment_intent.succeeded` |
| `/api/stripe/service-payment-webhook` | `checkout.session.completed`, `payment_intent.succeeded` |
| `/api/stripe/subscription-webhook` | subscription + invoice events (only when garage subs launch) |
