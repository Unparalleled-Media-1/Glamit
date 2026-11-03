#!/usr/bin/env bash
set -euo pipefail
cd /workspace/Glamit
export UV_CACHE_DIR="${UV_CACHE_DIR:-/tmp/glam-uv-cache}"
uv sync --frozen
npm ci --ignore-scripts

# Target the managed local daemon, not an inherited remote context.
glam_docker() {
  env -u DOCKER_HOST -u DOCKER_CONTEXT -u DOCKER_TLS \
    -u DOCKER_TLS_VERIFY -u DOCKER_CERT_PATH \
    docker --host=unix:///var/run/docker.sock "$@"
}
glam_docker compose up -d --wait postgres
if [ ! -f .env ]; then
  cp .env.example .env
fi

# Never apply the automatic development migrations to a user-selected remote database.
uv run --frozen python - <<'PY'
from sqlalchemy.engine import make_url
from glam_api.config import Settings
url = make_url(Settings().database_url)
if (url.host, url.port or 5432, url.database) != ("127.0.0.1", 5432, "glam"):
    raise SystemExit("Automatic setup only migrates the local Compose glam database; review your configuration")
PY
uv run --frozen alembic upgrade head
glam_test_exists=$(glam_docker compose exec -T postgres psql -U glam -d postgres -tAc \
  "SELECT 1 FROM pg_database WHERE datname='glam_test'")
if [ "$glam_test_exists" != "1" ]; then
  glam_docker compose exec -T postgres createdb -U glam glam_test
fi
