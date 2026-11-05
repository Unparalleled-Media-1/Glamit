# Commerce, advertising and launch operations v2

5 November 2026 · Proposed workflow/acceptance design under [Master PRD v2](master-prd-v2.md). It extends existing Complete the Look, inventory, booking, outbox and journal authorities. No merchant relationship, feed, payment method, stock or provider result is asserted.

## Commercial roles and launch boundary

| Mode | Customer contract/payment/fulfillment | GLAM AI responsibility and truthful app state |
|---|---|---|
| Initial affiliate/referral proposal | Customer buys from the identified external seller using its payment/shipping/returns terms | Verify authorized feed/destination/agreements, show current source evidence and unknown costs, disclose commission, provide a safe handoff and partner support route. A click/return-to-app is not a paid order |
| Initial professional look request | Customer sends a scoped request; professional may confirm feasibility/quote. No platform deposit collection by default | Disclose non-binding request status; do not claim a slot or exact result is booked. Any external payment/booking is identified as partner-handled and must have actual evidence |
| Later marketplace facilitator | Defined merchant seller fulfills; licensed payment partner handles agreed collection/splits/refunds; duties vary by country | Versioned seller/tax/fee contracts, verified stock/slot holds, payment, fulfillment, disputes and reconciliation. Local counsel/PSP qualify actual facilitator role before activation |
| Merchant of record | GLAM AI would sell to the customer and assume additional consumer/tax/refund obligations | Deferred and not assumed by architecture or checkout branding; separate explicit commercial/legal/operating decision |

Digital app subscriptions/credits follow applicable store policies and server verification separately from physical goods/services. Affiliate tracking, customer payment and advertiser billing are distinct events/authorities. Mobile money/cards/local transfers can be enabled only for verified provider/country/currency capabilities; no generic “global payments” switch.

## Workflow 1 — supply onboarding, authenticity and live catalog

1. **Mobile merchant draft:** collect minimal organization, region, seller/service area, authorized catalog rights and support/returns details. Verify identity/business/beneficial-party information proportionately through a qualified process; informal business onboarding still needs appropriate risk review. Organization membership does not itself publish products or authorize payouts.
2. **Review and eligibility:** validate category/product rights, claims, domain/account authority, counterfeit/safety risk and commercial agreement. States are `draft → submitted → under_review → verified`, or `needs_information/rejected`; verified can become `suspended/expired` with appeal. Audit reviewer/reason/expiry. No “verified” badge merely from a form submission.
3. **Feed staging:** API, CSV and approved manual uploads use equivalent validation for stable seller/SKU identifiers, variant/pack/size/unit, currencies/tax basis, source timestamp, stock semantics, images/rights, destination/pickup eligibility and shipping evidence. Sanitize files/URLs; treat text as data, not model instructions. Reject duplicates, implausible claims, stale/out-of-order revisions and ambiguous required fields.
4. **Publication/indexing:** commit approved immutable offer/catalog revisions and outbox events atomically. Matching indexes are rebuildable projections, never price/stock authority. Source sequence/watermark prevents a delayed event restoring obsolete inventory. Suspension/deletion tombstones remove candidates and block paid delivery before projection catch-up.
5. **Freshness:** refresh according to approved per-feed/category SLA; show last verification/source and expiry. Expired price/stock/zone facts make an offer ineligible for firm purchasable/sponsored claims. Merchant assertions and actual upstream inventory semantics remain visible; revalidation cannot guarantee future stock at external checkout.
6. **Operations:** report coverage/errors/refresh failures to the merchant's authorized mobile workspace and redacted admin queues. Opt-in WhatsApp notifications use an approved provider/template and minimal metadata or authenticated deep link—never private selfies, secrets or unprotected order details. A delivered notification is not an order acknowledgement.

Acceptance: identical invalid inputs fail across all ingestion routes; duplicates/replays/out-of-order events do not create phantom stock; suspended seller/stale offer never passes hard eligibility; tests verify tenant isolation, consented publication and actual source lineage. Real feed/partner rights are required before claiming available inventory.

## Workflow 2 — Screenshot to Shop and within-budget assembly

Upload only through the private, rights/purpose/age/market-gated media flow. No implicit social-account scraping or arbitrary URL fetching. Minimize third-party faces and unrelated screenshot metadata; do not derive identity/protected traits. User query representations remain private/deletable and cannot become advertiser audiences.

Decompose requested style components and dependencies independently of bids. Exact means independently verified item identity (for example approved source/SKU/identifier evidence), not a high embedding similarity. Similar alternatives carry their own real catalog evidence; Unknown and No Match are valid. A catalog model cannot invent or override price, stock, seller quality, delivery, size or service feasibility.

Budget inputs are selected market/delivery area, native budget currency, occasion, explicit preferences, fit/coverage/accessibility constraints and owned items. The server calculates:

