"""Isolated PostgreSQL and explicit Storage doubles, never live user photos or Storage."""

import hashlib
import io
from types import SimpleNamespace
from uuid import uuid4

import pytest
from glam_api.main import app
from glam_api.media_cleanup import purge_one
from glam_api.private_media import storage_dependency
from PIL import Image
from sqlalchemy import text
from test_workspaces import account, as_user, qualify


class StorageDouble:
    """Explicit, injected test double. No runtime import or production fallback uses it."""

    def __init__(self):
        self.objects = {}
        self.puts = 0
        self.fail_put = False
        self.fail_delete = False
        self.before_put = None

    def check_private_bucket(self):
        return None

    def put(self, key, content):
        from glam_api.integrations.private_storage import StorageError

        self.puts += 1
        if self.before_put:
            self.before_put()
        # Simulate the important ambiguous-write failure: bytes exist despite a lost ACK.
        self.objects[key] = content
        if self.fail_put:
            raise StorageError("storage_unavailable")

    def get(self, key):
        return self.objects[key]

    def delete(self, key):
        from glam_api.integrations.private_storage import StorageError

        if self.fail_delete:
            raise StorageError("storage_unavailable")
        self.objects.pop(key, None)


def photo():
    output = io.BytesIO()
    exif = Image.Exif()
    exif[0x010E] = "private caption that must not survive normalization"
    Image.new("RGB", (480, 600), "pink").save(output, format="JPEG", exif=exif)
    return output.getvalue()


@pytest.fixture
def media(client, db, monkeypatch):
    monkeypatch.setenv("GLAM_PRIVATE_MEDIA_RETENTION_SECONDS", "3600")
    uid = account(client, "alice")
    qualify(db, uid)
    policy = uuid4()
    with db.begin() as c:
        c.execute(
            text("""
          INSERT INTO policy_document(id,purpose,version,content,approved_at)
          VALUES(:p,'private_photo_storage','test-only','Isolated fixture only',now())
        """),
            {"p": policy},
        )
    grant = client.post(
        f"/v1/policies/{policy}/consent",
        json={"action": "granted"},
        headers={"Idempotency-Key": str(uuid4())},
    )
    assert grant.status_code == 201
    store = StorageDouble()
    app.dependency_overrides[storage_dependency] = lambda: store
    yield SimpleNamespace(uid=uid, policy=str(policy), store=store, data=photo())
    app.dependency_overrides.pop(storage_dependency, None)


def create(client, media, *, data=None, key=None, **extra):
    data = media.data if data is None else data
    return client.post(
        "/v1/media",
        headers={"Idempotency-Key": key or str(uuid4())},
        json={
            "content_type": "image/jpeg",
            "size_bytes": len(data),
            "sha256": hashlib.sha256(data).hexdigest(),
            "policy_id": media.policy,
            **extra,
        },
    )


def upload(client, media, *, media_id=None):
    if media_id is None:
        response = create(client, media)
        assert response.status_code == 201, response.text
        media_id = response.json()["id"]
    response = client.put(
        f"/v1/media/{media_id}/content", content=media.data, headers={"Content-Type": "image/jpeg"}
    )
    assert response.status_code == 200, response.text
    return response.json()


def withdraw(client, media, action="withdrawn"):
    assert (
        client.post(
            f"/v1/policies/{media.policy}/consent",
            json={"action": action},
            headers={"Idempotency-Key": str(uuid4())},
        ).status_code
        == 201
    )


def test_unconfigured_media_status_is_explicit(client, monkeypatch):
    monkeypatch.delenv("GLAM_PRIVATE_MEDIA_ENABLED", raising=False)
    response = client.get("/v1/media/status")
    assert response.status_code == 200
    assert response.json()["state"] == "NOT CONFIGURED"


def test_foundation_readiness_recognizes_the_new_canonical_descendant(client, monkeypatch):
    import glam_api.config as config

    monkeypatch.setattr(
        config, "get_settings", lambda: SimpleNamespace(oidc_issuer="https://test.invalid")
    )
    monkeypatch.delenv("GLAM_PRIVATE_MEDIA_ENABLED", raising=False)
    assert client.get("/health/ready").status_code == 200


