# Development environment

The latest goal-led `/event` and `/builder` journeys, opt-in device profile metadata and full review runbook are in [application preview](application-preview/README.md). No external provider or hosted database is connected.

The current client implementation is the [analysis-first application build](specification/analysis-first-build.md), superseding the older foundation-shell/design-only preview notes below. Run `npm run dev:web` and open `http://localhost:3000` on the same machine; `/analyze`, `/report`, `/color`, `/guide`, `/studio`, `/business` and `/admin` are actual app routes. Run `npm run dev:mobile` for Expo. Native photo/camera modules need an SDK-compatible Expo Go or development build; physical-device behavior remains unverified. See [current preview guide](application-preview/README.md).

For UI tests run `npm run test:client`; after `npm run build:web`, run `npm run test:web` (requires the isolated Playwright install in `docs/design-preview` and Chromium). New APIs are in generated contracts. Apply canonical migrations to a deliberately selected development database before using them; tests use only a dedicated `_test` database. No hosted connection is activated by this code update.

Use the existing checkout, not an additional worktree. Node 24.22.1, npm 11.9.0 and Python 3.12 are pinned. `uv.lock` and `package-lock.json` reproduce dependencies. PostgreSQL 17 is required; SQLite does not validate locking or journal triggers.

TypeScript is pinned to 5.9.3 because `openapi-typescript` 7.13.0 requires its compiler API. Both clients use React 19.3.0, the installed Expo SDK's expected version; root overrides keep React/React DOM peers on that version so Metro cannot load a different React instance from the app. Upgrade Expo, React Native and React together and run the runtime/compatibility checks below. See [dependency constraints](dependency-overrides.md). Frozen installation and contract generation use the repository commands directly; the earlier external generator and `--legacy-peer-deps`/`--package-lock=false` installation workarounds are unnecessary on this branch.

From this managed checkout, `bash scripts/setup.sh` is the tested repeatable installer. It preserves `.env`, targets the local Docker daemon, refuses automatic migrations against other database destinations and creates the dedicated test database only if absent. It also sets a writable uv cache. The expanded equivalent workflow follows below.

```sh
cd /workspace/Glamit
uv sync --frozen
npm ci --ignore-scripts
docker compose up -d --wait postgres
cp -n .env.example .env
uv run --frozen alembic upgrade head
uv run --frozen uvicorn glam_api.main:app --host 127.0.0.1 --port 8000 --no-access-log
```

Preserve an existing `.env`; do not overwrite it. The sample database password is strictly local development and the port is bound to loopback. Do not use that password or Compose deployment in production. In the managed cloud runtime, follow its Docker proxy/CA guidance and target its local daemon. A read-only default cache can be handled by `UV_CACHE_DIR=/tmp/glam-uv-cache` while retaining TLS verification.

The API liveness request `/health/live` should return `{"status":"alive"}`. `/health/ready` intentionally returns 503 until current migrations and all three real OIDC settings are available. Protected routes also fail closed. Google through Supabase Auth and Supabase PostgreSQL are selected; connection setup is deferred by the user. Once requested, configure `GLAM_OIDC_ISSUER`, `GLAM_OIDC_AUDIENCE` and `GLAM_OIDC_JWKS_URL` for the exact project, following [ADR 015](adr-015-supabase-google-capture.md). Only HTTPS issuer/JWKS endpoints and asymmetric RS256/ES256 tokens are supported. There is no development auth bypass or pre-created privileged account. Real identity login/MFA remains unverified until connected. The facial step is beauty analysis after sign-in, not face-login recognition.

No consent policy is pre-approved by a seed. Populate an approved policy through a reviewed administrative process before private-look writes can be enabled; test policy fixtures exist only in the disposable test database. Facial uploads, AI decomposition, catalogs and payments are not configured by this setup.

In separate terminals:

```sh
cd /workspace/Glamit
uv run --frozen python -m glam_api.worker
npm run dev:web
npm run dev:mobile
```

The web and mobile screens are explicitly labeled development shells. Expo can bundle offline with installed packages; online Expo account/device services are separate capabilities. Native iOS/Android binary builds, store distribution and device testing have not been established by JavaScript exports.

## Preview the current UI

The standalone design artifact in `docs/design-preview` now reflects the proposed global PRD v2/Style Companion direction. It remains separate from application routes; global/age/guardian/agent/twin capabilities are not enabled. The revised architecture/criteria await the review required in `docs/approvals.md`.

The latest [UI/UX design handoff](specification/ui-ux-design-handoff.md) expands design scope to consumer and business web apps alongside iOS/Android and platform-wide `/admin`. This supersedes the earlier landing-only/mobile-only design rule. Application clients still contain foundation screens; actual admin, login, scanning, analysis and commerce remain unimplemented.

For the independent design prototype, run `npm start --prefix docs/design-preview` and open `http://127.0.0.1:3345` **on the same machine**. Select iOS, Android, consumer web, one of five role workspaces, Design system or Screen-family library. The toolbar includes lifecycle states, audience restrictions, wireframes and partial RTL. See [preview instructions](design-preview/README.md) for screenshots and repeatable checks. This loopback address is not a public cloud or phone preview link.

For a phone preview, use a checkout on your own computer on the same network as the phone:

```sh
npm ci --ignore-scripts
npm exec --workspace=@glam/mobile -- expo start --lan
```

Open the QR code in an Expo Go version compatible with the pinned Expo SDK. This is the intended local-device preview workflow; device execution remains unverified. The repository's normal mobile start script uses `--localhost`, which does not expose the cloud server to a phone. A cloud-local address or QR code is not a public preview link. If the installed Expo Go cannot support the pinned SDK, a compatible development build is required; native build/distribution setup remains outstanding.

## Tests and generated contracts

Create a dedicated empty database once (the test harness refuses a name without `_test`):

```sh
docker compose exec -T postgres createdb -U glam glam_test
export GLAM_TEST_DATABASE_URL=postgresql+psycopg://glam:glam_local_only@127.0.0.1:5432/glam_test
uv run --frozen pytest
uv run --frozen ruff check .
uv run --frozen ruff format --check .
uv run --frozen python scripts/export_contracts.py --check
npm run contracts:generate
npm run check:client-runtime
npm run typecheck
NEXT_TELEMETRY_DISABLED=1 npm run build:web
EXPO_OFFLINE=1 EXPO_NO_TELEMETRY=1 npm exec --workspace=@glam/mobile -- expo install --check
EXPO_OFFLINE=1 EXPO_NO_TELEMETRY=1 npm run export --workspace=@glam/mobile
```

`createdb` is only needed when the database is absent; use `psql -lqt`/a database existence query to check before repeating. Tests truncate only the configured dedicated test database's application tables. Never point them at a user/shared database. Migrations run from empty or current database to the sole head; routine `upgrade head` is repeatable. Downgrade commands intentionally refuse to remove data/security safeguards. No setup command drops a database or volume.

After API changes regenerate JSON with `uv run python scripts/export_contracts.py` and TypeScript with `npm run contracts:generate`. Check both files into the feature PR. The specification's full API inventory is a future contract proposal; generated OpenAPI describes only actual endpoints in this foundation.