`full delivered obligation = item/pack quantities + per-merchant shipping + applicable taxes/duties/fees + full agreed services/materials - verified eligible discounts`

Avoid duplicate kit/components, shipping double-counts, treating a deposit as the full service cost, mixed-currency addition and unconfirmed zero fees. Preserve native amounts and dated FX basis for estimates. Exclude unsupported currencies/routes from firm accepted totals. An owned item reduces a requirement only after explicit user confirmation; do not assume someone already owns cosmetics or tools.

Choose eligible combinations satisfying hard constraints and budget before ranking value/style/coverage. Explain unmet dependencies and alternatives; do not promise mathematical optimality from a heuristic. Unpriced components, unknown service feasibility/shipping or partial inventory prevent a firm “complete within budget” claim. Present known subtotal, unconfirmed obligations and unfilled components separately. Sponsored choices can be deliberately selected but cannot change analysis/organic assembly logic. All offered substitutions preserve required compatibility or ask for confirmation.

Revalidate offer revisions before firm quote or external handoff. State `draft → priced_estimate → revalidating → confirmed_estimate`, with `needs_confirmation/incomplete/expired` alternatives. External referral retains “estimate/check seller” semantics; a platform accepted checkout quote is a later distinct authority. Changes in price/stock/materials/FX/terms require renewed explicit acceptance.

Acceptance: property tests cover currency exponent/rounding, grouped shipping, quantities/pack conversion, kits/owned items, tax/discount order, service full-price/deposit differences, unknown costs, stale sources, unsupported sizes and expiry. Held-out global style retrieval/coverage and verified no-fabrication evidence complement deterministic tests.

## Workflow 3 — referral, conversions and trustworthy purchase outcome

The customer explicitly selects a seller and sees seller identity, actual currency/price basis, last verification, destination, delivery/returns limitations and commission disclosure. Resolve only an approved seller domain/product route; no open redirect or untrusted checkout URL. A signed short-lived referral token carries minimal opaque attribution lineage, no private look/photo/age/trait data. App/browser handoff is an external purchase, not platform settlement.

Track `prepared → handed_off` independently of partner outcome. Only authenticated/signed, schema-valid, deduplicated partner conversion evidence can create `reported → verified` commercial events. A receipt-like client screen, app return URL or click is not proof. Attribution follows approved eligibility window, consent, funding and counterparty contract; unsupported confirmation stays unknown.

Record verified commissions in existing balanced money journals/payables under permanent business uniqueness. Reversal/return/chargeback events append compensating entries and revise recognized net metrics; never edit posted history. Partner statement reconciliation detects missing/delayed/reordered events and unpaid commissions. Product GMV, seller revenue and advertiser deposits are not platform revenue; avoid claiming affiliate and marketplace commission for the same transaction without real terms.

Acceptance: forged/replayed/postback/out-of-order events, last-click boundary/consent loss, self-referrals, partial returns, currency conflicts and worker crashes cannot duplicate a commission or payable. Real partner sandbox then controlled-live evidence is needed before claiming attribution/conversion/revenue capability.

## Workflow 4 — Book the Exact Look

Customer chooses a look/template and explicitly authorizes specific reference sharing with a verified eligible professional. Default to a non-personal style board; original selfie/private analysis is not silently attached. Professional access is scoped, short-lived, revocable and audited; no cross-customer/organization media browsing. Age/guardian/market rules govern both request and disclosure.

Request states: `draft → submitted → awaiting_professional → needs_clarification/quoted/declined/expired/withdrawn`. A quote records feasibility/limitations, service/materials/extension/lace/density/length details as relevant, full price/currency, installation duration, professional location/service area, terms and expiry. Do not guarantee an exact recreation of generated imagery. Hair/barber, modest styling, adaptive needs and cultural occasion preferences come from the user's explicit request and real professional capability evidence.

Customer acceptance binds one quote revision but is not itself slot confirmation. Initial referral pilot returns `quote_accepted_pending_booking` or partner-confirmed status only when real evidence exists. A later booking flow requires atomic resource/slot holds, explicit timezone, deposit/full balance and cancellation/no-show terms, verified payment and confirmation. Expiry/rejection/withdrawal revokes unused reference grants and associated pending work; keep only justified commercial/support evidence.

Acceptance: expired/superseded quote, concurrent slot claims, changed materials/price/duration, professional suspension, guardian/consent withdrawal and cross-tenant access fail safely. No lead is mislabeled as booking. Payment/deposit/refund claims require the later partner-backed flow and tests.

## Workflow 5 — later marketplace fulfillment, returns and disputes

Before platform checkout: decide seller/facilitator role per country, qualified payment methods, tax/invoicing, stock/slot hold semantics, refund/returns/support ownership and delivery evidence. A multi-merchant parent is an orchestration record with independently authoritative seller children, not atomic fulfillment across external companies.

