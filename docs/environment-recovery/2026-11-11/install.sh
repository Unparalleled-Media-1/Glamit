#!/usr/bin/env bash
set -euo pipefail
cd /workspace/Glamit
export UV_CACHE_DIR=/tmp/glam-uv-cache
export UV_LINK_MODE=copy
uv sync --frozen
# React, React DOM and test renderer are aligned to Expo 58: 19.3.0.
npm ci --ignore-scripts --cache /tmp/glam-npm-cache
npm ci --ignore-scripts --prefix docs/design-preview --cache /tmp/glam-npm-cache
glam_docker() {
  env -u DOCKER_HOST -u DOCKER_CONTEXT -u DOCKER_TLS -u DOCKER_TLS_VERIFY -u DOCKER_CERT_PATH docker --host=unix:///var/run/docker.sock "$@"
}
glam_docker compose up -d --wait postgres
# These two isolated local databases are separate from every hosted/Stripe database.
for glam_db in glam_dev_test glam_test; do
  glam_exists=$(glam_docker compose exec -T postgres psql -U glam -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$glam_db'")
  if [ "$glam_exists" != 1 ]; then
    glam_docker compose exec -T postgres createdb -U glam "$glam_db"
  fi
done
# This is the Compose sample password, exclusively for disposable local development.
export GLAM_DATABASE_URL=postgresql+psycopg://glam:glam_local_only@127.0.0.1:5432/glam_dev_test
uv run --frozen python - <<'PY'
from pathlib import Path
from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url
from glam_api.config import Settings
url = make_url(Settings().database_url)
if (url.host, url.port or 5432, url.database) != ("127.0.0.1", 5432, "glam_dev_test"):
    raise SystemExit("Refusing initialization outside the disposable local database")
with create_engine(url).begin() as connection:
    for fixture in ("supabase_auth.sql", "supabase_storage.sql"):
        connection.execute(text(Path("tests/fixtures", fixture).read_text()))
PY
uv run --frozen alembic upgrade application@head
npm run check:client-runtime