def test_upload_decode_owner_retrieval_and_private_metadata(client, db, media):
    result = upload(client, media)
    assert result["state"] == "ready"
    assert (result["width"], result["height"]) == (480, 600)
    assert "object_key" not in result and "input_sha256" not in result
    content = client.get(f"/v1/media/{result['id']}/content")
    assert content.status_code == 200
    assert content.headers["cache-control"] == "no-store"
    assert "Authorization" in content.headers["vary"].split(", ")
    assert content.headers["content-type"] == "image/png"
    assert b"private caption" not in content.content
    with Image.open(io.BytesIO(content.content)) as image:
        assert image.format == "PNG" and not image.getexif() and not image.info
    assert len(client.get("/v1/media").json()) == 1
    as_user("bob")
    path = f"/v1/media/{result['id']}"
    assert client.get(path).status_code == 404
    assert client.get(path + "/content").status_code == 404
    assert client.delete(path).status_code == 404
    assert client.get("/v1/media").json() == []


def test_intent_and_content_retries_are_idempotent_and_cannot_change_input(client, media):
    key = str(uuid4())
    first = create(client, media, key=key).json()
    assert create(client, media, key=key).json() == first
    assert create(client, media, key=key, sha256="0" * 64).status_code == 409
    upload(client, media, media_id=first["id"])
    upload(client, media, media_id=first["id"])
    assert media.store.puts == 1
    assert create(client, media, key=key).json()["state"] == "ready"


def test_client_cannot_supply_owner_storage_key_ttl_or_skip_consent(client, db, media):
    for extra in [
        {"owner_id": str(uuid4())},
        {"object_key": "other/file"},
        {"expires_at": "2099-01-01T00:00:00Z"},
    ]:
        assert create(client, media, **extra).status_code == 422
    withdraw(client, media)
    assert create(client, media).status_code == 403
    as_user("bob")
    assert create(client, media).status_code == 403
    as_user("alice")
    withdraw(client, media, "granted")
    with db.begin() as c:
        c.execute(text("DELETE FROM account_eligibility WHERE user_id=:u"), {"u": media.uid})
    assert create(client, media).status_code == 403


def test_look_preview_consent_is_not_photo_storage_consent(client, db, media):
    withdraw(client, media)
    policy = uuid4()
    with db.begin() as c:
        c.execute(
            text("""
          INSERT INTO policy_document(id,purpose,version,content,approved_at)
          VALUES(:p,'private_look_storage','fixture','Local fixture only',now())
        """),
            {"p": policy},
        )
    assert (
        client.post(
            f"/v1/policies/{policy}/consent",
            json={"action": "granted"},
            headers={"Idempotency-Key": str(uuid4())},
        ).status_code
        == 201
    )
    assert create(client, media, policy_id=str(policy)).status_code == 403


def test_only_the_current_approved_photo_policy_is_offered(client, db, media):
    with db.begin() as c:
        c.execute(
            text("""
          INSERT INTO policy_document(id,purpose,version,content,approved_at)
          VALUES(:id,'private_photo_storage','future-test','Not yet approved',
                 now()+interval '1 day')
        """),
            {"id": uuid4()},
        )
    current = client.get("/v1/media/policy")
    assert current.status_code == 200
    assert current.json()["id"] == media.policy


@pytest.mark.parametrize("data", [b"not an image", photo()[:90]])
def test_invalid_or_truncated_image_never_reaches_storage(client, media, data):
    result = create(client, media, data=data)
    assert result.status_code == 201
    response = client.put(
        f"/v1/media/{result.json()['id']}/content",
        content=data,
        headers={"Content-Type": "image/jpeg"},
    )
    assert response.status_code == 422
    assert media.store.puts == 0


def test_hash_mime_and_stream_size_checks_precede_object_write(client, media):
    media_id = create(client, media).json()["id"]
    path = f"/v1/media/{media_id}/content"
    assert (
        client.put(path, content=b"wrong", headers={"Content-Type": "image/jpeg"}).status_code
        == 409
    )
    assert (
        client.put(path, content=media.data, headers={"Content-Type": "image/png"}).status_code
        == 415
    )
    assert (
        client.put(
            path, content=b"x" * (10 * 1024 * 1024 + 1), headers={"Content-Type": "image/jpeg"}
        ).status_code
        == 413
    )
    assert media.store.puts == 0


@pytest.mark.parametrize(
    "fmt,mime", [("JPEG", "image/jpeg"), ("PNG", "image/png"), ("WEBP", "image/webp")]
)
def test_every_accepted_source_format_has_a_real_decoded_roundtrip(client, media, fmt, mime):
    output = io.BytesIO()
    Image.new("RGB", (500, 600), "green").save(output, format=fmt)
    value = output.getvalue()
    media_id = create(client, media, data=value, content_type=mime).json()["id"]
    result = client.put(
        f"/v1/media/{media_id}/content", content=value, headers={"Content-Type": mime}
    )
    assert result.status_code == 200 and result.json()["state"] == "ready"
    content = client.get(f"/v1/media/{media_id}/content").content
    with Image.open(io.BytesIO(content)) as image:
        image.load()
        assert image.format == "PNG" and image.size == (500, 600)