Revalidate all quote lines → customer accepts full versioned obligations → reserve stock/slots and payment authorization with idempotent lineage → confirm eligible seller children → capture only according to the reviewed policy → record fulfillment/tracking/service completion evidence. On a partial failure, compensate uncommitted holds/authorizations and show confirmed children/remaining obligations. Never undo an already fulfilled order by hiding a parent failure, double-capture on retries, or promise an unconfirmed delivery date.

Returns/refunds/disputes are per eligible order line/service with reason/policy/quantity/currency and return evidence. Bound refunds by captured net amount and prior refunds; reverse creator/affiliate/platform commissions and seller payables as agreed. Immutable journals, fiscal credit notes where required and provider statement reconciliation explain every compensation. Track chargebacks after payout and accountable loss allocation; do not fabricate negative consumer spendable credits to repair a merchant loss.

Regional mobile-money/card/transfer, KYC/AML, taxes, cancellation/cooling-off, delivery/pickup, warranty, custom-tailor/alteration and no-show policies require local review and actual partner evidence. Reviews show verified-purchase/service labels only with evidence and support reporting/appeal/counterfeit action. Referral customers use the actual external seller's returns process with an honest GLAM support boundary; no platform-refund promise without authority.

## Workflow 6 — advertiser demand, brand studio and growth

Start with real eligible advertisers and measured demand, not an assumed auction revenue forecast. Campaign objective/market/currency/term/budget/rights/creative/landing destination/measurement contract is reviewed before any billable delivery. A small fixed-price or sponsored-collection pilot still needs clear earned-obligation rules, disclosure, fraud checks and reconciliation. CPC requires validated clicks/attribution/invoice evidence, hard account/campaign/day caps and no double charge. Complex auction/pacing rollout remains deferred behind existing [first-price integrity gates](look-ranking-commerce.md).

Eligible adult intent is explicitly selected nonsensitive look/category/occasion shopping context; no private photo, inferred appearance, biometric, religion, gender, disability, age/guardian records or protected-profile targeting. Some explicit style contexts may themselves reveal sensitive information; suppress advertising in those contexts under reviewed policy. Organic private matching can satisfy user preferences without disclosing them to advertisers. Initial unknown/teen/child contexts suppress ad delivery entirely. A bid never overrides safety, suitability, stock, policy, rights, budget or analysis integrity.

“Why this ad?” explains approved selected shopping context and sponsorship, not private traits. Distinguish Best Matches and Sponsored Matches with advertiser identity; paid collections also disclose sponsorship. Use signed delivery lineage, anti-replay/bot/velocity checks, deduplicated conversion verification, invalid-traffic credits and privacy-thresholded reporting; no private user drilldowns. Audit budget versus holds/spend and earned revenue separately. No fixture clicks/sales are reported as real demand.

Brand advertising studio: merchant supplies authorized product assets and claims → creates a draft promotional style → qualified AI rendering with explicit source/likeness rights and adult-only permitted creative under the initial policy → automated/human review for safety, counterfeit/false claims and misleading endorsement → approved version → publication/disclosed placement. Generation never auto-publishes and cannot rewrite product dimensions, pricing or efficacy. Real/synthetic people's likeness requires appropriate rights/consent and disclosure; no child-photo creative in the initial pilot. Record model/asset/rights/policy versions and revocation.

Growth uses explicit, rights-cleared style/template sharing and creator collections, with no automatic publication of customer selfies/results. Recipients try a style in mobile; web fallback promotes app downloads. Rewards are optional, age-eligible, rule-versioned server events with abuse/return reversals, not editable balances or appearance-pressure streaks. Storefront earnings need verified contracts/conversions. Full social-network expansion waits for moderation/support evidence.

## Event-driven commerce contract

Existing database outbox is the authoritative transactional handoff; consumers use inbox deduplication and current authorization. Version events and payload schemas. Envelope: `event_id`, type/version, occurred_at UTC, aggregate ID/revision/sequence, owner/tenant scope, correlation/causation IDs, relevant policy versions and allowlisted minimal payload. Private/internal events have scoped service access and retention; advertiser/public projections exclude private look IDs, photographs, traits, household details and sensitive denial reasons. A source signature authenticates origin, not business authority or current permission.

