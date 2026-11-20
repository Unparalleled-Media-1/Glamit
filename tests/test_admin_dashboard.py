# ruff: noqa: E501
"""Platform admin modules: staff-only, role-scoped, audited, read-only and free of private content."""

import json
import time
from uuid import uuid4

import pytest
from glam_api.admin import TITLES
from glam_api.auth import Principal, get_principal
from glam_api.main import app
from glam_api.workspaces import STAFF_MODULES
from sqlalchemy import text
from test_workspaces import account

MODULES = sorted(TITLES)


def staff(client, db, role, *, age=0, aal="aal2", subject="staff"):
    uid = account(client, subject)
    with db.begin() as c:
        c.execute(
            text(
                "INSERT INTO account_eligibility(user_id,age_band,evidence_ref,expires_at) "
                "VALUES (:u,'eligible_adult','test-only',now()+interval '1 day') ON CONFLICT DO NOTHING"
            ),
            {"u": uid},
        )
        c.execute(
            text(
                "INSERT INTO staff_grant(user_id,role,expires_at,evidence_ref) "
                "VALUES (:u,:r,now()+interval '1 hour','test-only')"
            ),
            {"u": uid, "r": role},
        )
    app.dependency_overrides[get_principal] = lambda: Principal(
        "https://test.invalid", subject, aal, int(time.time()) - age
    )
    return uid


def test_every_staff_module_has_a_view_and_titles_match_the_context_contract():
    assert set(TITLES) == set(STAFF_MODULES["super_admin"])


def test_super_admin_gets_all_fifteen_modules_with_the_common_shape(client, db):
    staff(client, db, "super_admin")
    for module in MODULES:
        body = client.get(f"/v1/admin/modules/{module}")
        assert body.status_code == 200, (module, body.text)
        data = body.json()
        assert (
            data["module"] == module
            and data["read_only"] is True
            and data["title"] == TITLES[module]
        )
        assert data["available"] or data["reason"]
        assert "no-store" in body.headers["cache-control"]


@pytest.mark.parametrize("module", ["advertising", "commerce", "subscriptions"])
def test_unbuilt_areas_say_so_instead_of_showing_invented_numbers(client, db, module):
    staff(client, db, "super_admin")
    data = client.get(f"/v1/admin/modules/{module}").json()
    assert data["available"] is False and data["metrics"] == [] and data["tables"] == []
    assert data["reason"]


def test_roles_only_reach_their_own_modules(client, db):
    staff(client, db, "finance")
    assert client.get("/v1/admin/modules/commerce").status_code == 200
    assert client.get("/v1/admin/modules/subscriptions").status_code == 200
    for module in ("users", "ai", "privacy", "executive", "configuration"):
        assert client.get(f"/v1/admin/modules/{module}").status_code == 403, module


def test_support_role_reaches_users_trust_and_privacy_only(client, db):
    staff(client, db, "support")
    allowed = {m for m in MODULES if client.get(f"/v1/admin/modules/{m}").status_code == 200}
    assert allowed == {"users", "trust", "privacy"}


def test_no_staff_grant_stale_or_weak_assurance_and_anonymous_are_refused(client, db):
    uid = account(client, "plain")
    assert client.get("/v1/admin/modules/users").status_code == 403  # no grant
    staff(client, db, "super_admin", aal="aal1", subject="weak")
    assert client.get("/v1/admin/modules/users").status_code == 403  # no MFA
    staff(client, db, "super_admin", age=301, subject="stale")
    assert client.get("/v1/admin/modules/users").status_code == 403  # stale MFA
    assert uid


def test_unknown_module_is_404_and_each_read_is_audited(client, db):
    uid = staff(client, db, "super_admin")
    assert client.get("/v1/admin/modules/nonsense").status_code == 404
    assert client.get("/v1/admin/modules/users").status_code == 200
    assert client.get("/v1/admin/modules/privacy").status_code == 200
    with db.begin() as c:
        actions = {
            r[0]
            for r in c.execute(text("SELECT action FROM audit_event WHERE actor_id=:u"), {"u": uid})
        }
    assert {"admin.read.users", "admin.read.privacy"} <= actions


def test_there_are_no_write_routes_under_the_admin_modules_path():
    spec = app.openapi()["paths"]
    for path, ops in spec.items():
        if path.startswith("/v1/admin/modules"):
            assert set(ops) == {"get"}


def test_views_carry_counts_but_never_private_content_or_secrets(client, db, monkeypatch):
    monkeypatch.setenv("GLAM_OPENAI_API_KEY", "sk-do-not-leak")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "service-key-do-not-leak")
    uid = staff(client, db, "super_admin")
    with db.begin() as c:
        c.execute(
            text(
                "INSERT INTO audit_event(id,actor_id,action,resource_id) VALUES (:i,:u,'media.deleted',:r)"
            ),
            {"i": uuid4(), "u": uid, "r": uuid4()},
        )
    blob = ""
    for module in MODULES:
        blob += json.dumps(client.get(f"/v1/admin/modules/{module}").json())
    for forbidden in (
        "sk-do-not-leak",
        "service-key-do-not-leak",
        "stored_sha256",
        "object_key",
        "encrypted_envelope",
    ):
        assert forbidden not in blob
    # users are shown only as a short pseudonymous id prefix, never the issuer subject
    users = client.get("/v1/admin/modules/users").json()
    ids = [row[0] for table in users["tables"] for row in table["rows"] if len(row[0]) == 8]
    assert ids and all(len(i) == 8 for i in ids)
    assert "staff" not in json.dumps(users["tables"][1]["rows"])


def test_executive_and_ai_reflect_real_job_and_cost_data(client, db):
    staff(client, db, "super_admin")
    executive = client.get("/v1/admin/modules/executive").json()
    labels = {m["label"] for m in executive["metrics"]}
    assert {"Users", "Organizations", "Undelivered outbox events"} <= labels
    ai = client.get("/v1/admin/modules/ai").json()
    assert any(t["title"].startswith("Credit price rules") for t in ai["tables"])
    configuration = client.get("/v1/admin/modules/configuration").json()
    assert {"Virtual try-on", "Private media", "Photo analysis"} <= {
        m["label"] for m in configuration["metrics"]
    }
    assert configuration["tables"][0]["rows"]  # applied revisions
