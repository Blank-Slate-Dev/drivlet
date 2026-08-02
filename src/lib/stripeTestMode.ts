// src/lib/stripeTestMode.ts
// Single decision point for the $1 test-charge override.
//
// STRIPE_TEST_MODE=true makes the payment-intent routes charge $1.00 instead
// of the real price — useful for end-to-end testing. In PRODUCTION this is
// ignored unless STRIPE_TEST_MODE_ALLOW_PRODUCTION=true is ALSO set, so a
// forgotten env var can never silently undercharge real customers
// (2026-07-25: live site was charging $1 because the flag was left on).
export function isStripeTestModeActive(): boolean {
  if (process.env.STRIPE_TEST_MODE !== "true") return false;

  // Guard ALL Vercel deployments, not just production: preview deploys share
  // the same Stripe keys, so a forgotten flag there also charged $1
  // (extended 2026-08-02, pre-launch audit LB-8). Local dev is unaffected.
  const isDeployed = !!process.env.VERCEL;
  if (isDeployed && process.env.STRIPE_TEST_MODE_ALLOW_PRODUCTION !== "true") {
    console.warn(
      "[stripe] STRIPE_TEST_MODE is set but IGNORED on Vercel deployments. " +
        "For a deliberate live $1 test, also set STRIPE_TEST_MODE_ALLOW_PRODUCTION=true (and remove it straight after)."
    );
    return false;
  }
  return true;
}
