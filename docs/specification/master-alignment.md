# Master specification alignment — 5 November 2026

Revision note: this is the v1-source reconciliation. The later [Master PRD v2](master-prd-v2.md) supersedes exclusively African/adults-only target assumptions and adds global age/guardian/localization and commerce operating plans. Preserve this file as source traceability; use v2 for subsequent implementation planning. The original 47-versus-50 count remains a source discrepancy, with v2 route additions in the screen blueprint.

The subsequent [style-companion extension](style-companion-extension.md) consolidates all 12 additional opportunities into v2, including explicit user-controlled memory and confirmation-based shopping. Its staged priorities do not alter the revised-architecture approval requirement or imply live services.

This is the architecture/design deliverable requested in the uploaded GLAM AI master specification. It reconciles that document with the existing approved foundation and Complete the Look plans. It does not establish that the proposed integrations or screens work.

The [original upload](sources/2026-11-master-product-specification.txt) is preserved verbatim as the supplied master input. It contains earlier conversation excerpts, alternatives and copied builder prompts; these do not override explicit user decisions or authorize deployments, purchases or destructive operations. [Approval history](../approvals.md) records the already approved foundation/Complete the Look baseline; it need not be approved again merely because the source was uploaded again.

## Decisions carried forward

| Topic | Governing direction | Current evidence |
|---|---|---|
| Public website | Informational landing page directing people to iOS/Android downloads | Existing informational shell; store URLs not configured |
| Web administration | `/admin` manages the entire platform, including mobile users, content, billing, AI operations, feature configuration and business-role workflows | Design only; no implemented admin session, MFA, API or portal |
| All non-admin workflows | iOS/Android apps, including merchant, creator, professional and advertiser accounts | Existing Expo foundation screen only |
| Identity/database | Google via Supabase Auth and Supabase PostgreSQL; connection explicitly deferred | Backend verifies asymmetric test tokens; no live project/login |
| Capture | Explicit consent and guided beauty scan after Google sign-in, not face login | [ADR 015](../adr-015-supabase-google-capture.md); no camera/provider integration |
| AI/commerce/privacy | Capability-specific adapters, private inputs, no advertiser access to appearance traits, server-side prices/credits and one Alembic history | Partial foundation only; see implementation-status.md |

The upload's guest-before-sign-in flow and local registration/password-reset proposals conflict with the selected Google-first capture flow. Retain them as deferred alternatives; do not introduce a second identity system or unauthenticated image processing by implication. Its proposed merchant/creator web portals are superseded by the user's mobile-only non-admin surface decision.

## Requested deliverables and canonical locations

| Requested output | Canonical document | Remaining gap / delivery state |
|---|---|---|
| Full architecture/repository | [Architecture](architecture.md) | Modular API/workers, shared auth/ledgers; web limited to public site and `/admin`; managed services still need qualification |
| Database entity relationship model | [Data model](data-model.md), [look schema](look-schema-api.md) | Logical models, not installed migrations; upload-specific advisor/routine/feedback additions below |
| Complete screen inventory | [Screen and design blueprint](screen-blueprint.md), [existing role inventory](product-delivery.md) | Concrete mobile screen families and 16 proposed admin modules; count discrepancy recorded |
| Provider evaluation/cost model | [Providers/economics](providers-economics.md) | Capability shortlist, disqualifiers, rubric, sampling and reproducible scenarios; no measured winner or current vendor quote |
| Subscription/credit/transaction architecture | [Architecture](architecture.md), [data model](data-model.md), [economics](providers-economics.md) | Separate entitlements, credit lots, money/credit journals and reconciliation; lots/billing integrations still unbuilt |
| Advertising/attribution/reporting | [Look ranking/commerce](look-ranking-commerce.md), [look schema](look-schema-api.md) | Contextual eligibility, first-price CPC, atomic caps, frequency, deduplication, attribution and suppressed reports; no live serving |
| Complete the Look engine | [Requirements](complete-the-look.md), [schema/APIs](look-schema-api.md), [delivery/economics](look-delivery-economics.md) | Seven logical services share existing inventory, identity, ledgers and orders; most remain designs |
| Phased backlog/dependencies | [Product/delivery](product-delivery.md), [look backlog](look-delivery-economics.md), next steps below | Existing P0–P7 phase IDs remain canonical; uploaded six-phase schedule is a narrative, not a second backlog |
| Security/privacy/compliance | [Security/privacy](security-privacy.md), [ADR 015](../adr-015-supabase-google-capture.md) | Legal, retention, runtime-role/RLS, MFA, private storage and provider evidence remain release gates |
| Automated tests/release strategy | [Product/delivery](product-delivery.md), [validation](../validation.md), acceptance mapping below | Passing 32 foundation tests does not validate the absent full journeys |
| Infrastructure/AI costs | [Base economics](providers-economics.md), [incremental look costs](look-delivery-economics.md) | Hypothetical USD scenarios, explicit exclusions and no double counting; reprice selected Supabase region/plan |

