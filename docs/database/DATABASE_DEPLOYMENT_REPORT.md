# GLAM AI production deployment report

Observed 7 November 2026. **Hosted core verified; full operational acceptance remains incomplete.**

Authentication follow-up deployed revision `0013_passwordless_accounts` and Edge version 4. Current production now has **41 public tables**, all RLS enabled, 77 indexes, 54 validated foreign keys and 21 policies. The additional tables are `notification_preferences` and `device_auth_preferences`; the active-session guard now rejects revoked sessions, including direct private Data API reads. Twenty controlled live session checks passed and both temporary Auth users/profiles were removed. Phone and social providers remain disabled; native biometric source is not physical-device evidence. See the [current authentication report](../authentication/PASSWORDLESS_AUTH_REPORT.md) and its production receipts. The stage-specific 0011/0012 evidence below remains historical.

All application migrations and Edge deployments targeted project `bkkmsbxrxkqaveymcrgi`, production `main`. No development branch was requested. Opening PR22 triggered the existing Supabase GitHub integration to auto-create one empty, nonpersistent preview. That newly generated preview was removed after discovery, automatic preview branching was disabled, and the original production database was verified intact. The final branch inventory is empty because preview branching is disabled; the original project identity, production database host and application revision remain verified. See [remediation evidence](evidence/hosted-api/automatic-preview-remediation.json). The canonical Alembic application branch is now `0013_passwordless_accounts`: application revisions 0001–0008, 0010, 0011, 0012 and 0013 (12 total). Sandbox0009 is excluded from production. The database and the GitHub branch are different release surfaces; production DDL execution does not mean a Git PR was merged.

## This deployment stage

- Two incremental canonical migrations executed and independently verified: 0011 and 0012. The previous 0010 release was not reapplied or stamped.
- One additional operational table, `api_request_counters`; **39 total public tables**, all with RLS enabled. 75 indexes, 52 validated foreign keys, zero unvalidated foreign keys and 19 public policies. No sandbox financial tables.
- Completed physical recovery point `2189281988`, 7 November 2026 02:07:35 UTC, was checked before each apply. Restore was not rehearsed; PITR is not claimed.
- Supabase Edge Function `glam-api`, version 2, ACTIVE. Endpoint: `https://bkkmsbxrxkqaveymcrgi.supabase.co/functions/v1/glam-api`.
- Public `/health/live`; authenticated `/health/ready`. Readiness scope is `hosted_core_api`, not the entire GLAM product.
- JWT-scoped profile, preferences, Style Passport, organization, verified workspace-list, credit-balance and routine endpoints are queryable. Routine create/read/update/delete uses the existing `personal_routine` model, idempotency records, optimistic revision checks and minimal audit trail.
- ES256/RS256 signature, fixed issuer, audience, expiry, role and active Auth user are verified. Legacy gateway verification is disabled because the handler performs verification for the project's ES256 signing keys. Database RPCs reject anonymous execution and derive owners from verified claims. Normal application calls never use Management API or service-role credentials.
- Web Profile account form and saved routines are wired in source, behind `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Tokens remain in app-root memory across in-app navigation and are never added to the saved device profile or browser storage. **The owner confirmed GoDaddy cPanel at `https://www.glamit.beauty`; backend CORS and Auth site URL are verified. The cPanel upload package is prepared; publication awaits server access and applied network grants. See [domain connection](../deployment/GLAMIT_BEAUTY_CONNECTION.md). This is not a published frontend rollout.** The static interactive preview deliberately remains offline.

## Actual verification

29/29 live HTTP checks passed using two explicitly designated temporary Auth users: real password login, identity/profile persistence, preferences, Style Passport correction/version conflicts, organization idempotency, tenant isolation, privilege override refusal, unsupported-operation refusal, routine CRUD/deletion/stale writes and no replay of deleted routine contents. Both Auth users and their test organization were removed. Actual post-cleanup SQL counts: Auth users 0, profiles 0, organizations 0, private routines 0. Minimal internal test identity references and immutable audit events were retained; no merchant listings, images, customer orders or financial records were created.

222 Python tests passed on a fresh local PostgreSQL database; 6 Edge security tests passed. Independent replay of each exact incremental SQL artifact passed on a separate fresh local database. Web/mobile TypeScript checks, web production build, 13 shared client tests, 13 web application browser regression groups, the account UI browser regression and 5 preview-disabled production-target guard tests passed. Browser doubles are identified as UI regression evidence; only the separate live report is evidence of real provider/database operations. No native iOS/Android device evidence is claimed.

## Credentials and external services

Names/presence and authenticated provider metadata only are recorded in [service evidence](evidence/hosted-api/service-readiness.json). Secrets were not committed, printed or stored in database tables.

Supabase Management API, Auth, Data API and hosted Edge core are verified. Runtime Supabase URL/public/service keys and OIDC configuration are present; Edge uses built-in project secrets. The native PostgreSQL URL parses and the Python configuration normalizes its driver and requires verified TLS; **a direct application TCP database connection is not claimed**. The hosted application uses authenticated Data API RPC instead.

