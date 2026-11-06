# Commerce and financial audit

**Integration INCOMPLETE. No actual Stripe financial certification.** No live payments, production financial records, existing credit ledger, commission policy or Supabase data were changed by this audit.

The existing policy remains ** 10% on eligible completed physical-product item amounts**, with line-level rounding and cumulative refunds. Shipping, taxes, processor fees and services are separate accounting categories. Never treat an account balance (including a user-reported $97) as evidence of earned commission.

The isolated test suite covers server-owned pricing, hosted onboarding/checkout account binding, separate charge/merchant transfers, partial fulfillment, held unfulfilled amounts, authenticated test-only operations, signed timestamp-bounded webhooks, duplicates/concurrency, lost responses, partial/full refunds, disputes, immutable balanced journal postings and reconciliation rejection. See [payment regression report](../../payments/PAYMENT_REGRESSION_REPORT.md) and [captured fixture](../../application-preview/stripe-test-fixture-report.json). Synthetic IDs/fees in that fixture are explicitly test doubles; they are not Stripe API evidence.

Actual platform/account capability checks, onboarding links, PaymentIntent/charge/transfer/balance transaction IDs, actual processing fees and external reconciliation remain **BLOCKED** by unconfigured credentials and unverified connectivity/merchant supply. No real provider API calls were made during this audit. Stripe Connect country/settlement eligibility and merchant agreements require verification before relevant operations. Peach is not activated.

G0-003:0009 is expressly a disposable sandbox-only migration and refuses non-\_test database names. Its place in the canonical migration chain prevents treating the latest branch as Supabase-ready. Defer sandbox consolidation until maintainers approve an isolated migration/runtime layout. Preserve guards and all existing financial behavior. No financial fix was made under this audit.

Before sign-off require actual Stripe test payment success/decline, duplicated signed deliveries, refund/reversal and dispute evidence; exact gross/fee/net balance transaction attribution; merchant-by-merchant transfers and held balances; and a zero unexplained reconciliation gap. A passing mock test alone does not satisfy this.
