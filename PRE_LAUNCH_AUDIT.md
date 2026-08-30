# Drivlet Pre-Launch Audit

**Re-verified 2026-08-30** (prior audits 2026-08-02, 2026-08-16). Scope of this
pass: verify the 18-commit fix batch (`8b2e6c7..dabcbac`) holds, hunt
regressions it may have introduced, full end-to-end re-sweep of every major
flow (booking→payment, dispatch→driver legs→delivery, admin, driver portal,
customer dashboard/tracker, auth), and re-assessment of the deliberately
skipped items. Read-only pass — no code changes. `tsc --noEmit` clean.

---

## ✅ THE 18-COMMIT FIX BATCH — ALL 18 VERIFIED HOLDING

Each fix re-verified against current code, with a regression hunt around the
four risky ones. **No regressions introduced by the batch were found.**

1. `8b2e6c7` **NB-1 generate_payment deadlock guard** — stage only advances
   from `at_garage`/`service_in_progress`, never once `returnDriver.startedAt`
   (`driver/jobs/route.ts:1125-1132`). Return-leg deadlock is dead: return form
   signable throughout `driver_returning`, `delivered` reachable. Paid/refunded
   409 guards + atomic claim + claim release on Stripe failure all verified.
2. `ea8429c` **NB-2 admin sidebar scroll** — `overflow-y-auto` on desktop and
   mobile navs (`admin/layout.tsx:356,470`), footer pinned.
3. `a229906` **NB-3 policy deep links** — hash validated against the policy-id
   list then expanded on mount (`policies/page.tsx:600-606`). No injection.
4. `d7e8a3e` **NB-4 auto-prompt vs open modal** — `formModalOpenRef` checked
   first in `checkAutoPrompt`; `autoPromptedRef` marked before `setFormModal`
   so no loops; first-load prompt now fires too (`dashboard/page.tsx:345-389`).
5. `416b094` **build fixes** — unused imports gone, Pay step removed from the
   stepper, retained payment render unreachable (`clientSecret` has no setter).
6. `acbffb3` **NEW-S1 garage directory gate** — `garagePortalGate()` in
   `garages/search` + `garages/[id]`; all garage APIs now inert for Phase 1.
7. `ef094b6` **NEW-S2 email escaping** — `escapeHtml` exported and applied to
   userName/rego/suburb/garageName in admin notifications + firstName in the
   confirmation email. Decline reason also escaped.
8. `11236b2` **forms hardening** — rate limit before body parse
   (`RATE_LIMITS.form` = 16/min, exists), 5-claim cap, signature data-URL
   regex (anchored, length-capped at 500KB **before** the regex — no ReDoS,
   no bypass found), auth-before-existence on POST (404 admin-only).
9. `7597a04` **decline cancels PI + webhook refusal** — best-effort
   `paymentIntents.cancel` on decline; webhook refuses `declined` conversions
   with a manual-refund admin note. Both branches verified. (Residual race the
   other direction — see SF-3 below.)
10. `42eb109` **undo cross-leg guard** — pickup-leg undo 409s once
    `returnDriver.startedAt`; return-start undo is payment-aware; 15-min
    window server-side. (Minor interaction with phone-paid — see M-1.)
11. `42eb109` **duplicate stage email suppression** —
    `suppressCustomerNotifications` supported in `emit-booking-update.ts:89`
    (SSE always emitted first) and applied on all three sub-steps.
12. `a32927d` **ready_for_return label** — dashboard STAGES labelled; tracker
    `STAGE_ALIASES` maps to `service_in_progress` (no more index-0 fallback).
13. `a32927d` **phone-paid stage advance** — mirrors `markServicePaymentPaid`
    incl. the return-started guard; double-mark 409; notify suppressed. No
    email/SMS template exists for `ready_for_return` and `sendBookingStageEmail`
    warns-and-returns on unknown stages, so nothing broken can ever send.
