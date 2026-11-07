"""Real PostgreSQL tests for permissions, tenant isolation and invitation lifecycle."""

from uuid import uuid4

import pytest
from glam_api.auth import Principal, get_principal
from glam_api.main import app
from sqlalchemy import text


def as_user(subject):
    app.dependency_overrides[get_principal] = lambda: Principal("https://test.invalid", subject)


def account(client, subject):
    as_user(subject)
    return client.get("/v1/me").json()["id"]


def qualify(db, uid):
    with db.begin() as c:
        c.execute(
            text(
                "INSERT INTO account_eligibility(user_id,age_band,evidence_ref,expires_at) "
                "VALUES (:u,'eligible_adult','test-only',now()+interval '1 day') "
                "ON CONFLICT(user_id) DO UPDATE SET age_band='eligible_adult',"
                "expires_at=now()+interval '1 day'"
            ),
            {"u": uid},
        )


def organization(client, db, uid, workspace="merchant"):
    response = client.post(
        "/v1/organizations",
        json={"name": "Test organization"},
        headers={"Idempotency-Key": str(uuid4())},
    )
    assert response.status_code == 201
    org = response.json()["id"]
    with db.begin() as c:
        c.execute(
            text(
                "INSERT INTO workspace_capability(organization_id,workspace,status,expires_at) "
                "VALUES (:o,:w,'verified',now()+interval '1 day')"
            ),
            {"o": org, "w": workspace},
        )
    qualify(db, uid)
    return org


def base(org, workspace="merchant"):
    return f"/v1/organizations/{org}/workspaces/{workspace}"


def create_draft(client, org, key="draft"):
    return client.post(
        base(org) + "/drafts",
        json={"title": "Catalog planning", "notes": "Rights first"},
        headers={"Idempotency-Key": key},
    )


def test_unverified_organization_and_unknown_age_cannot_activate(client, db):
    uid = account(client, "alice")
    org = client.post(
        "/v1/organizations", json={"name": "Unverified"}, headers={"Idempotency-Key": "org"}
    ).json()["id"]
    assert client.get("/v1/me/workspaces").json() == []
    assert create_draft(client, org).status_code == 404
    qualify(db, uid)
    assert client.get("/v1/me/workspaces").json() == []
    assert create_draft(client, org).status_code == 404


def test_workspace_crud_idempotency_and_cross_tenant(client, db):
    alice = account(client, "alice")
    org = organization(client, db, alice)
    result = create_draft(client, org)
    assert result.status_code == 201
    assert create_draft(client, org).json() == result.json()
    draft = result.json()["id"]
    update = {"title": "Revised", "notes": "Source updated", "expected_revision": 1}
    assert client.put(base(org) + f"/drafts/{draft}", json=update).json()["revision"] == 2
    assert client.put(base(org) + f"/drafts/{draft}", json=update).status_code == 409
    assert len(client.get(base(org) + "/drafts").json()) == 1
    as_user("bob")
    bob = client.get("/v1/me").json()["id"]
    other = organization(client, db, bob)
    assert client.get(base(org) + "/drafts").status_code == 404
    assert client.delete(base(other) + f"/drafts/{draft}").status_code == 404
    assert client.put(base(other) + f"/drafts/{draft}", json=update).status_code == 404
    as_user("alice")
    assert client.delete(base(org) + f"/drafts/{draft}").status_code == 204
    assert client.get(base(org) + "/drafts").json() == []
    assert create_draft(client, org).status_code == 410