## Upload-specific model additions

These extend the logical model under the existing canonical migration history. Names in the upload are conceptual domains, not a demand to replace installed tables or create duplicate ledgers. `users` maps to the existing `app_user` implementation and logical `user`; `user_consents` maps to append-only consent events; `credit_ledger` maps to balanced journals/postings; subscription events map to verified commercial events; deletion jobs map to tracked data requests and downstream tasks. Analysis/generation jobs specialize the common `ai_job` lifecycle rather than creating competing job authorities.

Every new row has UUID identity, creation/update/version timestamps as appropriate, owner/tenant FKs and scoped indexes. Encrypt private content and honor purpose-specific deletion; use explicit publication state for public routines/content. Final retention durations require privacy review.

| Entity | Relationships / invariants | Privacy and retention boundary |
|---|---|---|
| `analysis_result` | Owner → user, job → succeeded analysis `ai_job`, source → private media, model/taxonomy/schema versions, confidence and lighting limitations; immutable versioned output | Private cosmetic guidance, no attractiveness score/diagnosis/identity embedding; source permission controls access |
| `analysis_feedback` | Owner → user, result → owned result, correction category, user-provided correction, timestamp; index owner/result/time | Explicit permission to use for evaluation; no automatic training reuse |
| `ai_conversation` | Owner → user, purpose/consent, state, deletion deadline; optional owned analysis reference | Private chat; do not copy sensitive context to advertising/analytics |
| `ai_message` | Conversation → owned conversation, role, content, provider-attempt reference, sequence; unique conversation/sequence; no client-created assistant output | Prompt and output deletion follows conversation/consent; redact telemetry |
| `beauty_routine` | Owner → user, source analysis/conversation optional, title/version/state; user saves explicitly | Private until an independently reviewed publication flow; no medical advice |
| `routine_step` | Routine → routine, position, instructions, optional verified product reference; unique routine/position | No fabricated merchant efficacy/availability; routine deletion removes steps |
| `routine_progress` | Owner → user, step → owned routine step, occurrence/completion; unique step/occurrence | Optional tracking; withdraw/delete independently of financial records |
| `referral` | Referrer/referee → users, server code, eligibility/rule version, verified reward commercial-event reference; permanent event deduplication | No contact scraping or premature credit grant; fraud/account-deletion policy review |
| `provider_incident` | Provider/model → registry, incident window/status, redacted diagnostic reference and evaluated fallback policy | No prompt/photo bodies in incidents; audit policy for operational evidence |
| `user_session` | User → user, provider session identifier/hash, device/revocation metadata, expiry; unique provider/session | Supabase remains session authority; never store raw bearer/refresh tokens in application tables |

### Proposed API delta

These are design contracts, not endpoints present in generated OpenAPI. All use server ownership/RBAC, the existing error envelope, cursor pagination and scoped idempotency for side effects. Actual endpoint additions require implementation tests and regeneration of the existing OpenAPI/TypeScript artifacts.

| Group | Contract boundary | Key acceptance behavior |
|---|---|---|
| Auth | Google/Supabase callbacks and backend bearer validation | PKCE/state/nonce and exact issuer/audience; `/auth/guest` and local register deferred |
| Preferences | `PATCH /v1/me/preferences` with versioned, allowlisted preferences | Reject role, balance, price and entitlement mutations |
| Media/analysis | Upload intent, create analysis, read owned status/result, feedback | Consent, safe signed upload, validated/quarantined asset, quote and quality gates; never upload just by opening screen |
| Generation | Create, poll, cancel owned generation | Immutable accepted quote; reserve once, consume only verified success, release once on failed/cancelled/expired; resolve cancel/success races server-side |
| Advisor | Conversation create/list and message submit | Owned context only, purpose consent, policy-checked responses, no fabricated products; provider timeout/retry lineage |
| Routines | Owned routine list/detail/save/progress | Idempotent saves/completions, user correction, deletion and no medical treatment claims |
| Billing | Entitlements, credit history, verified restore, RevenueCat webhook if selected | App-store verified transactions; signed/authenticated/replay-safe events and reconciliation; client state never grants access |
| Privacy | Export and delete with request/status tracking | Step-up where required, session revocation, cancellable processing, object/provider/backup obligations tracked |
| Admin | `/v1/admin/metrics`, audit and module-specific actions | Backend admin permissions and assurance level, reason/audit, dual authorization for qualifying finance actions; no default image access |

