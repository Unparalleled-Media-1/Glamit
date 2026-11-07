# GLAM AI payment architecture — Stripe test sandbox

6 November 2026, Africa/Johannesburg. **Test implementation; actual Stripe acceptance INCOMPLETE.**

The central executable legal-entity configuration is `glam_api.payments.config.LEGAL_ENTITY`: GLAM AI is operated by **Zanzu Technologies Inc., Delaware, United States**. EIN, Stripe account and Mercury account availability are user-reported. No EIN, bank login, raw card data or sensitive bank details are stored here. A Delaware company does not establish universal Merchant of Record or global payout eligibility.

The user authorized Stripe Connect test integration and an immutable test ledger without changing existing production financial records. This explicitly extends the earlier payment-preparation gate for **test mode only**. Existing `commerce_policy.py`, credit ledger, authentication, original migrations and production data are untouched. New code lives under `glam_api.payments`; the original API does not mount it.

## Account and mode boundaries

- Credentials come only from environment secrets. `sk_live_`/`rk_live_` and all objects with `livemode:true` are rejected. Account/BalanceTransaction/Reversal objects that lack a mode flag are bound to the configured test API/platform and verified test Charge/Transfer objects.
- Verify `GET /v1/account` matches `STRIPE_ACCOUNT_ID`, US country and enabled platform charges. Independently retrieve each allowlisted connected account and require US, enabled charges/payouts, and active **card_payments AND transfers**. Dashboard card/payout indicators do not prove transfer capability.
- Only US→US/USD is a sandbox candidate. Actual test transfers must succeed before claiming eligibility. Other country/currency combinations default-deny pending documented Connect/cross-border/FX evidence. No live country is activated.
- Stripe-hosted Account Links onboard already provisioned, allowlisted test merchants. Merchant binding and existing identity are required by the separate API. Stripe is responsible for hosted KYC collection; unsupported account/controller types fail at Stripe instead of fabricating onboarding. OAuth and new account provisioning are not silently added.

## Separate charges and transfers

One platform PaymentIntent/hosted Checkout payment covers a server-priced multi-merchant order. Each immutable order line stores its merchant, discounted physical item value, quantity, separate shipping and tax. The public request accepts only offer ID and quantity; browser prices, commission rates, totals, merchant account IDs and payment statuses are forbidden.

Sandbox offer rows are explicitly **operator-created synthetic merchandise**, not live GLAM catalog facts. Production catalog/tax/inventory integration remains a release gate. Shipping is an attributed per-line fixture amount; tax is a fixture amount per unit. Neither is a production tax engine or jurisdictional tax determination.

Capture posts gross Stripe cash against per-line merchant holds and tax liabilities. The original server commission policy recognizes 10%, rounded half-up **per completed physical order line**, on post-discount item value excluding shipping/tax/processing fees. Fulfillment evidence is required before earning commission and transferring merchant proceeds. An unfulfilled merchant's item/shipping funds stay held; their commission is not earned. Services/advertising have no approved commission here.

On fulfillment, transfer the remaining item proceeds plus attributable shipping, tied to the platform charge using `source_transaction` and one transfer group per order. Tax stays in a separate liability pending approved tax responsibility/remittance. Platform Stripe processing and transfer fees are separate expenses based on actual balance transactions, not deducted from the physical-product commission base or silently charged to merchants.

## Durable journal and operation safety

Canonical additive revision `0009_stripe_test_ledger` creates new `stripe_test_*` tables **only on a selected `_test` database**. It refuses production/non-test databases; it is not a production migration approval. No historical migration or existing financial table is rewritten. Runtime also requires a local PostgreSQL test database. Use persistent `glam_stripe_sandbox_test` separately from disposable pytest `glam_test`; tests refuse the same database name to protect actual sandbox evidence.

Journals/postings/fees/refunds/transfers/reversals are append-only. PostgreSQL deferred constraints require at least two postings summing to zero. Posting insertion is limited to the journal's creating transaction; existing journals cannot gain later postings. Original order prices/owners and external operation inputs are immutable. Client roles are denied by RLS. Database administrators retain normal administrative powers; disposable regression fixtures deliberately truncate their own test tables.

Every money operation first commits its deterministic business key and server-authored request. Cross-process order locks span intent, Stripe call and ledger transactions. Stripe POSTs use stable idempotency keys and have no automatic transport retries. On uncertain responses, retry the same request/key within 23 hours; after that, stop for manual provider reconciliation rather than issue a new key. Actual signed refund webhooks can resolve unknown successful refunds and associated reversal recovery. GETs have bounded retries/timeouts, TLS/proxy trust is preserved and redirects cannot forward credentials.

Payment objects must match server order amount/currency, the original checkout operation and an HMAC binding. Success pages never prove payment. Capture, fees and transfers require canonical Stripe API objects and source-linked balance evidence, not webhook-provided amounts.

## Refunds, disputes and reconciliation

Cumulative per-line refund targets cannot exceed original item/shipping/tax values. Use the existing policy's remaining-value rounding to calculate commission reversal, so split refunds equal a full cumulative refund. Reverse merchant transfers separately; Stripe separate charges/transfers do not automatically claw merchant funds back. Customer refund and merchant recovery are distinct journal events. Pending/failed refunds are not booked as successful.

Unknown dashboard refunds go to allocation suspense and freeze new transfers/refunds; do not guess a merchant or commission allocation. New refund requests check the current charge for unallocated refunds/disputes. Late payment events preserve these freezes. Disputes record actual withdrawal/reinstatement/fee balance transactions; losses move receivables to dispute loss. Won disputes remain transfer-frozen pending a reviewed release decision. No assumption that Stripe returns the original processing fee is made.

Reconciliation retrieves actual balance transactions and transfers, scans paginated transfer/refund/dispute lists for missing records, checks source/merchant/amount/reversal bindings and compares actual Stripe net movement with journal cash. Cash matching is distinct from full reconciliation: allocation suspense, unknown effects and missing evidence prevent completion. The platform's existing **$97 test balance is never treated as commission evidence**.

Actual Stripe API shape/eligibility and public webhook delivery still require verification. API version is explicitly pinned to `2024-06-20` for these candidate contracts. No production Stripe mode, bank payout or production Supabase connection is activated.
