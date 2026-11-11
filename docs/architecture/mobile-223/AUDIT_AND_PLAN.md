# GLAM Beauty — 223-screen architecture audit and approval plan

**Recommendation: HOLD implementation and deployment. GO for review of this audit/plan only.** The [attached directive](../../specification/sources/2026-11-master-mobile-223.txt) requires: “Do not begin implementation until the audit and plan are approved.” This package supplies its ten required first-response deliverables. No screen registry row, source route, database table or compilation result is represented as a completed product feature.

Audit source:97e3e7570c3da9d7ca5b8622ea044c3677040f33, branch feat/referral-month-rewards. Read-only remote observations:11 November2026,08:10 SAST. The audit indexes1615 tracked files, reviews all application/service/migration/deployment areas and inspects the current Flutter feature source. It is a structural/source reconciliation with fresh database metadata, not an exhaustive rerun of every production interaction.

## 1. Existing repository audit

| Area | Actual implementation | Finding |
| --- | --- | --- |
| Web | apps/web; React19.3.0,Next16.4.5; public/consumer pages and business/admin entry | Retain web-native desktop workspaces and public app-acquisition/privacy/support journeys |
| Current native restart | apps/glam_mobile; Flutter/Dart;10 lib Dart files; camera/image_picker/secure metadata vault/http | One Analyze candidate, not a223-screen app. Native capture/picker/navigation evidence exists; full live account/AI/save flow is unverified |
| Previous Flutter | apps/flutter_app; five-tab GoRouter shell and related screens | Explicitly rejected UX, preserved as source/reference. Existing tabs are not approval of the new mobile design |
| Previous mobile | apps/mobile; Expo/React Native | Preserved existing application. Do not overwrite this directory to match a proposed folder drawing |
| Main API | services/api/src/glam_api; FastAPI/SQLAlchemy/psycopg; OpenAPI generated from mounted routes |70 operations across58 paths in the audited branch. Presence/tests are separate from deployed qualification |
| Jobs/privacy | glam_api analysis_jobs,catalog_jobs,worker,media_cleanup,analysis_privacy | Processing functions exist; no live deployed worker/provider/retention schedule is proven by source |
| Supabase edge | supabase/functions/glam-api; authenticated RPC bridge with original-project checks | Active version8 observed. It is not an implementation of all FastAPI media/analysis/generation contracts |
| Database | db/migrations,canonical Alembic history; SQL release manifests and guarded deployment tools | Production0017 is verified. Candidate0018 referral awards exists only in the engineering branch/local tests |
| Financial authorities | Credit journal/reservations,item commission policy,creator records,separate Stripe test sandbox | Not one operational worldwide checkout/subscription/payout service yet. Existing rules must be retained |
| Delivery | Railway web/API Dockerfiles and independent configs; native CI/bootstrap; legacy cPanel packaging | Configuration in source does not prove the currently served Railway commit or native-store readiness |

Current GitHub default is **feat/platform-foundations**, not a literal main branch. The recorded default SHA is2d837e696c9f64887d515cf0c335f14c919a903f; comparison with the audited source is diverged,ahead5/behind21. PRs45–47 are merged in their recorded targets;59/60 remain stacked drafts. A merged feature-base PR does not prove inclusion in the release branch or deployment. [Exact source/PR metadata](evidence/github-pr-history.json). No branches were merged,deleted or force-pushed during this audit.

The rejected-app backup branch exists locally. Its name is absent from the current remote branch inventory, so durable remote backup retention needs review before structural migration. Both old app directories and historical build evidence remain preserved. See [risk R06](RISKS.csv).

## 2. Proposed monorepo structure

Retain the working layout rather than move files merely to match the proposed tree:

```text
apps/web/                 React/Next.js web and business/admin
apps/glam_mobile/         Current Flutter restart; future feature folders live here
apps/mobile/              Preserved Expo application
apps/flutter_app/         Preserved rejected Flutter application
services/api/             Canonical API, jobs and server business rules
packages/contracts/       Generated OpenAPI/TypeScript; Dart compatibility next
packages/product/         Existing neutral tokens/public facts/generated pricing
db/migrations/            Sole canonical Alembic/SQL history and release manifests
supabase/functions/       Existing edge integration; no second migration history
docs/architecture/mobile-223/  Registry,contract/capability inventory and review plan
```

The proposed app/router,core/auth/network/storage and feature directories can be introduced **inside apps/glam_mobile after approval**, preserving existing domain clients and test contracts. A future rename/consolidation needs a justified CI/import/build/signing migration plan, not silent replacement. packages/design-tokens/shared-rules can be logical boundaries over existing sources before any physical move. Keep pricing/commission/credit/permission authority on the server; share values/contracts,not React layouts or cross-language copies of financial logic.

Target relationship is Flutter and React → the same authenticated canonical services → the same Supabase project/identity/data. Each frontend retains its own navigation and interaction design. Original project only; destructive/payment tests use disposable isolated PostgreSQL and test providers. No deleted Supabase development branch or new project is recreated.

