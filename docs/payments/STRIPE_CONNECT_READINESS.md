# Stripe Connect readiness

6 November 2026, Africa/Johannesburg. **INCOMPLETE — actual Stripe financial verification is blocked.**

The user reports one enabled US test connected account with active cards/payouts. The two uploaded briefs report Zanzu Technologies Inc.'s US EIN, Stripe and Mercury availability. These are user reports, not independently authenticated API findings. Active `transfers` capability, exact account bindings and actual separate-charge/transfer support must also be verified.

## Current evidence

- [Actual-provider report](../application-preview/stripe-test-actual-report.json): NOT CONFIGURED; no actual PaymentIntent, Charge, Transfer or balance-transaction IDs, actual fees or actual reconciliation are available. No Stripe API call, onboarding link, payment, refund, dispute or transfer was executed against Stripe in this environment.
- [Isolated financial report](../application-preview/stripe-test-fixture-report.json): real PostgreSQL journal/posting behavior with explicitly synthetic Stripe objects and fees. It is not actual Stripe evidence.
- [Regression report](PAYMENT_REGRESSION_REPORT.md), [architecture](PAYMENT_ARCHITECTURE.md), [country matrix](COUNTRY_ELIGIBILITY_MATRIX.md), [onboarding matrix](MERCHANT_ONBOARDING_MATRIX.md), [flow](MARKETPLACE_PAYMENT_FLOW.md).

## Configuration requirements

Configure test secrets through secure environment settings, never this chat or source control:

| Name | Use |
|---|---|
| `STRIPE_SECRET_KEY` | Server only; `sk_test_` or supported restricted test key. Live keys fail closed |
| `STRIPE_WEBHOOK_SECRET` | Actual test endpoint's signing secret; used locally for signature verification, never sent to Stripe |
| `STRIPE_ACCOUNT_ID` | Exact platform account ID for Zanzu's test API scope |
| `STRIPE_TEST_CONNECTED_ACCOUNT_ID` | Existing US test merchant account |
| `STRIPE_TEST_ADDITIONAL_CONNECTED_ACCOUNT_IDS` | Additional distinct, verified US test accounts; two merchants are necessary for actual multi-merchant acceptance |
| `STRIPE_TEST_DATABASE_URL` | Persistent local PostgreSQL `glam_stripe_sandbox_test`; keep it different from disposable regression `glam_test` |
| `STRIPE_TEST_RETURN_URL` / `STRIPE_TEST_REFRESH_URL` | Explicit approved HTTPS application URLs; never considered payment/onboarding success proof |
| `STRIPE_PUBLISHABLE_KEY` | Optional public test client setting; no server secret in the browser |
| `STRIPE_CONNECT_CLIENT_ID` | Not used by the implemented Account Links flow; only if an approved OAuth flow later requires it |

[Blank example](../../deploy/stripe-test/.env.example). No environment secret values were created or changed. No Mercury credentials or production Supabase configuration is needed or permitted.

Network policy currently lacks Stripe access. A draft for **api.stripe.com** and **docs.stripe.com** was saved through the supported environment configuration tool; it is **not applied**. Review/save the changes in environment settings, then publish the environment. The [cloud-environment runtime skill](skill://plugin_connector_1p_c5b7d5df5d7081918f2c4be5a633ed5d/cloud-environment-runtime/SKILL.md) states: “Configuration changes require the environment configuration workflow and its user review.” No network/proxy/TLS bypass was attempted. A saved draft is not connectivity evidence.

## Operator runbook

Use separate persistent local sandbox and disposable regression databases. Applying canonical `0009_stripe_test_ledger` is authorized here only for a deliberately selected `_test` database. It rejects non-test destinations; it must not be applied to production under this test authorization.

```sh
# Safe configuration inventory; no outbound calls, no credential values.
UV_CACHE_DIR=/tmp/glam-ui-uv-cache uv run python scripts/stripe_test.py readiness

# After secure configuration and published network access: read-only authenticated verification.
UV_CACHE_DIR=/tmp/glam-ui-uv-cache uv run python scripts/stripe_test.py probe

# Only after a separate local persistent sandbox is created and the test-only schema is selected.
# Do not substitute GLAM's production/default database URL.
GLAM_DATABASE_URL="$STRIPE_TEST_DATABASE_URL" uv run alembic upgrade head

# Stable run UUID is chosen once and retained for retries. This performs Stripe TEST writes only.
uv run python scripts/stripe_test.py exercise --confirm-test-only --run-id YOUR_STABLE_RUN_UUID

# Re-fetch actual balance transactions, refunds, transfers/reversals and dispute evidence.
uv run python scripts/stripe_test.py reconcile --order-id YOUR_SANDBOX_ORDER_UUID

# Optional separate API: existing authentication required, no development-auth bypass.
uv run uvicorn glam_api.payments.app:create_app --factory --host 127.0.0.1 --port 8010 --no-access-log
```

`exercise` uses synthetic physical merchandise and actual test PaymentIntent test methods after configuration. It checks success, decline, duplicate transfer prevention, two-merchant allocation, partial/full refund and reconciliation using actual Stripe object IDs and balance fees. It remains **a subset**, not a completion claim: actual dispute generation/withdrawal/reinstatement and provider-signed webhook delivery require additional real evidence. A Stripe testing card/event must actually produce the dispute and its balance transactions; creating a local sample webhook does not prove it.

Absent credentials must not be replaced with fixture IDs in the actual report. Missing/changed balance evidence, unallocated refunds, ambiguous operations older than 23 hours, restricted recipients, unsupported markets, partial captures or unresolved merchant recovery stop acceptance. Live financial tests and release gates have not passed.
