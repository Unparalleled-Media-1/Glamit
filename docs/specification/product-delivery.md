# Product scope, delivery and release strategy

All requirements below are proposed and unimplemented. The matrix and backlog must be version-controlled and updated in every feature PR with evidence links. Completed means acceptance criteria, relevant automated tests, documentation and actual integration evidence all exist; a screen with fixtures does not count as a completed integration.

## Screen inventory

Complete the Look adds component confirmation, organic/sponsored panels, offer comparison, private lists/assembly coverage, child quote/partial-checkout status and professional material/slot coordination. Merchants gain catalog feed/error/freshness views; advertisers gain catalog-linked auction/holds/invalid-traffic/collection controls. Details: [look flows](complete-the-look.md), [advertiser dashboard](look-ranking-commerce.md).

Each flow includes loading, empty, denied, expired, offline, retry, error and accessibility states. Per the user's 5 November 2026 clarification, all non-admin product flows run in the mobile apps, including consumer, merchant, professional, creator and advertiser workflows. The public web is an informational landing page directing visitors to app downloads; web control is restricted to administrative workflows at `/admin`. This supersedes earlier consumer-web, web-checkout and non-admin web-dashboard proposals throughout the design package. Shared business operations use the same API; administrative permissions remain distinct from mobile entitlements. Real store destinations must be configured before claiming app downloads are available.

| Audience | Screens / flows |
|---|---|
| Consumer entry | Landing, country/language, age eligibility, account registration/login/recovery, terms/privacy, consent by purpose, onboarding goals and voluntary preferences |
| Consumer analysis | Capture instructions and lighting check, camera/gallery permissions, upload validation, consent confirmation, credit quote, processing queue/progress/cancel, analysis with confidence/limitations, personal color palette, accessible explanation and feedback |
| Confirmed first-use scan | Google/Supabase sign-in → camera/processing consent → guided quality check and disclosed automatic still capture with cancel/retake/confirm → quoted submission → next-screen progress/results; no face-login recognition. [ADR 015](../adr-015-supabase-google-capture.md) |
| Consumer beauty/hair | Makeup category/shade selection, hairstyle library with natural/braids/locs/wigs/protective filters, texture/length/maintenance preferences, reference upload and rights confirmation, job confirmation, before/after comparison, private saved looks, share/export consent, deletion |
| Consumer fashion | Occasion/style/preferences, garment upload, outfit builder, size guidance limitations, outfit generation, comparison, private wardrobe and saved outfits |
| Consumer discovery/social | Personalized and contextual recommendations, search/filter, product details and commercial disclosures, creator profile/feed/post, follow/save/report/block, affiliate link disclosure and external destination confirmation |
| Consumer commerce | Cart, address and delivery, checkout quote/taxes/fees, payment challenge/status, orders/tracking, cancellation/return/refund/dispute, verified review |
| Consumer professionals | Professional/salon search/map/list, profile/verification, service details/prices, availability/timezone, booking hold, deposit/payment, confirmation/calendar, reschedule/cancel/no-show policy, review |
| Consumer account | Subscription plans and channel eligibility, purchase/restore/manage, credits balance/lots/expiry/history, receipts, notification preferences, consent center, data export/delete, devices/security, support |
| Merchant | Organization onboarding/KYC status, team roles/MFA, storefront, catalog/variants/public product media, stock/import validation, price/tax/shipping settings, order acceptance/fulfillment, returns/refunds/disputes, payouts/reconciliation, analytics, creator agreements, promotion entry, support |
| Professional/salon | Verification and locations, service menu/pricing/deposit policy, staff/resources, availability/blackouts, appointment calendar, customer booking details with limited data, reschedule/cancel/completion, earnings/payouts, dispute/support, team access |
| Creator | Eligibility/verification, public profile, licensed content upload/editor, disclosures/moderation, shoppable posts/product tagging, affiliate agreement acceptance, link generation, audience aggregates, verified conversions/commission/payout statements, tax/KYC, reports/appeals |
| Advertiser | Business verification/team, billing/spend caps, campaign list/create/objective, ad groups/contextual targeting, placements/creative preview and `Sponsored` label, approval/appeal, budget/schedule/timezone, pause/stop, performance/attribution explanation, invalid traffic adjustments, invoices/export, support |
| Administrator | Privileged login/MFA, scoped operational overview, user/organization verification, roles/access review, media access request with audit, content/product/creative moderation and appeals, style taxonomy/rights, AI model qualification/routing and kill switches, price/plan configuration with review, payments/credits/reconciliation exceptions, disputes/payout review, ad fraud/campaign oversight, data rights/deletion and legal holds, security/audit viewer, incident status and support |

