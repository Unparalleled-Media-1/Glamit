# Current-instance validation

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
