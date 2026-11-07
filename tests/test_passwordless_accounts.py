"""Real PostgreSQL session revocation, device preference and channel privacy boundaries."""

from uuid import uuid4

import pytest
from sqlalchemy import text
from sqlalchemy.exc import DBAPIError
from test_hosted_api import rpc
from test_supabase_foundation import as_user
from test_supabase_foundation import foundation as foundation


def test_revoked_session_cannot_access_rpc_or_private_rls_data(db, foundation):
    owner = foundation[0]
    with db.begin() as c:
        as_user(c, owner["uid"])
        assert rpc(c, "GET", "/v1/me/profile")["id"] == str(owner["uid"])
    with db.begin() as c:
        c.execute(text("DELETE FROM auth.sessions WHERE user_id=:u"), {"u": owner["uid"]})
    with db.begin() as c:
        as_user(c, owner["uid"])
        assert c.scalar(text("SELECT count(*) FROM public.profiles")) == 0
        assert c.scalar(text("SELECT count(*) FROM public.organizations")) == 0
        with pytest.raises(DBAPIError) as error:
            rpc(c, "GET", "/v1/me/profile")
        assert error.value.orig.sqlstate == "PT401"


def test_notification_updates_preserve_other_choices_and_reject_stale_revision(db, foundation):
    with db.begin() as c:
        as_user(c, foundation[0]["uid"])
        first = rpc(c, "GET", "/v1/me/notifications")
        assert first["sms_updates"] is False
        second = rpc(
            c,
            "PATCH",
            "/v1/me/notifications",
            {"expected_revision": first["revision"], "sms_updates": True},
        )
        third = rpc(
            c,
            "PATCH",
            "/v1/me/notifications",
            {"expected_revision": second["revision"], "push_updates": True},
        )
        assert third["sms_updates"] is True and third["push_updates"] is True
        assert third["email_updates"] is False
    with db.begin() as c:
        as_user(c, foundation[0]["uid"])
        with pytest.raises(DBAPIError, match="REVISION_CONFLICT"):
            rpc(
                c,
                "PATCH",
                "/v1/me/notifications",
                {"expected_revision": first["revision"], "sms_updates": False},
            )


def test_device_preferences_are_owned_nonsecret_metadata_and_do_not_grant_roles(db, foundation):
    device = str(uuid4())
    with db.begin() as c:
        as_user(c, foundation[0]["uid"])
        saved = rpc(
            c, "PUT", "/v1/me/devices/" + device, {"platform": "ios", "biometric_enabled": True}
        )
        assert saved["profile_id"] == str(foundation[0]["uid"])
        assert rpc(c, "GET", "/v1/me/workspaces") == []
    with db.begin() as c:
        as_user(c, foundation[1]["uid"])
        assert rpc(c, "GET", "/v1/me/devices") == []
        assert c.scalar(text("SELECT count(*) FROM public.device_auth_preferences")) == 0
    with db.begin() as c:
        as_user(c, foundation[0]["uid"])
        with pytest.raises(DBAPIError, match="VALIDATION_ERROR"):
            rpc(
                c,
                "PUT",
                "/v1/me/devices/" + device,
                {
                    "platform": "ios",
                    "biometric_enabled": True,
                    "refresh_token": "must-never-persist",
                },
            )
    with db.begin() as c:
        as_user(c, foundation[0]["uid"])
        rpc(c, "DELETE", "/v1/me/devices/" + device)
        assert rpc(c, "GET", "/v1/me/devices") == []


def test_consents_reuse_existing_append_only_events_and_bootstrap_is_idempotent(db, foundation):
    with db.begin() as c:
        as_user(c, foundation[0]["uid"])
        rpc(c, "GET", "/v1/me/profile")
        rpc(c, "GET", "/v1/me/profile")
        assert rpc(c, "GET", "/v1/me/consents") == []
    with db.connect() as c:
        assert (
            c.scalar(
                text("SELECT count(*) FROM public.profiles WHERE id=:id"),
                {"id": foundation[0]["uid"]},
            )
            == 1
        )
        columns = (
            c.execute(
                text(
                    "SELECT column_name FROM information_schema.columns "
                    "WHERE table_schema='public' AND table_name IN "
                    "('device_auth_preferences','notification_preferences')"
                )
            )
            .scalars()
            .all()
        )
        assert not any(
            any(secret in name for secret in ["token", "otp", "fingerprint", "template"])
            for name in columns
        )


def test_existing_python_api_also_rejects_revoked_supabase_principal(db, foundation):
    from fastapi import HTTPException
    from glam_api.auth import Principal
    from glam_api.main import user
    from sqlalchemy.orm import Session

    owner = foundation[0]["uid"]
    principal = Principal(
        "https://bkkmsbxrxkqaveymcrgi.supabase.co/auth/v1", str(owner), session_id=str(owner)
    )
    with Session(db) as session, session.begin():
        assert user(session, principal)
    with db.begin() as c:
        c.execute(text("DELETE FROM auth.sessions WHERE user_id=:u"), {"u": owner})
    with Session(db) as session, session.begin(), pytest.raises(HTTPException) as error:
        user(session, principal)
    assert error.value.status_code == 401
