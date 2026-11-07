# Complete the Look — delivery, acceptance and unit economics

V2 authority: [Master PRD](master-prd-v2.md), [global policy](global-policy-architecture.md), [commerce operations](commerce-operations-v2.md) and [companion extension](style-companion-extension.md). Earlier scenarios are hypothetical inputs, not global economics. V2-B06 qualifies referral/professional leads before platform settlement, while CTL-06 full checkout and CTL-08 complex auctions remain later disabled capabilities. Add global cohort/age/localization/supply evidence to applicable AC gates; add private memory/wardrobe/twin/agent review costs without double counting. Existing foundation approval remains; revised expanded architecture/acceptance criteria await approval.

Status: proposed. No rates, revenue, inventory, partner integration or quality outcomes here have been observed in production. All scenarios are hypothetical USD inputs for commercial review; no vendor trial or deployment is authorized.

## Incremental cost and revenue model

This model adds the look engine to the [base GLAM AI cost model](providers-economics.md). It does not replace generation/subscription costs or count product GMV as revenue. Charge users for decomposition only under an approved, clearly quoted entitlement/credit rule; default proposal is to include standard look decomposition within a bounded look quota and monetize commerce/ads, subject to margin review. Failed or low-confidence results need a stated no-charge/refund policy using existing credits.

Variables: `L` = monthly new decomposition runs after reuse; `D` = vendor cost per billable decomposition attempt; `F` = attempts per successful/usable decomposition; `M` = incremental retrieval/ranking cost per run including refresh; `K` = ongoing catalog embedding/validation/search cost; `I` = incremental queue/database/reporting infrastructure allowance. Then `look_operating_cost = L × (D × F + M) + K + I`. Include failed/abandoned paid attempts in measured F, avoid assuming all runs yield purchases. A provider's image/token billing and model quality determine D, not the planning rate.

| Input / monthly scenario | Pilot | Growth | Scale |
|---|---:|---:|---:|
| New look decomposition runs L | 1,000 | 10,000 | 100,000 |
| Assumed D | $0.020 | $0.020 | $0.020 |
| Assumed F | 1.15 | 1.15 | 1.15 |
| Assumed M | $0.010 | $0.010 | $0.010 |
| Variable look cost L×(.020×1.15+.010) | $33 | $330 | $3,300 |
| Catalog processing/search K | $50 | $200 | $1,200 |
| Incremental infrastructure I | $150 | $400 | $2,000 |
| Total incremental cost | **$233** | **$930** | **$6,500** |
| With 20% contingency | **$279.60** | **$1,116.00** | **$7,800.00** |

These are capacity allowances, not priced cloud SKUs. Avoid charging the same database/search capacity again if already budgeted in the base infrastructure. Catalog indexing cost depends on SKU count/update volume, not only MAU: estimate `new_or_changed_SKUs × tokens_per_SKU × embedding_rate + feed_validation_compute + index storage/queries`; full daily re-embedding is unnecessary. At a high hypothetical D=$.080 and F=1.30, with unchanged M/K/I, the 10k-run cost is `10,000×(.080×1.30+.010)+200+400 = $1,740`, or $2,088 with contingency.

### Illustrative 10k-run commercial funnel

- Sponsored viewable impressions: 6,000; assumed raw click rate 3% yields 180 clicks; 10% invalid yields 162 billable clicks at hypothetical average CPC $0.30 → **$48.60** ad revenue. Delivery holds are not revenue. If 100 additional valid clicks occur without viewability telemetry, report them separately; this example assumes none.
- On-platform purchase rate 4% of look runs → 400 goods orders at tax-exclusive $40 GMV = $16,000 GMV; 12% platform take → **$1,920** gross platform commission.
- Verified off-platform affiliate conversions: 80 separate orders × $40 × 5% network commission → **$160** affiliate revenue. These are disjoint from on-platform orders in this example; do not claim both commission types on the same order without a real contract.
- Professional bookings: 100 completed distinct service orders × $30 × 10% platform take → **$300** commission. Not included in goods GMV.
- Optional sponsored collection: one monthly contracted placement at hypothetical $200, fully earned after agreed delivery/period → **$200**. Exclude when no real contract or required delivery is unfulfilled; do not double bill the same obligation as CPC.

Gross illustrative revenue = $48.60+$1,920+$160+$300+$200 = **$2,628.60**. Before collection sponsorship it is $2,428.60. Deduct hypothetical platform-borne processing of $650 (400 goods orders×$1.40 +100 bookings×$.90), creator shares $200, support/fraud/refund allowance $200, and engine cost with contingency $1,116 → **$462.60 contribution/month**, or $262.60 without a collection. This excludes base app/AI infrastructure, staff, tax on revenue, vendor minimums, partner acquisition, moderation and legal costs; it is not profit or a forecast. Marketplace tax/PSP/commission agreement details determine the real contribution.

