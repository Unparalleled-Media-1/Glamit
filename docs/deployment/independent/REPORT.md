# GLAM Beauty deployment investigation and candidate

7 November 2026. **NOT READY FOR PUBLIC LAUNCH. No Railway service, production setting, domain, database, signing credential or store submission was changed.** The later user instruction takes precedence: inspect/preserve the existing working service; create no additional services; obtain release approval before public deployment.

## Verified GitHub facts

Repository `Unparalleled-Media-1/Glamit` has default branch **`feat/platform-foundations`**. There is **no literal branch `main`**. The user previously designated this default branch as main. PR #24 and #25 are merged, along with #22/#23. Default-branch SHA at inspection:

`2eff5dfead8a446ebe7627e33db2f495e38b32f0`

It includes GLAM Beauty branding/authentication and private Creator Studio draft source. Comparing the earlier working head `d37812b` to the fetched default yielded five merge-history commits ahead, zero local commits ahead, and identical source trees. This candidate branch was fast-forwarded to the actual default before committing its changes; no production/default branch was rewritten.

The user-reported Railway source `feat/platform-foundations` therefore **matches GitHub's actual default**. A mismatched branch name is not an established root cause. Switching Railway to nonexistent `main` would be incorrect. Nine remaining open PRs in the inventory are dependency updates; they were not blindly merged. [Repository](evidence/github-repository.json), [branches](evidence/github-branches.json), [PR states/merges](evidence/github-pull-requests.json).

## Existing Railway service: reported versus verified

Use only existing project `elegant-dedication`, project ID `3f490939-cffd-4468-8c25-d90146f1b308`, production environment `93eeefda-99b8-462b-9041-421f9f5903ca`, service `glamit-web`, ID `d2a011b7-929e-4302-809a-27ca7345621a`.

| Item | Actual evidence/status |
| --- | --- |
| Existing URL | User supplied `https://glamit-web-production.up.railway.app`; direct request returned a proxy access error in this environment |
| Online / Python 3.12.16 / successful PR24 deployment | User's screenshot description; not independently inspected |
| PR25 deployed successfully | GitHub merge verified; Railway deployment status and served UI **unverified** |
| Railway source, root/build/start commands, health path and current variables | **Unverified** without Railway access |
| Actual deployed commit SHA and branch | **Unknown** until Railway deployment metadata and served health/build are compared |
| Build/runtime failure logs | **Unavailable**, not diagnosed and not replaced with guessed causes |
| “Could not load branches” / auto deploy unavailable | User reported; exact cause **unknown**. Agent GitHub access does not prove Railway GitHub App authorization |
| Public-domain DNS/HTTPS | **Not verified or changed** |
| Service split | **Not performed**. Inspect what the existing Python runtime serves before deciding whether another API service is appropriate |

Both `RAILWAY_TOKEN` and `RAILWAY_API_TOKEN` were absent at inspection. Use **only a project-scoped `RAILWAY_TOKEN`**, not both. An earlier environment draft queued the broader API-token requirement before the user chose a project token; remove/leave that unused requirement unconfigured during environment review. Never fill both tokens. No token value belongs in this repository, frontend or chat.

An access draft preserves prior domains and adds Railway documentation/API hosts, the existing Railway URL and `glam.beauty`/`www.glam.beauty`/`api.glam.beauty`. The environment tool confirms the draft was saved but requires review/save/publication to apply; it has **not** been applied or published. After the environment restarted, readiness was refreshed and still showed the old enforced network policy and no Railway token. Missing access blocks authenticated logs/source inspection and live browser click-through. Do not repeatedly redeploy to compensate for absent diagnostic evidence.

## Actual monorepo and backend architecture

| Location | Purpose |
| --- | --- |
| `apps/web` | Next.js 16 / React website, including protected business/admin UI |
| `apps/mobile` | React Native / Expo 58 native app source, not merely a responsive website |
| `services/api/src/glam_api` | Separate FastAPI foundation API and server logic |
| `packages/auth` | Shared Supabase identity and session contract |
| `packages/product` | Shared product models, clients, brand tokens, styling logic |
| `packages/contracts` | Existing OpenAPI contract and generated TypeScript |
| `db/migrations` | **Sole canonical Alembic history**; do not duplicate into `supabase/migrations` |
| `supabase/functions/glam-api` | Current deployed Edge HTTP API, calls authenticated `public.glam_api_v1` RPC |