def test_animated_images_cannot_hide_additional_frames_in_private_storage(client, media):
    output = io.BytesIO()
    first = Image.new("RGB", (480, 600), "red")
    first.save(
        output,
        format="PNG",
        save_all=True,
        append_images=[Image.new("RGB", (480, 600), "blue")],
        duration=100,
        loop=0,
    )
    value = output.getvalue()
    media_id = create(client, media, data=value, content_type="image/png").json()["id"]
    response = client.put(
        f"/v1/media/{media_id}/content", content=value, headers={"Content-Type": "image/png"}
    )
    assert response.status_code == 422 and media.store.puts == 0


def test_withdraw_regrant_cannot_resurrect_old_media_and_cleanup_scrubs_it(client, db, media):
    result = upload(client, media)
    withdraw(client, media)
    withdraw(client, media, "granted")
    assert client.get(f"/v1/media/{result['id']}/content").status_code == 410
    assert client.get("/v1/media").json() == []
    assert purge_one(db, media.store)
    assert not media.store.objects
    state = client.get(f"/v1/media/{result['id']}").json()
    assert state["state"] == "deleted" and state["width"] is None
    with db.begin() as c:
        row = (
            c.execute(text("SELECT * FROM private_media WHERE id=:id"), {"id": result["id"]})
            .mappings()
            .one()
        )
        assert row["input_sha256"] is None and row["request_hash"] is None


def test_pending_write_survives_ambiguous_storage_failure_and_is_cleaned(client, db, media):
    result = create(client, media).json()
    media.store.fail_put = True
    path = f"/v1/media/{result['id']}"
    assert (
        client.put(
            path + "/content", content=media.data, headers={"Content-Type": "image/jpeg"}
        ).status_code
        == 503
    )
    assert client.get(path).json()["state"] == "pending"
    assert media.store.objects
    assert client.get(path + "/content").status_code == 409
    assert client.delete(path).json()["state"] == "deletion_pending"
    assert purge_one(db, media.store)
    assert client.get(path).json()["state"] == "deleted" and not media.store.objects


def test_failed_cleanup_keeps_truthful_state_retries_and_cannot_be_reuploaded(client, db, media):
    key = str(uuid4())
    result = create(client, media, key=key).json()
    upload(client, media, media_id=result["id"])
    path = f"/v1/media/{result['id']}"
    assert client.delete(path).status_code == 202
    assert client.get(path + "/content").status_code == 410
    media.store.fail_delete = True
    assert purge_one(db, media.store)
    assert client.get(path).json()["state"] == "deletion_pending"
    assert not purge_one(db, media.store)  # Backoff, not an endless retry loop.
    assert create(client, media, key=key).status_code == 410
    media.store.fail_delete = False
    with db.begin() as c:
        c.execute(
            text("UPDATE private_media SET next_purge_at=now() WHERE id=:id"), {"id": result["id"]}
        )
    assert purge_one(db, media.store)
    assert client.get(path).json()["state"] == "deleted"
    assert client.delete(path).json()["state"] == "deleted"


def test_expiry_and_revoked_eligibility_are_immediate_access_fences(client, db, media):
    result = upload(client, media)
    with db.begin() as c:
        c.execute(
            text("""
          UPDATE private_media SET created_at=now()-interval '1 hour',
            expires_at=now()-interval '1 second' WHERE id=:id
        """),
            {"id": result["id"]},
        )
    assert client.get(f"/v1/media/{result['id']}/content").status_code == 410
    assert purge_one(db, media.store)
    result = upload(client, media)
    with db.begin() as c:
        c.execute(text("DELETE FROM account_eligibility WHERE user_id=:u"), {"u": media.uid})
    assert client.get(f"/v1/media/{result['id']}/content").status_code == 410
    assert purge_one(db, media.store)


def test_corrupted_provider_bytes_are_not_returned_as_a_user_photo(client, media):
    result = upload(client, media)
    key = next(iter(media.store.objects))
    media.store.objects[key] = b"wrong owner bytes or corrupt data"
    assert client.get(f"/v1/media/{result['id']}/content").status_code == 502


