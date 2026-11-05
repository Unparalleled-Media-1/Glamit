# GLAM AI Master PRD v2.0

5 November 2026 · **Revised architecture and acceptance criteria: proposed for review.**

**Every Look. Every Style. Everyone.** GLAM AI is a worldwide AI-powered beauty, grooming, fashion and lifestyle discovery platform: **Discover → Try → Complete → Shop → Book → Share**. People choose their style; the system does not tell them how attractive they are or infer their identity from appearance.

The subsequent [12 opportunities upload](sources/2026-11-style-companion-opportunities.txt) is consolidated through the [style-companion extension](style-companion-extension.md): a personal AI style companion powering visual shopping, useful even when no purchase is intended. Style DNA + Complete the Look + Occasion Concierge + a confirmation-based Shopping Agent form the proposed core journey; all 12 additions have explicit scope, privacy, schema/API and staged acceptance there. Exploration stays free where supported; premium AI/advanced tools require transparent approved economics. This is added scope for review, not permission to launch twelve disconnected features at once.

This consolidates the [v1 master](sources/2026-11-master-product-specification.txt), the [15-gap/global-inclusivity directive](sources/2026-11-global-inclusivity-directive.txt), and previously approved requirements. The new product direction supersedes an exclusively African identity and adults-only target product. African natural/protective hair, beauty, fashion and local commerce retain full support within the worldwide offering. Existing engineering/privacy/financial invariants remain unless explicitly revised here. The source's “75–80%” is a planning opinion about concept coverage, not an implementation-completion measure.

## Scope and approval boundary

- The later [UI/UX brief](ui-ux-design-handoff.md) expands design scope to iOS/Android, responsive consumer web and merchant, advertiser, professional, creator and admin web workspaces. This supersedes the previous landing-only/mobile-only design restriction. `/admin` controls the whole platform. Primary flows/design system and expanded production architecture await review; no production portals are implemented by the design package.
- Google through Supabase Auth and Supabase PostgreSQL remain selected; connection remains deferred. No new identity provider, raw-token storage or alternate migration system is implied.
- Global-ready architecture does not activate every country or age band. Restricted teen and guardian-managed child experiences are required planned capabilities. Their assurance, consent, platform rules and jurisdiction policies must be reviewed and implemented before activation. Missing policy means unavailable capability, not adult access.
- The user explicitly requires approval of the revised architecture/acceptance criteria before production implementation. This PRD and visual proposal do not implement youth access, commerce, AI, admin authorization or global release. Earlier foundation approval is preserved and does not automatically approve the expanded production scope. Deployment/destructive operations retain separate action-specific approval.

Canonical supporting plans: [global policy/schema/API architecture](global-policy-architecture.md), [commerce operations](commerce-operations-v2.md), [screen blueprint](screen-blueprint.md), [base architecture](architecture.md), [data model](data-model.md), [provider evaluation/economics](providers-economics.md), [look schema](look-schema-api.md), [commercial ranking](look-ranking-commerce.md) and [security/privacy](security-privacy.md). This document governs conflicts in older planning text.

The [companion extension](style-companion-extension.md) adds OPP-01–OPP-12 and OPP-B01–OPP-B07 to this same backlog. Wardrobe/twin/groups/challenges follow later gates; circular commerce, merchant intelligence and commercial API remain later expansion. Persistent photorealistic child twins are excluded at launch. No inferred sensitive identity, private profile or wardrobe/twin information may become advertising data.

## Three connected engines

| Engine | Owns | Boundary and success evidence |
|---|---|---|
| AI Inspiration | User-selected goals, consented visual understanding, inclusive hair/grooming/makeup/fashion simulation, uncertainty, routines and occasion discovery | Preserve natural skin tone, identity, body proportions and visible features; no demographic inference or attractiveness scoring; qualified model/cohort evidence and measured cost per accepted result |
| Commerce Fulfillment | Screenshot to Shop, look decomposition, verified catalogs, delivered-cost budget assembly, professional feasibility requests, referral handoff and later orders/returns | Only evidenced products/prices/availability/coverage, truthful Exact/Similar/Unknown labels; no invented purchasable outcome or guaranteed fit |
| Advertising and Growth | Rights-cleared creative, disclosed placements against permitted explicit shopping intent, verified attribution, creator collections/referrals and privacy-controlled sharing | Bids cannot alter analysis, safety or organic order. No sensitive profiling; no ads in initial child/teen policy. Real advertiser demand and reconciled pilot outcomes precede sophisticated auctions |

