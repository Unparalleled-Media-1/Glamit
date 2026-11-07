# Implementation evidence and remaining gates

**Latest payment authority — 6 November 2026:** Zanzu Technologies Inc. operates GLAM AI. The user authorized **Stripe Connect test mode only**, including additive sandbox financial tables and the existing 10% completed physical-item policy. Existing production financial records, live payment activation and production Supabase remain protected. See [payment architecture](payments/PAYMENT_ARCHITECTURE.md), [readiness](payments/STRIPE_CONNECT_READINESS.md) and [financial regression](payments/PAYMENT_REGRESSION_REPORT.md). Isolated tests pass; actual Stripe acceptance is blocked and integration is not complete.


**Latest authority — 6 November 2026:** The user approved the five golden patterns as the visual direction, subject to functional/usability validation, and authorized the sixth Personalized Results pattern, missing journey completion and the selected provider preparations. Preserve the five patterns and existing navigation; keep Supabase disconnected pending G0 and payments inactive. Existing financial/authentication/migration code and production data must not change. See [current scope](specification/ux-completion-and-integrations.md), [regression report](ux-regression-report.md) and [service readiness](service-integration-readiness.md). Live end-to-end and native-device acceptance remain blocked.


**Latest directive — golden-screen recovery and feature freeze (5 November 2026):** [Visual gap report](specification/visual-gap-report.md), [review and design system](specification/golden-screen-review.md), [frozen feature contracts](specification/feature-freeze-contracts.md) and [proposed Destination Stylist](specification/destination-stylist-contracts.md) govern this revision. Five golden patterns are implemented as review candidates. Primary navigation remains Home / Analyze / AI Studio / AI Advisor / Profile. Visual approval is pending; no external integration or production readiness is claimed.


## Interactive preview and GitHub publication

The user explicitly authorized pushing the past 24 hours' builds and creating an interactive preview. All eight earlier snapshots now have verified GitHub branch hashes; see [published build inventory](application-preview/published-build-snapshots.json). The default branch was not merged. A new static review hub mounts the actual consumer/business components with phone/desktop viewport and nine journey entries; repository-prefix routing and local-photo/privacy/access gates are browser-tested. [Preview build and hosting instructions](application-preview/interactive-preview.md) distinguish tested local/static artifacts from unverified Pages deployment. API-based GitHub Pages management was Forbidden locally. No live AI, merchant, booking or payment activation follows from publication.


## Latest beauty-led visual revision

Actual web/native Home, Analyze and Studio now use original portrait-led campaign/editor layouts with charcoal/blush styling. Home keeps immediate analysis/stylist entry and all six goals. Analysis has a framed editorial reference with permission-first entry, not an active scan. Studio provides tool-specific directions, reference thumbnails, color families/swatches and original-preserving controls; selected makeup mood enters the correct Look Builder component. Color has an illustrative palette explorer. See [visual revision](specification/beauty-led-visual-pass.md) and [actual capture sheet](application-preview/visual-review.png).

The prior goal-led data/privacy/RBAC/catalog behavior is retained. No personal model output, provider, authentication sync, inventory, product compatibility, booking or payment is claimed live. Physical-device and human competitor usability benchmarks remain open. This is a visual/interaction revision, not completion of every platform module or a competitive-parity claim.


## Latest goal-led UX update

[Goal-led experience](specification/goal-led-experience.md) replaces the tool-led home with six goal journeys and immediate Face Analysis/Personal Stylist actions. Actual web/native components share a user-authored event/conversation brief, independent five-component Look Builder, snapshot save/edit/delete, owned-wardrobe notes/reuse, Get This Look breakdown and opt-in editable/deletable device profile metadata. Raw photos, inspiration files, conversation text, grants and uncomputed reports are excluded from durable memory. Google/Supabase account sync and actual approved analysis-report persistence remain unconnected. Web nav is fixed with reserved safe-area space; native uses measured safe-area context.

A pure central server policy calculates the fixed 10% eligible item-sale fee and cumulative refund reversals; no order ledger, checkout, settlement or service commission is activated. Existing canonical catalog/RBAC/migrations remain unchanged. No external connection, market activation or production database migration is made. The [phased gap backlog](specification/goal-led-backlog.md) preserves all six briefs' remaining requirements. Provider-generated recommendations/previews, invitation extraction, real matching accuracy, device/human usability, live catalog/booking/payment evidence remain open.


## Current contextual-catalog update

The [catalog addendum](specification/contextual-catalog-build.md) implements embedded recommendations across Face/Hair/Skin/Body & Fit/Color/Makeup Match/Makeover/routines in web and native. Users can save/delete chosen requirements; disconnected views say no verified matches. Qualified-response cards distinguish organic/Sponsored, Exact/Similar, source condition, known/unknown cost and fresh handoff/quote review. No merchants or paid placements are seeded.