Current web/native account and Creator clients use the original Supabase Edge API. The FastAPI route set is **not yet equivalent**: profile/notification/device/Creator endpoints used by current clients are not all mounted there. No traffic was redirected to an incompatible `api.glam.beauty`. User identity and current data contracts remain unchanged. The reviewed production API decision must address this parity before client cutover; having two build configs is not proof a second live service is necessary.

A Python runtime for a service named “web” warrants inspection, but is not proof of an error: it could be serving static files, the API, a combined application or an old deployment. No root cause is asserted without logs.

## Prepared build/deployment candidate

These files are **candidate configurations only**, not changes to the existing Railway service:

- `deploy/railway/web.Dockerfile`: repository-root build context, root npm lockfile/workspaces, pinned Node 24.22.1, Next standalone output tracing shared packages, non-root runtime. The server binds Railway's injected `PORT` on `0.0.0.0`. No privileged frontend secrets or `.env` files copied.
- `deploy/railway/api.Dockerfile`: Python 3.12, frozen production uv dependencies, installed API package, non-root runtime. `scripts/start-api.py` handles `PORT`, rejects administrative production database usernames/wrong Supabase projects/Auth, and refuses remote production databases in development/preview. It does **not** run migrations at startup.
- Separate `web.railway.json` and `api.railway.json`, bounded restart policy, readiness probes and per-service watch patterns. If a service is approved for either candidate, set its root to repository root and its config-file path explicitly. Do not point the build context at `apps/web` or `services/api` while losing root lockfiles/shared code. Do not apply both files to the same service or create an API service without architecture review.
- Web `/api/health/live` and `/api/health/ready`; API `/health/live` and `/health/ready`. Web readiness describes build/public-key configuration only, explicitly not provider verification. API readiness fails when the required DB revision or identity config is unavailable. Health endpoints expose only a validated Railway commit SHA, not environment values; compare it against Railway metadata after deployment.
- Explicit API CORS allowlist, no wildcard origins or cookie credentials, allowed bearer/idempotency headers. Changes affect the prepared API candidate, not the currently deployed Supabase Edge CORS configuration.
- Draft web metadata/legal-link target `https://www.glam.beauty`; no DNS redirect, public cutover or Supabase Auth-site mutation.

### Environment contract

| Environment | Web/native | FastAPI/data |
| --- | --- | --- |
| Development | Local UI / Expo; current stable `glamai://auth/callback` retained | Isolated local PostgreSQL, existing local fixtures |
| Preview | Disconnected UI unless deliberately qualified; no production private credentials | Dedicated local/CI `_test` DB; runtime refuses remote DB access |
| Production | Public Supabase key only; target original project | Restricted runtime DB credential and original project/Auth configuration; no schema migration at boot |

Web build accepts only `NEXT_PUBLIC_SUPABASE_ANON_KEY` as a public configuration argument. API runtime requires `GLAM_DATABASE_URL`, the three existing `GLAM_OIDC_*` values, `GLAM_DEPLOYMENT_ENV=production`, and `GLAM_ALLOWED_ORIGINS=https://www.glam.beauty` (preserve old allowed origin during an approved transition). Never put a database password, service-role key, Stripe secret or deployment token in public builds. Use the actual verified Connect URL for a restricted runtime role; no guessed pooler region/credentials. Keep live payment activation separate.

## Supabase audit and current critical blockers

[Read-only evidence](evidence/supabase-readonly.json): original project `bkkmsbxrxkqaveymcrgi` is `ACTIVE_HEALTHY`; an actual SQL history query succeeded through the Management API. This proves administrative inspection connectivity, **not connectivity from Railway**.

- Production revision remains **0013_passwordless_accounts**. Creator Studio migration 0014 is in merged source but not deployed. The prepared FastAPI readiness check expects 0014 and correctly fails until the controlled migration process completes. No migration was executed in this task.
- New-origin Edge preflight for `https://www.glam.beauty` returned **403**, without an allow-origin header. A new web domain cannot currently make its cross-origin account calls successfully.
- Supabase Auth site/redirects remain `https://www.glamit.beauty`, its callback, and `glamai://auth/callback`. Add new exact web callback only in an approved, verified DNS/HTTPS transition while preserving the old callback as needed. OAuth provider console callbacks still target original-project `/auth/v1/callback`.
- Phone, Google, Apple and Facebook login are **disabled** in actual Supabase settings. No live OTP/social identity flow or cross-device login can be claimed.
- The configured DB URL is parseable and points to the original project, but uses an **administrative username**. It was not reused as a production application credential and no password is printed in evidence.
- Real Stripe callback/webhook delivery from a new Railway API was not verified. Existing Stripe test helpers are not an automatically mounted production webhook. Do not change Stripe destinations or activate payments on this evidence.