@pytest.mark.parametrize(
    "workspace,role",
    [
        ("merchant", "catalog_manager"),
        ("advertiser", "campaign_manager"),
        ("professional", "booking_manager"),
        ("creator", "creator"),
        ("affiliate", "affiliate"),
    ],
)
def test_all_role_workspaces_and_scope_revalidation(client, db, workspace, role):
    owner = account(client, "owner")
    org = organization(client, db, owner, workspace)
    member = account(client, "member")
    qualify(db, member)
    with db.begin() as c:
        c.execute(
            text(
                "INSERT INTO organization_member(organization_id,user_id,role) "
                "VALUES (:o,:u,'analyst')"
            ),
            {"o": org, "u": member},
        )
        c.execute(
            text("INSERT INTO workspace_role VALUES (:o,:u,:w,:r)"),
            {"o": org, "u": member, "w": workspace, "r": role},
        )
    found = client.get("/v1/me/workspaces").json()
    assert found[0]["can_write"] is True
    url = base(org, workspace) + "/drafts"
    assert (
        client.post(url, json={"title": "Plan"}, headers={"Idempotency-Key": "plan"}).status_code
        == 201
    )
    with db.begin() as c:
        c.execute(text("DELETE FROM workspace_role WHERE user_id=:u"), {"u": member})
    # The same request/key must not bypass revocation using an idempotency replay.
    assert (
        client.post(url, json={"title": "Plan"}, headers={"Idempotency-Key": "plan"}).status_code
        == 404
    )
    assert client.get("/v1/me/workspaces").json() == []
    assert client.get("/v1/me").status_code == 200


def test_analyst_read_only_and_suspension_does_not_cross_organizations(client, db):
    uid = account(client, "alice")
    first = organization(client, db, uid)
    second = organization(client, db, uid)
    create_draft(client, first)
    with db.begin() as c:
        c.execute(
            text("UPDATE organization_member SET active=false WHERE organization_id=:o"),
            {"o": first},
        )
    assert client.get(base(first) + "/drafts").status_code == 404
    assert client.get(base(second) + "/drafts").status_code == 200
    with db.begin() as c:
        c.execute(
            text("UPDATE organization_member SET role='analyst' WHERE organization_id=:o"),
            {"o": second},
        )
        c.execute(
            text("INSERT INTO workspace_role VALUES (:o,:u,'merchant','analyst')"),
            {"o": second, "u": uid},
        )
    assert client.get(base(second) + "/drafts").status_code == 200
    assert create_draft(client, second).status_code == 403
    assert client.get("/v1/me/workspaces").json()[0]["can_write"] is False


@pytest.mark.parametrize(
    "change", ["suspended_org", "suspended_capability", "expired", "restricted"]
)
def test_authority_changes_apply_to_every_request(client, db, change):
    uid = account(client, "alice")
    org = organization(client, db, uid)
    assert create_draft(client, org).status_code == 201
    with db.begin() as c:
        if change == "suspended_org":
            c.execute(text("UPDATE organization SET suspended=true WHERE id=:o"), {"o": org})
        elif change == "suspended_capability":
            c.execute(text("UPDATE workspace_capability SET status='suspended'"))
        elif change == "expired":
            c.execute(text("UPDATE account_eligibility SET expires_at=now()-interval '1 second'"))
        else:
            c.execute(text("UPDATE account_eligibility SET age_band='restricted'"))
    assert create_draft(client, org).status_code == 404
    assert client.get(base(org) + "/drafts").status_code == 404
    assert client.get("/v1/me/workspaces").json() == []