14. `3250a39` **consent on Booking** — `policiesAgreedAt`/`marketingOptIn` in
    the Booking schema and copied at webhook conversion. No consent-free
    conversion path is reachable (legacy paths 410-gated).
15. `3d3a1df` **dashboard range-race** — guard matches the API's actual
    `range.key`; loading/error gated by request currency; chart `rangeKey`
    from fetched data. Delta windows now period-to-date like-for-like
    (month/year capped; week is a rolling window).
16. `da089fb` **bookings list abort** — `useRef` imported, previous controller
    aborted, post-json aborted check, `finally` guarded by controller identity,
    AbortError filtered. (No abort on unmount — cosmetic, see minors.)
17. `2df3115` **drivers Approve via review gate** — row button only opens the
    modal; the sole approve call site sits behind the `reviewConfirmed`
    checkbox; gate + `accountActionMessage` reset per driver.
18. `5217d64`+`b5f9659`+`dabcbac` **PreJobAlert + BookingCard + /pay** —
    safe-area bottom offset, z-40 under z-50 modals, return legs show
    `garageName` (present in the driver GET payload); claim label honest;
    stray "0" dead (`!= null && > 0`); feedback/time-change type guards 400
    instead of 500; `/pay` treats `processing` honestly and 3DS return never
    trusts `redirect_status` alone.

---

> **FIX BATCH 2026-08-30 (same day, after the re-audit below):** LB-A and
> SF-1…SF-6 below are now FIXED in code, plus two skipped-item follow-ups
> (bcrypt-before-status-error ordering in login; modal pickup-unassign now
> auto-clears the return driver). Pay-link expiry implemented as a lazy
> 7-day TTL from token issue (expire-on-use + slot counting excludes stale
> links; admin "Resend Payment Link" revives with a fresh token; webhook
> refuses expired conversions like declined ones). Photo DELETE now
> supersedes instead of hard-deleting (evidence retained). Product call
> still open: whether the pay-link window should also cap at the
> serviceDate rather than a flat 7 days. Run `npm run build` locally before
> pushing — the sandbox can only run `tsc` (clean).

## 🔴 CURRENT LAUNCH BLOCKERS — CODE (all fixed 2026-08-30, see note above)

**LB-A. Photo modal checkpoint-unlock rule contradicts the server gate —
return leg gets stuck.** `PhotoUploadModal.tsx:87-105` requires
front+back+left+right at EVERY checkpoint and locks each checkpoint until all
previous ones satisfy that rule; the SOP/server rule for `service_dropoff` is
**any 1 photo** (`photoRequirements.ts:37-40`), which is exactly what the
driver-card checklist asks for. So on the standard happy path (pickup driver
takes the single drop-off proof photo), `service_pickup` is permanently locked
in the modal (`handleCaptureClick` hard-returns, :284), the return driver
can't upload the 4 photos the `collected_from_workshop` server gate demands
(`driver/jobs/route.ts:660-669`), and the return leg cannot advance. The modal
is the only driver upload UI. Hits **every two-leg booking** unless the pickup
driver over-shoots 4 typed drop-off photos. Pre-existing (not a batch
regression), newly found. Fix: make the modal use
`validateCheckpointPhotos`/`PHOTO_REQUIREMENTS` instead of its private
`REQUIRED_PHOTO_TYPES` (or special-case `service_dropoff` to min-1). While
there: `getCheckpointFromStage("driver_returning")` should point at
`service_pickup`, not `final_delivery` (:274-281).

That is the only hard code blocker. The following are **strongly recommended
before launch** (customer-visible or abuse-vector, but nothing is
functionally stuck):

