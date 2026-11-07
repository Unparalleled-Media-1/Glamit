"""Creator draft boundaries on real local PostgreSQL; no provider or production claims."""

from uuid import uuid4

import pytest
from sqlalchemy import text
from sqlalchemy.exc import DBAPIError
from test_hosted_api import rpc
from test_supabase_foundation import as_user
from test_supabase_foundation import foundation as foundation


def eligible(db, entry):
    with db.begin() as c:
        c.execute(
            text(
                "INSERT INTO account_eligibility(user_id,age_band,evidence_ref,expires_at) "
                "VALUES(:u,'eligible_adult','local-test',now()+interval '1 day')"
            ),
            {"u": entry["internal"]},
        )


def create(db, entry):
    eligible(db, entry)
    with db.begin() as c:
        as_user(c, entry["uid"])
        return rpc(
            c,
            "POST",
            "/v1/me/creator/profile",
            {
                "handle": "fixture_" + str(entry["uid"])[:8],
                "display_name": "Local Creator",
                "bio": "Private draft",
            },
        )


def test_owner_drafts_survive_reload_and_other_identity_cannot_read_or_delete(db, foundation):
    owner, other = foundation
    profile = create(db, owner)
    with db.begin() as c:
        as_user(c, owner["uid"])
        link = rpc(
            c,
            "POST",
            "/v1/me/creator/connections",
            {"provider": "tiktok", "profile_url": "https://www.tiktok.com/@fixture"},
        )
        assert link["status"] == "manual_unverified" and link["authorized_scopes"] == []
        media = rpc(
            c,
            "POST",
            "/v1/me/creator/media",
            {
                "provider": "instagram",
                "source_url": "https://www.instagram.com/reel/abc_1/",
                "title": "Test",
                "rights_confirmed": True,
            },
        )
        collection = rpc(
            c,
            "POST",
            "/v1/me/creator/collections",
            {
                "title": "Local",
                "sponsored": True,
                "disclosure": "Sponsored by test",
                "rights_confirmed": True,
                "product_ids": [],
            },
        )
    with db.begin() as c:
        as_user(c, owner["uid"])
        saved = rpc(c, "GET", "/v1/me/creator")
        assert saved["profile"]["id"] == profile["id"]
        assert len(saved["media"]) == 1 and len(saved["collections"]) == 1
        assert not saved["oauth_available"] and not saved["payouts_available"]
    create(db, other)
    with db.begin() as c:
        as_user(c, other["uid"])
        assert c.scalar(text("SELECT count(*) FROM social_media_items")) == 0
        assert c.scalar(text("SELECT count(*) FROM creator_profiles")) == 1
        assert rpc(c, "GET", "/v1/me/creator")["connections"] == []
        with pytest.raises(DBAPIError, match="NOT_FOUND"):
            rpc(c, "DELETE", "/v1/me/creator/media/" + media["id"])
    with db.begin() as c:
        as_user(c, owner["uid"])
        rpc(c, "DELETE", "/v1/me/creator/media/" + media["id"])
        rpc(c, "DELETE", "/v1/me/creator/collections/" + collection["id"])
        rpc(c, "DELETE", "/v1/me/creator/connections/" + link["id"])
        saved = rpc(c, "GET", "/v1/me/creator")
        assert not saved["media"] and not saved["collections"]
        assert saved["connections"][0]["status"] == "revoked"


@pytest.mark.parametrize(
    "payload",
    [
        {"provider": "tiktok", "profile_url": "https://tiktok.com.evil.invalid/@x"},
        {"provider": "tiktok", "profile_url": "https://user:pw@tiktok.com/@x"},
        {"provider": "instagram", "profile_url": "https://instagram.com/accounts/"},
        {"provider": "facebook", "profile_url": "javascript:alert(1)"},
        {
            "provider": "youtube",
            "profile_url": "https://youtube.com/@test",
            "access_token": "not-allowed",
        },
        {
            "provider": "pinterest",
            "profile_url": "https://pinterest.com/test",
            "status": "connected",
        },
    ],
)
def test_social_urls_and_privileged_fields_are_rejected(db, foundation, payload):
    create(db, foundation[0])
    with db.begin() as c:
        as_user(c, foundation[0]["uid"])
        with pytest.raises(DBAPIError, match="INVALID_SOCIAL_PROFILE"):
            rpc(c, "POST", "/v1/me/creator/connections", payload)


def test_age_eligibility_revocation_and_raw_table_writes_are_enforced(db, foundation):
    actor = foundation[0]
    with db.begin() as c:
        as_user(c, actor["uid"])
        with pytest.raises(DBAPIError, match="CREATOR_ADULT_ELIGIBILITY_REQUIRED"):
            rpc(
                c,
                "POST",
                "/v1/me/creator/profile",
                {"handle": "test_creator", "display_name": "Test"},
            )
    profile = create(db, actor)
    with db.begin() as c:
        as_user(c, actor["uid"])
        with pytest.raises(DBAPIError):
            c.execute(text("UPDATE creator_profiles SET status='published'"))
    with db.begin() as c:
        as_user(c, actor["uid"])
        with pytest.raises(DBAPIError):
            c.execute(text("SELECT * FROM creator_private.social_credentials"))
    with db.begin() as c:
        c.execute(text("DELETE FROM auth.sessions WHERE user_id=:u"), {"u": actor["uid"]})
    with db.begin() as c:
        as_user(c, actor["uid"])
        assert (
            c.scalar(
                text("SELECT count(*) FROM creator_profiles WHERE id=:id"), {"id": profile["id"]}
            )
            == 0
        )
        with pytest.raises(DBAPIError):
            rpc(c, "GET", "/v1/me/creator")


@pytest.mark.parametrize(
    "path,payload,error",
    [
        (
            "/profile",
            {"handle": "okay_handle", "display_name": "Test", "organization_id": str(uuid4())},
            "UNEXPECTED_PROFILE_FIELD",
        ),
        ("/profile", {"expected_revision": 99, "display_name": "Test"}, "REVISION_CONFLICT"),
        (
            "/media",
            {
                "provider": "tiktok",
                "source_url": "https://tiktok.com/@test/video/123",
                "title": "Test",
                "rights_confirmed": False,
            },
            "CONTENT_RIGHTS_REQUIRED",
        ),
        (
            "/collections",
            {
                "title": "Test",
                "rights_confirmed": True,
                "sponsored": False,
                "product_ids": [str(uuid4())],
            },
            "QUALIFIED_CATALOG_SELECTION_REQUIRED",
        ),
        ("/profile/publish", {}, "PUBLICATION_QUALIFICATION_REQUIRED"),
        ("/tiktok/authorize", {}, "SOCIAL_PROVIDER_NOT_QUALIFIED"),
    ],
)
def test_no_implicit_publication_product_qualification_or_authorization(
    db, foundation, path, payload, error
):
    create(db, foundation[0])
    with db.begin() as c:
        as_user(c, foundation[0]["uid"])
        with pytest.raises(DBAPIError, match=error):
            rpc(c, "PATCH" if path == "/profile" else "POST", "/v1/me/creator" + path, payload)