## 3. Current Supabase schema and migrations

[Fresh read-only receipt](evidence/supabase-readonly.json): original project bkkmsbxrxkqaveymcrgi is ACTIVE_HEALTHY with matching database host; preview branch inventory is empty. Production revision is **0017_analysis_passport**, **59 public tables plus one creator_private table**. All59 public tables and the private credential table report RLS enabled. RLS flags alone do not prove every access policy/operation is secure; complete policy/constraint verification from the prior production deployment remains in [its report](../../database/analysis-schema/RESULT.md).

The required private_media,analysis_job,analysis_correction and style_passport_analysis tables **already exist**. glam-private-media is private,PNG-only,10MiB. Never reapply the old bulk schema to fix a client issue. Existing canonical identities are auth.users/profiles plus app_user's issuer/subject bridge; these are related authorities,not permission to create a disconnected mobile user store.

Creator/catalog/credit/routine/organization/preference authorities also exist. A professional profile is not an atomic booking engine; creator tables are not a completed social feed; private manual looks are not the complete TP aggregate. Missing domain operations are listed in [BACKEND_TASKS.csv](BACKEND_TASKS.csv), with reuse-before-addition requirements.

Supabase email authentication is enabled; phone,Google,Apple and Facebook remain disabled. This is a provider-activation fact; missing native sign-up/social/recovery UI and complete account export/deletion remain separate implementation gaps. Management access used for metadata is never a runtime application credential. No user rows,private images or credential values were read for this audit.

## 4. Current API contract inventory

[API_CONTRACTS.csv](API_CONTRACTS.csv) lists all70 mounted FastAPI operations with parameters,request and response schemas,operation IDs and bearer declarations. The complete generated schema is [OpenAPI](../../../packages/contracts/openapi.json). Generated contract and public pricing consistency checks passed without changing their contents.

| Surface | Current source coverage | Important boundary |
| --- | --- | --- |
| FastAPI | Identity/workspaces/invitations,private media,analysis jobs/corrections/Passport,manual looks/routines/requirements,catalog/moderation/matches,Advisor,credit balance,public subscription catalog | Main canonical media/analysis operations exist in code and production tables; actual restricted runtime access,API origin,workers/policies/provider/device journey remain unverified |
| Stripe sandbox API | POST /stripe-test/orders,/orders/{identifier}/checkout,/merchants/{account}/onboarding,/webhook in separate payments/app.py | Four separate test-only routes,not mounted production commerce. Their webhook uses signature verification; they are not consumer digital subscription APIs |
| Edge RPC bridge | Auth verifies Supabase tokens/user/session; glam_api_gate,glam_backend_status,glam_api_v1 dispatch | Selected profile/preferences/Style Passport,organization/workspace/credits,routines,notifications/consents/devices and creator manual operations live in canonicalSQL0011–0014. Active edge metadata does not certify each journey |
| Supabase Auth | Existing email sign-in,token/user verification,refresh/revoke clients | External Auth contract,not an invented application endpoint; disabled social/phone providers are not shown as working |
| Provider adapters | OpenAI,FASHN,Replicate,maps/weather,notifications/monitoring boundaries | Adapter presence is not an operational personalized transformation,booking,catalog or finance workflow |

The new proposed `/transformations/:id/preview` is a **navigation route**, not a verified API. No missing API path is invented in the capability list; each missing service task defines request/response concepts,authorization,persistence and acceptance before an API design is approved.

## 5. Complete223-screen implementation matrix

[SCREEN_MATRIX.csv](SCREEN_MATRIX.csv) contains **GL-001–208,TP-01–14 and HOME-001**, each once. It preserves every name,function and proposed route,plus role,actual Flutter state/source,evidence/gap,web equivalent,backend dependency,design/live/device status. [ROUTE_REGISTRY.csv](ROUTE_REGISTRY.csv) distinguishes proposed navigation from specialized existing states and proposed aliases.

There are **222 distinct proposed URL patterns for223 IDs**: GL-115 booking messaging and GL-198 general messaging both specify /messages/:conversationId. The registry proposes GL-115 as a booking-context alias of GL-198,with participant/booking authorization. The IDs are preserved rather than silently renumbered or presented as two independent implemented pages.

- **20 rows have partial current Flutter code.** These are mostly Analyze/camera/email/consent/history and related recovery states; none is certified complete under the attachment's gates.
- **203 rows are not implemented as matching screens/states in the current Flutter restart.** Existing rejected Flutter/Expo/web code is recorded as related source where relevant and is not counted as accepted new mobile implementation.
- All223 design approvals and complete deployed/physical-device journeys remain unverified. This is not a completion percentage and does not erase earlier scoped test passes.

