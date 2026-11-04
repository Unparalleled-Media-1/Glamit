# Decisions and implementation approval

All ADRs are `Proposed`. User-specified architecture and engineering rules are requirements; proposed launch details below need approval. Approval of planning documents is not production deployment approval or permission for destructive database operations.

## Architecture decision register

| ADR | Proposal | Reason / consequence | State |
|---|---|---|---|
| 001 | Expo consumer mobile, Next.js web/dashboards, FastAPI backend, PostgreSQL, private object storage, async workers | Matches requested architecture; validate native SDK compatibility before selecting try-on vendors | Required architecture; detailed design proposed |
| 002 | Modular monolith plus worker pools, one Alembic history | Preserves transactional boundaries and reduces initial operating burden; modules must keep explicit ownership | Proposed |
| 003 | Transactional outbox/inbox, idempotent business effects | Avoids lost jobs and duplicate grants/settlements over at-least-once infrastructure | Proposed |
| 004 | Distinct balanced money and credit journals with reservations | Supports concurrency, reversals and auditable settlement; adds invariant and reconciliation work | Proposed |
| 005 | Purpose-bound private facial media, no identity recognition, no advertising access to appearance traits | Privacy-by-design; limits targeting and data reuse intentionally | Privacy restriction required; mechanisms proposed |
| 006 | Capability-specific provider adapters and qualified fallbacks | Avoids vendor lock-in; adapters do not erase different vendor policies or quality | Proposed |
| 007 | Single write region, multi-zone managed services, progressive country rollout | Easier initial consistency and data governance; provider availability may constrain region | Proposed |
| 008 | Licensed marketplace PSP rather than platform-held escrow | Reduces custody/licensing exposure; country support and merchant-of-record role require confirmation | Proposed |
| 009 | Contextual ads, relevance-gated first-price CPC for dedicated look slots, separate fixed-price collections, no appearance audiences | Complete the Look now specifies bidding; rollout requires audited measurement, privacy and billing gates | Proposed; revised by look extension |
| 010 | Adults-only South Africa/English/ZAR planning launch | Bounded legal, payment and localization scope; global architecture does not enable all markets automatically | Proposed |
| 011 | Git feature branches and PR evidence, protected main after bootstrap | Reviewable changes and regression protection; empty repository needs an initial authorized commit | Required workflow; bootstrap pending |
| 012 | Seven Complete the Look domain services inside existing backend; shared inventory/orders/ledgers | First-class shoppable looks without a second application/history | Proposed |
| 013 | Immutable decomposition/organic matching independent of sponsorship | Ads cannot alter analysis, quantities or organic ordering; private traits excluded from commercial context | Proposed; user-required separation |
| 014 | Verified versioned offers, freshness, revalidation and honest unknown states | No fabricated inventory/price/delivery; external handoff where authoritative checkout is unsupported | Proposed |
| 015 | Google via Supabase Auth, Supabase PostgreSQL; guided beauty scan after sign-in | User selected on 4 November 2026; integration deferred. Face scan is analysis, not login. [Detailed ADR](../adr-015-supabase-google-capture.md) | User-selected; not connected |

## Unresolved decisions

| Decision | Recommended starting point | Needed before / owner |
|---|---|---|
| Launch country, audience and product surface | South Africa, 18+, English/ZAR; P3 consumer AI + catalog first, limited verified professionals after P4 | P0 / product + legal |
| Mobile platforms and web checkout scope | iOS/Android consumer, responsive consumer web and desktop role dashboards; validate digital billing per storefront | UX and billing build / product |
| Image retention/consent | 24h captures, 7d unsaved outputs, 90d saved looks, 30d opted-in traits; no customer model training | Provider selection / privacy lead |
| Hosting and transfer regions | Supabase selected for PostgreSQL; project region/plan still needs availability, transfer/privacy and cost review; prefer a suitable launch-region option where supported | Infrastructure setup / security + privacy |
| AI providers | Qualify at least two candidates per critical capability where feasible; no automatic unqualified fallback | Integration build / AI lead |
| Evaluation dataset | License/recruit consented representation across hair families/skin tones; approve proposed metrics and sampling | Trials / privacy + AI + product |
| Trial budget | Approve a maximum $1k–$3k inference envelope, with licensing/rater budget separately quoted | Any paid vendor trial / finance |
| Merchant of record and payout responsibility | PSP-connected merchant sales; determine digital subscription seller and tax duties explicitly | Commerce build / legal + finance |
| Payment vendors/countries | Select based on verified marketplace splits, KYC, local methods, refunds and settlement support; app stores for required digital channels | Checkout implementation / payments lead |
| Business model and pricing | Approve target margin and burn, then use measured provider/channel costs to set plans, credits, take rate and free quota | Billing product configuration / finance + product |
| Credit expiry/refunds and booking deposits | Country/store-compliant rules, clear disclosure, server-versioned policies | Paid beta / legal + product |
| Creator and ad attribution | Seven-day last eligible click; creator and ad credit tracked separately; no view-through initially | Creator/ads build / growth + finance |
| Ad charging and privacy | Fixed-price/CPC first, contextual only, minimum aggregate cohort proposal 50 plus anti-differencing controls | Advertising launch / privacy + ads lead |
| Social/content moderation | Curated publishing and reporting/appeals before broad creator access; staffed escalation | Creator release / trust lead |
| Team, spend and SLO ownership | Staff the roles assumed in estimates; approve initial capacity, availability and restore objectives | Schedule commitment / engineering + finance |

## Requested approval scope

Complete the Look requires review of [R13–R27 and architecture](complete-the-look.md), [schema/APIs](look-schema-api.md), [ranking/auction/commercial rules](look-ranking-commerce.md), and [AC-01–AC-12/economics/backlog](look-delivery-economics.md). Decide organic weights/quality floor; first-price CPC; account/day/total holds and cap-change rules; frequency limits; 5-minute tokens/24-hour click validation; feed freshness; seven-day attribution and commission funding; collection terms; decomposition quota/pricing; launch countries/providers and evidence thresholds. Nothing is approved by this update. Approve this baseline before production implementation; deployment remains a separate later approval.

Approve this architecture as the planning baseline and authorize **Phase 0 discovery/qualification and Phase 1 foundations only**, subject to resolving the applicable decisions above. Also authorize initialization of the empty Glamit repository on an initial feature branch and opening a documentation/foundation PR once Git write access is available. No vendor purchase, secret provisioning, production deployment or destructive database operation is performed or implied by this package. Vendor trials with charges require the approved budget and credentials supplied securely.

Before Phase 2 provider integration, record vendor privacy terms, quality/cost evidence and approved retention settings. Before paid beta, approve actual plans, prices, payment/store arrangements and country-specific terms. Before marketplace/creator/ad rollout, require the corresponding phase gates. Before production deployment or destructive database changes, request explicit action-specific approval with a concrete reviewed release/change plan.

If approved, the first PR should commit the requirements matrix, backlog, ADRs and release checklist, then establish locked toolchains, a single migration baseline and CI test harness. It should not add a broad set of unfinished product screens or represent fixtures as live integrations. Keep decisions versioned as evidence changes.