Snap & List now has local original product photos, optional enhancement controls, manual factual review, duplicate validation, session drafts/catalog health, bounded web JSON import/export and native camera/gallery integration. Live enhancement, storage upload, canonical client persistence and authenticated publication are not connected. Catalog counts refer to real session drafts only.

Canonical backend additions: scoped single/bulk listing creation, immutable factual revisions, separate fresh staff content review, source/rights/freshness publication, atomic bulk publish, withdrawal/new-version rollback, transactional outbox/index worker, strict product/professional matching, exact identifier/source scoping, explicit cost/condition handling, private saved requirements and lease/idempotency-safe AI-preparation worker protocol. Source catalogs, private binary storage and real AI adapters remain deferred. Market discovery is default-deny through immutable latest policy versions; none is activated outside tests. Canonical head is `0008_catalog_market_policy`; only the dedicated local test database receives migrations in this update.

Sponsored serving/budgets/attribution, notifications, purchase/booking, external feed rights, real model output/quality and physical-device image behavior still require implementation/integration and qualification. See [connections](application-preview/connections.md) and [validation](validation.md). Earlier implementation records below are historical where they conflict.

## Current analysis-first application build

The newest explicit user instruction authorizes coding/building now, followed by external connections. See [the authoritative build specification](specification/analysis-first-build.md). Earlier approval-wait/navigation text below records prior revisions.

| Delivered in this build | Evidence / boundary |
|---|---|
| Actual consumer web + Expo app | Home, Analyze, AI Studio, AI Advisor, Profile; dedicated consent/photo-quality/goals/report/color/guide/history/privacy and secondary commerce/companion routes. No fabricated inference or makeover results |
| Browser local photo preparation | Permission before file selection, MIME/size/dimensions checks, local object URL and explicit clearing; no facial quality model or server upload |
| Native photo integration | Expo picker/camera permission and app-owned cache deletion code; iOS/Android JS exports pass. Native device/camera behavior remains unverified |
| Guides / routine interaction | Editable, checkable and deletable session routines; optional interests and reset. No private persistent browser storage; account sync deferred |
| Consumer persistence API | Authenticated owner-only routine create/read/update/delete, optimistic revisions, idempotent creation and audit; real PostgreSQL tests |
| Unified business portal | Five role inventories, module-specific planning forms, isolated session drafts and seven-step campaign review; no approved tenant activated or business operation executed |
| Canonical server RBAC | Verified/unexpired capability + eligible adult assertion + active organization membership + workspace grants; read/write separation; no public self-verification endpoint |
| Team invitations | Owner-issued recipient-bound invitations; acceptance, expiration, revocation, role revocation and changed-authority checks; no email/notification delivery connected |
| Business draft API | Scoped CRUD with optimistic updates/idempotent creation/audit; capability/permission rechecked before replay, no cross-tenant access |
| Restricted admin | Public module/role inventory only, no staff records, privileges or operational controls. Separate staff-context API requires expiring staff grants and fresh AAL2/auth_time; full operational staff portal remains connection/implementation work |
| Canonical migrations/contracts | Additive 0004/0005/0006, server-only RLS for all new tables; actual OpenAPI/TypeScript contracts regenerated; migrations exercised on dedicated local test DB only |

Remaining: connect Google/Supabase Auth and hosted PostgreSQL; qualify age/guardian/market/privacy policies; private storage, real provider analysis/makeovers/Advisor, persistent results/history and deletion; source-backed catalog/matching/full-cost budgets; professional availability/quotes/booking; publication/moderation; payments/subscriptions/ledger/payout execution; verified analytics and admin staff authority; native/device, accessibility, localization, provider quality and pilot/recovery evidence. The broad marketplace and later companion proposals are not fully implemented by planning forms. Current code is a reviewable build, not a market-ready platform.

Current application code is a limited foundation, not the completed platform or a production release. This file records the delivered subset; all feature and release gates without evidence remain open. The revised global [Master PRD v2.0](specification/master-prd-v2.md) and age/commerce architecture await review before expanded production implementation.

Latest design scope (5 November 2026): the [UI/UX handoff](specification/ui-ux-design-handoff.md) supersedes the earlier mobile-only/landing-only design restriction with eight application designs. Home, Discover, Studio, Shop, Profile are the proposed mobile destinations; Advisor is contextual. The standalone HTML prototype contains 133 dedicated screen-family studies, separate role workspaces and original illustrative imagery. Native Figma authoring remains outstanding. Only the existing web/mobile application foundation screens are implemented; the prototype adds no production routes, identity/provider/catalog/payment connection or privileged access. Primary flows/design system and expanded architecture still await review.