Example reconciliation: GL-020 maps to CameraSurface with Android emulator capture evidence; its physical iPhone camera is untested. GL-021 has actual iOS simulator picker evidence,not an Android gallery/device pass. GL-026 maps to face/undertone ReportScreen but lacks skin/hair/TP navigation. GL-121 may alias GL-033's history flow; it must not be counted as a second independently completed history feature. HOME-001 is absent from the new app; the rejected Home screen is not a substitute.

The current Navigator uses native pages/sheets for one Analyze flow. It has no accepted223-route/deep-link registry or five independent consumer stacks. The prior GoRouter shell exists only in the rejected app; a framework choice can be reused without copying rejected layouts. Existing web `/professionals` is business acquisition content,not the proposed consumer professional-search route; app-link fallbacks need explicit semantics.

## 6. Missing backend capabilities

[BACKEND_TASKS.csv](BACKEND_TASKS.csv) defines20 concrete capability workstreams,B01–B20,with existing code/schema,remaining operations,request/response concepts,permission,persistence and test behavior. It includes runtime qualification separately from missing code.

Highest dependencies are: qualify canonical private-photo/analysis runtime; finish skin/hair/grooming coverage; create/reuse persistent transformation context; connect actual own-photo generation/credits/assets; persist save/refine/tutorial/product/professional actions across both clients. Provider keys cannot replace these operations.

Other required service completion includes wardrobe,Discover/social,persistent carts/orders/shipping/tax/refunds,atomic bookings,operational role companions,messaging/push,privacy export/deletion and subscription/store verification. Consumer referral awards are **one month per distinct referred person's first successful subscription payment**,not signups/renewals; candidate0018 does not apply itself or grant entitlement. Preserve US$1.50/month,US$15/year and the existing10% eligible physical-product commission.

## 7. Design gaps and blockers

The attachment provides scope and architecture,not approved223-screen visual designs. There is no accepted complete design for HOME-001,TP journey,Studio's photo canvas/tools,Discover feed,Profile or the mobile role companions. The earlier five-screen UX was rejected; source merging is not design approval. Actual native artifact screenshots remain on GitHub and their download is blocked in this executor; no new visual approval or device evidence is claimed.

Missing design specifications include first-run/auth recovery; camera quality/permission/crop states; confidence/corrections; own-photo simulation/credit quote/retry/cancel; accessible before/after; tutorial-to-product/booking action; five-stack/deep-link recovery; subscriptions/rewards; role access and desktop/mobile companion boundaries. Men's grooming,barbers,protective/natural hair,inclusive sizing/modesty,nonmedical skin language and correctable assumptions must be explicit,not inferred from a generic results screen.

Use the existing consumer-design.json values: ivory#f8f3ef,rose#b76d8c,charcoal#181719,blush#f6c6d8. Current Flutter values match these core colours but are hand-maintained; propose platform-neutral token generation/parity checks after approval. Do not port website headers,wide cards or desktop sidebars into Flutter.

## 8. Risk and regression register

[RISKS.csv](RISKS.csv) records15 source/design/runtime/privacy/finance/distribution/branch risks and their controls. Preserve the current438-test backend baseline,the generated pricing/contracts,public footer/business guards,server role/consent/owner checks and actual narrow Android/iOS camera/picker/navigation evidence. No new broad tests or production mutations were run just to recreate an audit badge; this package's checks validate registry completeness/source preservation and fresh read-only metadata.

The scoped [native evidence report](../../implementation/batches/ANALYZE_HISTORY/RESULT.md) identifies the tested application/harness SHA and Android/iOS artifacts; the [latest backend baseline](../../payments/referral-evidence/backend-tests.txt) records438 passing isolated tests. Neither is upgraded into a new deployed/device/223-screen certification here.

The [migration and rollback plan](MIGRATION_ROLLBACK_PLAN.md) requires no moves,migrations or deployment in Phase0. It specifies safe review/config/source rollback and a separate recovery/approval path for future additive data changes. A restore is not an automatic rollback for a failed mobile UI.

## 9. Incremental implementation plan

[DELIVERY_PLAN.md](DELIVERY_PLAN.md) defines the approval gates,first complete Analyze→Transformation→own-photo Preview→Save milestone and subsequent modules. Do not implement223 placeholder routes or reopen the backend architecture from scratch. Each batch must connect real authorized operations,demonstrate both OSes and web regression,and receive the prescribed approval before expansion.

## 10. Explicit GO/HOLD decision

**GO:** review this exact223-ID baseline,proposed state/route aliases,preserved repository paths,canonical data/API boundaries,capability tasks and rollback plan.

**HOLD:** application/router/schema implementation,provider activation,production changes,branch consolidation,public deployment and store submission until the relevant approvals and actual evidence exist. Audit/plan approval alone does not approve unreviewed screens,production migrations or live payments.

The immediate decision is approval of this Phase0 audit and incremental plan. Then approve the first milestone's native interaction/design specification and qualify the existing backend; do not generate another browser prototype or claim coverage from source count.
