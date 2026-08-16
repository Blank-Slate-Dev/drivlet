# Drivlet Pre-Launch Audit

**Re-audited 2026-08-16** (original audit 2026-08-02). Scope of the re-audit:
full flow regression, interactions between the ~30 commits landed since the
first audit, bug hunt in the redesigned UI, security re-check of every new
surface. Read-only — findings below, no fixes applied yet.

## ✅ ORIGINAL LAUNCH BLOCKERS — ALL 8 FIXED (verified in re-audit)

1. Return-driver photo/call access — fixed `f56f395`, verified.
2. Legacy booking paths — 410-gated `8a078af` (+ webhook branches disabled), verified.
3. Public blob PII — proxied + unguessable `c6b8527`, verified. Residual: Vercel
   Blob is public-only, so URLs that leaked BEFORE the fix stay live until
   re-uploaded (documented limitation).
4. Rate limiter — Mongo-backed `1263a29`, all 21 call sites await, verified.
5. Login throttle + uniform errors `9d0079b` — PARTIAL: email-keyed only, see
   NEW-S5 (add a per-IP key).
6. review-info lockdown `a63b498`, verified.
7. Form-viewer XSS escaped `69540c6`, verified.
8. Env hardening `c4a7bb6` — code side done; ops actions remain in the checklist.

Garage portal fully inert for Phase 1 (`4152db4`, `aefebdb`, `b054940`):
all 19 `/api/garage/**` files gated (verified handler-by-handler), pages
proxy-blocked, admin sections hidden. Exception found: see NEW-S1.

---

## 🔴 NEW LAUNCH BLOCKERS (re-audit 2026-08-16)

**NB-1. `generate_payment` stage rewrite deadlocks the return leg against the
new form gating.** `driver/jobs/route.ts:1087` still unconditionally sets
`currentStage = "service_in_progress"`. New interaction: the forms POST now
enforces `RETURN_SIGNABLE_STAGES = [driver_returning, delivered]` for
EVERYONE. Return driver at the customer's door → customer can't pay by phone →
driver generates the backup link (supported at any stage) → stage regresses →
return-confirmation form 409s for driver AND customer → `delivered` is gated
on that form → job cannot be completed (paying only advances to
`ready_for_return`, still not signable). Fix: only set the stage from
`at_garage`/`service_in_progress`, never when `returnDriver.startedAt` exists
(same guard `servicePayment.ts` already uses). Was SF-3; now upgraded.

**NB-2. Admin sidebar nav can't scroll — bottom items unreachable.**
`admin/layout.tsx:356` (desktop) and `:470` (mobile drawer): neither nav has
`overflow-y-auto`; with the greeting card + traffic footer card, Promo Codes /
Inquiries / Testimonials / Traffic clip off short screens with no way to reach
them. Fix: `overflow-y-auto` on both navs.

**NB-3. Consent policy links land on collapsed cards.** The booking flow's
consent checkboxes link to `/policies#terms` etc. (`booking/page.tsx:837+`),
but the policies page ignores `location.hash` — customers arrive at a card
whose content is hidden. Consent links must actually show the policy. Fix:
on-mount, read the hash and call `scrollToPolicy(id)`.

**NB-4. Polling auto-prompt stomps an open form modal (data loss).**
`dashboard/page.tsx:374,350-351`: every 30s poll can `setFormModal(...)` while
the customer is mid-way through another form (e.g. a claim) — their input is
silently replaced. Fix: skip auto-prompt while a form modal is open.

---

## 🟠 SHOULD-FIX (new + carryovers, prioritised)

### Flow / correctness
1. **Declined request can still convert + promo double-spend** (carryover S-1,
   worse with promos): decline never cancels the Stripe PI; webhook doesn't
   check `declined`; released promo code redeemable twice. Fix: cancel PI on
   decline; webhook refuses declined conversions.
2. **`undo_last` across the leg boundary** (carryover S-7/S-2): pickup-leg undo
   of `dropped_at_workshop` not blocked when the return leg has started.
