import json
from concurrent.futures import ThreadPoolExecutor
from types import SimpleNamespace
from uuid import uuid4

import pytest
from glam_api.ai_stylist import openai_provider, stylist_engine
from glam_api.auth import Principal, get_principal
from glam_api.integrations.providers import OpenAI
from glam_api.integrations.runtime import IntegrationError, ProviderConfig
from glam_api.main import app
from pydantic import SecretStr
from sqlalchemy import text
from test_workspaces import account, qualify


@pytest.fixture(autouse=True)
def local_engine(db):
    app.dependency_overrides[stylist_engine] = lambda: db
    yield
    app.dependency_overrides.pop(stylist_engine, None)


def test_openai_route_is_present_and_not_falsely_connected_without_credentials(client, monkeypatch):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    monkeypatch.delenv("GLAM_OPENAI_API_KEY", raising=False)
    result = client.get("/v1/ai/openai/status")
    assert result.status_code == 200
    assert result.json()["state"] == "NOT CONFIGURED"
    assert result.json()["scope"] == "openai_authenticated_api"


class ProviderDouble:
    def __init__(self):
        self.calls = []
        self.before = None
        self.error = None
        self.result = {
            "message": "Fixture-only styling response",
            "uncertainty": "Fixture only",
            "directions": [],
        }

    def send(self, method, url, headers, body=None):
        if method == "GET":
            return {"id": "test-model"}
        self.calls.append(body)
        if self.before:
            self.before()
        if self.error:
            raise self.error
        return {
            "status": "completed",
            "output": [
                {
                    "type": "message",
                    "content": [{"type": "output_text", "text": json.dumps(self.result)}],
                }
            ],
        }


@pytest.fixture
def stylist(client, db, monkeypatch):
    monkeypatch.setenv("GLAM_OPENAI_ADVISOR_ENABLED", "true")
    monkeypatch.setenv("GLAM_OPENAI_MAX_REQUESTS_PER_HOUR", "5")
    uid = account(client, "alice")
    qualify(db, uid)
    policy = uuid4()
    with db.begin() as c:
        c.execute(
            text(
                "INSERT INTO policy_document(id,purpose,version,content,approved_at) "
                "VALUES(:id,'ai_styling_advice','test-only','Isolated fixture only',now())"
            ),
            {"id": policy},
        )
    grant(client, policy)
    transport = ProviderDouble()
    provider = OpenAI(
        ProviderConfig(
            values={"OPENAI_API_KEY": SecretStr("fixture-not-real-key")}, openai_model="test-model"
        ),
        transport,
    )
    app.dependency_overrides[openai_provider] = lambda: provider
    return SimpleNamespace(uid=uid, policy=policy, transport=transport, provider=provider)


def grant(client, policy, action="granted"):
    response = client.post(
        f"/v1/policies/{policy}/consent",
        headers={"Idempotency-Key": str(uuid4())},
        json={"action": action},
    )
    assert response.status_code == 201


def ask(client, stylist, key=None, **changes):
    return client.post(
        "/v1/ai/stylist/advice",
        headers={"Idempotency-Key": str(key or uuid4())},
        json={
            "messages": ["Test-only styling brief"],
            "policy_id": str(stylist.policy),
            "consent": True,
            **changes,
        },
    )


def test_readiness_requires_real_model_probe_and_has_no_private_fields(client, stylist):
    result = client.get("/v1/ai/openai/status")
    assert result.json()["state"] == "CONNECTED"
    assert result.json()["scope"] == "openai_authenticated_api"
    assert result.json()["response_persistence"] == "transient"
    assert "fixture-not-real-key" not in result.text
    assert "no-store" in result.headers["cache-control"]


def test_advice_transient_audit_is_opaque_and_duplicate_is_not_billed(client, db, stylist):
    key = uuid4()
    response = ask(client, stylist, key)
    assert response.status_code == 200
    assert response.json()["subject"] == "alice"
    assert response.json()["id"] == str(key)
    assert "no-store" in response.headers["cache-control"]
    assert response.json()["advice"]["message"] == "Fixture-only styling response"
    assert ask(client, stylist, key).status_code == 409
    assert len(stylist.transport.calls) == 1
    assert stylist.transport.calls[0]["store"] is False
    with db.begin() as c:
        rows = list(
            c.execute(
                text("SELECT action,resource_id FROM audit_event WHERE action='ai.stylist.attempt'")
            )
        )
        assert rows == [("ai.stylist.attempt", key)]
        assert (
            c.scalar(text("SELECT count(*) FROM idempotency_record WHERE route LIKE '%stylist%'"))
            == 0
        )


@pytest.mark.parametrize(
    "changes",
    [
        {"consent": False},
        {"consent": 1},
        {"consent": "true"},
        {"photoUri": "file:///private.jpg"},
        {"messages": [""]},
        {"messages": ["x" * 2001]},
        {"messages": ["x" * 2000] * 5},
        {"owner_id": "another-user"},
    ],
)
def test_invalid_or_photo_requests_never_reach_provider(client, stylist, changes):
    assert ask(client, stylist, **changes).status_code == 422
    assert stylist.transport.calls == []


