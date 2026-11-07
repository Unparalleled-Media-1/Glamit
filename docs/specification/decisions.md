# Decisions and implementation approval

**Current authority:** [Analysis-first build](analysis-first-build.md). The latest user instruction authorizes implementation now, then external connections. Face Analysis, Color Analysis, Glow-Up Guide and makeover lead the experience; Home · Analyze · AI Studio · AI Advisor · Profile replaces the earlier shopping-first navigation. One Expo app, consumer web, unified business portal and restricted admin share canonical identity/RBAC/backend/migrations. Older design-approval waiting and surface/navigation descriptions below are historical where they conflict; production activation/release gates remain.

The latest [UI/UX design brief](ui-ux-design-handoff.md) supersedes older surface/navigation/palette proposals **for design scope**: iOS, Android, responsive consumer web and separate merchant, advertiser, professional, creator and admin web workspaces. Mobile tabs are Home, Discover, Studio, Shop, Profile; Advisor is contextual. Fifteen admin UI groups map to the retained A01–A16 requirement IDs. Application implementation still awaits the required primary-flow/design-system and expanded-architecture review. Older mobile-only descriptions below record the preceding architecture baseline; the linked handoff governs current design scope.

The user approved the foundation and Complete the Look planning baseline on 3 November 2026; the original `Proposed` entries below describe design maturity, not an outstanding request to repeat that approval. Explicit later selections are recorded in ADRs 015–016 and [approval history](../approvals.md). Vendor, retention, launch and commercial details without evidence remain unresolved. Planning approval does not authorize production deployment or destructive database operations.

The latest [global Master PRD v2](master-prd-v2.md) and [12-opportunity companion extension](style-companion-extension.md) are the consolidated review package. Global inclusivity is the user-selected direction, but revised architecture/acceptance criteria require approval before expanded production implementation. This preserves prior foundation approval while superseding an exclusively African/adults-only target product and proposing a narrower referral-first commerce rollout.

## Architecture decision register

| ADR | Proposal | Reason / consequence | State |
|---|---|---|---|
| 001 | Expo iOS/Android for all non-admin workflows, Next.js public informational/download site and platform-wide web `/admin`, FastAPI/PostgreSQL/private storage/workers | Matches explicit surface choices; validate native SDK compatibility and global/age/guardian contracts | Required architecture; v2 detail proposed |
| 002 | Modular monolith plus worker pools, one Alembic history | Preserves transactional boundaries and reduces initial operating burden; modules must keep explicit ownership | Proposed |
| 003 | Transactional outbox/inbox, idempotent business effects | Avoids lost jobs and duplicate grants/settlements over at-least-once infrastructure | Proposed |
| 004 | Distinct balanced money and credit journals with reservations | Supports concurrency, reversals and auditable settlement; adds invariant and reconciliation work | Proposed |
| 005 | Purpose-bound private facial media, no identity recognition, no advertising access to appearance traits | Privacy-by-design; limits targeting and data reuse intentionally | Privacy restriction required; mechanisms proposed |
| 006 | Capability-specific provider adapters and qualified fallbacks | Avoids vendor lock-in; adapters do not erase different vendor policies or quality | Proposed |
| 007 | Single write region, multi-zone managed services, progressive country rollout | Easier initial consistency and data governance; provider availability may constrain region | Proposed |
| 008 | Licensed marketplace PSP rather than platform-held escrow | Reduces custody/licensing exposure; country support and merchant-of-record role require confirmation | Proposed |
| 009 | Contextual ads, relevance-gated first-price CPC for dedicated look slots, separate fixed-price collections, no appearance audiences | Complete the Look now specifies bidding; rollout requires audited measurement, privacy and billing gates | Proposed; revised by look extension |
| 010 | Global inclusive product with per-jurisdiction restricted teen and guardian-managed child experiences; staged country activation | Supersedes adult-only/exclusively African target; no automatic country/age availability or universal thresholds | User-selected direction; v2 architecture/criteria await approval |
| 011 | Git feature branches and PR evidence, protected branch controls | Repository/foundation exist; keep reviewable evidence and regression protection | Required workflow; remote policy evidence outstanding |
| 012 | Seven Complete the Look domain services inside existing backend; shared inventory/orders/ledgers | First-class shoppable looks without a second application/history | Proposed |
| 013 | Immutable decomposition/organic matching independent of sponsorship | Ads cannot alter analysis, quantities or organic ordering; private traits excluded from commercial context | Proposed; user-required separation |
| 014 | Verified versioned offers, freshness, revalidation and honest unknown states | No fabricated inventory/price/delivery; external handoff where authoritative checkout is unsupported | Proposed |
| 015 | Google via Supabase Auth, Supabase PostgreSQL; guided beauty scan after sign-in | User selected on 4 November 2026; integration deferred. Face scan is analysis, not login. [Detailed ADR](../adr-015-supabase-google-capture.md) | User-selected; not connected |
| 016 | Public informational/download website; web `/admin` controls the entire platform including mobile; every non-admin workflow in iOS/Android | User clarified on 5 November; supersedes consumer web/checkout and merchant/creator/advertiser web portals | User-selected; admin/downloads not implemented |
| 017 | [Master alignment](master-alignment.md) and [screen blueprint](screen-blueprint.md) | Upload counts add to 50 rather than 47; only six admin modules are named. Proposed normalization/remaining ten module definitions are labeled as design proposals | Design proposal; not new service/production approval |

## Unresolved decisions