def test_deletion_right_is_not_blocked_by_provider_or_eligibility_loss(client, db, media):
    result = upload(client, media)
    withdraw(client, media)
    with db.begin() as c:
        c.execute(text("DELETE FROM account_eligibility WHERE user_id=:u"), {"u": media.uid})
    app.dependency_overrides.pop(storage_dependency)
    response = client.delete(f"/v1/media/{result['id']}")
    assert response.status_code == 202 and response.json()["state"] == "deletion_pending"
    assert purge_one(db, media.store)


def test_absent_retention_configuration_never_silently_chooses_a_period(
    client,
    media,
    monkeypatch,
):
    monkeypatch.delenv("GLAM_PRIVATE_MEDIA_RETENTION_SECONDS")
    assert create(client, media).status_code == 503
    assert not media.store.objects


def test_concurrent_retries_share_one_intent_and_one_object_write(client, media):
    from concurrent.futures import ThreadPoolExecutor

    key = str(uuid4())
    with ThreadPoolExecutor(max_workers=2) as pool:
        responses = list(pool.map(lambda _: create(client, media, key=key), range(2)))
    assert all(r.status_code == 201 for r in responses)
    ids = {r.json()["id"] for r in responses}
    assert len(ids) == 1
    media_id = ids.pop()
    with ThreadPoolExecutor(max_workers=2) as pool:
        values = list(pool.map(lambda _: upload(client, media, media_id=media_id), range(2)))
    assert all(r["state"] == "ready" for r in values)
    assert media.store.puts == 1 and len(media.store.objects) == 1


def test_policy_change_during_external_write_never_returns_a_success(client, db, media):
    result = create(client, media).json()

    def publish_new_policy():
        with db.begin() as c:
            c.execute(
                text("""
              INSERT INTO policy_document(id,purpose,version,content,approved_at)
              VALUES(:id,'private_photo_storage','new-test-only','Fixture only',clock_timestamp())
            """),
                {"id": uuid4()},
            )

    media.store.before_put = publish_new_policy
    path = f"/v1/media/{result['id']}"
    response = client.put(
        path + "/content", content=media.data, headers={"Content-Type": "image/jpeg"}
    )
    assert response.status_code == 410
    assert media.store.objects
    assert client.get(path).json()["state"] == "pending"
    assert purge_one(db, media.store)
    assert not media.store.objects


def test_revoked_supabase_session_cannot_read_private_photo(client, db, media):
    from glam_api.auth import Principal, get_principal

    subject = uuid4()
    with db.begin() as c:
        c.execute(text("INSERT INTO auth.users(id) VALUES(:u)"), {"u": subject})
    app.dependency_overrides[get_principal] = lambda: Principal(
        "https://bkkmsbxrxkqaveymcrgi.supabase.co/auth/v1",
        str(subject),
        session_id=str(subject),
    )
    uid = client.get("/v1/me").json()["id"]
    qualify(db, uid)
    withdraw(client, media, "granted")
    result = upload(client, media)
    with db.begin() as c:
        c.execute(text("DELETE FROM auth.sessions WHERE user_id=:u"), {"u": subject})
    assert client.get(f"/v1/media/{result['id']}/content").status_code == 401
    assert client.get(f"/v1/media/{result['id']}").status_code == 401


def test_privacy_guard_drift_blocks_upload_read_but_not_erasure(client, db, media, monkeypatch):
    from pathlib import Path

    import glam_api.private_media as module

    result = upload(client, media)
    monkeypatch.setattr(module, "configured_storage", lambda: media.store)
    with db.begin() as c:
        c.execute(text("DROP POLICY glam_private_media_server_only ON storage.objects"))
    try:
        assert client.get("/v1/media/status").json()["state"] == "NOT CONFIGURED"
        assert create(client, media).status_code == 503
        assert client.get(f"/v1/media/{result['id']}/content").status_code == 503
        assert client.delete(f"/v1/media/{result['id']}").status_code == 202
        assert purge_one(db, media.store)
        assert not media.store.objects
    finally:
        sql = Path("db/migrations/versions/0015_private_media.sql").read_text()
        statement = (
            "CREATE POLICY glam_private_media_server_only"
            + sql.split("CREATE POLICY glam_private_media_server_only", 1)[1].split(";", 1)[0]
        )
        with db.begin() as c:
            c.execute(text(statement))


def test_missing_current_policy_is_not_skipped_by_cleanup_sql_null_semantics(client, db, media):
    result = upload(client, media)
    with db.begin() as c:
        c.execute(
            text("UPDATE policy_document SET approved_at=now()+interval '1 day' WHERE id=:id"),
            {"id": media.policy},
        )
    assert client.get(f"/v1/media/{result['id']}/content").status_code == 410
    assert purge_one(db, media.store)
    assert not media.store.objects
