Use the existing /workspace/Glamit checkout; each cloud task is isolated. Do not create a Git worktree unless the user explicitly requests one. Read AGENTS.md before development. Keep production migrations, deployment, live providers/payments, and installed native acceptance behind their separate gates.

Prepared: Python 3.12 virtualenv, Node 24.22.1/npm 11.9.0 workspace dependencies, Playwright package, system /usr/bin/chromium, PostgreSQL 17 image and local databases. Live processes must restart after restore. If dependencies need refreshing, run the saved install_script (also /workspace/glam-environment/install.sh). It uses frozen uv/npm installations with a temporary npm --legacy-peer-deps workaround; plain npm ci fails on the committed React override mismatch. Do not edit manifests or lockfiles as part of setup.

From /workspace/Glamit:
export UV_CACHE_DIR=/tmp/glam-uv-cache
export GLAM_DATABASE_URL=postgresql+psycopg://glam:glam_local_only@127.0.0.1:5432/glam_dev_test
export GLAM_TEST_DATABASE_URL=postgresql+psycopg://glam:glam_local_only@127.0.0.1:5432/glam_test
export NEXT_TELEMETRY_DISABLED=1 EXPO_NO_TELEMETRY=1 EXPO_OFFLINE=1
env -u DOCKER_HOST -u DOCKER_CONTEXT -u DOCKER_TLS -u DOCKER_TLS_VERIFY -u DOCKER_CERT_PATH docker --host=unix:///var/run/docker.sock compose up -d --wait postgres

Use separate persistent terminal sessions for:
1. uv run --frozen uvicorn glam_api.main:app --host 127.0.0.1 --port 8000 --no-access-log
2. uv run --frozen python -m glam_api.worker
3. npm run dev --workspace=@glam/web -- --hostname 127.0.0.1 --port 3000
No public loopback previews. Validate locally with HTTP requests: /health/live returns 200/alive; /health/ready returns 503 "Identity provider is not configured" until real OIDC is configured. Check an unauthenticated /v1/me request fails closed. Web / and /analyze should render. For browser checks use docs/design-preview/node_modules/playwright with executablePath /usr/bin/chromium and args ['--no-sandbox']; downloading Playwright Chromium is unnecessary and cdn.playwright.dev is currently denied.

Useful checks:
uv run --frozen ruff check .
uv run --frozen python scripts/export_contracts.py --check
uv run --frozen pytest (dedicated glam_test only; observed 399 passed, 1 failed dependency-consistency test)
npm run check:client-runtime
npm run typecheck
npm run test:client (13 passed)
npm run build:web
EXPO_OFFLINE=1 EXPO_NO_TELEMETRY=1 CI=1 npm run export --workspace=@glam/mobile (both platforms passed)
The Expo install --check currently fails because declared React 19.3.1 differs from SDK expected 19.3.0. Mobile JS exports are not native binary/device acceptance. The backend suite writes docs/application-preview/stripe-test-fixture-report.json; preserve its pre-test contents outside the checkout and restore only the generated change if needed, preserving user changes.
Next dev automatically generates apps/web/AGENTS.md and updates next-env.d.ts for dev types. Preserve any pre-existing copies and clean up only changes it generates when setup finishes; do not overwrite user edits.
Real OIDC, private Storage, AI providers, Stripe and native devices are unconfigured/unverified; local SQL Auth/Storage fixtures are test doubles only. No secret values are needed for this local workflow. Do not apply these fixtures to hosted databases.