Admins do not get default access to private facial images. Exceptional support access requires a reason, short-lived grant, appropriate user authorization or lawful basis, and audit. Reporting permissions do not imply credit-grant, payout, moderation or provider-policy permissions.

## Requirements matrix

| ID | Requirement | Primary evidence needed | Delivery dependency / phase | Current state |
|---|---|---|---|---|
| R01 | Facial feature and color guidance | Consent tests, lighting/confidence evaluation, subgroup quality/abstention report | Consent/media, provider qualification; P2 | Proposed |
| R02 | Realistic makeup/hair simulation | Provider contract, retained-identity/realism evaluation, job/refund tests | R01 foundation; P2 | Proposed |
| R03 | African hair specialization | Licensed taxonomy/reference corpus, separate evaluation for named hair families and skin tones | Research/design P0; P2 | Proposed |
| R04 | Fashion/outfit visualization | Garment fidelity/fit limitation tests, rights validation and real provider calls | P2 orchestration; P5 | Proposed |
| R05 | Product discovery | Verified catalog ingestion, relevance tests, disclosure and ownership tests | Catalog P3 | Proposed |
| R06 | Salon/pro marketplace | Real onboarding/booking/capture/refund/payout reconciliation | Country/PSP approval; P4 | Proposed |
| R07 | Creator affiliate commerce | Disclosures, signed postbacks or server orders, commission reversals and payout tests | R05/R06, agreements; P5 | Proposed |
| R08 | Advertising network | Reviewed campaigns, delivery/fraud tests, atomic budget cap, privacy and attribution reconciliation | R05/R07, consent/warehouse; P6 | Proposed |
| R09 | Freemium/subscriptions/credits | Real channel verification, parallel reservation tests, refund/renewal reconciliation | Ledger P1; billing P3 | Proposed |
| R10 | Secure role dashboards | Tenant escape/access matrix tests, MFA, redacted reporting | Identity P1; grows P3–P6 | Proposed |
| R11 | Privacy and consent | Purpose/access/deletion evidence, vendor contracts, no ad exposure | Mandatory P0–all | Proposed |
| R12 | Production operations | Restore drill, incident exercise, SLO/load/cost evidence and release sign-off | P1 foundation; P7 launch | Proposed |

The matrix extends to [R13–R27](complete-the-look.md), covering decomposition, verified regional product/professional matching, African hair specialization, organic/sponsored separation, auctions, shopping, ingestion, privacy, audit and creator collections. All remain Proposed. Evidence gates [AC-01–AC-12](look-delivery-economics.md) and CTL-00–CTL-10 augment existing P0–P7 work alongside R05–R08. B31 includes look-driven organic matching; B62 includes the proposed first-price CPC rules, subject to approval.

## Phased implementation backlog

Effort ranges are planning estimates in elapsed weeks for a stable team of roughly 6–8 engineers plus product/design, QA, security/privacy and AI evaluation specialists. Phases can overlap only after their prerequisite gates; they are not a committed schedule. External contracts, licensing, provider reviews and store approval can dominate duration. Full scope is approximately 9–15+ months with this staffing assumption, subject to Phase 0 discovery; the bounded first release is smaller.