def test_recipient_bound_invitation_acceptance_revocation_and_no_privilege_escalation(client, db):
    owner = account(client, "owner")
    org = organization(client, db, owner)
    recipient = account(client, "recipient")
    qualify(db, recipient)
    outsider = account(client, "outsider")
    qualify(db, outsider)
    as_user("owner")
    route = base(org) + "/invitations"
    bad = client.post(
        route,
        json={"recipient_id": recipient, "role": "campaign_manager"},
        headers={"Idempotency-Key": "wrong-role"},
    )
    assert bad.status_code == 422
    response = client.post(
        route,
        json={"recipient_id": recipient, "role": "catalog_manager"},
        headers={"Idempotency-Key": "invite"},
    )
    assert response.status_code == 201
    invitation = response.json()["id"]
    as_user("recipient")
    assert client.get(base(org) + "/drafts").status_code == 404
    assert client.get("/v1/me/workspace-invitations").json()[0]["id"] == invitation
    as_user("outsider")
    assert client.get("/v1/me/workspace-invitations").json() == []
    accept = f"/v1/me/workspace-invitations/{invitation}/accept"
    assert client.post(accept).status_code == 404
    as_user("recipient")
    assert client.post(accept).json()["state"] == "accepted"
    assert client.post(accept).json()["state"] == "accepted"
    assert create_draft(client, org).status_code == 201
    assert (
        client.post(
            route,
            json={"recipient_id": outsider, "role": "analyst"},
            headers={"Idempotency-Key": "cannot-invite"},
        ).status_code
        == 403
    )
    as_user("owner")
    assert client.delete(base(org) + f"/roles/{recipient}/catalog_manager").status_code == 204
    as_user("recipient")
    assert client.post(accept).status_code == 200
    assert create_draft(client, org).status_code == 404  # Accepted replay cannot restore a role.
    as_user("owner")
    assert client.delete(route + f"/{invitation}").status_code == 204
    as_user("recipient")
    assert client.post(accept).status_code == 404


def test_private_routines_owner_update_conflict_delete_and_no_business_access(client, db):
    body = {"title": "My private routine", "steps": [{"text": "Use my chosen technique"}]}
    response = client.post("/v1/me/routines", json=body, headers={"Idempotency-Key": "routine"})
    assert response.status_code == 201
    assert (
        client.post("/v1/me/routines", json=body, headers={"Idempotency-Key": "routine"}).json()
        == response.json()
    )
    rid = response.json()["id"]
    update = {**body, "steps": [{"text": "Updated", "done": True}], "expected_revision": 1}
    assert client.put(f"/v1/me/routines/{rid}", json=update).json()["revision"] == 2
    assert client.put(f"/v1/me/routines/{rid}", json=update).status_code == 409
    as_user("bob")
    assert client.get("/v1/me/routines").json() == []
    assert client.delete(f"/v1/me/routines/{rid}").status_code == 404
    assert client.put(f"/v1/me/routines/{rid}", json=update).status_code == 404
    as_user("alice")
    assert client.delete(f"/v1/me/routines/{rid}").status_code == 204
    assert client.get("/v1/me/routines").json() == []
    assert (
        client.post(
            "/v1/me/routines", json=body, headers={"Idempotency-Key": "routine"}
        ).status_code
        == 410
    )
    with db.begin() as c:
        cached = c.scalar(text("SELECT response FROM idempotency_record WHERE route='routines'"))
        assert cached == {"deleted": True}


def test_no_self_grants_no_private_media_fields_and_direct_client_rls(client, db):
    uid = account(client, "alice")
    org = organization(client, db, uid)
    assert (
        client.post(
            base(org) + "/drafts",
            json={"title": "Plan", "photo": "private-image"},
            headers={"Idempotency-Key": "forbidden"},
        ).status_code
        == 422
    )
    assert (
        client.post(
            "/v1/me/routines",
            json={"title": " ", "steps": []},
            headers={"Idempotency-Key": "invalid"},
        ).status_code
        == 422
    )
    assert client.post("/v1/analysis/requests").status_code == 503
    with db.begin() as c:
        for table in [
            "account_eligibility",
            "workspace_capability",
            "workspace_role",
            "workspace_draft",
            "personal_routine",
            "workspace_invitation",
        ]:
            assert (
                c.scalar(
                    text("SELECT relrowsecurity FROM pg_class WHERE oid=CAST(:table AS regclass)"),
                    {"table": table},
                )
                is True
            )
        assert c.scalar(text("SELECT count(*) FROM credit_reservation")) == 0
        assert c.scalar(text("SELECT count(*) FROM workspace_draft")) == 0


