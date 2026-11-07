# Current UX connection boundary

The goal-led redesign is interactive user-authored planning. Device metadata memory is opt-in; cloud profile/report/wardrobe sync, real conversation generation, invitation OCR/official-theme verification and combined look rendering need qualified identity/storage/provider integrations. No device location is collected; manual destination and currency do not activate a market or convert prices. The 10% server item-fee policy is a calculation, not a payment/order/settlement ledger. See [all remaining gaps](../specification/goal-led-backlog.md).

# Deferred connections and activation

The user requested code/build first, tools and hosted databases afterward. No credentials are needed to run the current local UI or isolated tests. No paid vendor calls or production changes were performed.

| Connection | Code boundary now | Required before activation |
|---|---|---|
| Google + Supabase Auth | Existing signed JWT verification; in-memory `GlamApi` token supplier; no token persistence or Google-password collection | Selected project, redirect/PKCE/session and browser BFF or reviewed CORS design, refresh/revocation; secure credential settings |
| Supabase PostgreSQL | One Alembic chain through `0008_catalog_market_policy`, server-only RLS, real local PostgreSQL tests | Selected hosted project/runtime role and region; reviewed canonical migration run; no direct client access to private tables |
| Private image storage | Device-only browser object URLs / native app-owned cache; no server upload accepted | Signed owner/purpose-bound upload/read grants, content validation, retention/vendor deletion, region/rights/age/consent qualification |
| Face and color analysis | Dedicated screens and truthful uncomputed states; `POST /v1/analysis/requests` deliberately returns unavailable | Selected qualified cosmetic-analysis provider, structured uncertainty/correction output, quality/inclusivity evidence; no scores or diagnosis |
| Makeover / Hair / Makeup Match | Separate controls and original-preserving comparison; no output fabrication | Selected generation provider, likeness/complexion/fidelity evaluation, accepted server quote, job/outbox cancellation/deletion |
| AI Advisor / guides | Editable user-authored routines; no fabricated AI answer | Grounded qualified provider, sources/age/purpose safety, independent commercial disclosures, consent and deletion |
| Workspaces / invitations | Server capabilities, membership/grants, intended-recipient acceptance and scoped draft CRUD | Trusted verification process and minimal eligibility assertions; real team identity lookup/notification integration; no public self-approval |
| Internal administration | Separate expiring staff grants and `/v1/admin/context`; operational actions remain off | Selected issuer must supply verified AAL2 and fresh integer `auth_time` or a reviewed equivalent; audit/step-up/approval flows; domain-specific operational endpoints and regional scope |
| Merchant feeds / matching | Secondary checklist, exact/similar requirements, source/stock/cost unknown | Authorized source feeds and rights, freshness, SKU evidence, returns/support and destination contracts |
| Professional booking | Feasibility/reference/quote interface; no request or appointment claimed sent | Verified professionals, actual slots/resources, full quotes, explicit acceptance, cancellation and payment responsibility |
| Store subscriptions / credits / payments | Existing internal credit kernel; no commercial grant/purchase/payout API activated | Approved plans, store/PSP SDK/webhook verification, ledger/entitlements, refund/reconciliation/settlement tests |
| Advertising / creator / affiliate | Planning forms, gated campaign wizard, distinct organic/sponsored requirements | Verified source events, rights/moderation, caps/consent, attribution/refunds and recognized commissions; no face/profile targeting |
| Companion expansion | Wardrobe/calendar/groups/agent planning interfaces | Private persistence/sharing/revocation, real source evidence, explicit transaction confirmation; rentals/resale/B2B require later contracts |

“Connection pending” does not mean every domain service is implemented. Domain execution for AI jobs, persistent reports/media, real matching, publication, bookings, settlements, verified analytics and privileged admin changes remains implementation/integration work. Planning notes are not those records. Device builds, camera/privacy testing, complete localization, accessibility, provider evaluation and representative pilot evidence remain necessary before release.

Supply credentials through secure environment/project settings when ready, not chat or source files. The SDK port uses HTTPS (or loopback development), no-store requests, omitted cookies and rejected redirects; no arbitrary token-bearing URL parameters. Consumers must abort in-flight requests on context changes and discard prior-tenant state before presenting new records. Server permissions remain authoritative.

The contextual catalog and leased preparation protocol are now implemented; see the catalog addendum for exact API/state coverage. Private binary media ingestion/read grants, actual enhancement/OCR/translation/embeddings, AI billing, provider fidelity qualification, live advertiser delivery and authenticated client wiring are still deferred. Only trusted future staff/operating workflows can provision market policy/capability/eligibility evidence; no public toggle activates a market.
