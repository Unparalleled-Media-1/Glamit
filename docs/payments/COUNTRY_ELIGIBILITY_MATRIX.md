# Country and currency eligibility matrix

6 November 2026. Central operator: Zanzu Technologies Inc. (US/Delaware). **No live payment market is activated.**

| Platform → seller | Currency | Test status | Required evidence before use |
|---|---|---|---|
| US → configured US account | USD | Candidate only; dashboard capability is user-reported; API verification blocked | Exact platform/account IDs, test authentication, charges/payouts enabled, active card_payments + transfers, successful separate-charge transfer and reconciliation |
| US → additional US test merchant | USD | Needed for actual multi-merchant acceptance; no second account is configured here | Distinct test account, hosted onboarding if required, independent capability/API checks and source-linked transfer proof |
| US → non-US merchant | Any | DENIED / unqualified | Current Stripe regional and cross-border rules, account/controller model, local KYC, supported settlement/currency, actual approvals and test evidence |
| Any → US merchant | Non-USD | DENIED / unqualified in this sandbox | Currency support, minor-unit/FX/fee/refund/settlement rules and reconciliation evidence |
| South African acquiring via Peach | ZAR | Not connected; outside current Stripe sandbox | Separate approved acquiring/submerchant/split-settlement contract and actual test evidence |
| Any live-mode charge/transfer | Any | DENIED | Separate commercial and production release approval; never enabled by test success |

This is deliberately a default-deny evidence matrix, not a claim that Stripe only supports US merchants. Global product discovery and marketplace payment activation are separate. Mercury is a reported platform settlement bank; no bank payout, bank ownership or global seller settlement approval is inferred.