## Native release status

The user confirms no registered app identifiers/EAS project yet. `app.config.ts` preserves `glamai`, the existing slug and GLAM Beauty display name. Production config refuses missing registered iOS/Android identifiers, EAS project/owner, public Auth key, original icon and splash files. No identifiers, keys, EAS project, signing certificate or store record were invented or created.

`eas.json` prepares development/internal preview/store candidate profiles. `.github/workflows/native-store-build.yml` is **manual only**, requires an exact reviewed SHA and build environment configuration, uses pinned EAS CLI, waits for native build completion and **never submits** to either store. Configure protected GitHub environment/reviewers and EAS credentials before enabling it. OTA publishing is not configured or claimed.

Both iOS and Android **JavaScript/Hermes exports pass locally**, but no signed IPA/AAB, device run or App Store/Play submission exists. Original downloadable icon/wordmark/favicon files are still missing. No approximate art was substituted.

## Independent CI/CD

CI selects changed paths into independent `web`, `mobile`, `backend`, `hosted-api` jobs, retaining aggregate required `clients` status. Web-only source changes do not build native JS; native-only source changes do not build the website/API. Shared packages/lockfiles deliberately validate both clients; backend/schema changes validate backend. Five path-routing tests cover this behavior.

Backend/web jobs also build their separate Docker image and run local component smoke checks. Native store builds remain manual; normal mobile CI exports JS and labels artifacts **not store builds**. Railway watch patterns are prepared separately; live auto-deploy/Wait-for-CI/source settings have **not** been changed or verified.

## Validation and launch report

| Requested result | Evidence/status |
| --- | --- |
| Local API/web images | Both built; local port/liveness/SSR/readiness/CORS smoke checks pass with fixture configuration |
| Backend regression | 260 passing local PostgreSQL tests; includes deployment controls and two-session shared-data ownership |
| Client/config validation | Normal standalone Next build and local browser click-through passed; web/mobile TypeScript; five CI-routing cases; production native config fails closed; iOS/Android JS exports pass |
| Web deployed URL | Existing Railway URL reported by user; HTTPS/UI routes **not verified** because access is blocked |
| API deployed URL | No separate API service/domain verified; none created |
| iOS signed build | **Not built** — identifiers/project/artwork/signing unavailable |
| Android signed build | **Not built** — identifiers/project/artwork/signing unavailable |
| Supabase connection | Management API + read-only SQL verified; Railway runtime connectivity unverified |
| CI/CD | Review candidate adds independent checks/configs; actual Railway auto-deploy status and final PR checks recorded in GitHub |
| Cross-platform authentication | Shared Auth/security contract doubles pass in existing suite; real web/iOS/Android session flow **not run** |
| Cross-platform data sync | Real local PostgreSQL two-session same-identity test; actual web↔native devices **not run** |
| Live click-through/E2E | **Blocked**, not replaced with local browser results |
| Railway failure/branch-load root cause | **Not established** without actual logs/app authorization/source metadata |

## Exact continuation once access is available

1. Supply the project-scoped `RAILWAY_TOKEN` securely and apply the narrowly scoped access draft; remove the unused broad-token draft requirement. Never configure both Railway tokens.
2. Inspect only the specified existing project/environment/service. Record deployment ID, source SHA/branch, GitHub App authorization, root/config file, builder, start command, health probe and sanitized build/runtime errors. Preserve the active deployment and configuration.
3. Fetch and compare the exact deployed source with default `feat/platform-foundations`; do not switch to nonexistent `main`, force-push or disconnect the repository. Diagnose each failed deployment from logs before proposing a repair.
4. Determine whether the existing service serves Next, static UI, FastAPI or combined processes. Select a tested config only for the actual intended runtime; obtain approval before any public redeployment/domain change. Create no additional service until the existing architecture warrants it.
5. Complete reviewed schema/runtime-role/API-parity/Auth/provider/domain prerequisites, verify recovery and rollback, then independently smoke-test approved deployments. Run actual browser click-through and authorized same-user web/native data tests. Enable Wait for CI only after verifying required checks and the actual source integration.

Public launch remains blocked until those checks and the user's release approval are complete.
