#!/bin/bash
# Commit the pass-3 + pass-4 audit verdicts (doc only). Run on the Mac:
#   cd ~/Documents/GitHub/blank-slate-dev/drivlet && bash commit-audit-pass3.sh
# 1 commit, no push, deletes itself.
set -euo pipefail
cd "$(dirname "$0")"
rm -f .git/index.lock
git reset >/dev/null
git add PRE_LAUNCH_AUDIT.md
git commit -m "Docs: audit passes 3+4 — code flows clean; pass 4 finds content/legal/data launch blockers (fake reviews, contradictory refund policy, false payment copy, placeholder contacts, committed customer photos, dep vulns)"
git log --oneline -2
rm -- "$0"
