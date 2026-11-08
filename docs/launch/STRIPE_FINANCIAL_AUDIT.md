# Stripe financial audit

Observed 2026-11-08T15:00:58.123916+00:00. Source base `d38cf1667a50d5ae240dc75da6c683a770363fd9` plus the uncommitted/committed audit patch. Exact tested file hashes are in evidence/final/source-hashes.json. This is a failed acceptance audit, not a certificate of completion.

Fresh authenticated Stripe read: HTTP200, `livemode=true`. **BLOCKED** for authorized test-only financial acceptance. Zero financial mutations. Actual payment IDs: none. Transfer IDs: none. Actual fees: NOT MEASURED. Reconciliation: NOT EXECUTED. Local PostgreSQL tests cover sandbox signatures/idempotency, refunds/disputes/partial fulfillment and immutable journals with doubles. Synthetic fixture IDs/fees in financial-fixture-report.json are explicitly not Stripe evidence. Preserve 10% on eligible discounted physical-product item amounts, with shipping, tax, fees and refunds separately accounted. Do not activate live payments.
