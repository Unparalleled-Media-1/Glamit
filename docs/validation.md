# Current-instance validation

## Client toolchain repair — 4 November 2026

Branch `fix/reproducible-client-toolchain`, validated in the restored published environment. The repository's frozen installer now runs directly without the external generator or npm peer-resolution workarounds used during onboarding. The published environment configuration was not edited or republished.

- `bash scripts/setup.sh`: passed with `uv sync --frozen`, `npm ci --ignore-scripts`, local PostgreSQL reuse, preserved `.env`, repeatable canonical migrations and existing dedicated test database detection.
- `GLAM_TEST_DATABASE_URL=<dedicated local glam_test URL> bash scripts/check.sh`: passed Ruff check/format, all 32 real-PostgreSQL tests (none skipped), OpenAPI JSON check, client runtime checks and both TypeScript checks. One existing Starlette/httpx deprecation warning remains.
- `npm run contracts:generate` followed by `git diff --exit-code -- packages/contracts`: passed; checked-in generated contracts are unchanged with TypeScript 5.9.3.
- `NEXT_TELEMETRY_DISABLED=1 npm run build:web`: passed with matching React/React DOM 19.3.0.
- Started the built web shell with `npm run start --workspace=@glam/web -- --hostname 127.0.0.1`; a local request returned HTTP 200, the expected development-shell content and the `nosniff` header.
- Offline Expo `install --check`: passed against the installed SDK compatibility map. Android and iOS exports both completed. This does not validate online Expo services, native binaries or device behavior.
- `npm run check:client-runtime`: passed actual shared-module checks for mobile/Expo/React Native and web/React DOM, plus server rendering of a hook-using web component.
- `npm audit --omit=dev --audit-level=moderate`: zero reported production dependency vulnerabilities. Developer-tool advisories retain the limits documented in dependency-overrides.md.

GitHub API repository lookup returned `Forbidden`; no remote CI or pull-request creation is claimed by these local checks. Supabase/Google connection remains explicitly deferred, and no production deployment was performed.

## Earlier foundation evidence

4 November 2026; branch `feat/platform-foundations`. These checks establish the foundation subset in `implementation-status.md`, not production readiness.

| Check | Evidence |
|---|---|
| Backend automated suite | 32 tests passed against real PostgreSQL 17; no skipped tests. Covers RS256/ES256 auth, Google-token/cross-project rejection, owner/tenant isolation, client RLS denial, idempotency, immutable revisions, redacted logs, consent withdrawal/deletion, credit constraints/concurrency/rollback and ranking primitives |
| Canonical migrations | Initial/safety migrations succeeded on an empty database and on repeat; the additive server-only RLS migration passed in local development/test databases; one head `0003_server_only_access` |
| Python hygiene / contracts | Ruff checks and formatting passed; implemented OpenAPI JSON exported and checked; TypeScript types generated |
| Client compilation | Mobile/web TypeScript checks and Next.js production-mode build passed; this is a build artifact, not a deployment |
| Mobile bundles | Expo exported Android and iOS Hermes JavaScript bundles; installed compatibility map agrees with pinned direct versions; no native binaries/device/store testing claimed |
| Dependency security correction | After clean installation with explicit Expo overrides, mobile exports and fingerprint generation passed; production-only npm audit reported zero vulnerabilities; see `dependency-overrides.md` for dev-tool and native-build limits |
| Setup repeatability | `bash scripts/setup.sh` exercised frozen Python/JS install, existing local Postgres reuse, preserved config, repeatable migrations and existing test-database detection |
| Local API smoke | Liveness HTTP 200 with expected JSON; readiness and protected `/v1/me` return HTTP 503 because identity is unconfigured; no-store/request-ID headers checked |
| Local web smoke | Compiled shell returned HTTP 200, declared features unavailable and collected no facial images/payments; security header checked |
| Privacy worker startup | Documented `python -m glam_api.worker --once` ran; transactional withdrawal/delete handling exercised in automated tests |

Known test-tool warning: the installed Starlette version deprecates its httpx-backed test client in favor of httpx2. The suite executed successfully; this is not a failed or skipped test. Follow upstream migration separately.

Remote GitHub CI, live OIDC/MFA, object storage, AI providers, real merchant feeds, payment settlement, full auctions/caps/attribution, security penetration tests, cloud IaC and production restore/performance gates remain unverified. GitHub API access currently returns Forbidden; Git transport access is checked separately. No production deployment or destructive database change was performed.