| V2 ADR | Proposal / consequence | Review state |
|---|---|---|
| 018 | Three logical engines and global country/age/guardian/localization policy; disabled missing prerequisites, no inferred protected identity | Consolidated v2 architecture/acceptance proposal |
| 019 | Initial verified affiliate/referral shopping and non-binding exact-look professional requests; platform checkout/MoR and complex auctions deferred | Revised commerce rollout proposal; seller duties/agreements still need review |
| 020 | Free exploration and companion core: user-controlled Style DNA + Complete the Look + Occasion Concierge + confirmation-based Shopping Agent | Prioritized design proposal; no hidden premium charge or agent purchase authority |
| 021 | Later wardrobe/twin/groups/challenges/circular commerce/intelligence/API with independent rights/age/privacy/tenant gates | Staged proposal; no photorealistic child twin at launch or blanket vendor resale rights |

The table below concerns concrete evidence/configuration decisions. It does not reopen the already answered global positioning, iOS/Android, web/admin or Google/Supabase choices.

| Decision | Recommended starting point | Needed before / owner |
|---|---|---|
| First activated country/capability and audience mode | Global inclusive target is selected; choose actual pilot using supply/localization/legal/payment/age evidence. South Africa remains a candidate, not exclusive identity | Before market activation / product + legal + operations |
| Mobile platforms and web scope | Selected: iOS/Android non-admin product, informational/download website and web `/admin` for platform-wide control. Validate digital billing per mobile storefront | Platform decision answered; store/payment integration outstanding |
| Image/memory/twin retention and consent | Earlier durations remain proposals; separately approve purpose/age/processor-specific retained memory/wardrobe/twin scope, expiry/revoke and vendor deletion; no child persistent photorealistic twin at launch | Before collection/reuse / privacy + security |
| Hosting and transfer regions | Supabase selected for PostgreSQL; project region/plan still needs availability, transfer/privacy and cost review; prefer a suitable launch-region option where supported | Infrastructure setup / security + privacy |
| AI providers | Qualify at least two candidates per critical capability where feasible; no automatic unqualified fallback | Integration build / AI lead |
| Evaluation dataset | Global voluntary/consented hair/skin/visible-feature/body/adaptive/modest/cultural/device cohorts, measured disparity/uncertainty; youth data only after dedicated review; retain African expertise | Before qualified trials / privacy + AI + product |
| Trial budget | Approve a maximum $1k–$3k inference envelope, with licensing/rater budget separately quoted | Any paid vendor trial / finance |
| Seller/referral/facilitator/MoR responsibility | Proposed referral-first with explicit external seller/returns and professional-request boundaries; platform settlement/MoR require later explicit role/contract review | Before applicable commerce build / legal + finance |
| Payment vendors/countries | Select based on verified marketplace splits, KYC, local methods, refunds and settlement support; app stores for required digital channels | Checkout implementation / payments lead |
| Business model and pricing | Approve target margin and burn, then use measured provider/channel costs to set plans, credits, take rate and free quota | Billing product configuration / finance + product |
| Credit expiry/refunds and booking deposits | Country/store-compliant rules, clear disclosure, server-versioned policies | Paid beta / legal + product |
| Creator and ad attribution | Seven-day last eligible click; creator and ad credit tracked separately; no view-through initially | Creator/ads build / growth + finance |
| Ad charging and privacy | Fixed-price/CPC first, contextual only, minimum aggregate cohort proposal 50 plus anti-differencing controls | Advertising launch / privacy + ads lead |
| Social/content moderation | Curated publishing and reporting/appeals before broad creator access; staffed escalation | Creator release / trust lead |
| Team, spend and SLO ownership | Staff the roles assumed in estimates; approve initial capacity, availability and restore objectives | Schedule commitment / engineering + finance |
| Age/guardian and global release policy | Qualified assurance/guardian provider, per-jurisdiction legal/store/provider rules, revocation/child session model and accountable reviewers; no hardcoded universal ages | Before expanded age/country capability / privacy + legal + security |
| Pilot supply/demand and companion scope | Actual authorized feeds/partners, first complete look journey, measurable coverage/demand/support thresholds and confirmation-based agent tools | Before commercial pilot / operations + product + finance |

## Approved scope and remaining release boundaries

The recorded approval covers [R13–R27/architecture](complete-the-look.md), [schema/APIs](look-schema-api.md), [ranking/auction/commercial rules](look-ranking-commerce.md), and [AC-01–AC-12/economics/backlog](look-delivery-economics.md) as a baseline. Its parameters remain versioned policies to validate: relevance floor, first-price CPC, atomic holds/caps/frequency, token/click expiry, freshness, attribution, collection terms, pricing and country/provider eligibility. Real integrations and commercial release need their stated evidence; a design preview cannot satisfy those gates.

Authorized scope is **Phase 0 discovery/design and Phase 1 foundations**, plus dependency-appropriate Complete the Look foundation work. Repository initialization and the first foundation have already occurred. No new vendor purchase, secret provisioning, production deployment or destructive database operation is implied by the upload or this reconciliation. Charged vendor trials require an approved budget and securely supplied credentials.

Before Phase 2 provider integration, record vendor privacy terms, quality/cost evidence and approved retention settings. Before paid beta, approve actual plans, prices, payment/store arrangements and country-specific terms. Before marketplace/creator/ad rollout, require the corresponding phase gates. Before production deployment or destructive database changes, request explicit action-specific approval with a concrete reviewed release/change plan.

Subsequent PRs should preserve the single migration history and regression evidence. Review standalone wireframes as design artifacts before expanding actual product routes; do not represent them or fixtures as live integrations. Keep decisions versioned as evidence changes.
