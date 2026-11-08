"""Shared SQL API semantics and production-style JWT role enforcement on real PostgreSQL."""

import hashlib
import json
from uuid import uuid4

import pytest
from sqlalchemy import text
from sqlalchemy.exc import DBAPIError
from test_supabase_foundation import as_user
from test_supabase_foundation import foundation as foundation


def rpc(c, method, path, body=None, key=None):
    return c.scalar(
        text("SELECT public.glam_api_v1(:m,:p,CAST(:b AS jsonb),:k)"),
        {"m": method, "p": path, "b": json.dumps({} if body is None else body), "k": key},
    )


@pytest.mark.parametrize(
    "value", [{"name": "Café 👩"}, {"a": ["é", True, 2, None], "b": {"x": "test"}}, {}]
)
def test_shared_idempotency_canonicalization_matches_existing_python_api(db, value):
    expected = hashlib.sha256(
        json.dumps(value, sort_keys=True, separators=(",", ":")).encode()
    ).hexdigest()
    with db.connect() as c:
        actual = c.scalar(
            text(
                "SELECT encode(sha256(convert_to(glam_private.canonical_json(CAST("
                ":v AS jsonb)),'UTF8')),'hex')"
            ),
            {"v": json.dumps(value)},
        )
        assert actual == expected


def test_authenticated_profile_preferences_and_passport_persist_without_erasing_other_fields(
    db, foundation
):
    actor = foundation[0]
    with db.begin() as c:
        as_user(c, actor["uid"])
        assert rpc(c, "GET", "/v1/me")["id"] == str(actor["internal"])
        changed = rpc(c, "PATCH", "/v1/me/profile", {"display_name": "Owned profile"})
        assert changed["id"] == str(actor["uid"])
        assert (
            rpc(c, "PATCH", "/v1/me/preferences", {"locale": "fr", "marketing_opt_in": False})[
                "locale"
            ]
            == "fr"
        )
        passport = rpc(c, "GET", "/v1/me/style-passport")
        passport = rpc(
            c,
            "PATCH",
            "/v1/me/style-passport",
            {"expected_revision": passport["revision"], "preferred_colors": ["navy"]},
        )
        passport = rpc(
            c,
            "PATCH",
            "/v1/me/style-passport",
            {"expected_revision": passport["revision"], "preferred_styles": ["formal"]},
        )
        assert passport["preferred_colors"] == ["navy"] and passport["preferred_styles"] == [
            "formal"
        ]
    with db.begin() as c:
        as_user(c, actor["uid"])
        assert rpc(c, "GET", "/v1/me/profile")["display_name"] == "Owned profile"
        assert rpc(c, "GET", "/v1/me/preferences")["locale"] == "fr"


def test_organization_creation_replays_and_ownership_is_not_client_supplied(db, foundation):
    with db.begin() as c:
        as_user(c, foundation[0]["uid"])
        first = rpc(c, "POST", "/v1/organizations", {"name": "Café 👩"}, "same-key")
        assert rpc(c, "POST", "/v1/organizations", {"name": "Café 👩"}, "same-key") == first
        assert rpc(c, "GET", "/v1/organizations/" + first["id"])["role"] == "owner"
    with pytest.raises(DBAPIError) as error, db.begin() as c:
        as_user(c, foundation[1]["uid"])
        rpc(c, "GET", "/v1/organizations/" + first["id"])
    assert error.value.orig.sqlstate == "PT404"
    with pytest.raises(DBAPIError) as error, db.begin() as c:
        as_user(c, foundation[0]["uid"])
        rpc(c, "POST", "/v1/organizations", {"name": "Changed"}, "same-key")
    assert error.value.orig.sqlstate == "PT409"


@pytest.mark.parametrize(
    "body",
    [
        {"id": str(uuid4())},
        {"role": "super_admin"},
        {"avatar_object_key": str(uuid4()) + "/other.png"},
    ],
)
def test_privilege_owner_and_private_asset_overrides_are_refused(db, foundation, body):
    with pytest.raises(DBAPIError), db.begin() as c:
        as_user(c, foundation[0]["uid"])
        rpc(c, "PATCH", "/v1/me/profile", body)


def test_passport_stale_revision_is_not_applied(db, foundation):
    with pytest.raises(DBAPIError) as error, db.begin() as c:
        as_user(c, foundation[0]["uid"])
        rpc(
            c,
            "PATCH",
            "/v1/me/style-passport",
            {"expected_revision": 999, "coverage_preference": "stale"},
        )
    assert error.value.orig.sqlstate == "PT409"


def test_anonymous_or_missing_identity_cannot_call_privileged_bootstrap(db):
    with pytest.raises(DBAPIError), db.begin() as c:
        c.execute(text("SET LOCAL ROLE anon"))
        rpc(c, "GET", "/v1/me")
    with pytest.raises(DBAPIError), db.begin() as c:
        c.execute(text("SET LOCAL ROLE authenticated"))
        rpc(c, "GET", "/v1/me")


