# ADR 015 — Supabase, Google sign-in and guided beauty capture

V2 eligibility overlay: the selected identity/database and explicit capture-consent flow remain. [Global policy](specification/global-policy-architecture.md) adds age/guardian/market/rights/provider qualification before any capture/processing; no minor/unknown-age access follows from Google sign-in alone. Managed-child contexts do not require inventing an independent Google account. The [companion extension](specification/style-companion-extension.md) requires separate consent/expiry for reusable twins and excludes persistent photorealistic child twins at launch. These are proposed expanded contracts, not connected runtime features.

Status: user-selected architecture, 4 November 2026. Supersedes the unresolved identity/database-host choices. Service connection/provisioning is explicitly deferred by the user; no Supabase project or Google OAuth integration is represented as connected.

## Identity and transactional database

Use Google as the social sign-in provider through Supabase Auth, and Supabase-managed PostgreSQL as the transactional database host. FastAPI, workers, the single Alembic migration history and existing domain boundaries remain. Local PostgreSQL remains the development/test runtime until Supabase connection setup is requested.

Mobile uses the system browser and authorization-code/PKCE with approved app/universal redirects. Web uses the corresponding secure server-session/cookie flow with CSRF/state/nonce protections. These flows require implementation and real integration tests; the current shells do not perform login. Google account authentication is separate from consent to camera capture, AI processing, saving results or marketing. Never collect a Google password in GLAM AI.

FastAPI verifies the Supabase-issued access token against the exact project's issuer and JWKS endpoint, expiry and intended audience. Proposed configuration once the project is chosen:

- `GLAM_OIDC_ISSUER=https://<project-ref>.supabase.co/auth/v1`
- `GLAM_OIDC_AUDIENCE=authenticated` for the project's standard user access tokens, confirmed against actual configuration.
- `GLAM_OIDC_JWKS_URL=https://<project-ref>.supabase.co/auth/v1/.well-known/jwks.json`

Support asymmetric ES256 and RS256. Legacy shared-secret HS256 tokens and raw Google ID tokens are not backend session credentials. Never trust client `user_metadata` for platform/org roles; use server memberships. Supabase token-assurance level and configured MFA must gate privileged finance/admin actions when those roles are implemented; Google sign-in by itself does not establish privileged MFA.

Database migration/admin credentials and application runtime credentials must be separated before production. Do not put connection passwords or Supabase service-role keys in the browser/mobile app. Use an appropriately restricted backend database role and TLS hostname/certificate verification. Select direct or session-pooled connections for migrations and persistent API/worker sessions, then qualify connection limits/timeout/prepared-statement behavior against the selected Supabase plan. If transaction pooling is later used, explicitly validate psycopg prepared-statement compatibility and transaction semantics; never weaken TLS to solve connectivity.

Client business operations go through FastAPI. Supabase's public client key must not grant direct access to private looks, journals, outbox or consent tables. Migration 0003 enables deny-by-default RLS and revokes known client roles' grants on our tables only, without changing unrelated project tables. The initial local backend database owner can bypass RLS; production least-privilege policies/runtime role and full tenant/RLS tests remain mandatory. No additional Supabase dashboard/CLI schema history is allowed. Realtime subscriptions, if later enabled, need a separate authorization design and may not publish private financial/media records broadly.

## Confirmed consumer flow

The user confirmed that “facial signing” means a beauty-analysis scan after Google sign-in, not face-based authentication. There is no identity-recognition template, face-login feature or advertiser access to capture data.

1. Sign in through Google/Supabase and return to the app. Select the beauty-analysis purpose; present clear processing/provider/retention information and request explicit consent.
2. Request camera permission only on this step. Show positioning/lighting/blur/occlusion guidance and an accessible alternative. On-device face presence/quality checks may guide framing; they do not authenticate identity. Do not silently start the camera at login. A clearly labeled `Start scan` action accepts the displayed processing purpose and server quote when credits apply.
3. Once capture quality is sufficient, show a disclosed short countdown and automatically capture a still, with a cancel control and retake option. The accepted `Start scan` action can authorize capture and submission together so the next screen progresses directly to results. Do not run background analysis or retain rejected preview frames. A manual capture/upload alternative is required. A face entering the frame without that explicit prior action cannot trigger a charge or provider submission.
4. Submit only the authorized still to private storage using the existing quarantine/validation workflow, then enqueue analysis. If the quote expired, cost changed, consent is absent or image quality is uncertain, pause for renewed confirmation/retake. Do not silently incur a different price to preserve an automatic flow.
5. The next screen shows progress followed by cosmetic feature/color guidance, uncertainty and available style actions. If lighting/provider quality is insufficient, ask for a retake or abstain; do not fabricate analysis or product inventory. It is a beauty assessment, not a medical diagnosis.
6. From a selected/generated look, continue to Complete the Look with the same private analysis boundary, organic/sponsored separation, catalogue evidence and booking rules.

Acceptance additions: automated camera permission/consent/cancel/retake/quote tests; no upload before confirmed capture; no identity embedding; private deletion across assets/traits; same-subject/project token and cross-project rejection; real Google OAuth callback/PKCE and signed-token integration tests; measured darker-skin/lighting/texture capture quality across supported devices. Native device and real Supabase tests remain unrun until service setup.
