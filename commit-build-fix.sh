#!/bin/bash
# Build fix (mongoose 9.10 typings) + the cleanup steps that were skipped
# when the launch batch was committed by hand as 37d2c6d "fixes".
# ⚠️ Do NOT run the old commit-launch-batch.sh / commit-audit-pass3.sh —
# their work is already committed; this script removes them.
# Run:  cd ~/Documents/GitHub/blank-slate-dev/drivlet && bash commit-build-fix.sh
set -euo pipefail
cd "$(dirname "$0")"
rm -f .git/index.lock
git reset >/dev/null

# 1 — mongoose 9.10 typing fixes (the Vercel TS2769 failures)
git add src/app/api/bookings/slot-availability/route.ts \
  "src/app/api/garage/dashboard/incoming/route.ts" \
  src/app/api/reviews/route.ts src/lib/slotCapacity.ts
git commit -m "Fix build: mongoose 9.10 stricter query typings — as-const literal unions for \$in/status filters, FilterQuery renamed to QueryFilter"

# 2 — cleanup the hand-made commit skipped: de-index customer photos,
#     delete debug route, remove the now-committed helper scripts
git rm -r --cached uploads >/dev/null
git rm -r src/app/api/debug >/dev/null
git rm commit-launch-batch.sh commit-audit-pass3.sh >/dev/null
git commit -m "Hygiene: de-index customer vehicle photos (history scrub still pending), remove TEMPORARY debug email route + committed helper scripts"

git log --oneline -3
echo
echo "Done. NOT pushed. Next: npm ci && npm run build, then push."
echo "REMINDER: the 12 customer photos are in git history on GitHub — run the"
echo "filter-repo scrub + force-push from the external checklist."
rm -- "$0"