3. **Duplicate stage emails/SMS** on `arrived_pickup`, `collected_from_workshop`,
   `delivering` (`driver/jobs/route.ts:499,688,713`) — pass
   `suppressCustomerNotifications`.
4. **Assignment endpoints drift** (carryover S-6): modal route skips
   `driver.isActive`, job metrics, SSE, and doesn't auto-clear the return
   driver on pickup-unassign. Extract one shared helper.
5. **`ready_for_return` raw/invisible on customer surfaces** (carryover S-5):
   tracker shows "Booking Confirmed" at 85%; dashboard chip shows the raw id.
   `mark_paid_phone` also doesn't advance the stage like the Stripe path.
6. **Consent not copied to Booking** (carryover): `policiesAgreedAt` /
   `marketingOptIn` live only on the BookingRequest.
7. **Dashboard stats race + chart label mismatch**: no abort on range switch
   (`admin/dashboard/page.tsx:272-294`) and `rangeKey={range}` uses UI state
   instead of the fetched `r.key` (`:453`) — wrong labels mid-switch.
8. **Month/year hero delta compares period-to-date vs FULL previous period**
   (`stats/route.ts:28-30`) — reads as a fake drop early in the period.
9. **Bookings list fetch race** on debounced search (no abort,
   `admin/bookings/page.tsx:213-260`).
10. **Drivers table row Approve bypasses the review-confirmation gate**
    (`admin/drivers/page.tsx:647`) — route through the modal.
11. **Customer can't VIEW a lodged claim** (`BookingCard.tsx:410` says
    "View / New Claim" but only opens a new claim; viewer supports
    pickup/return only). Rename or extend the viewer.
12. **First-load auto-prompt never fires** (poll-only); **stray "0"** rendered
    when `paymentAmount === 0` (`BookingCard.tsx:434`); **`accountActionMessage`
    leaks between driver modals** (`admin/drivers/page.tsx:203`).
13. **PreJobAlert positioning**: chip collides with the driver bottom nav on
    iPhones (`bottom-20` vs nav + safe-area ≈ 90px) and `z-[60]` sits above
    open form modals. Return-leg alert shows the customer's suburb next to
    "collect from the workshop" wording.
14. **Booking page unused imports** (`Building`, `Lock`, `Sparkles`,
    `SERVICE_CATEGORIES`, `getCategoryById`, `setClientSecret`,
    `setPaymentIntentId`) — will trip `next build` lint. **Stepper still shows
    the unreachable "Pay" step.**
15. **Collapsed filter bars keep controls keyboard-focusable** (all expandable
    bars + AccountSection + policies): add `inert`/`aria-hidden` when closed.

### Security (new surfaces)
NEW-S1. **`/api/garages/search` + `/api/garages/[id]` missed the Phase-1 gate**
— public, unthrottled, unbounded aggregation; nothing in Phase 1 uses them.
Fix: one-line `garagePortalGate()` in each.
NEW-S2. **Unescaped `userName`/`garageName` in admin notification email HTML**
(`notifications.ts:315-319`) — HTML injection into admin inbox. Escape both
(+ `firstName` in `requestConfirmationEmail.ts:84`).
NEW-S3. **Forms POST: no rate limit; `claim_lodgement` unlimited per booking;
signature data-URLs unvalidated at write** — storage bloat/archive spam
vector for verified guests. Add `withRateLimit` + claim cap + write-time
signature pattern check.
NEW-S4. **Forms POST booking-existence oracle** — 404 before auth. Auth first.
NEW-S5. **Login throttle email-only** — password spray across emails is
globally unthrottled; add a looser per-IP key.
NEW-S6. **Rate-limiter TTL index fire-and-forget** — if createIndex fails,
`ratelimits` grows unbounded. Create in deploy script or add delete fallback.

### Still open from the first audit (unchanged)
- Analytics `collect`: no origin/same-site check; fallback salt string still
  present.
