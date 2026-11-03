# Development environment

Use the existing checkout, not an additional worktree. Node 24.22.1, npm 11.9.0 and Python 3.12 are pinned. `uv.lock` and `package-lock.json` reproduce dependencies. PostgreSQL 17 is required; SQLite does not validate locking or journal triggers.

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

The API liveness request `/health/live` should return `{"status":"alive"}`. `/health/ready` intentionally returns 503 until current migrations and all three real OIDC settings are available. Protected routes also fail closed. Configure `GLAM_OIDC_ISSUER`, `GLAM_OIDC_AUDIENCE` and `GLAM_OIDC_JWKS_URL` through environment settings for the intended provider. Only HTTPS issuer/JWKS endpoints and RS256 tokens are supported initially. There is no development auth bypass or pre-created privileged account. Real identity login/MFA remains unverified until a provider is connected.

No consent policy is pre-approved by a seed. Populate an approved policy through a reviewed administrative process before private-look writes can be enabled; test policy fixtures exist only in the disposable test database. Facial uploads, AI decomposition, catalogs and payments are not configured by this setup.

In separate terminals:

```sh
cd /workspace/Glamit
uv run --frozen python -m glam_api.worker
npm run dev:web
npm run dev:mobile
```

The web and mobile screens are explicitly labeled development shells. Expo can bundle offline with installed packages; online Expo account/device services are separate capabilities. Native iOS/Android binary builds, store distribution and device testing have not been established by JavaScript exports.

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
npm run typecheck
NEXT_TELEMETRY_DISABLED=1 npm run build:web
EXPO_OFFLINE=1 EXPO_NO_TELEMETRY=1 npm exec --workspace=@glam/mobile -- expo install --check
EXPO_OFFLINE=1 EXPO_NO_TELEMETRY=1 npm run export --workspace=@glam/mobile
```

`createdb` is only needed when the database is absent; use `psql -lqt`/a database existence query to check before repeating. Tests truncate only the configured dedicated test database's application tables. Never point them at a user/shared database. Migrations run from empty or current database to the sole head; routine `upgrade head` is repeatable. Downgrade commands intentionally refuse to remove data/security safeguards. No setup command drops a database or volume.

After API changes regenerate JSON with `uv run python scripts/export_contracts.py` and TypeScript with `npm run contracts:generate`. Check both files into the feature PR. The specification's full API inventory is a future contract proposal; generated OpenAPI describes only actual endpoints in this foundation.