**SF-1. Internal QA text lands in the customer's stage emails on every
booking.** `collected` and `dropped_at_workshop` push the audit entry LAST
with `stage === currentStage` (`driver/jobs/route.ts:550-555, 596-601`), and
`emit-booking-update.ts:100-102` promotes the latest stage-matching update to
the email's custom message — so every "Car Picked Up" / "Arrived at Garage"
email reads "Photo requirements verified (5/5)… Status advanced to
collected." Swap the push order (audit first, friendly message last) or
exclude driver-authored updates from the customMessage heuristic.

**SF-2. `POST /api/booking-requests` has no rate limit.** Only
`requireValidOrigin` (spoofable Origin header) guards it; it creates a DB doc,
fires an admin notification, and emails an arbitrary attacker-supplied
address — email-bombing / Mailjet-reputation / DB-flood vector on the single
most public endpoint. Add `withRateLimit` like its siblings.

**SF-3. Decline-vs-pay race isn't atomic.** `decline/route.ts:60-85` is
find→check→save; if the webhook converts between, the stale save writes
`declined` over `paid`, the promo release double-spends a genuinely redeemed
code, and the customer is told "You haven't been charged" right after being
charged. Same shape in approve (double-approve kills the first pay link). Use
`findOneAndUpdate` with a status filter. (The webhook side of the race IS
handled — this is the remaining direction.)

**SF-4. Payment links never expire.** `BookingRequest.expiresAt` /
`paymentTokenCreatedAt` are stored but read nowhere (repo-wide grep) — a pay
link works forever, a customer can pay weeks after the serviceDate and the
webhook converts it; approved-but-never-paid requests hold a
`MAX_BOOKINGS_PER_SLOT` seat and their promo code indefinitely. The pay page's
"or has expired" copy promises behaviour that doesn't exist. Add a TTL check
in the pay GET + PI-creation routes and extend the webhook refusal to
`expired` when added.

**SF-5. Admin Edit Booking silently drops vehicle fields.** The modal sends
`vehicleYear`/`vehicleModel` (`BookingDetailModals.tsx:1906-1907`) but the
PATCH handler never applies them (`admin/bookings/[id]/route.ts:238-360`) —
admin sees "updated successfully", edit reverts.

**SF-6. Suspension isn't enforced on most driver endpoints.** Only jobs +
latest-assignment check it. A suspended driver with a live session can still
upload/DELETE custody photos, sign forms, and place masked (Twilio-billed)
calls on assigned bookings until unassigned. Related: photo DELETE hard-deletes
evidence (blob included) at any time, even post-delivery
(`driver/bookings/[id]/photos/route.ts:411-509`) — prefer supersede.

---

## 🟠 SHOULD-FIX (new findings, prioritised — none blocking)

1. **Webhook conversion email is fire-and-forget**
   (`request-payment-webhook/route.ts:365-382`) — on Vercel the lambda can
   freeze before the tracking-code email sends; the same file's sibling route
   awaits for exactly this reason. Await it. Also: concurrent first deliveries
   can double-send it (lost-upsert branch still falls through to the email).
2. **Webhook never compares `paymentIntent.amount` to `quotedAmount`** — admin
   edits the quote while the customer has Elements mounted → stale amount paid
   and converted silently. One `if` + admin note.
3. **Tracker (/track) auto-prompt lacks the NB-4 modal guard** — same
   stomp-the-open-claim-form bug just fixed on the dashboard, still live for
   guests (`track/page.tsx:483-510,593`); also called inside a `setBooking`
   updater (side effect in a pure updater).
4. **BookingCard stage vocabulary is wrong** (`BookingCard.tsx:127-140`) —
   maps stage ids that don't exist, so history cards show raw
   `car_picked_up`/`at_garage`/`ready_for_return`. Same bug class as the fixed
   dashboard chip.
5. **Modal pickup-unassign doesn't auto-clear the return driver**
   (`assign-driver/route.ts:196-226` vs `dispatch/route.ts:442-453`) — ghost
   "Waiting for pickup" job for the return driver; heals on re-assign. This is
   the one real gap in the deliberately-skipped assignment-drift item; port
   the 10-line auto-clear or point the modal at the dispatch route.