def test_missing_consent_and_adult_eligibility_prevent_provider(client, db, stylist):
    grant(client, stylist.policy, "withdrawn")
    assert ask(client, stylist).status_code == 403
    grant(client, stylist.policy)
    with db.begin() as c:
        c.execute(text("DELETE FROM account_eligibility WHERE user_id=:u"), {"u": stylist.uid})
    assert ask(client, stylist).status_code == 403
    assert stylist.transport.calls == []


def test_only_current_approved_policy_and_not_future_document_is_exposed(client, db, stylist):
    future = uuid4()
    with db.begin() as c:
        c.execute(
            text(
                "INSERT INTO policy_document(id,purpose,version,content,approved_at) "
                "VALUES(:id,'ai_styling_advice','future-test-only',"
                "'Not yet approved',now()+interval '1 day')"
            ),
            {"id": future},
        )
    assert client.get("/v1/ai/stylist/policy").json()["id"] == str(stylist.policy)
    assert ask(client, stylist, policy_id=str(future)).status_code == 403
    assert stylist.transport.calls == []


def test_hourly_guard_counts_failed_attempt_and_no_automatic_retry(client, stylist, monkeypatch):
    monkeypatch.setenv("GLAM_OPENAI_MAX_REQUESTS_PER_HOUR", "1")
    key = uuid4()
    stylist.transport.error = IntegrationError("provider_unavailable", retryable=True)
    assert ask(client, stylist, key).status_code == 503
    assert ask(client, stylist, key).status_code == 409
    assert ask(client, stylist).status_code == 429
    assert len(stylist.transport.calls) == 1


def test_concurrent_duplicate_attempts_issue_one_provider_call(client, stylist):
    key = uuid4()
    with ThreadPoolExecutor(max_workers=2) as pool:
        replies = list(pool.map(lambda _: ask(client, stylist, key).status_code, range(2)))
    assert sorted(replies) == [200, 409]
    assert len(stylist.transport.calls) == 1


def test_no_database_lock_during_provider_call_and_consent_regrant_cannot_revive_reply(
    client, db, stylist
):
    def withdraw_and_regrant():
        # Fails/hangs if the route holds its actor lock through provider I/O.
        grant(client, stylist.policy, "withdrawn")
        grant(client, stylist.policy)

    stylist.transport.before = withdraw_and_regrant
    result = ask(client, stylist)
    assert result.status_code == 409 and result.json()["message"] == "styling_scope_changed"
    assert "Fixture-only styling response" not in result.text


def test_expired_eligibility_after_provider_call_never_exposes_reply(client, db, stylist):
    def expire():
        with db.begin() as c:
            c.execute(
                text(
                    "UPDATE account_eligibility "
                    "SET expires_at=clock_timestamp()-interval '1 second' "
                    "WHERE user_id=:u"
                ),
                {"u": stylist.uid},
            )

    stylist.transport.before = expire
    response = ask(client, stylist)
    assert response.status_code == 403
    assert "Fixture-only styling response" not in response.text


def test_feature_requires_explicit_enabled_model_and_limit(client, stylist, monkeypatch):
    monkeypatch.delenv("GLAM_OPENAI_ADVISOR_ENABLED")
    assert ask(client, stylist).status_code == 503
    monkeypatch.setenv("GLAM_OPENAI_ADVISOR_ENABLED", "true")
    monkeypatch.setenv("GLAM_OPENAI_MAX_REQUESTS_PER_HOUR", "0")
    assert ask(client, stylist).status_code == 503
    monkeypatch.setenv("GLAM_OPENAI_MAX_REQUESTS_PER_HOUR", "5")
    stylist.provider.config.openai_model = ""
    assert ask(client, stylist).status_code == 503
    assert stylist.transport.calls == []


def test_subject_change_does_not_reuse_another_accounts_consent(client, stylist):
    from test_workspaces import as_user

    as_user("bob")
    assert ask(client, stylist).status_code == 403
    assert stylist.transport.calls == []


def test_active_supabase_session_is_rechecked_after_provider_call(client, db, stylist):
    subject = uuid4()
    with db.begin() as c:
        c.execute(text("INSERT INTO auth.users(id) VALUES(:id)"), {"id": subject})
    app.dependency_overrides[get_principal] = lambda: Principal(
        "https://bkkmsbxrxkqaveymcrgi.supabase.co/auth/v1", str(subject), session_id=str(subject)
    )
    uid = client.get("/v1/me").json()["id"]
    qualify(db, uid)
    grant(client, stylist.policy)

    def revoke():
        with db.begin() as c:
            c.execute(text("DELETE FROM auth.sessions WHERE id=:id"), {"id": subject})

    stylist.transport.before = revoke
    response = ask(client, stylist)
    assert response.status_code == 401
    assert "Fixture-only styling response" not in response.text


def test_raw_request_bound_is_enforced_before_provider(client, stylist):
    response = client.post(
        "/v1/ai/stylist/advice",
        content=b" " * 65537,
        headers={"Idempotency-Key": str(uuid4()), "Content-Type": "application/json"},
    )
    assert response.status_code == 413
    assert stylist.transport.calls == []


def test_client_database_role_cannot_bypass_the_server_attempt_guard(db):
    from fastapi import HTTPException
    from glam_api.ai_stylist import require_attempt_permissions
    from sqlalchemy.orm import Session

    with Session(db) as session, session.begin():
        session.execute(text("SET LOCAL ROLE authenticated"))
        with pytest.raises(HTTPException) as error:
            require_attempt_permissions(session)
        assert error.value.status_code == 503