@pytest.mark.parametrize("failure", ["expired", "revoked", "restricted", "suspended"])
def test_pending_invitation_cannot_bypass_changed_eligibility(client, db, failure):
    owner = account(client, "owner")
    org = organization(client, db, owner)
    recipient = account(client, "recipient")
    qualify(db, recipient)
    as_user("owner")
    result = client.post(
        base(org) + "/invitations",
        json={"recipient_id": recipient, "role": "analyst"},
        headers={"Idempotency-Key": "invite"},
    )
    assert result.status_code == 201
    invitation = result.json()["id"]
    with db.begin() as c:
        if failure == "expired":
            c.execute(text("UPDATE workspace_invitation SET expires_at=now()-interval '1 second'"))
        elif failure == "revoked":
            c.execute(text("UPDATE workspace_invitation SET state='revoked'"))
        elif failure == "restricted":
            c.execute(
                text("UPDATE account_eligibility SET age_band='restricted' WHERE user_id=:u"),
                {"u": recipient},
            )
        else:
            c.execute(text("UPDATE organization SET suspended=true WHERE id=:o"), {"o": org})
    as_user("recipient")
    assert client.post(f"/v1/me/workspace-invitations/{invitation}/accept").status_code == 404
    assert client.get("/v1/me/workspaces").json() == []


def test_new_private_tables_deny_direct_client_reads_even_with_accidental_grants(client, db):
    uid = account(client, "owner")
    organization(client, db, uid)
    tables = [
        "account_eligibility",
        "workspace_capability",
        "workspace_role",
        "workspace_draft",
        "personal_routine",
        "workspace_invitation",
        "staff_grant",
    ]
    with db.begin() as c:
        c.execute(
            text("""DO $$ BEGIN
            IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='glam_workspace_rls_probe') THEN
                CREATE ROLE glam_workspace_rls_probe NOLOGIN;
            END IF;
        END $$;""")
        )
        assert c.scalar(text("SELECT count(*) FROM account_eligibility")) == 1
        for table in tables:
            c.execute(text(f"GRANT SELECT ON {table} TO glam_workspace_rls_probe"))
        c.execute(text("SET LOCAL ROLE glam_workspace_rls_probe"))
        for table in tables:
            assert c.scalar(text(f"SELECT count(*) FROM {table}")) == 0


@pytest.mark.parametrize(
    "role,expected",
    [
        ("super_admin", "configuration"),
        ("support", "users"),
        ("finance", "commerce"),
        ("ai_operations", "ai"),
        ("content_moderation", "content"),
        ("trust_safety", "trust"),
        ("compliance", "privacy"),
        ("regional_operations", "regions"),
        ("analyst", "analytics"),
    ],
)
def test_staff_context_requires_separate_grant_fresh_assurance_and_revalidation(
    client, db, role, expected
):
    import time

    uid = account(client, "owner")
    organization(client, db, uid)
    assert client.get("/v1/admin/context").status_code == 403
    app.dependency_overrides[get_principal] = lambda: Principal(
        "https://test.invalid", "owner", "aal2", int(time.time())
    )
    # Business ownership and fresh MFA alone never grant staff access.
    assert client.get("/v1/admin/context").status_code == 403
    with db.begin() as c:
        c.execute(
            text(
                "INSERT INTO staff_grant(user_id,role,expires_at,evidence_ref) "
                "VALUES (:u,:r,now()+interval '1 hour','test-only')"
            ),
            {"u": uid, "r": role},
        )
    context = client.get("/v1/admin/context")
    assert context.status_code == 200
    assert expected in context.json()["modules"]
    assert context.json()["operational_actions_enabled"] is False
    if role == "finance":
        assert "users" not in context.json()["modules"]
    app.dependency_overrides[get_principal] = lambda: Principal(
        "https://test.invalid", "owner", "aal2", int(time.time()) - 301
    )
    assert client.get("/v1/admin/context").status_code == 403
    app.dependency_overrides[get_principal] = lambda: Principal(
        "https://test.invalid", "owner", "aal2", int(time.time())
    )
    with db.begin() as c:
        c.execute(text("UPDATE staff_grant SET active=false WHERE user_id=:u"), {"u": uid})
    assert client.get("/v1/admin/context").status_code == 403
