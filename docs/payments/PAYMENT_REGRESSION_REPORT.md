# Payment regression report

6 November 2026, Africa/Johannesburg. Branch `feat/stripe-connect-test`.

**Overall integration status: INCOMPLETE.** Isolated PostgreSQL financial tests pass; authenticated Stripe test connectivity and actual processor financial evidence remain blocked by missing credentials and unpublished network access. No live payments or production Supabase connection was activated.

## Isolated regression coverage

The focused suite has **31 financial tests**, using real PostgreSQL plus a labeled deterministic Stripe double. It verifies:

- Strict test keys, local `_test` database selection, correct platform binding and independently active card/transfer/payout capabilities; unsupported/restricted recipients are denied.
- Server-owned physical-product prices/quantities/shipping/tax; buyer price fields rejected; owned Checkout and Account Links merchant binding; existing authentication remains required.
- One platform charge, distinct merchant transfer groups/source charges, partial merchant fulfillment, 10% item-only commission and held unfulfilled proceeds.
- Cumulative partial/full refunds, rounding, commission reversals, separate merchant recovery, original processing-fee retention unless actual provider evidence credits it, and refunds before fulfillment without reversing never-earned commission.
- Pending/action-required payments remain pending rather than being called failed or completed. Payment declines, including an HTTP-402-style unknown result resolved through canonical PaymentIntent evidence without retrying the charge.
- Signed/timestamp-bounded webhook validation, test-object mode, duplicate/out-of-order events, copied metadata rejection and successful refund webhook recovery after an unknown remote result.
- Concurrent duplicate fulfillment, lost API responses, immutable operation inputs and the 23-hour retry cutoff without issuing new keys.
- Dispute withdrawals, actual-fixture dispute fees, lost/won/reinstated funds and frozen remaining transfers.
- PostgreSQL immutable order/ledger facts, balanced journals, refusal of later postings to sealed transactions, client-role RLS and no changes to the existing credit journal.
- Reconciliation rejects unrecorded remote transfers/refunds, unexpected reversal amounts, changed balance evidence and unallocated refund suspense even when cash balances match.
- The explicit operator exercise is repeatable and reports a financial subset rather than falsely marking full integration complete.

Full backend regression results, Ruff, unchanged main OpenAPI, client runtime, TypeScript and production-mode web build are recorded in [validation](../validation.md). Existing Stripe/provider calls are simulated only in the focused regression suite. One existing Starlette test-client deprecation warning is unrelated to financial failures.

## Representative isolated financial evidence

[Fixture report](../application-preview/stripe-test-fixture-report.json) contains PostgreSQL journal UUIDs, ledger entries, posting balances and **synthetic** IDs such as `pi_fixture1`, `ch_fixture2`, `tr_fixture4`, `txn_fixture3`. These do not identify actual Stripe payments. The regression database is disposable and resets between tests; this file is a captured test snapshot.

| Fixture fact | USD minor units | Meaning |
|---|---:|---|
| Merchant A eligible item | 10000 | Shipping 1000 and tax 800 are separate |
| Merchant B eligible item | 20000 | Shipping 2000 and tax 1600 are separate |
| Platform charge | 35400 | Server total, no browser price authority |
| Synthetic charge fee | 1060 | Explicit test-double amount, **not an actual Stripe fee or quoted rate** |
| A initial earned commission | 1000 | A fulfilled; B remains held/unearned |
| A merchant transfer | 10000 | 9000 item proceeds + 1000 attributed shipping; tax stays separate |
| A partial refund | 3633 | Item 3333 + shipping 200 + tax 100 |
| A commission reversal | 333 | Remaining item 6667 earns 667 using the unchanged policy |
| Transfer reversal / merchant recovery | 3200 | Item return 3000 + shipping return 200 |
| Final earned commission in this snapshot | 667 | B still unfulfilled; no B commission or payout |
| Reconciliation gap | 0 | Compared against the same explicit fixture provider objects, not Stripe |

Other tests cover full reversals, both merchants, decline, dispute loss/fee and reinstatement. Per-line earned, unearned and actually reversed commission fields are included in the JSON; a policy's hypothetical reversal of never-earned fees is not treated as a ledger reversal.

## Actual Stripe verification — blocked

| Required evidence | Actual result |
|---|---|
| Platform authentication/account ID | Not verified; credentials absent |
| Connected card/transfer/payout capabilities | Dashboard state user-reported; no authenticated result |
| Stripe-hosted onboarding link | Not generated against Stripe |
| Actual payment/charge IDs | None |
| Actual transfer/reversal/refund IDs | None |
| Actual balance transactions and processing/dispute/refund fees | Unavailable |
| Actual multi-merchant and partial-fulfillment run | Blocked; needs two verified test connected accounts |
| Actual signed provider webhook delivery and dispute balance movement | Not demonstrated |
| Existing $97 test balance proves 10% commission | **False — no such inference is made** |
| Actual reconciliation and complete integration | **Not passed / not complete** |

[Actual-provider JSON](../application-preview/stripe-test-actual-report.json) deliberately contains empty actual-ID arrays and null actual-fee/reconciliation fields. [Readiness/runbook](STRIPE_CONNECT_READINESS.md) explains how to supply secure settings and finish authenticated verification. No production financial record, old policy, existing credit logic or original migration was modified. New canonical sandbox tables were exercised only on the dedicated local test database.
