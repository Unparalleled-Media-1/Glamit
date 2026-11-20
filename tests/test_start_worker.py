# ruff: noqa: E501
"""Background services must obey the API's production guards and only start known roles."""

import importlib.util
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("start_worker", ROOT / "scripts/start-worker.py")
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
LOCAL = {
    "GLAM_DEPLOYMENT_ENV": "development",
    "GLAM_DATABASE_URL": "postgresql+psycopg://u@127.0.0.1/x",
}


def test_known_roles_map_to_the_real_modules_and_they_exist():
    for role, module in mod.ROLES.items():
        argv = mod.command(role, LOCAL)
        assert argv == [sys.executable, "-m", module]
        assert importlib.util.find_spec(module) is not None


def test_unknown_or_missing_role_is_refused():
    for role in ("", "api", "worker; rm -rf /"):
        with pytest.raises(RuntimeError, match="UNKNOWN_WORKER_ROLE"):
            mod.command(role, LOCAL)


def test_production_guards_apply_to_background_services_too():
    production = {**LOCAL, "GLAM_DEPLOYMENT_ENV": "production"}
    with pytest.raises(RuntimeError, match="ORIGINAL_SUPABASE_PROJECT_REQUIRED"):
        mod.command("privacy-worker", production)
    wrong_role = {
        **production,
        "GLAM_DATABASE_URL": "postgresql+psycopg://postgres.bkkmsbxrxkqaveymcrgi:x@aws-0-eu.pooler.supabase.com/postgres",
    }
    with pytest.raises(RuntimeError, match="RESTRICTED_RUNTIME_DATABASE_ROLE_REQUIRED"):
        mod.command("media-cleanup", wrong_role)
    with pytest.raises(RuntimeError, match="DATABASE_URL_REQUIRED|POSTGRESQL_REQUIRED"):
        mod.command("privacy-worker", {"GLAM_DEPLOYMENT_ENV": "development"})
