#!/bin/bash
# Launch batch 2026-09-11 — 12 grouped commits, no push. Run on the Mac:
#   cd ~/Documents/GitHub/blank-slate-dev/drivlet && bash commit-launch-batch.sh
# Also de-indexes the customer photos and deletes the debug email route.
# Deletes itself (and the superseded pass-3 script) when done.
set -euo pipefail
cd "$(dirname "$0")"
rm -f .git/index.lock
git reset >/dev/null

# C1 — content blockers
git add src/components/seo/JsonLd.tsx src/components/homepage/HeroSection.tsx \
  src/app/opengraph-image.tsx src/components/homepage/TestimonialsSection.tsx \
  src/lib/seedTestimonials.ts src/components/homepage/ValuePropsSection.tsx
git commit -m "Content: remove all fabricated ratings, ride counts and fictional testimonials (ACCC risk) — section hides until real reviews exist"

# C2 — refund policy alignment
git add src/lib/policy.ts src/app/policies/page.tsx src/components/homepage/FAQSection.tsx
git commit -m "Policy: unify all refund copy on the implemented 24h-full/50%-late scheme (dated decision note in policy.ts — confirm or change WITH refund-calculator)"

# C3 — email/SMS truthfulness + contacts + Reply-To
git add src/lib/email.ts src/lib/sms.ts src/app/driver/pending/page.tsx \
  src/app/garage/pending/page.tsx src/app/garage/subscription/success/page.tsx \
  src/app/garage/subscription/cancelled/page.tsx \
  "src/app/api/admin/bookings/[id]/refund/route.ts"
git commit -m "Email/SMS: truthful payment-link copy (no 'service complete'/withholding claims), Mailjet ReplyTo, real 1300 number + .com.au addresses, escape refund email name, remove dead en-route SMS"

# C4 — repo hygiene + dependency patches
git rm -r --cached uploads >/dev/null
git rm -r src/app/api/debug >/dev/null
git add .gitignore package-lock.json
git commit -m "Hygiene: gitignore + de-index customer vehicle photos (history scrub separate); remove TEMPORARY debug email route; patch all 21 npm vulns lockfile-only (next 16.3.4, next-auth 4.24.15, mongoose 9.10.0, axios 1.20.0)"

# C5 — money reconciliation
git add src/lib/servicePayment.ts src/lib/stripe-refund.ts \
  "src/app/api/bookings/[id]/confirm-service-payment/route.ts" \
  src/app/api/stripe/webhook/route.ts
git commit -m "Money: refunded service payment can no longer flip back to paid; charge.refunded webhook reconciliation (refundId-deduped); Stripe refund idempotency keys"

# C6 — quote APIs Phase-1 gate
git add src/lib/quoteSystem.ts src/app/api/quotes
git commit -m "Security: Phase-1 gate all quote APIs (quoteSystemGate) + rate-limit request/track — were live, unauthenticated and unthrottled"

# C7 — updatedBy leak
git add src/app/api/bookings/track/route.ts "src/app/api/bookings/[id]/stream/route.ts" \
  src/lib/emit-booking-update.ts src/lib/booking-events.ts
git commit -m "Security: scrub updatedBy (staff emails / raw ObjectIds) from guest tracker + SSE payloads"

# C8 — driver jobs route: BA-1 completion + checkout expiry
git add src/app/api/driver/jobs/route.ts
git commit -m "Driver API: order/replay guards on start_pickup/arrived_pickup/start_return (completed bookings can't regress); mark_paid_phone expires the live Checkout session"

# C9 — Users-page suspend/delete syncs dispatchability
git add "src/app/api/admin/users/[id]/route.ts"
git commit -m "Admin: Users-page suspend/delete now clears Driver.canAcceptJobs (reactivate restores only when onboarded) — suspended drivers were still dispatchable"

# C10 — revival edges
git add "src/app/api/admin/booking-requests/[id]/route.ts" \
  "src/app/api/admin/booking-requests/[id]/decline/route.ts" \
  "src/app/api/admin/booking-requests/[id]/send-payment-link/route.ts" \
  src/components/admin/RequestDetailModal.tsx
git commit -m "Admin: expired requests are editable/declinable (no more revive-409 dead-end); resend slot re-check keys on TTL not status; promo re-claim recovers own prior claim; token saved before emailing"

# C11 — SEO + a11y
git add src/app/robots.ts src/app/track/layout.tsx src/app/policies/layout.tsx \
  src/app/driver/join/layout.tsx src/app/not-found.tsx \
  "src/app/[city]/page.tsx" "src/app/[city]/[suburb]/page.tsx" \
  src/app/booking/page.tsx
git commit -m "SEO/a11y: per-page canonicals (/track,/policies,/driver/join), robots /pay/, branded 404, [city] prototype-key 404s, booking wizard label associations + aria-labels"

# C12 — docs (includes the still-uncommitted pass-3/4 addenda)
git add PRE_LAUNCH_AUDIT.md
git commit -m "Docs: audit passes 3+4 + launch batch 2026-09-11 addendum"

git log --oneline -13
echo
echo "12 commits made. NOT pushed."
echo "NEXT: npm ci && npm run build   (deps changed: next/next-auth/mongoose/axios)"
echo "THEN: git history scrub for uploads/ (see PRE_LAUNCH_AUDIT.md / Claude's checklist)"
rm -f commit-audit-pass3.sh
rm -- "$0"