6. **`generate_payment` mid-return re-sends the unchanged stage email/SMS**
   (`driver/jobs/route.ts:1140` full notify) on top of the payment email+SMS —
   up to 4 messages for one tap. Suppress like the sub-steps.
7. **Traffic page has the exact race the dashboard fixed** —
   `traffic/page.tsx:84-106`, `periodRef` declared and never read; API even
   returns `period`. One-line guard.
8. **Forms GET still leaks booking existence** (404 before auth,
   `forms/route.ts:397-421`) — POST got the fix; GET needs the same reorder.
9. **Login status errors before bcrypt** (`auth.ts:120-130`) — suspended/
   deleted/unverified messages confirm account state for any garbage password.
   Compare first, then surface status.
10. **Guest photo access is 2-factor** (email+rego, no tracking code —
    `photos/[id]/route.ts:66-74`) and individual photo GETs are unthrottled;
    guest listing also returns superseded photos. Add the code as a third
    factor; that also de-fangs the creds-in-URL skip (below).
11. **Stats range maths in server-local time** while buckets are
    Sydney-time (`admin/stats/route.ts:14-39` vs `:205-210`) — boundary
    hours misattributed; deltas internally consistent. Plus: no zero-fill in
    the revenue chart buckets; week delta compares partial-today vs full week.
12. **Request-creation input hygiene** — no length caps on
    name/phone/address/notes, phone never validated (drives "Call customer"),
    logged-in users' body email trusted over session email; serviceDate not
    validated server-side (past dates accepted; client min-date computed in
    UTC so before ~10-11am AEST "tomorrow" is today).
13. **admin/refund email doesn't escape firstName**
    (`refund/route.ts:141`) — inconsistent with the batch's escaping fix.
14. Minor cluster: undo-after-phone-paid strands stage at `at_garage`
    (cosmetic, admin-only view; M-1); modal auto-expands `final_delivery`
    instead of `service_pickup` at `driver_returning`; driver error banner
    renders at page top (409s can look like silent failures on long lists);
    claim cap has no admin bypass and no stage gating; forms malformed
    JSON/ObjectId → 500 not 400; bookings pipeline truncates silently at 500;
    one-click driver Suspend with no confirm; dispatch unassign icon with no
    confirm; notification bell always routes to /admin/bookings; stale
    approve copy in RequestDetailModal; drivers API loads full collection
    twice; time-change `requestedTime`/`note` reach admin surfaces unescaped
    (admin renders as React text — latent only); `call-customer` lacks
    `requireValidOrigin`; dashboard "Track your car" links to bare /track;
    form-success refetch flashes the full-page spinner; client pickup-form
    stage lists drift from `formRequirements.ts` (no one gets stuck —
    `status === "completed"` catch-all holds).

---

## 🟡 SKIPPED ITEMS — RE-ASSESSED (none rise to launch blocker)

| Skipped item | Verdict |
|---|---|
| Assignment endpoint drift (S-4 carryover) | **Not a blocker.** isActive/metrics/SSE gaps are immaterial in practice (dropdown pre-filtered, capacity counts from Bookings, driver polls). The return-driver auto-clear gap is real → SHOULD-FIX 5. |
| Per-IP login throttle (NEW-S5) | **Not a blocker** for a launch-day credential corpus (bcrypt 12, email-keyed 5/min, registration throttled). Add a loose `login-ip:` bucket (~5 lines) before real users accumulate. See also SF-item 9 (ordering). |
| Rate-limiter TTL index fire-and-forget (NEW-S6) | **Not a code blocker.** Fail path retries; worst case is slow doc growth. Neutralised by the ops checklist item (create the index manually in Atlas). |
| Guest email+rego in GET query params (photos/stream) | **Not a blocker.** No Referer/history leakage beyond logs; email+rego is a weak secret regardless. Real gap is the missing 3rd factor (SHOULD-FIX 10); fix together. |
| Analytics `collect` origin check / fallback salt | Unchanged, minor. Junk-data vector only. |
| `auth/verify` code-only fallback | **Fine.** No session issued on code-only path; 5/min throttle; worst case a third party flips `emailVerified`. Retire when old links age out. |
| First-load auto-prompt never fires | **Actually fixed** in the batch (`d7e8a3e`). |
| Collapsed filter bars keyboard-focusable | Accessibility polish, not a blocker. |
| Feedback/time-change non-string 500s | **Actually fixed** in the batch (`dabcbac`). |
| `/pay` processing-as-success | **Actually fixed** in the batch (`dabcbac`). |