**Stripe is blocked:** a read-only `/v1/balance` request returned HTTP200 with `livemode=true`. The configured secret therefore cannot be used for the authorized test task. No live payment/transfer/refund request was made. A test secret and test webhook secret are required. Existing 10% eligibility/commission logic and production financial records were not changed. No commission reconciliation or financial acceptance is claimed. No Stripe server key was copied into Edge secrets.

OpenAI, Replicate, FASHN, Google Maps, Resend, Twilio, Peach and Sentry credentials are absent. Open-Meteo commercial entitlement remains unverified. Those services are NOT CONFIGURED or BLOCKED, never CONNECTED based on a fixture.

## Complete requested feature scope: remaining work

| Domain | Current verified scope | Still incomplete or blocked |
|---|---|---|
| A Identity | Real Auth login, profile, preferences | Public registration/recovery delivery verification; addresses, saved locations, account-deletion workflow; production web activation |
| B Organizations | Canonical organizations/members, owner isolation, approved workspace listing | Business verification/admin bootstrap authority, remaining profiles/team/invitation APIs on Edge and UI workspace handoff |
| C Analysis/Passport | Editable versioned Style Passport | Private image consent/Storage, analysis sessions/results/history/model usage, live AI credentials and benchmarks |
| D Studio | Existing canonical look/revision model retained | Hosted look APIs, private media/generation jobs, transforms/try-on, provider connectivity and accuracy |
| E Advisor | Private user-authored routines CRUD | Conversations/messages/context persistence and live advice |
| F Destination/weather | Existing frontend/provider contracts retained | Travel/forecast/packing persistence and commercially approved live weather integration |
| G Wardrobe | Existing session experience retained | Private uploads, wardrobe tables and durable outfit APIs |
| H Catalog | Existing canonical catalog/products/variants/RLS retained | Hosted merchant CRUD/publication/inventory/discovery; approved real merchant records and location provider |
| I Shopping | Existing frontend contracts retained | Cart/order/fulfillment persistence and verified server-authoritative checkout |
| J Finance | Original 10% policy and isolated sandbox retained | Correct test credential, signed webhook secret, eligibility/settlement review, complete immutable production ledger/reconciliation flows; live money remains disabled |
| K Bookings | Professional profiles exist | Services, availability, atomic booking, cancellation/deposit/tailor workflows |
| L Creators/affiliates | Existing scoped capability contracts retained | Creator storefront/content, attribution and settlement persistence/APIs |
| M Advertising | Existing relevance/sponsorship contracts retained | Campaign lifecycle, approved targeting, budgets and verified reporting |
| N Subscriptions/usage | Existing canonical AI credit accounting retained; balance read available | Subscription events, provider usage and billing integration |
| O Notifications/admin | Existing audit/staff contracts retained | Notification delivery, support/moderation/admin Edge workflows, explicit initial staff grants and monitoring |

These gaps include implementation work as well as missing credentials. The complete backend/schema and the 26-workflow acceptance matrix have **not** been completed. Private Storage buckets are currently empty/not provisioned; no photograph-processing or deletion completion is asserted. A legal/retention policy and verified processing path must accompany private media activation. Request-counter expiry/operational maintenance, production web delivery, full external integrations and all business workflows remain launch gates.

## Source, deployment and Git review

Branch `feat/operational-supabase-backend`; target main is `feat/platform-foundations`. Source includes existing foundation work from PR21, which remained open without an approving review at the last check. The hosted changes are pushed in [PR22](https://github.com/Unparalleled-Media-1/Glamit/pull/22), implementation commit `3dca3cd480d34f872a00842425d5f15692b532f9`; CI was running and no approving review was present at the recorded snapshot; no force push, review bypass, production data reset or live-payment activation is authorized. See the Git status evidence alongside this report for the current PR/commit/check state. The earlier deployment report is preserved in [history](history/PRE_HOSTED_API_DEPLOYMENT_REPORT.md).

## Actual production table inventory

- `account_eligibility`
- `alembic_version`
- `api_request_counters`
- `app_user`
- `audit_event`
- `catalog_ai_job`
- `catalog_approval`
- `catalog_listing`
- `catalog_media`
- `catalog_projection`
- `catalog_revision`
- `consent_event`
- `credit_account`
- `credit_journal`
- `credit_posting`
- `credit_reservation`
- `idempotency_record`
- `look`
- `look_revision`
- `market_policy_version`
- `merchant_profiles`
- `organization_members`
- `organizations`
- `outbox_event`
- `personal_routine`
- `policy_document`
- `product_categories`
- `product_variants`
- `products`
- `professional_profiles`
- `profiles`
- `saved_requirement`
- `staff_grant`
- `style_passports`
- `user_preferences`
- `workspace_capability`
- `workspace_draft`
- `workspace_invitation`
- `workspace_role`

## Evidence

- [production-migration.json](evidence/hosted-api/production-migration.json)
- [production-routines-migration.json](evidence/hosted-api/production-routines-migration.json)
- [production-catalog.json](evidence/hosted-api/production-catalog.json)
- [edge-deployment.json](evidence/hosted-api/edge-deployment.json)
- [live-regression-0011.json](evidence/hosted-api/live-regression-0011.json)
- [live-regression.json](evidence/hosted-api/live-regression.json)
- [service-readiness.json](evidence/hosted-api/service-readiness.json)