| Phase / work items | Depends on | Deliverables / acceptance gate | Estimate |
|---|---|---|---|
| P0 / B00–B05 | Architecture approval | B00 jurisdiction/product scope; B01 privacy impact/data map; B02 licensed African hair/style evaluation protocol; B03 real provider trials and signed processing terms; B04 payment/app-store feasibility and tax advice; B05 UX/accessibility and cost caps. Gate: approved ADRs, selected qualified vendors and priced launch envelope | 2–4 weeks |
| P1 / B10–B16 | P0 scope; qualification may continue | B10 repository/locked toolchains/CI; B11 identity/tenant/RBAC/MFA; B12 single migration baseline; B13 consent/private media/deletion; B14 durable jobs/outbox/idempotency; B15 credit and money ledger kernel with concurrency tests; B16 telemetry/IaC/nonproduction environment. Gate: security and transactional foundations pass automated tests | 4–6 weeks |
| P2 / B20–B25 | P1; P0 provider gate | B20 guided capture and color/feature analysis; B21 makeup adapter; B22 hair taxonomy and specialized try-on; B23 price quotes/reservation/reconciliation; B24 private result history; B25 cohort evaluation/cost/load tests. Gate: real provider quality/privacy thresholds and failure/credit reconciliation pass | 6–10 weeks |
| P3 / B30–B35 | P1 ledger/identity; P2 qualified feature | B30 verified catalog and rights; B31 search/recommendations; B32 web and app-store subscription integrations; B33 credit packs/restore/renewal/refund; B34 consumer/merchant dashboards; B35 independent penetration test and beta. Gate: paid digital limited release only with store/legal approval and support | 5–8 weeks |
| P4 / B40–B45 | P3; marketplace PSP approved | B40 merchant/pro verification; B41 stock/checkout/order state machines; B42 resource availability/booking; B43 deposits/fulfillment/returns/disputes; B44 split payables/payouts; B45 daily reconciliation and controlled settlement drill. Gate: licensed marketplace flows and real low-value settlement evidence | 6–10 weeks |
| P5 / B50–B55 | P2/P3; payouts use P4 | B50 fashion provider qualification and outfit UX; B51 creator publishing/social abuse controls; B52 affiliate contracts/links/postbacks; B53 commission/return reversal logic; B54 creator dashboard/payouts; B55 moderation/disclosure evaluation. Gate: real attributed conversions and garment quality evidence | 6–10 weeks |
| P6 / B60–B66 | P3 catalog, P4 payments, P5 attribution and safety | B60 advertiser verification/creative review; B61 contextual placement/disclosure; B62 campaign pacing/atomic reservations; B63 signed event validation/fraud; B64 attribution/conversion refunds; B65 billing/privacy-thresholded reporting; B66 ad settlement and independent data-exposure review. Gate: reconciled budget/spend reports, no sensitive targeting or tenant leakage | 6–10 weeks |
| P7 / B70–B75 | Gates for every included feature | B70 load/capacity/failover; B71 backup/restore/deletion drills; B72 accessibility/localization/store review; B73 legal/vendor/tax sign-off; B74 on-call/runbooks/cost limits; B75 explicitly approved progressive production release. Gate: signed release checklist with tested rollback | 3–6 weeks |

The initial release can stop at P3 with a limited P4 professional cohort once its gates pass. Creator commerce, fashion and ads remain recorded future requirements, not implied launch completions. Assign one owner per work item, dependency IDs, acceptance tests, estimate, risk, status, PR and evidence before execution. Unapproved work remains `Proposed`; move through `Approved → In progress → Review → Verified`, or `Blocked` with a concrete prerequisite.

## Automated test strategy

