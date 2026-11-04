#!/usr/bin/env bash
set -euo pipefail
cd /workspace/Glamit
export UV_CACHE_DIR="${UV_CACHE_DIR:-/tmp/glam-uv-cache}"
: "${GLAM_TEST_DATABASE_URL:?Set a dedicated PostgreSQL database URL ending in _test}"
uv run --frozen ruff check .
uv run --frozen ruff format --check .
uv run --frozen pytest
uv run --frozen python scripts/export_contracts.py --check
npm run check:client-runtime
npm run typecheck