| Event / owner | Producer transaction | Consumer / failure behavior |
|---|---|---|
| `catalog.revision_approved.v1` / catalog | Publish reviewed source revision + outbox | Index only approved current sequence; replay is no-op; rebuildable projection |
| `inventory.snapshot_updated.v1` / inventory | Commit source watermark/stock facts | Suppress stale/unsupported offers; late sequence cannot restore obsolete stock |
| `merchant.eligibility_changed.v1` / trust | Audited verify/suspend/expiry | Block new publication/matches/ads and revalidate pending handoffs; do not fabricate seller acceptance |
| `look.revision_confirmed.v1` / looks | Owner confirms immutable requirements | Match private constraints without ad write access; consent/policy rechecked before model/index use |
| `offer.revalidated.v1` / catalog | Record actual source evidence and expiry | Invalidate/reprice dependent estimates; changed obligations require renewed acceptance |
| `referral.handed_off.v1` / referral | Approved destination/token lineage | Measurement only; no order, entitlement, booking or revenue grant |
| `affiliate.conversion_verified.v1` / attribution | Verified partner event + permanent uniqueness | Append commission/payable once; conflicting report quarantined, missing evidence pending |
| `commission.reversed.v1` / finance | Compensating journal from verified refund/chargeback | Reverse attributable net reporting/payables under agreement; no posted-history mutation |
| `professional.quote_accepted.v1` / professionals | Owner accepts unexpired specific quote | Booking request/slot workflow only where activated; acceptance alone cannot claim confirmed appointment |
| `order.child_confirmed.v1` / orders, later | Verified child order/payment state + outbox | Fulfillment/reconciliation scoped to child; retries cannot capture twice |
| `refund.verified.v1` / payments, later | Verified bounded refund/line allocation | Compensate canonical money/commission records exactly once and reconcile provider |
| `share.published.v1` / content | Explicit rights/age/purpose-approved asset allowlist | Public style projection only; unapproved/private assets never copied |
| `policy.access_revoked.v1` / policy | Consent/guardian/market/rights revocation + outbox | Invalidate caches/grants, stop queued work, revoke shares, trace vendor/deletion outcomes; financial lawful records minimized |

At-least-once delivery requires permanent business uniqueness beyond short API idempotency-key expiry, transactional state transitions and stable lock ordering. Use bounded retries/dead-letter investigation with an accountable owner. Test failures between business commit, outbox dispatch, provider acceptance, inbox commit, financial posting and acknowledgement. No distributed dual write pretending to be atomic. Event replay must not resurrect deleted private data, expired eligibility or withdrawn consent.

## Market activation and supply evidence pack

For each proposed country and age/capability combination, collect actual evidence rather than a continent-level “supported” label:

| Evidence | Required record / activation condition |
|---|---|
| Legal/role/payment | Reviewed seller/facilitator/referral contract, responsible parties, tax/consumer/privacy/store/age policies, licensed method/currency/provider routes as applicable |
| Supply | Named eligible merchants/brands/professionals/creators, signed rights/agreements, real feeds/services, scoped regional availability and support/returns ownership |
| Useful catalog | Curated pilot looks and applicable size/style/price bands, measured component/whole-look coverage, stale/rejected rate, actual delivered-cost completeness and agreed minimum thresholds |
| Professional feasibility | Verified relevant skill/resources/service area, response/quote/slot evidence, materials/full-price/terms coverage; requests distinguished from confirmations |
| AI/localization | Qualified per-capability/model/age/region, global cohort evidence, RTL/language/units/sizing accessibility, real device and uncertainty/abstention results |
| Demand/economics | Real opt-in pilot users/advertisers, verified clicks/leads/conversions, contribution by channel, variable/support/refund costs and budget/stop criteria |
| Operations | Named owners, support languages/hours, abuse/disputes/deletion queues, monitoring/backup/restore/incident evidence and country-specific rollback switches |

Pilot thresholds and denominators must be specified and approved before measurement/activation; an unset target is a failing gate, not zero required supply. Every surfaced purchasable/sponsored fact must have current provenance; every billable event must reconcile with its authoritative evidence. Suppress unqualified categories/countries rather than invent results to meet a coverage target. A possible Dress 4 Less feed and pilot advertiser interest are candidates until actual agreements/data exist. Coding does not recruit partners or authorize outreach by itself.

## Economics and acceptance

Use actual per-market/channel net receipts and recognized valid affiliate/commission/ad income. Deduct AI cost per accepted result including failed provider attempts, catalog processing, payment/store fees, shipping/service subsidies if platform-borne, creator funding, refunds/fraud/support, localized operations and attributable infrastructure. Add global content/translation review, age assurance/guardian support and expanded benchmark/legal cost. Existing example prices/commissions/funnels are hypotheses; no forecast is represented as measured performance.

The revised launch gate requires deterministic workflow/policy tests, real PostgreSQL concurrency and event replay/compensation tests, actual qualified source/partner evidence, global cohort/device/localization results, per-country legal/supply/operations approval and explicit release authorization. Prior AC-01–AC-12 criteria remain where applicable, with global/age coverage added and auction/settlement cases deferred only when those capabilities are disabled and clearly unlaunched.