| Layer | Required coverage |
|---|---|
| Unit / property tests | Money rounding across currency exponents, balanced postings, quote/commission/tax policies, consent rules, expiry/state transitions, refund bounds; generated sequences of grant/reserve/capture/release/reversal |
| Database integration | Real disposable PostgreSQL; concurrent credit holds, spend caps, booking overlaps, inventory reservations, tenant FKs/RLS, outbox atomicity, idempotent replays and deadlock retries |
| API / security | OpenAPI compatibility, role/tenant/owner negative cases, token expiry, forged webhook/upload/object access, SSRF and malicious image handling, rate limits, CSRF/session protections |
| Provider contracts | Adapter request/response/error mappings with recorded sanitized fixtures; real sandbox qualification separately; schema/version drift tests. Fixtures validate contracts, not production provider quality |
| End-to-end | Consumer consent→upload→quote→real-provider job→output→ledger; billing purchase/restore/refund; merchant order/return; professional double-booking; creator conversion/reversal; ad budget/click/conversion/report |
| Financial resilience | Duplicate, delayed, reordered and missing webhooks; timeout after PSP/provider accepted; retry after worker crash; refund after payout; chargeback after credit spend; daily external/internal reconciliation |
| Privacy / safety | Consent withdrawal during running job, object URL expiry, provider deletion evidence, backup restoration followed by deletion replay, log/warehouse scans for facial/appearance data, moderation/appeal and public-share authorization |
| AI quality | Licensed, consented held-out cases across skin tones, hair families, lighting, devices and genders; expert hair/makeup raters plus users; fidelity, artifacts, unsafe content, failure/abstention and cost distributions; no race inference for evaluation |
| Performance / recovery | Declared load and queue saturation, provider throttling, DB/queue worker failover, restore drill, deletion throughput and billing reconciliation recovery |
| Accessibility / device | WCAG 2.2 AA for web, screen reader and large text mobile flows; camera/skin-tone capture usability; low-bandwidth/reconnect/resumable upload; representative supported iOS/Android devices |

Every completed feature needs meaningful automated tests and a regression test for fixed defects. PR CI runs lint/type checks, domain tests, migrations against empty and previous supported schema, generated-client drift, relevant integration/E2E tests and dependency/secret/security scanning. A protected branch requires code review and passing checks. Nightly/release jobs run slower real-sandbox, device, resilience and AI benchmark suites with spend caps. Production smoke checks use synthetic nonfacial inputs or expressly consented test assets; never consume real customer media for tests.

Initial proposed AI gates: at least 200 consented/licensed cases per launch feature, with at least 30 applicable cases in each named critical hair/skin-tone cohort, disjoint from tuning data; sample requirements may require a larger total. Require ≥85% acceptable realism/fidelity overall, ≥80% in every critical cohort, ≤10 percentage-point gap between comparable cohorts, <2% severe identity/garment/hair corruption, and zero observed critical safety/privacy violations. Report confidence intervals; zero observations does not prove zero risk. These are proposed product thresholds, not vendor results or statistical guarantees; Phase 0 must validate measurement reliability, sample adequacy and rater agreement. Low-confidence analysis must abstain rather than present false precision.

## Release gate checklist (initial state: all open)

- [ ] Approved requirements matrix, country scope, ADRs and explicit release owner.
- [ ] Each included requirement links to merged PRs, current test outputs and real integration evidence; omitted features visibly disabled.
- [ ] All required tests passed; failures/skips documented and accepted by owner. No zero-test job counted as validation.
- [ ] Single migration head; expand/contract compatibility tested against previous application; migration dry-run and backup verified. Destructive changes require separate explicit approval.
- [ ] Ledger invariants and daily reconciliation pass; no unexplained monetary/credit mismatch, duplicate payout or campaign overspend.
- [ ] AI quality/privacy/cost gates pass for the actual model/version/region; fallback providers separately qualified.
- [ ] No open critical/high exploitable findings; RBAC/tenant isolation, privileged MFA and access reviews complete.
- [ ] Consent, privacy impact review, rights/licensing, vendor agreements, deletion and cross-border terms approved.
- [ ] Real settlement/refund/store purchase evidence where applicable; sandbox alone does not establish live commerce readiness.
- [ ] SLO/load/cost-cap evidence, paging, support, restore/deletion drills and incident/rollback runbooks current.
- [ ] Accessibility and device support validated; sponsored content and simulation limitations visibly disclosed.
- [ ] Legal/tax/consumer-protection and app-store approvals recorded for enabled countries/products.
- [ ] Explicit production deployment approval recorded; use feature flags and gradual rollout with halt criteria.

Proposed halt criteria: any image exposure or ledger invariant violation; material reconciliation mismatch; API error >1% for 5 minutes; provider terminal failure >5% over an adequate sample; generation queue p95 >5 minutes; or forecast spend above the approved cap. Tune noise-sensitive thresholds with real traffic. Roll back application versions or disable feature dispatch first; do not perform destructive schema rollback as an incident shortcut. Safety/financial/privacy failures halt affected workflows immediately regardless of metric sample size.