- Guest email+rego in GET query params (`photos/[id]`, stream).
- `/pay` treats PI `processing` as full success — show a "processing" state.
- `auth/verify` code-only fallback (throttled, no session issued — retire
  when old links age out).
- Non-string body 500s in feedback/time-change routes.
- Garage data over-sharing + all other MUST-FIX-BEFORE-PHASE-2 items (below) —
  neutralised for launch by the portal gate, NOT fixed.

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

## VERIFIED SOLID IN RE-AUDIT (no action)

Leg-gated forms × driver flow (driver signs at the right sub-stages; undo
preserves forms; auto-prompts are subsets of signable stages — no 409s);
manual workshop entry end to end (sanitised, placeId nulled, auto-assign
skipped, distance identical, admin badges everywhere, no garage-account
assumptions downstream); promo → approve → pay → decline-release (modulo
should-fix 1); 3DS verify + already-paid + webhook idempotency + phone-paid
propagation; suspension enforcement incl. PreJobAlert silence; PreJobAlert
timezone maths; forms-archive grouped aggregate (escaped regex, capped,
admin-only); stats `?range` whitelisted; blob proxies (no SSRF — cloudUrl is
never client-supplied); dispatch tile state across refetches; `?view=` deep
link; all expandable filter bars' logic; type-check clean.

---

## VERCEL PRODUCTION ENV CHECKLIST (updated)

| Var | Required | Notes |
|---|---|---|
| `MONGODB_URI` | YES | New Atlas URI |
| `NEXTAUTH_SECRET` / `NEXTAUTH_URL` | YES | URL = https://drivlet.com.au |
| `STRIPE_SECRET_KEY` / `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | YES | live keys |
| `STRIPE_WEBHOOK_SECRET` | YES | main webhook |
| `STRIPE_REQUEST_WEBHOOK_SECRET` | YES | falls back to main secret now, but set it |
| `STRIPE_SERVICE_PAYMENT_WEBHOOK_SECRET` | Recommended | falls back to main |
| `STRIPE_TEST_MODE` / `STRIPE_TEST_MODE_ALLOW_PRODUCTION` | MUST NOT EXIST | $1 override (all Vercel envs guarded) |
| `ENABLE_LEGACY_DIRECT_BOOKING` | MUST NOT EXIST | re-opens retired booking paths |
| `NEXT_PUBLIC_ENABLE_GARAGE_PORTAL` | MUST NOT EXIST / false | Phase 2 gate |
| `NEXT_PUBLIC_ENABLE_*` marketplace flags (x4) | Leave unset | build-time |
| `MAILJET_API_KEY` / `MAILJET_SECRET_KEY` / `EMAIL_FROM` | YES | sender verified in Mailjet |
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_PHONE_NUMBER` | YES | |
| `APP_URL` + `NEXT_PUBLIC_APP_URL` | YES | prod falls back to drivlet.com.au now, still set them |
| `BLOB_READ_WRITE_TOKEN` | YES | via Blob store connection |
| `AUTOGRAB_API_KEY` / `CRON_SECRET` / `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | YES | |
| `NEXT_PUBLIC_GA_ID` | Recommended | build-time |
| `ADMIN_NOTIFICATION_EMAIL` / `ANALYTICS_ADMIN_EMAILS` | Optional | default support@ |

**Stripe Dashboard**: register `/api/stripe/webhook`,
`/api/stripe/request-payment-webhook`, `/api/stripe/service-payment-webhook`
(+ subscription webhook only when garage subs launch).

**Ops one-offs**: run `npm run build` locally before every push (sandbox
can't); create the `ratelimits` TTL index manually in Atlas
(`db.ratelimits.createIndex({expiresAt:1},{expireAfterSeconds:0})`) so
NEW-S6 can't bite; check prod DB for `test@example.com`/`TEST123` seed
leftovers; consider re-uploading any driver documents submitted before the
blob fix (their old URLs remain public).