## Commercial values are proposals

The upload's Free/Plus/Pro allowances, $4.99/$9.99 prices, monthly 20/60 render examples, 10–15% booking commissions and revenue mix are hypotheses. They do not enable billing or authorize fixed production prices. Render allowances and internal credit units are different concepts: the older cost model's eight-credit render and the upload's one-render allowance must be reconciled through the server price registry, not mixed in UI arithmetic. No automatic “unlimited” analysis without measurable fair-use and global budget limits.

RevenueCat is a proposed subscription aggregator from the upload; its suitability, storefront support, event authenticity, receipts, refunds, grace periods and reconciliation must be verified before selecting/configuring it. App-store digital purchases and real-world booking payments keep separate policy/payment flows. Merchant inventory—including Dress 4 Less—requires a real authorized feed and agreements; none is implied by the business example.

## Release acceptance mapping

| Upload gate | Evidence needed in the existing release plan |
|---|---|
| G1 requirements/design | Screen IDs → permissions → contracts → meaningful tests; current/proposed/deferred states visible |
| G2 identity/permissions | Google callback/PKCE, owner/tenant negative cases, server admin roles/step-up, session revocation; guest scope only if later approved |
| G3 AI quality | Qualified model/version, consented/licensed cohort evidence, complexion/identity/hair fidelity, uncertainty/abstention; no numeric attractiveness score |
| G4 billing/credits | Verified purchase/renewal/restore/refund/cancel/retry, 100% reconciliation and ledger invariants for tested scenarios; concurrency and fault injection |
| G5 security/privacy | Cross-account/privilege tests, malicious media, signed access expiry, deletion/vendor evidence, dependency review; zero unresolved high findings |
| G6 device/accessibility | Real supported iOS/Android journeys, camera permission/cancel/retake, screen reader/large type/contrast/touch targets; ≥99.5% crash-free beta sessions at a declared sample |
| G7 reliability/recovery | p95 API <500 ms excluding AI at declared load, measured provider ≥95% supported-condition job success, 99.9% monthly stabilized API SLO, timed restore and incident evidence |
| G8 beta | Real users complete critical journeys; all critical E2E tests pass, no blocker defects; define cohort/observation window before measuring |
| G9 go/no-go | Named product/engineering/security/business sign-off; explicit production deployment approval and reviewed rollback |

These are target thresholds, not measurements from the current shell. The upload's 13-week plan and percentage funnels are assumptions, not delivery promises or observed KPIs.

## Next reviewable work

1. P0/B05: review the [screen/design blueprint](screen-blueprint.md) and [standalone visual preview](../design-preview/index.html). This is a design artifact, separate from the running application. No live metrics, catalog items, purchases, uploads or authorization are simulated as completed integrations.
2. P1/B11: implement Google/Supabase auth and privileged admin session/assurance boundaries once the deferred project connection is requested. UI prototypes do not unblock private media or admin access.
3. P1/B13–B16: qualify private storage, consent/deletion lifecycle, quotes/jobs and durable execution with real database/queue tests and cost ceilings.
4. P2/B20–B25: implement guided capture and qualified cosmetic analysis/makeover; then real device and cohort validation. Advisor/routines require separate provider and privacy tests.
5. Later billing/catalog/Complete the Look/marketplace/ads work follows existing dependencies and independent release gates. Keep planned screens accessible as honest empty/unavailable states until each capability has evidence.

Open external decisions remain: legal name/trademark, launch countries/region, retention policy, qualified AI/storage/queue vendors, consented evaluation data, approved trial caps, measured subscription economics, app-store listings, marketplace/affiliate agreements and privileged staff ownership. These do not block design review. They must be resolved before their related integrations or releases, without repeating already answered identity/platform questions.