The uploaded master specification is now mapped in `docs/specification/master-alignment.md`, with screen families/admin modules in `screen-blueprint.md` and a standalone interactive design proposal in `docs/design-preview/index.html`. These are planning/design artifacts; they do not add working app routes, native navigation, admin authorization, uploads, billing, catalogs or AI. `/admin` is intended to control the entire platform, including mobile apps.

PRD v2 expands the target to global inclusive styling and age-specific experiences, with African categories fully supported. It adds explicit visual search, delivered-cost budgets, professional feasibility requests, referral-first commerce, supply/verification/trust/returns/growth plans and jurisdiction/guardian/localization contracts. These remain designs. Runtime age/market enforcement, guardian accounts, minor processing, global activation and commerce integrations have not been implemented or enabled. Standalone preview copy reflects the global direction only.

All 12 companion opportunities are consolidated in `style-companion-extension.md`, including Style DNA, wardrobe/twin, Occasion Concierge, group planning, agent proposals, circular commerce, reviewed catalog assistance, challenges, aggregate intelligence, daily utility and later B2B API. M01–M71/B01–B03 are proposed screen families, with no implication that they exist in the native app. No memory/agent/twin/marketplace feature is implemented by this planning update.

| Work / requirement | Current implementation | Remaining gate |
|---|---|---|
| B10 repository/toolchains/CI | Feature branch, approved design snapshot, repaired frozen JS installation and compatible compiler, shared React runtime checks in CI, Next.js/Expo shells; see validation.md | Remote CI result and branch protection; native device builds |
| B11 identity/tenant access | RS256/ES256 issuer/audience/signature/expiry verification, owner-scoped resources and organization membership reads; Google through Supabase Auth selected | Supabase connection deferred by user; login UI, privileged MFA, permission administration and full RBAC matrix |
| B12 canonical schema | One Alembic history, additive baseline/safety/server-only RLS migrations, financial/immutability constraints; Supabase PostgreSQL selected | Supabase connection deferred; full entity model, production runtime-role/tenant RLS policies and migration release review |
| B13 consent/privacy | Approved-policy references, append-only consent, private manual look deletion and withdrawal cleanup worker, redacted request evidence | Real policy approval, facial media/private object storage, vendor deletion, retention scheduling and backup tombstones |
| B14 jobs/outbox | Atomic credit/privacy outbox writes, transactional privacy consumer with safe concurrent claims | Managed durable broker, AI dispatch, retry/dead-letter/timeout reconciliation and other event consumers |
| B15 commercial kernel | Internal balanced append-only credits, reserve/capture/release, deduplication, no negative user buckets | Credit lots/expiry/grant verification, balanced money ledger, store/PSP webhooks, reconciliation and payouts; no commercial credit issuance enabled |
| B16 operations | Sanitized request IDs/log fields, local PostgreSQL, explicit readiness/liveness and CI | Exported telemetry, cloud IaC, alerting, restore/SLO/penetration evidence |
| CTL-02 / R13 foundation | Private user-authored look/component revisions, explicit quantity validation and immutable content hashes | AI decomposition/provider adapters, dependency graph, full taxonomy and measured benchmark |
| CTL-04/08 primitives | Decimal organic scoring and evidence/relevance-gated first-price candidate ordering with tests | Verified catalog matching, transactional ad cap/frequency reservations and live auction/billing integration; no ad-serving endpoint |
| Other R01–R27 / CTL work | Approved design/backlog only | Remains unimplemented; no actual merchants/inventory, AI outputs, bookings, conversions or revenue are asserted |

Fixtures are restricted to automated tests. JWT tests use generated test keys, and API authorization tests stub only the JWKS transport; they are not evidence of a connected identity provider. PostgreSQL tests exercise actual commits, row locks, deferred journal constraints, concurrency, idempotency and consent deletion. Ranking tests establish policy primitives, not catalog relevance, African-hair quality or full auction integrity.

No production deployment, destructive schema rollback, paid vendor trial or fabricated commercial integration is included. External prerequisites: connect the selected Google/Supabase Auth and PostgreSQL project when the user requests it; qualify AI and payment vendors; license evaluation data; choose private storage/queue/project region and approve legal policies. Enter credentials only through secure settings, never chat. These prevent calling Phase 1 or the application fully ready. [ADR 015](adr-015-supabase-google-capture.md) records the confirmed automatic beauty-capture/results flow; camera/provider implementation remains future work.

See `validation.md` for current-run check results and `pr-description.md` for review scope. Update this matrix with each subsequent feature PR; never mark a broader requirement complete from its foundation slice.