Creator shares in this example are funded from platform revenue, not an additional merchant fee. Refund allowance is only a planning estimate: actual recognition must reverse corresponding commission and attributed revenue precisely. CPC invalidity credits reduce ad revenue; normal goods returns do not automatically invalidate a click. Payment processing may be merchant-borne in a signed agreement; do not silently move it off the platform model to improve margin.

Sensitivity: if goods purchase rate drops from 4% to 2%, goods commission falls $960 while assumed processing falls $280, leaving contribution approximately **-$217.40** with other inputs fixed. At the high decomposition scenario, replacing $1,116 cost with $2,088 reduces base-funnel contribution to **-$509.40**. Advertising alone does not fund this illustrative engine at these assumptions. Measure actual eligible catalog coverage, conversion, net take, refund rate, per-result cost and retention before deciding free quotas or prices.

Operating controls: daily vendor budget, per-user decomposition quotas, cache/reuse only within owner/purpose/consent and revision boundaries, incremental indexing, provider concurrency limits, circuit breakers, cost/accepted-result alerts and merchant freshness enforcement. Never use cross-user private image caches. Report contribution per run, matched look, paid order and country with attributed costs; merchant inventory freshness and style quality remain release constraints even when a cheaper model improves margin.

## Phased backlog integrated with existing phases

These tasks augment the existing backlog rather than starting a parallel product. Estimates are incremental team effort ranges, not additive calendar commitments: shared foundation work must not be counted twice. No task is approved or in progress.

| Work | Existing phase / dependencies | Deliverable and gate | Indicative effort |
|---|---|---|---|
| CTL-00 commercial/privacy specification | P0, architecture review | Approve schemas, quantity uncertainty, freshness/fee/auction/attribution rules, partner contracts and pilot budget | 1–2 team weeks |
| CTL-01 taxonomy and benchmark | P0–P2; B02/B03, CTL-00 | Licensed look/component ground truth with African hair expertise, sensitive-field exclusions and decomposition/provider trials | 2–4 |
| CTL-02 look revision domain/adapters | P1–P2; B11–B14, CTL-01 | Private looks, component graph/confirmation, durable jobs, deletion, provider contracts; no advertising input path | 2–4 |
| CTL-03 catalog ingestion/evidence | P3 B30; CTL-00 and canonical catalog | API/CSV/manual staging, review, source sequencing, provenance/freshness and rebuildable indexes | 3–5 |
| CTL-04 product/professional organic matching | P3/P4 B31/B40–B42; CTL-02/03 | Hard constraints, confidence/coverage, local delivery/service eligibility, held-out evaluation | 3–5 |
| CTL-05 lists/compare/assembly UX | P3–P4; CTL-04 | Native currencies, uncertainty, quantities/owned items, private saves and accessible organic/sponsored separation | 2–4 |
| CTL-06 shopping/booking orchestration | P4 B41–B45; CTL-05 | Revalidated child quotes, holds and compensation tests, partial outcomes and real settlement | 3–5 |
| CTL-07 storefronts/affiliate attribution | P5 B51–B54; CTL-03/06 | Disclosed collections, verified postbacks, line-level commissions/refunds and privacy-safe consented attribution | 2–4 |
| CTL-08 sponsored relevance/auction | P6 B60–B63; CTL-04, CTL-00 approved rules | Hard eligibility, first-price auction, atomic multi-limit budget/frequency holds, immutable analysis separation tests | 3–5 |
| CTL-09 billing/reports/dashboard | P6 B64–B66; CTL-07/08, canonical ledger | Validated CPC/adjustments, earned collection fees, seller-linked catalog health, protected reports and reconciled invoices | 3–5 |
| CTL-10 commercial launch assurance | P7; all included CTL gates | Real integration evidence, fairness/privacy review, spend/restore drills, accessibility and explicit deploy approval | 2–3 |

Organic complete-the-look can release behind a flag before paid placements. Unknown inventory is an honest no-match/check-merchant state; neither empty catalogs nor uncontracted affiliates can pass a commerce gate. Delay auctions, sponsored collections or storefronts individually if contracts/evidence are absent; keep their requirements/backlog visible.

## Proposed acceptance criteria and automated evidence

Thresholds below are approval proposals. Ground-truth quality and sample size must be reviewed before adoption; none has been measured yet. Every completed feature requires relevant automated tests and a PR/evidence link in the canonical matrix.

