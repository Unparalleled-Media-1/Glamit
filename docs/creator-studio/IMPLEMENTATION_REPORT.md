# GLAM Beauty branding and Creator Studio

7 November 2026. The user confirmed **GLAM Beauty — match the logo**. This is a draft implementation, not a claim of a completed social integration or production rollout.

## Brand delivery

Active web/mobile display names, document titles, login/guest copy, biometric permission text and review generators now say GLAM Beauty. Existing color tokens, editorial layouts, primary navigation, OAuth schemes, package IDs, hosting URL and Supabase project remain unchanged. `packages/product/brand.ts` records the display identity. Canonical colors still come from `packages/product/consumer-design.json`.

**Artwork blocked:** the ivory favicon, burgundy app icon and horizontal wordmark are visible as inline chat images but their original files are not mounted/downloadable in this workspace. No approximate redraw, generated replacement or broken asset URL has been substituted. Downloadable PNG/SVG originals are needed to install the exact favicon, Apple touch icon, Android/iOS icons and header wordmark. The printed domain in the artwork is not authority to change the deployment URL or OAuth origins.

## Implemented and tested locally

Web and native Profile include Creator Studio with one existing Supabase identity:

- Private creator profile creation/editing with optimistic revision checks.
- Manual public profile links for TikTok, Instagram, YouTube, Pinterest and Facebook, explicitly **manual / unverified**. No scraping, embedding or remote media fetching occurs.
- Rights-confirmed creator-submitted portfolio drafts and owned draft deletion.
- Private collection drafts, including web sponsorship/disclosure fields. Native creates unsponsored drafts and displays existing disclosures. Product attachment is blocked until contextual catalog qualification is implemented.
- Authenticated server RPC derives ownership; rejects extra fields, fabricated connection statuses, tokens and organization bindings. Existing explicit adult eligibility is mandatory for mutations; no age is inferred.
- RLS isolates private creator data. Direct client writes and private credential access are denied. Revoked Auth sessions lose RPC and RLS access. Organization-owned creator records require active membership, verified unexpired capability, adult eligibility and scoped roles.
- Separate campaign, referral, agreement, earnings, payout-eligibility and sync-log schema boundaries. They are not operational workflows yet.
- AES-256-GCM server-only token-envelope utility with fresh nonce and creator/connection/provider binding; missing encryption key fails closed. No OAuth tokens are stored, returned or logged by this implementation. This utility has not been wired to a provider callback or refresh job.

Nothing here grants a business role, approves a policy, publishes content, allocates a sale, changes the existing platform 10% item commission or issues a payout.

## Provider operational report

| Provider | Manual profile/content drafts | OAuth / refresh / media synchronization | Current activation status |
| --- | --- | --- | --- |
| TikTok | Local SQL + mocked-transport web tests pass | Not implemented or connected | Awaiting credentials, API eligibility/scopes/review verification and adapter/callback implementation; first priority |
| Instagram | Local SQL validation and web form use existing draft API | Not implemented or connected | Awaiting credentials, account-type/API eligibility/scopes/review verification and adapter/callback implementation; first priority |
| YouTube | Manual supported-link validation and draft storage | Not implemented or connected | Deferred API integration; credentials/review and API qualification still required |
| Pinterest | Manual supported-link validation and draft storage | Not implemented or connected | Deferred API integration; credentials/review and API qualification still required |
| Facebook | Manual supported-link validation and draft storage | Not implemented or connected | Deferred API integration; credentials/review and API qualification still required |

**No provider is fully operational or CONNECTED.** Unsupported API capabilities have not been asserted without a current provider review. Official developer/API hosts are outside this environment's current network allowlist. Provider app credentials and a server-only `CREATOR_TOKEN_ENCRYPTION_KEY` are absent from the observed environment configuration. Adding keys alone will not complete the integrations: callbacks, refresh/revocation, rate-limit handling and authorized synchronization still need implementation and real tests. Consumer Google/Apple/Facebook login remains a separate existing flow.

## Migration and production status

Read-only original-production inventory: [production-schema-audit.json](production-schema-audit.json). Project `bkkmsbxrxkqaveymcrgi`, no replacement/development project. Production stays at `0013_passwordless_accounts`; **0014 has not been applied**. The Creator Studio UI will truthfully report unavailable if its new routes are not deployed.

Canonical proposed migration: `db/migrations/versions/0014_creator_studio.py` and adjacent SQL; predecessor 0013, Stripe sandbox sibling excluded. The exact incremental artifact and checksum manifest are under `db/migrations/releases/0014_application.*`. It adds 14 public tables and one non-exposed private credential table:

`creator_profiles`, `connected_social_accounts`, `social_media_items`, `creator_collections`, `creator_collection_items`, `creator_campaign_briefs`, `creator_campaign_applications`, `creator_campaign_deliverables`, `creator_referrals`, `creator_attribution_events`, `creator_commission_agreements`, `creator_earnings`, `creator_payout_eligibility`, `creator_social_sync_logs`, and private `creator_private.social_credentials`.

All new public tables have RLS and SELECT-only client grants with policies. Private credentials have no client/schema grants. Earnings and attribution evidence are append-only; creator agreement rates/funding/basis must be supplied explicitly, with signed agreement evidence required. There is no public RPC that can create agreements, earnings or payouts, nor any default creator rate. Real financial reconciliation and payout validation remain unperformed.

Deployment still requires reviewed code/CI, a fresh verified production recovery point, actual production RLS/object verification and an Edge/app release. [AGENTS.md](../../AGENTS.md) requires: “Git merges still require passing CI and required approvals.” No database, website, environment, payment activation or mobile-store publication occurred in this change.

## Regression evidence

- Clean local PostgreSQL migration from base plus isolated canonical 0013→0014 export and independent exact-artifact replay: passed. The replay produced 55 public tables, all with RLS; the Stripe test-only sibling was absent. Original migrations untouched.
- Full backend suite: **251 passed**. Includes creator ownership, adult-eligibility, revoked-session, forbidden raw writes, URL/field validation, content rights, optimistic conflicts, blocked product qualification/publication/OAuth, and encryption tamper/cross-tenant tests. One existing Starlette test-client deprecation warning.
- Web production build; web/mobile TypeScript; static-host build and preview/static-host TypeScript: passed.
- iOS and Android Hermes JS exports: passed. These do not prove native device rendering, icon installation or store readiness.
- Auth contract and native security-gate doubles: passed. No live social authentication or hardware biometrics claimed.
- Authentication UI regression: desktop, 390px, 320px, OTP, branded provider buttons, hidden unavailable methods and automated accessibility: passed using intercepted Auth transport.
- Creator UI: seven checks, desktop/390px/320px, no horizontal overflow, automated WCAG A/AA checks, profile/link/content/collection saves, deletion and unavailable-service clearing: passed with intercepted test transport. Screenshots carry an explicit simulation label.

[Creator desktop](evidence/desktop.png) · [Creator mobile](evidence/mobile.png) · [UI report](evidence/report.json) · [Authentication desktop](evidence/auth/auth-branding-preview-desktop.png) · [Authentication mobile](evidence/auth/auth-branding-preview-mobile.png).

## Unfinished acceptance gates

Exact brand artwork installation; reviewed/verified production migration and application release; creator activation/publication policy and moderation; real provider OAuth/refresh/revocation/scopes/sync/rate-limit tests; public shoppable creator pages and qualified product selection; tracked referral attribution; campaign briefs/applications/approvals/milestones UI and APIs; signed creator compensation calculations/reversals/reconciliation; verified earnings and payout eligibility; device testing. These remain explicit open work, not features represented as operational.
