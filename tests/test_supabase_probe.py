"""Read-only probe doubles; never contact Supabase or certify live connectivity."""

import base64
import json

import pytest
from glam_api.integrations.runtime import IntegrationError
from glam_api.integrations.supabase_probe import SupabaseReadOnlyProbe
from pydantic import SecretStr

URL = "https://abcdefghijklmnopqrst.supabase.co"
PUBLIC = "sb_publishable_test_fixture"


class TransportDouble:
    def __init__(self, response=None, error=None):
        self.response = response if response is not None else {"external": {"google": False}}
        self.error = error
        self.calls = []

    def send(self, method, url, headers):
        self.calls.append((method, url, headers))
        if self.error:
            raise self.error
        return self.response


def probe(transport, url=URL, key=PUBLIC, environment="development"):
    return SupabaseReadOnlyProbe(url, SecretStr(key), environment, transport)


@pytest.mark.parametrize(
    "url,key,environment,reason",
    [
        (URL, PUBLIC, "production", "development_environment_required"),
        (URL, "", "development", "credentials_absent"),
        ("http://127.0.0.1", PUBLIC, "development", "invalid_public_project_url"),
        (URL + "/rest/v1/private", PUBLIC, "development", "invalid_public_project_url"),
        (URL + "@attacker.example", PUBLIC, "development", "invalid_public_project_url"),
        (URL, "sb_secret_fixture", "development", "public_key_required"),
        (URL, PUBLIC + "\n", "development", "public_key_required"),
    ],
)
def test_invalid_or_privileged_configuration_never_makes_a_request(url, key, environment, reason):
    transport = TransportDouble()
    result = probe(transport, url, key, environment).check()
    assert result["state"] == "NOT CONFIGURED" and result["reason"] == reason
    assert transport.calls == []


@pytest.mark.parametrize("role", ["anon", "authenticated", "service_role"])
def test_legacy_jwt_public_role_only(role):
    claims = base64.urlsafe_b64encode(json.dumps({"role": role}).encode()).decode().rstrip("=")
    transport = TransportDouble()
    result = probe(transport, key=f"header.{claims}.signature").check()
    assert (result["state"] == "CONNECTED") is (role == "anon")
    assert bool(transport.calls) is (role == "anon")


def test_only_settings_get_is_allowed_and_connected_does_not_claim_database_or_release():
    transport = TransportDouble()
    instance = probe(transport)
    result = instance.check()
    assert transport.calls == [("GET", URL + "/auth/v1/settings", {"apikey": PUBLIC})]
    assert result["state"] == "CONNECTED"
    assert not any(
        result[k]
        for k in [
            "database_connected",
            "application_connected",
            "migrations_applied",
            "production_activation",
        ]
    )
    assert PUBLIC not in json.dumps(result) and PUBLIC not in repr(instance)


@pytest.mark.parametrize("response", [{}, {"external": "wrong"}, ["not a settings response"]])
def test_unexpected_responses_are_not_connected(response):
    result = probe(TransportDouble(response=response)).check()
    assert result["state"] == "DEGRADED"


def test_provider_failures_do_not_leak_keys_or_exception_details():
    for error in [IntegrationError("provider_auth_rejected"), RuntimeError(PUBLIC)]:
        result = probe(TransportDouble(error=error)).check()
        assert result["state"] == "DEGRADED" and PUBLIC not in json.dumps(result)


def test_process_environment_only_does_not_use_service_role_key(monkeypatch):
    monkeypatch.setenv("SUPABASE_URL", URL)
    monkeypatch.setenv("GLAM_SUPABASE_ENVIRONMENT", "development")
    monkeypatch.delenv("SUPABASE_ANON_KEY", raising=False)
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "must-never-be-used")
    instance = SupabaseReadOnlyProbe.from_environment()
    transport = TransportDouble()
    instance.transport = transport
    assert instance.check()["state"] == "NOT CONFIGURED"
    assert transport.calls == []