| Gate | Pass condition / tests |
|---|---|
| AC-01 decomposition | Held-out licensed/consented benchmark ≥300 looks with ≥30 applicable examples for each critical makeup/fashion/African-hair family/skin-tone cohort, expanding total as needed. Required component precision ≥90%, recall ≥85% overall, each critical cohort precision ≥85%/recall ≥80%, ≤10pp comparable-cohort gap; confidence intervals/rater agreement reported. Human-confirmed quantity ranges required for uncertain packs/fit; exact SKU precision tested separately |
| AC-02 factual offers | 100% surfaced purchasable/sponsored offers resolve to an approved current catalog revision with source price/currency/stock/delivery evidence and expiry. In stale, empty, partial-feed and adversarial catalog tests, no invented SKU, amount, delivery estimate or available flag. Unknowns remain explicit and cannot enter firm totals |
| AC-03 regional/hair suitability | Table-driven local currency exponent/tax/import/zone/pickup tests; unit/pack conversions; wigs/locs/braids/natural-hair dependencies; unsupported region/material/size never passes a hard constraint; low confidence asks user/professional |
| AC-04 analysis independence | For fixed look/model/catalog/policy, varying bids, budgets, sponsor identity and sponsorship agreements leaves decomposition content hash and organic order unchanged. API/DB permissions prohibit sponsored module writes to those records; feed prompt-injection tests cannot alter analysis or commercial fields |
| AC-05 matching quality | Human-labeled eligible candidates: proposed precision@5 ≥85% products and ≥90% professional capability fit, critical cohorts ≥80%; report coverage and abstention separately. Empty/unsupported markets pass honestly. Provider/storefront quality cannot be validated with fixtures alone |
| AC-06 auction and caps | Deterministic first-price examples/ties/floors; ineligible high bid never wins; generated concurrent serve/click/expire/cap-edit/midnight sequences never exceed wallet, daily, total or frequency limits; at most one click charge/delivery; first-price is exact integer accepted bid |
| AC-07 event/billing integrity | Forged/replayed/late tokens, bots, duplicate/out-of-order events, worker crashes, midnight/DST and 24h pending timeout cases pass. Immutable balanced ledger, adjustment/refund and hold cleanup produce zero unexplained reconciliation mismatch. Test with real PostgreSQL and integration queue, not only in-memory mocks |
| AC-08 privacy | Contract/authorization/log/export tests reject image/geometry/private traits/private look IDs in ad context/reports; no user drilldown. Threshold/differencing/tenant escape tests pass; consent withdrawal and private list/image deletion propagate to indexes/providers under approved deadlines |
| AC-09 shopping/booking | Price/stock/slot changes require new acceptance; inventory and resource concurrency tests; multi-seller failure compensates only affected uncommitted steps, reports confirmed children, never double-captures; actual external handoff is not claimed as platform settlement |
| AC-10 attribution/commissions | Real signed partner sandbox then controlled live event evidence before commercial claims; seven-day eligibility boundary, consent loss, multi-seller allocation, partial refunds/chargebacks, discount precedence, creator overlap and duplicate postbacks produce declared net metrics and no duplicate payable |
| AC-11 dashboards | All advertised controls scoped by role/tenant; sponsored label/identity always visible; spend vs holds/invalid clicks clear; CSV/API/manual pipeline equivalent validation; report as_of/currency/basis/suppression/export match ledger evidence |
| AC-12 operations | Proposed p95 warm matching ≤1.5s, sponsored serve ≤300ms at initial load target (20 API RPS/100 concurrent sessions, 5 sponsored serves/s); decomposition async p95 ≤30s only if provider qualification supports it. Load, throttling, stale catalog, deletion and provider outage drills meet limits or disable paid dispatch safely |

Release evidence includes exact commit/model/policy/catalog versions, test target/count/results, actual sandbox/live status, benchmark provenance, cost per usable decomposition, failure/abstention, merchant/provider agreements and unresolved defects. Manual quality/privacy/legal review complements automated tests; no passing fixture suite establishes real inventory or commercial readiness. Critical privacy leakage, fabricated availability, ledger imbalance or overspend blocks rollout regardless of aggregate quality.

## Approval required before production implementation

Confirm or amend: first-price CPC and quality floor, cap/frequency/TTL/validation defaults, private-context restriction, organic score factors, freshness SLAs, stock/price revalidation and external-checkout fallback, attribution/commission funding rules, collection sponsorship terms, decomposition quota/credits, target countries/providers and acceptance thresholds. Approve the architecture/commercial rules/acceptance baseline before implementation; approve production deployment separately after evidence passes. No production code, migration or vendor purchase is included in this design package.