def test_rate_limit_and_no_direct_counter_access(db, foundation):
    with db.begin() as c:
        c.execute(
            text(
                "INSERT INTO api_request_counters(user_id,window_start,request_cou"
                "nt) VALUES(:u,date_trunc('minute',now()),120) ON CONFLICT(user_id"
                ",window_start) DO UPDATE SET request_count=120"
            ),
            {"u": foundation[0]["uid"]},
        )
    with pytest.raises(DBAPIError) as error, db.begin() as c:
        as_user(c, foundation[0]["uid"])
        rpc(c, "GET", "/v1/me")
    assert error.value.orig.sqlstate == "PT429"
    with pytest.raises(DBAPIError), db.begin() as c:
        as_user(c, foundation[0]["uid"])
        c.execute(text("SELECT * FROM api_request_counters"))


def test_hosted_routines_are_private_versioned_idempotent_and_deletable(db, foundation):
    body = {"title": " Evening routine ", "steps": [{"text": " Cleanse "}]}
    with db.begin() as c:
        as_user(c, foundation[0]["uid"])
        first = rpc(c, "POST", "/v1/me/routines", body, "routine-key")
        assert first["title"] == "Evening routine"
        assert first["steps"] == [{"text": "Cleanse", "done": False}]
        assert rpc(c, "POST", "/v1/me/routines", body, "routine-key") == first
        assert rpc(c, "GET", "/v1/me/routines")[0]["id"] == first["id"]
        changed = rpc(
            c,
            "PUT",
            "/v1/me/routines/" + first["id"],
            {
                "title": "Evening routine",
                "steps": [{"text": "Cleanse", "done": True}],
                "expected_revision": first["revision"],
            },
        )
        assert changed["revision"] == first["revision"] + 1
    with db.begin() as c:
        as_user(c, foundation[1]["uid"])
        assert rpc(c, "GET", "/v1/me/routines") == []
        with pytest.raises(DBAPIError, match="NOT_FOUND"):
            rpc(c, "DELETE", "/v1/me/routines/" + first["id"])
    with db.begin() as c:
        as_user(c, foundation[0]["uid"])
        with pytest.raises(DBAPIError, match="REVISION_CONFLICT"):
            rpc(
                c,
                "PUT",
                "/v1/me/routines/" + first["id"],
                {
                    **body,
                    "expected_revision": first["revision"],
                },
            )
    with db.begin() as c:
        as_user(c, foundation[0]["uid"])
        assert rpc(c, "DELETE", "/v1/me/routines/" + first["id"]) is None
        assert rpc(c, "GET", "/v1/me/routines") == []
    with db.begin() as c:
        as_user(c, foundation[0]["uid"])
        with pytest.raises(DBAPIError, match="ROUTINE_DELETED"):
            rpc(c, "POST", "/v1/me/routines", body, "routine-key")


@pytest.mark.parametrize(
    "steps",
    [
        [],
        [{"text": " "}],
        [{"text": "Cleanse", "done": "false"}],
        [{"text": "Cleanse", "owner_id": "override"}],
    ],
)
def test_routine_invalid_steps_cannot_persist(db, foundation, steps):
    with db.begin() as c:
        as_user(c, foundation[0]["uid"])
        with pytest.raises(DBAPIError, match="VALIDATION_ERROR"):
            rpc(c, "POST", "/v1/me/routines", {"title": "Routine", "steps": steps}, "bad-key")


def test_private_core_transport_cannot_be_called_directly_by_client_role(db, foundation):
    with pytest.raises(DBAPIError) as error, db.begin() as c:
        as_user(c, foundation[0]["uid"])
        c.execute(text("SELECT glam_private.glam_core_api_v1('GET','/v1/me','{}',NULL)"))
    assert error.value.orig.sqlstate == "42501"


def test_business_registration_creates_no_verified_workspace_or_staff_grant(db, foundation):
    actor = foundation[0]
    with db.begin() as c:
        as_user(c, actor["uid"])
        result = rpc(c, "POST", "/v1/organizations", {"name": "Pending business"}, "pending")
        assert not any(
            w["organization_id"] == result["id"] for w in rpc(c, "GET", "/v1/me/workspaces")
        )
    with db.connect() as c:
        assert (
            c.scalar(
                text("SELECT count(*) FROM workspace_capability WHERE organization_id=:org"),
                {"org": result["id"]},
            )
            == 0
        )
        assert (
            c.scalar(
                text("SELECT count(*) FROM staff_grant WHERE user_id=:uid"),
                {"uid": actor["internal"]},
            )
            == 0
        )


@pytest.mark.parametrize(
    "extra",
    [
        {"workspace": "merchant"},
        {"role": "super_admin"},
        {"verification_status": "verified"},
        {"organization_id": str(uuid4())},
    ],
)
def test_business_registration_rejects_self_assigned_authority(db, foundation, extra):
    with pytest.raises(DBAPIError) as failure, db.begin() as c:
        as_user(c, foundation[0]["uid"])
        rpc(c, "POST", "/v1/organizations", {"name": "Safe name", **extra}, str(uuid4()))
    assert failure.value.orig.sqlstate == "PT422"
