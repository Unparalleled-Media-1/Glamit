# Start the recovered development workflow

Use the existing `/workspace/Glamit` checkout. Each cloud task is isolated; do not create a Git worktree unless explicitly requested. Read root `AGENTS.md` and the current native directives. Do not assume background processes survive snapshot restoration.

The original platform configuration and `/workspace/glam-environment` files are preserved. The current reproducible installer is `bash docs/environment-recovery/2026-11-11/install.sh` from the repository root. It requires the image's pinned Node 24.22.1/npm 11.9.0 and Python 3.12/uv, retains TLS/package-integrity checks, installs without peer bypasses, starts the local pinned PostgreSQL 17 image, and idempotently initializes two separate disposable local databases. It never reads a hosted database URL for its initialization and never applies fixtures/migrations to hosted systems.

From `/workspace/Glamit`, initialize each service terminal:

```sh
export UV_CACHE_DIR=/tmp/glam-uv-cache
export GLAM_DATABASE_URL=postgresql+psycopg://glam:glam_local_only@127.0.0.1:5432/glam_dev_test
export GLAM_TEST_DATABASE_URL=postgresql+psycopg://glam:glam_local_only@127.0.0.1:5432/glam_test
export NEXT_TELEMETRY_DISABLED=1 EXPO_NO_TELEMETRY=1 EXPO_OFFLINE=1
env -u DOCKER_HOST -u DOCKER_CONTEXT -u DOCKER_TLS -u DOCKER_TLS_VERIFY -u DOCKER_CERT_PATH docker --host=unix:///var/run/docker.sock compose up -d --wait postgres
```

The password above is the repository's strictly local Compose sample, not a secret or production credential. Keep `glam_test` separate from any persistent Stripe sandbox. Preserve pre-existing `.env` files and all user edits.

Run in separate persistent terminals:

```sh
uv run --frozen uvicorn glam_api.main:app --host 127.0.0.1 --port 8000 --no-access-log
uv run --frozen python -m glam_api.worker
npm run dev --workspace=@glam/web -- --hostname 127.0.0.1 --port 3000
```

Reuse existing healthy services instead of starting duplicates. Verify with local requests: API `/health/live` must return 200/alive; `/health/ready` returns 503 with “Identity provider is not configured” until genuine OIDC is configured. `/v1/me` must fail closed. Web `/` and `/analyze` must render. These local endpoints are not public previews. Browser smoke checks use `docs/design-preview/node_modules/playwright` with `/usr/bin/chromium` and `--no-sandbox`; the blocked Playwright CDN download is unnecessary.

Use `uv run --frozen pytest` only with the dedicated test URL. The suite writes `docs/application-preview/stripe-test-fixture-report.json`: preserve pre-test bytes outside the checkout and restore only its generated changes afterward. `next dev` generates `apps/web/AGENTS.md` and updates `next-env.d.ts`; preserve existing user copies/edits and clean up only generated setup changes. Standard checks are the root AGENTS commands plus `python3 scripts/ci/check_lockfiles.py`, `npm run check:client-runtime` and the relevant client suites. React 19.3.0 now matches Expo; no dependency bypass should be used.

## Native continuation

The authoritative controlled native work is **`apps/glam_mobile`**, not the retained Expo app or rejected `apps/flutter_app`. The current first-feature gate is Analyze only. Home/Studio/Discover/Profile implementation waits for real Analyze acceptance and required design approval; preparing a map does not grant that approval.

Flutter 3.47.9, Dart, Android tooling and macOS/Xcode are **not installed or validated in this machine**. The existing `scripts/analyze-restart/bootstrap.sh`, `apps/glam_mobile/README.md` and `.github/workflows/flutter-analyze-restart.yml` define native prerequisites and independent runner steps. They generate platform shells; do not run them blindly over user changes. Preserve native inputs and share one resolved `pubspec.lock` across both OS jobs as the workflow specifies. No local native startup claim follows from the recovered JS/API environment.

Native public build settings are `GLAM_API_ORIGIN` (qualified canonical HTTPS origin) and `SUPABASE_PUBLIC_KEY` (original project's public app key), delivered securely to the build. Auth remains pinned to original Supabase project `bkkmsbxrxkqaveymcrgi`. Never put passwords, session tokens, service-role/Management keys or provider keys in the app or this documentation. Real login/upload/analysis/Passport acceptance requires qualified backend schema/routes, storage/policies/worker/provider and an authorized eligible identity. No production setup is authorized by these instructions.
