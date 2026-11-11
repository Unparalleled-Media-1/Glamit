# Refer one person, earn one month

Approved commercial rule, 11 November 2026: the **referrer earns one free subscription month for every qualifying person referred**. Rewards stack: one person=one month, three people=three months, twelve people=twelve months. No numerical reward cap, expiry, cash payout, referrer paid-subscription prerequisite or reward for the referred person is introduced. Monthly US$1.50/yearly US$15 base prices and physical-product10% commission are unchanged.

## Confirmed qualification

The user explicitly selected **“First subscription payment.”** The referrer earns one month after the referred person's first successful, positive subscription payment, whether monthly or yearly. Signups, zero-value trial invoices, unpaid/failed events and later renewals do not qualify. Each person earns at most one referral reward, not one per renewal.

The canonical qualifying_event is first_subscription_payment. The program remains NOT CONFIGURED because trusted first-payment verification/attribution and billing redemption are not operational. A policy with no qualification still fails closed. The core requires an internal first-paid attestation and positive integer paid amount; these facts must come from the future authenticated provider/store verifier, never a public request body or a checkout return URL.

## Implemented and tested

- Canonical ReferralPolicy in services/api/src/glam_api/referrals.py, included in the subscription API and generated public pricing catalog. /pricing explains the cumulative offer and states the program is coming soon; there is no invented working referral link or success counter.
- Candidate canonical Alembic0018 follows0017 and creates **subscription_referral_award**, referencing existing app_user identities. No duplicate user, creator referral commission or new migration framework is introduced.
- Each referred account and verified source-event ID can earn at most one award. Self-referrals are denied in application and SQL constraints. Atomic INSERT/uniqueness handles concurrent replay without duplicate credits. The first awarded attribution cannot be replaced by another referrer.
- Reward rows contain exactly one month and are immutable; direct browser roles cannot read/write them. Corrections/reversals would require reviewed compensating records, not silent deletion. earned_months is the historical earned total, not a redeemable balance or proof that billing was extended.
- QualifiedReferral is an internal trusted-event contract, not a public request model. The core rejects wrong event kinds and attribution after the first payment. An existing nonpaying account can qualify; no extra new-signup requirement is imposed. No client-facing endpoint can supply its own qualification proof.

Candidate0018 was exercised only on disposable local PostgreSQL. Production remains at verified0017. No production migration, live award, payment change, provider call or app deployment occurred. Empty-only rollback code exists; valuable award records must never be discarded automatically.

## Operational work still required

Before opening the program, implement authenticated invitation/attribution persistence, verified first-payment event ingestion, anti-abuse/unique-person assessment, durable qualification/consent evidence and owner-authorized reward history. Unique database accounts do not establish unique human beings; the tests do not claim to detect multi-account farming. Provider/store verification must establish the actual first successful subscription payment and prevent a later renewal from being mislabeled as first.

Implement idempotent redemption against the canonical subscription/entitlement authority and the applicable provider/store billing cycle, including monthly/yearly subscribers, cancellations and any agreed reversal rules. Award storage alone does not postpone a renewal, grant app access or modify Apple/Google/Stripe billing. Earned months must remain months rather than an invented universal cash discount. No automatic refund or annual-plan repricing is performed.

The parent subscription work still needs durable customer/consent mappings, signed billing webhooks, verified entitlements, portal/payment-method operations, store receipt/restore and provider/currency qualification. These are implementation gaps beyond missing keys. Separate production-schema and payment-activation gates remain intact.

## Evidence

Initial targeted real-PostgreSQL pricing/referral/migration/deployment checks:45 passed. After the qualification answer, tests additionally cover approved monthly/yearly first payments, renewals, zero-value trials, negative/invalid amounts and signup rejection. The final suite runs against a fresh disposable database to verify the exact final candidate migration, not a previously applied draft. Full backend and browser regression outputs are recorded in referral-evidence after the final run. Browser captures are website previews, not native evidence; no mobile files changed.

Final result: **438 backend tests passed**, including **16 referral tests**. The readiness guard now recognizes0018 as the exact canonical descendant without dropping compatibility with production0017 or earlier accepted revisions. Web TypeScript, production Next.js build, public route/footer/accessibility/320–1440px browser checks, generated pricing/OpenAPI consistency, Ruff and diff checks passed. The existing Starlette TestClient deprecation warning remains. [Backend evidence](referral-evidence/backend-tests.txt) and [browser evidence](referral-evidence/web-tests.txt). No live provider/unique-person/entitlement or device proof is inferred from these tests.
