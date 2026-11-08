"""Deployment controls never change application identities or automatically migrate data."""

import importlib.util
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from glam_api.deployment import cors_origins
from glam_api.main import app
from starlette.middleware.cors import CORSMiddleware

spec = importlib.util.spec_from_file_location("start_api", "scripts/start-api.py")
entry = importlib.util.module_from_spec(spec)
spec.loader.exec_module(entry)


def test_port_binding_and_preview_database_boundary():
    env = {
        "PORT": "9123",
        "GLAM_DATABASE_URL": "postgresql://test:fixture@localhost/demo_test",
        "GLAM_DEPLOYMENT_ENV": "preview",
    }
    assert entry.runtime_options(env)["port"] == 9123
    assert entry.runtime_options(env)["host"] == "0.0.0.0"
    with pytest.raises(RuntimeError, match="NONPRODUCTION_REQUIRES_ISOLATED"):
        entry.runtime_options(
            {
                **env,
                "GLAM_DATABASE_URL": "postgresql://test:fixture@db.bkkmsbxrxkqaveymcrgi.supabase.co/postgres",
            }
        )
    with pytest.raises(RuntimeError, match="PORT_OUT_OF_RANGE"):
        entry.runtime_options({**env, "PORT": "0"})


def test_runtime_does_not_accept_another_project_or_admin_database_role():
    env = {
        "GLAM_DEPLOYMENT_ENV": "production",
        "GLAM_DATABASE_URL": "postgresql://postgres:fixture@db.bkkmsbxrxkqaveymcrgi.supabase.co/postgres",
    }
    with pytest.raises(RuntimeError, match="RESTRICTED_RUNTIME_DATABASE_ROLE"):
        entry.runtime_options(env)
    with pytest.raises(RuntimeError, match="ORIGINAL_SUPABASE_PROJECT_REQUIRED"):
        entry.runtime_options(
            {**env, "GLAM_DATABASE_URL": "postgresql://test:fixture@other.invalid/postgres"}
        )
    assert "command.upgrade" not in Path("scripts/start-api.py").read_text()


@pytest.mark.parametrize(
    "origin",
    [
        "*",
        "https://www.glam.beauty/",
        "https://user:pass@www.glam.beauty",
        "http://www.glam.beauty",
        "https://www.glam.beauty?token=bad",
    ],
)
def test_cors_rejects_ambiguous_credentialed_or_insecure_origins(origin):
    with pytest.raises(RuntimeError):
        cors_origins(origin, production=True)


def test_cors_preflight_allows_new_origin_without_cookies_and_denies_outsiders():
    wrapped = CORSMiddleware(
        app,
        allow_origins=cors_origins("https://www.glam.beauty"),
        allow_methods=["GET"],
        allow_headers=["Authorization"],
        allow_credentials=False,
    )
    with TestClient(wrapped) as c:
        accepted = c.options(
            "/v1/me",
            headers={
                "Origin": "https://www.glam.beauty",
                "Access-Control-Request-Method": "GET",
                "Access-Control-Request-Headers": "authorization",
            },
        )
        assert accepted.status_code == 200
        assert accepted.headers["access-control-allow-origin"] == "https://www.glam.beauty"
        assert "access-control-allow-credentials" not in accepted.headers
        assert (
            c.options(
                "/v1/me",
                headers={"Origin": "https://evil.invalid", "Access-Control-Request-Method": "GET"},
            ).status_code
            == 400
        )
        assert c.get("/health/live").json()["status"] == "alive"