---

## ✅ VERIFIED SOLID THIS PASS (no action)

Amount integrity end-to-end (client sends only `{token}`; PI amount from DB;
re-synced on refetch; <50c refuses; promo capped 99%; admin quote edits
bounded); promo lifecycle atomic (active→used claim, release on decline by
usage-ref only, failed-submission release); webhook signature verification +
triple idempotency + declined refusal; 3DS return verified via PI retrieve;
consent chain end-to-end incl. copy at conversion, no consent-free path;
STRIPE_TEST_MODE double-gated on Vercel; all 44 `/api/admin/**` handlers
admin-checked (one intentional widening: drivers fetching own documents);
signed-forms viewer XSS escaping intact, signatures whitelisted to image
data-URLs; no `dangerouslySetInnerHTML` outside static JSON-LD; refund cap
server-side; users/drivers destructive actions gated (typed DELETE, reason
required, self/admin protections); dispatch board atomic assigns + return
auto-clear + in-progress unassign blocks; driver photo/forms/call routes all
assignment-checked; no form-gating deadlock (pickup signable from
`driver_en_route`, return stable through the return leg, `completed`
catch-all); PreJobAlert window maths incl. DST, suspension silence, z-order;
rate limiter race-safe atomic windows, sensible fail-open; forgot/reset
password (hashed single-use token, 1h TTL, generic responses); suspension at
login + every-session re-check; track endpoint 3-factor with response
allow-list; tracking codes 31^6 crypto-random; contact form throttled +
escaped; `tsc --noEmit` clean.

---

## ⚠️ MUST FIX BEFORE PHASE 2 (garage portal re-enable checklist)

Unchanged from 2026-08-06 — see `src/lib/garagePortal.ts` for the in-code
copy. Do not enable `NEXT_PUBLIC_ENABLE_GARAGE_PORTAL` until cleared:

1. Cross-garage booking seizure via " - " name normalisation
   (`garage/acknowledge-booking`) — require placeId equality.
2. Garage data over-sharing: `garage/bookings`, `garage/bookings/[id]`,
   `garage/dashboard/incoming` return full booking documents (customer
   email/phone/address, payment fields) with no projection.
3. Legacy `garage/booking-action` still writes top-level `status:"completed"`.
4. Garage "Start Service" pulls un-dispatched bookings off the dispatch board
   and voids the customer's cancellation window.
5. Garage analytics vs stats count "completed" on different fields.
6. Quote units migration (dollars→cents), quote-request projection gaps,
   unimplemented contacts-on-accept flow.

---

## 🔧 OPS / ENV LAUNCH CHECKLIST

