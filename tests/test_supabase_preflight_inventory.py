"""Read-only metadata/count audit boundaries, with no live Supabase requests."""

import importlib.util
import json
from pathlib import Path

import httpx
import pytest

spec = importlib.util.spec_from_file_location(
    "supabase_inventory", Path("scripts/supabase_preflight_inventory.py")
)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def setup(monkeypatch, handler):
    monkeypatch.setenv("SUPABASE_URL", f"https://{module.PROJECT}.supabase.co")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "inventory-fixture-secret")
    original = httpx.Client
    monkeypatch.setattr(
        module.httpx, "Client", lambda **kw: original(transport=httpx.MockTransport(handler), **kw)
    )


def test_inventory_never_fetches_rows_or_invokes_rpcs_and_flags_existing_data(monkeypatch):
    requests = []

    def handler(request):
        requests.append((request.method, request.url.path))
        if request.url.path == "/rest/v1/":
            return httpx.Response(
                200,
                json={
                    "paths": {"/look": {}, "/rpc/unsafe_sql": {}},
                    "definitions": {"look": {"properties": {"id": {}}}},
                },
            )
        if request.url.path == "/rest/v1/look":
            assert request.method == "HEAD"
            assert request.headers["prefer"] == "count=exact"
            return httpx.Response(200, headers={"Content-Range": "0-0/3"})
        return httpx.Response(
            200, json=[{"id": "face", "public": False, "owner": "private-owner-not-reported"}]
        )

    setup(monkeypatch, handler)
    result = module.inventory()
    assert requests == [
        ("GET", "/rest/v1/"),
        ("HEAD", "/rest/v1/look"),
        ("GET", "/storage/v1/bucket"),
    ]
    assert result["tables"][0]["row_count"] == 3
    assert "EXISTING ROWS" in result["valuable_data"]
    assert result["mutation_requests"] == 0 and not result["sql_executed"]
    public = json.dumps(result)
    assert "inventory-fixture-secret" not in public and "private-owner-not-reported" not in public


def test_empty_exposed_schema_does_not_certify_empty_project_or_migration_permissions(monkeypatch):
    setup(
        monkeypatch,
        lambda r: httpx.Response(200, json={"paths": {}} if r.url.path == "/rest/v1/" else []),
    )
    result = module.inventory()
    assert result["exposed_table_count"] == 0 and result["tables"] == []
    assert "UNKNOWN" in result["valuable_data"] and "UNVERIFIED" in result["migration_permission"]


@pytest.mark.parametrize("status", [302, 401, 503])
def test_failed_inventory_is_not_empty_project_evidence_or_secret_output(monkeypatch, status):
    setup(monkeypatch, lambda r: httpx.Response(status, text="inventory-fixture-secret"))
    result = module.inventory()
    assert "BLOCKED" in result["rest_inventory"] and "BLOCKED" in result["storage_inventory"]
    assert "UNKNOWN" in result["valuable_data"] and "inventory-fixture-secret" not in json.dumps(
        result
    )


def test_wrong_project_never_receives_service_key(monkeypatch):
    monkeypatch.setenv("SUPABASE_URL", "https://wrong-project.example")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "inventory-fixture-secret")
    monkeypatch.setattr(
        module.httpx, "Client", lambda **kw: pytest.fail("Must not issue a request")
    )
    assert module.inventory()["state"] == "BLOCKED"