Engines are logical ownership boundaries in the existing modular API and workers, not three disconnected apps or a requirement for new microservices. They share canonical identity, consent, policy decisions, catalog versions, balanced ledgers and outbox/inbox events. Private images/traits never flow into advertiser data contracts.

## Six engineering deliverables from the gap assessment

| Deliverable | Concrete planning artifact | Unmet real-world prerequisite |
|---|---|---|
| Event-driven commerce | [Workflow states, event envelope, transactional handoffs and failure/compensation](commerce-operations-v2.md#event-driven-commerce-contract) | Actual feed/payment/partner integrations and failure evidence |
| AI evaluation benchmark | [Inclusive scorecard, cohort/fidelity/retrieval/agent/cost design](providers-economics.md#evaluation-scorecard-and-experiment) | Consented/licensed dataset, qualified vendors and approved trial budget; no child collection by assumption |
| Advertising integrity | [Eligibility, disclosure, first-price/caps, signed events and reconciliation](look-ranking-commerce.md) with v2 pilot/age/privacy overlays | Real advertisers, demand, contract and validated billing/measurement |
| Merchant/professional verification | [Onboarding, evidence, review/appeal and feasibility workflows](commerce-operations-v2.md) | Named suppliers, appropriate checks, authorized rights/agreements and operating staff |
| Regional deployment | [Market/age/locale/currency/size/tax/payment/region capability design](global-policy-architecture.md) | Country-specific legal/store/privacy/payment/support qualification and activation approvals |
| Launch supply plan | [Per-market supplier/evidence/coverage/demand register and gates](commerce-operations-v2.md#market-activation-and-supply-evidence-pack) | Real recruited partners, live inventory/services, agreed thresholds and measured coverage |

These documents satisfy the requested planning scope; they do not establish that operational prerequisites have been supplied or passed.

## Fifteen capabilities and strict acceptance

Every capability remains open until its scoped tests, integration evidence and owner sign-off exist. A design, fixture suite or passing foundation test does not establish a provider/feed/partner integration.

| ID | Capability / priority | Minimum acceptance evidence | Current state |
|---|---|---|---|
| V2-01 | Visual search / Critical | Rights/purpose-gated upload; product-only retrieval features; Exact requires source/SKU evidence, otherwise Similar; empty/stale/adversarial catalogs produce honest no-match; held-out retrieval precision/coverage by market | Design only |
| V2-02 | Accurate virtual try-on / Critical | Qualified hair/grooming/makeup/garment adapters; preserve identity/complexion/proportions/visible features; labeled simulations, original access, uncertainty/abstention; diverse consented benchmark and real device tests | No qualified provider |
| V2-03 | Merchant onboarding / Critical | Mobile self-service drafts, verification/review, authorized team/catalog/stock management, counterfeit/claims checks, audited suspension/appeal; no publication before eligibility | Organization primitives only |
| V2-04 | Live inventory/pricing / Critical | API/CSV/manual staging equivalence, source/revision/expiry, sequence/deduplication, region/shipping/size facts, stale suppression, revalidation before handoff/quote; every surfaced firm offer has evidence | No connected feed |
| V2-05 | Checkout/fulfillment / Critical | Initial external referral clearly identifies seller/responsibility; later marketplace has concurrent stock/slot holds, verified payment/fulfillment, partial failure compensation and real reconciliation | Referral proposed; platform checkout deferred |
| V2-06 | Ad auction/billing / Critical | Initial reviewed sponsored pilots have contract, relevance/disclosure, hard spend caps, replay/fraud controls and verified reporting; later first-price auction must pass existing concurrency/ledger gates | Ranking primitives only; no serving |
| V2-07 | Regional payments / High | Country/currency/storefront-specific licensed partner evidence, tax/fee/settlement/refund responsibilities, supported mobile-money/card/transfer methods as available; no unsupported activation | No regional partner selected |
| V2-08 | Size/fit intelligence / High | Merchant size-chart version, declared measurements/units/fit preferences, uncertainty and return feedback; no guaranteed fit or assumed body/gender/religion from photos | Design only |
| V2-09 | Creator monetization / High | Rights-cleared mobile storefronts/collections, disclosed affiliate terms, signed verified conversions, refund-adjusted commissions and deduplication; no earnings from client claims | Design only |
| V2-10 | Professional operations / High | Verified skill/service area, explicit feasibility/quote for exact look, bounded sharing consent, confirmed availability/terms; request is not booking; later deposits/no-shows tested | No booking integration |
| V2-11 | Trust/authenticity / Critical | Source/seller verification, substantiated claims, purchase-linked review labels, fraud/counterfeit reporting, moderation/appeal, reviewable payout/identity changes | No verified commercial supply |
| V2-12 | Returns/disputes / Critical | Referral seller's actual policy surfaced; support distinguishes referral from platform order. Later returns/refunds/chargebacks allocate by line/currency and reverse commissions without duplicate refunds | Design only |
| V2-13 | Retention/loyalty / High | Optional reminders, routines, private saves, rights-controlled sharing and verified reward events; opt-out/deletion, no manipulative appearance pressure; youth-specific restrictions | Foundation private-look primitives only |
| V2-14 | AI quality/cost controls / Critical | Model/version registry, allowed data/region, qualified fallbacks, timeouts/retries, server quote/credits, daily budgets, measured failures and accepted-result costs; no user charge for failed/cancelled work | Credit primitives; no measured provider |
| V2-15 | Market launch/supply / Critical | Named pilot suppliers and signed data/commerce rights, actual catalog/price/delivery coverage, verified professionals, advertiser willingness to pay, legal/localization/support and country-specific release sign-off | No partnerships/inventory asserted |

## Three flagship journeys

**Screenshot to Shop:** select an owned/licensed/permitted inspiration image → disclose purpose and isolate/minimize third-party likeness → decompose requested style/product components → retrieve actual eligible offers → show Exact only with independent identity evidence, otherwise Similar → compare delivered-cost evidence → save or explicitly visit the seller in an approved handoff. Do not fetch arbitrary social URLs or scrape accounts as an implicit feature. Expired/unknown facts cannot be presented as live stock.

**Complete My Look Within My Budget:** choose occasion, region, currency, budget, voluntary style/coverage/accessibility/fit preferences and owned items → calculate component quantities/dependencies → retrieve verified offers/services → optimize total delivered cost including merchant-group shipping, taxes/duties/fees and full service obligations → show uncovered components, uncertainty and alternatives → revalidate and get renewed confirmation on price/availability changes. A deposit is not the full service price. Missing costs prevent a firm “within budget” claim.

**Book the Exact Look:** select the style and which references to share → choose a qualified professional → share only authorized reference material, defaulting to a non-personal style board → professional confirms feasibility, materials, installation/appointment duration and full price → customer accepts the versioned quote/terms → real availability confirmation precedes booking. Initial launch can stop at a clearly labeled non-binding request; deposit/checkout/no-show enforcement waits for verified booking/payment operations. No guaranteed exact recreation from an AI image.

## Inclusion and audience requirements

Serve all races and ethnicities, skin tones, genders, bodies, hair textures, cultures, religions, abilities, styles and budgets. Navigation and catalog access are gender-neutral. Interests, modest coverage, accessibility needs, occasions and styling preferences are voluntary user choices; do not infer them from a photo or use them to withhold unrelated products. Include straight/wavy/curly/coily/thinning/absent hair, beards/barbering, protective styles, wigs/weaves/lace/density, adaptive fastenings/seated fit, varied sizes, secondhand/affordable and premium/luxury supply. Show feasibility/evidence instead of stereotypes or beauty rankings.

Occasion discovery supports culturally specific weddings/ceremonies, graduations, celebrations, work and everyday use, localized with relevant experts rather than one “African” or other regional aesthetic. Informal merchants may use mobile-first onboarding and optional consented WhatsApp notifications through an approved provider; verification and privacy requirements remain. Tailor/designer requests require user-entered measurements, consent, quotation and explicit alteration/return terms.

Adults, restricted teens and guardian-managed children have distinct capabilities; see the [age matrix](global-policy-architecture.md#age-specific-permission-matrix). Age limits/legal rules are jurisdiction-specific. No child public profile, child photo exposure to advertisers, unnecessary facial retention, sensitive-profile advertising or cosmetic-pressure mechanics. The first proposed youth modes use curated style inspiration with facial processing and public sharing disabled until separately reviewed. Adult/provider eligibility does not imply youth eligibility.

## Global activation and localization

Support Americas, Europe, Africa, Middle East, Asia and Oceania through country-level capability manifests. A continent is not one legal/payment/sizing system. Locales include RTL, pluralization, accessible text expansion, local scripts and culturally reviewed terminology. Country currency/tax/payment/shipping/returns rules, catalog availability, merchant/professional service area, units and clothing/shoe sizing are independent versioned facts. Language is not a proxy for nationality or jurisdiction.

No country is automatically activated by this directive. South Africa remains a possible pilot, not an exclusive identity or an approved global launch decision. Every market/age/capability combination must pass supply, localization, privacy, payment/storefront, support and risk gates; missing entries default unavailable. The phased rollout can include country-specific read-only inspiration before paid/booking features, with clear availability labels.

## Commercial rollout proposal

1. **Validated inspiration and referral pilot:** qualified adult-eligible AI behind policy gates, Screenshot to Shop, organic Complete the Look, delivered-cost budget planning, verified merchant feed, external affiliate/referral shopping and non-binding professional look requests. Store subscriptions/credits require separate verification; useful nonpaid discovery remains where supported.
2. **Measured sponsored pilot:** onboard a small real advertiser cohort; begin reviewed fixed-price/disclosed collections or tightly bounded placements with known contracts/delivery obligations. CPC starts only after fraud, attribution, caps, privacy and invoice evidence. Measure real leads/clicks/partner-verified sales and contribution, not simulated demand.
3. **Marketplace and booking settlement:** introduce on-platform multi-merchant checkout, local payment methods, deposits, fulfillment, returns/disputes and payouts only after regional partner and operational gates. The legal seller/payment role is explicit per transaction.
4. **Scale:** complex auctions/pacing, broad social network, proprietary real-time AR wardrobe and advanced multi-country logistics follow demand/quality/operations evidence. Their requirements stay in backlog, not silently deleted.

Affiliate-first and simplified sponsored launch are revised proposals awaiting review. Prior auction/ledger designs remain the eventual technical baseline; their existence does not require deploying auctions at initial launch. Merchant of record is not assumed. See [detailed workflows and events](commerce-operations-v2.md).

## Implementation backlog and dependencies

The existing P0–P7/Bxx/CTL IDs remain canonical. These V2 work items extend them; estimates require staffing/supplier discovery rather than a new promised timeline.

| Work | Dependencies | Reviewable deliverable / owner | Release gate |
|---|---|---|---|
| V2-B00 product/design baseline | This directive | PRD v2, screen/role/age flows, three-engine ownership, exact/similar/budget rules / product + architecture | Revised architecture/criteria approved before production implementation |
| V2-B01 global policy/localization | B11/B13; V2-B00 | Country/age/capability manifests, verified guardian/session design, RTL/units/sizing and revoke semantics / security + privacy + mobile | Policy missing/unknown/expired always denied; qualified regional reviews |
| V2-B02 supply and trust | B30/B40; V2-B00 | Pilot merchant/professional recruitment plan, agreements, verification/appeals, feed rights / commercial operations | Actual eligible catalog/service coverage and supplier sign-off |
| V2-B03 inclusive AI benchmark | B02/B03/CTL-01; V2-B01 | Consented global cohort dataset/rubric, adapters, fairness/cost regressions / AI + privacy | Qualified capability/model/age/region; no unapproved child data collection |
| V2-B04 screenshot/occasion discovery | B13/B14, CTL-02/03; V2-B02/03 | Safe uploads/decomposition, exact/similar evidence and culturally reviewed occasion taxonomy / AI + catalog | Rights/privacy/security + held-out retrieval and no-fabrication tests |
| V2-B05 delivered-cost budget/fit | CTL-04/05; V2-B04 | Regional units/pack sizes/size charts, full-cost assembly and unknown/no-match states / commerce | Property tests for totals, shipping, FX, fees, constraints and stale facts |
| V2-B06 referral and exact-look leads | V2-B02/05; B11/B14 | Approved destination handoff, verified attribution; professional feasibility/quote requests / commerce + trust | No fake order/booking; consent/replay/tenant/withdrawal tests |
| V2-B07 mobile/business/admin design and identity | B11; V2-B01 | Five mobile tabs, role workspaces, platform-wide `/admin`, assurance/MFA / clients + security | Actual auth/permission tests, accessibility and supported-device journeys |
| V2-B08 growth/creator/loyalty | B51–B54; V2-B01/06 | Rights-cleared share/try links, private defaults, verified affiliate/reward events / growth + privacy | No implicit selfie sharing, no youth pressure/profiling, no unverified rewards |
| V2-B09 advertiser/brand studio pilot | B60/CTL-04; V2-B01/02/06 | Advertiser onboarding, rights/likeness approval, disclosed intent placement and billing evidence / ads + finance | Real demand, no sensitive targeting, no cap breach or analysis interference |
| V2-B10 regional settlement/returns | B41–B45; V2-B02/05/06 | Licensed payment routes, merchant seller duties, stock/slot/order/refund/dispute/settlement / payments + operations | Real sandbox and controlled live reconciliation before commercial claims |
| V2-B11 market activation/assurance | All included work | Country-by-country evidence pack, device/restore/incident/support/legal sign-off / release owner | Explicit release approval; rollback/kill-switch and no unmet required threshold |

Youth capabilities have an independent readiness lane in V2-B01/03/07/11; adding them to the product scope does not permit activating them through a cosmetic feature flag alone. Formal threat/privacy review and applicable guardian/age-assurance evidence are prerequisites.

## Codex acceptance contract

1. Use scoped feature branches, reviewable changes and one Alembic history. Preserve existing tests; no disabling assertions or replacing real integrations with fixtures. Record commit, policy/model/catalog versions and actual executed checks.
2. Ownership, organization authority, market, age/guardian assurance, consent, rights, provider region and feature eligibility are enforced at API entry, private URL issuance, accepted quote, asynchronous dispatch and publication. A client flag or user-supplied age/role/price cannot grant permission.
3. No attractiveness scoring, sensitive identity inference, body/complexion normalization or advertiser use of private images/traits. Never fabricate prices, stock, delivery, fit, professional feasibility, revenue, partnerships or measurements.
4. Concurrency/failure tests prove idempotent credits/commissions/events and compensation. Paid reservations are consumed only on authorized verified success and released once on nonbillable terminal outcomes; provider costs for failed work are not passed through as unauthorized user charges.
5. Strict country/age matrix tests include unknown/expired/conflicting evidence, guardian revocation, policy/region changes during jobs, RTL/mixed-script/units/currency boundaries, sensitive ad-context rejection and unsupported markets.
6. Real catalog/merchant/provider/payment/device evidence is required for applicable acceptance rows. Record failures/skips/unrun separately; zero-test/formatter-only results do not prove a workflow. Existing quality/financial/operations gates remain in force where stricter.
7. Before activating any pilot, publish the named eligible suppliers, agreements, catalog/freshness/coverage metrics, staff/support owners, approved risk thresholds and rollback plan. An empty or unset evidence field blocks activation.

## Economics, growth and supply evidence

Existing USD cost scenarios remain illustrative; they are not global provider quotes. Add localization/content review, age assurance/guardian support, country compliance, partner/feed ingestion and expanded quality-evaluation cost to the base model. Compute contribution by market/channel/age-eligible capability using actual net receipts less AI, payment/store fees, referrals/commissions, refunds/fraud/support and attributable operating costs. Do not rely on child/teen ad revenue or chargeable-data access. Privacy/age controls cannot be weakened to improve conversion.

Growth loop: explicit Create/Select → optional rights-controlled Share → recipients Try a style template in mobile → verified Shop/Book referral. Personal imagery/results remain private by default. Generic public web fallback explains the app and downloads; it does not introduce consumer web shopping/account flows. Referral rewards require approved rules, verified server events, age eligibility, abuse controls and reversible accounting. No scraping contacts or coercive appearance-based streaks.

The pilot supply register must list actual merchant/professional/creator/advertiser candidates, status and named owner, signed rights/terms, accessible real feeds, eligible regions/categories, price/inventory refresh evidence, returns/support route and measured coverage against the first curated looks. Dress 4 Less may be a candidate only after authorized data/agreements; no inventory or partnership is assumed. Recruit partners and qualify demand outside this coding task through explicitly authorized commercial outreach.

## Decisions for review

Approve/amend the revised v2 architecture and acceptance baseline, including: global inclusion/age capability design; guardian and jurisdiction policy ownership; affiliate/referral-first versus platform seller obligations; exact/similar and delivered-cost rules; simplified sponsored pilots and deferred complex auctions; global cohort/data acquisition and trial limits; country activation evidence/thresholds and accountable staff. Select actual providers, retention, countries, contracts, prices and store/payment details only with their required evidence. No secure values belong in chat or planning files.

This update provides a concrete reviewable architecture/design result. It does not request repeat approval for the earlier foundation; it requests approval only for the revised architecture/criteria before expanded production implementation, as the directive requires.