| Var | Required | Notes |
|---|---|---|
| `MONGODB_URI` | YES | **Swap to the new Atlas URI** |
| `NEXTAUTH_SECRET` / `NEXTAUTH_URL` | YES | URL = https://drivlet.com.au |
| `STRIPE_SECRET_KEY` / `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | YES | live keys |
| `STRIPE_WEBHOOK_SECRET` | YES | main webhook |
| `STRIPE_REQUEST_WEBHOOK_SECRET` | YES | falls back to main secret, but set it |
| `STRIPE_SERVICE_PAYMENT_WEBHOOK_SECRET` | Recommended | falls back to main |
| `STRIPE_TEST_MODE` / `STRIPE_TEST_MODE_ALLOW_PRODUCTION` | **MUST NOT EXIST** | $1 override (all Vercel envs guarded) |
| `ENABLE_LEGACY_DIRECT_BOOKING` | MUST NOT EXIST | re-opens retired booking paths |
| `NEXT_PUBLIC_ENABLE_GARAGE_PORTAL` | MUST NOT EXIST / false | Phase 2 gate |
| `NEXT_PUBLIC_ENABLE_*` marketplace flags (x4) | Leave unset | build-time |
| `MAILJET_API_KEY` / `MAILJET_SECRET_KEY` / `EMAIL_FROM` | YES | sender verified in Mailjet |
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_PHONE_NUMBER` | YES | |
| `APP_URL` + `NEXT_PUBLIC_APP_URL` | YES | prod falls back to drivlet.com.au, still set them |
| `BLOB_READ_WRITE_TOKEN` | YES | via Blob store connection |
| `AUTOGRAB_API_KEY` / `CRON_SECRET` / `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | YES | |
| `NEXT_PUBLIC_GA_ID` | Recommended | build-time — set before the prod build |
| `ADMIN_NOTIFICATION_EMAIL` / `ANALYTICS_ADMIN_EMAILS` | Optional | default support@; analytics page needs the allow-list |

**Stripe Dashboard — register all four webhooks**: `/api/stripe/webhook`,
`/api/stripe/request-payment-webhook`, `/api/stripe/service-payment-webhook`,
and the subscription webhook (only needed when garage subs launch, but the
registration list should be decided now).

**Ops one-offs**:
- Create the `ratelimits` TTL index manually in Atlas:
  `db.ratelimits.createIndex({expiresAt:1},{expireAfterSeconds:0})`.
- **Test data purge** in the prod DB: `driver@a.com`, `ABC123` test bookings,
  `test@example.com` / `TEST123` seed leftovers, any test promo codes.
- **Replace the fake 1300 number** — it appears in ~15 source files
  (contact, footer, policies, booking success, claim form, track, etc.);
  this is a code find/replace once the real number exists, plan it as a
  commit, not a config change.
- Run `npm run build` locally before every push (sandbox can't).
- Consider re-uploading any driver documents submitted before the blob fix
  (their old public URLs remain live).

---

## 📋 DEFINITIVE CURRENT LAUNCH BLOCKER LIST (2026-08-30)

**Code blockers (must fix):**
1. **LB-A** — PhotoUploadModal checkpoint lock strands the return leg
   (`PhotoUploadModal.tsx:87-105` vs `photoRequirements.ts:37-40`).

**Code, strongly recommended before launch (customer-visible / abuse vectors):**
2. SF-1 internal QA text in every customer stage email.
3. SF-2 rate-limit `POST /api/booking-requests`.
4. SF-3 atomic status transitions on decline/approve.
5. SF-4 pay-link expiry (slots + promos held forever).
6. SF-5 Edit Booking vehicle fields no-op.
7. SF-6 suspension enforcement on driver photo/forms/call endpoints.

**Ops/env (must complete):**
- MongoDB Atlas URI swap; `STRIPE_REQUEST_WEBHOOK_SECRET`; `APP_URL` +
  `NEXT_PUBLIC_APP_URL`; four Stripe webhook registrations; delete
  `STRIPE_TEST_MODE` (+`_ALLOW_PRODUCTION`) everywhere; `ratelimits` TTL
  index in Atlas; test data/account purge (`driver@a.com`, `ABC123`,
  `test@example.com`/`TEST123`); replace the fake 1300 number (code
  find/replace, ~15 files); set `NEXT_PUBLIC_GA_ID` before the prod build;
  `npm run build` locally before push.
