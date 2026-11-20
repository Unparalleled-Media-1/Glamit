"""Merchant product originals: validation, rights, isolation, and unlocking publication."""

import io

import pytest
from glam_api.catalog_media import storage_dependency
from glam_api.integrations.catalog_storage import StorageError
from glam_api.main import app
from PIL import Image
from sqlalchemy import text
from test_catalog import approve, create, drain, publish, revise, url
from test_workspaces import account, as_user, organization, qualify  # noqa: F401


class MemoryStorage:
    """Test-only isolated store; never a stand-in for the real bucket."""

    def __init__(self):
        self.objects = {}
        self.fail = False

    def put(self, key, content):
        if self.fail:
            raise StorageError("storage_unavailable")
        self.objects[key] = content

    def get(self, key):
        return self.objects[key]


@pytest.fixture
def store():
    s = MemoryStorage()
    app.dependency_overrides[storage_dependency] = lambda: s
    yield s
    app.dependency_overrides.pop(storage_dependency, None)


def image(fmt="PNG", size=(600, 600)):
    out = io.BytesIO()
    Image.new("RGB", size, (200, 30, 90)).save(out, format=fmt)
    return out.getvalue()


def put(client, org, lid, body, mime="image/png", rights="true"):
    headers = {"Content-Type": mime}
    if rights is not None:
        headers["X-Rights-Confirmed"] = rights
    return client.put(url(org, lid) + "/original-images", content=body, headers=headers)


def test_upload_requires_explicit_rights_confirmation(client, db, store):
    _, org, lid, _ = create(client, db)
    r = put(client, org, lid, image(), rights=None)
    assert r.status_code == 422 and not store.objects
    assert put(client, org, lid, image(), rights="false").status_code == 422


def test_valid_upload_is_reencoded_stored_and_recorded(client, db, store):
    _, org, lid, _ = create(client, db)
    r = put(client, org, lid, image("JPEG"), "image/jpeg")
    assert r.status_code == 201, r.text
    key = f"{org}/{r.json()['id']}.png"
    assert store.objects[key].startswith(b"\x89PNG")
    with db.begin() as c:
        row = c.execute(
            text("SELECT rights_confirmed,validated,original_id,storage_ref FROM catalog_media")
        ).one()
    assert row == (True, True, None, key)
    listed = client.get(url(org, lid) + "/original-images").json()
    assert listed == [{"id": r.json()["id"]}]


@pytest.mark.parametrize(
    "body,mime,status",
    [
        (b"not an image", "image/png", 422),
        (image("PNG"), "image/jpeg", 422),  # declared type must match content
        (image(size=(100, 100)), "image/png", 422),  # too small
        (image(), "image/gif", 415),
    ],
)
def test_invalid_images_are_rejected_and_never_stored(client, db, store, body, mime, status):
    _, org, lid, _ = create(client, db)
    assert put(client, org, lid, body, mime).status_code == status
    assert not store.objects


def test_storage_failure_records_nothing(client, db, store):
    _, org, lid, _ = create(client, db)
    store.fail = True
    assert put(client, org, lid, image()).status_code == 503
    with db.begin() as c:
        assert c.scalar(text("SELECT count(*) FROM catalog_media")) == 0


def test_unconfigured_storage_is_reported_not_simulated(client, db, monkeypatch):
    monkeypatch.delenv("GLAM_CATALOG_MEDIA_ENABLED", raising=False)
    _, org, lid, _ = create(client, db)
    r = put(client, org, lid, image())
    assert r.status_code == 503 and "catalog_media_not_configured" in r.text


def test_other_users_cannot_attach_images_to_a_listing(client, db, store):
    _, org, lid, _ = create(client, db)
    account(client, "stranger")
    as_user("stranger")
    assert put(client, org, lid, image()).status_code in {403, 404}
    assert not store.objects


def test_uploaded_original_unlocks_review_and_publication(client, db, store):
    _, org, lid, f = create(client, db)
    assert put(client, org, lid, image()).status_code == 201
    assert revise(client, org, lid, f).status_code == 200
    assert approve(client, db, lid, 2).status_code == 200
    drain(db)
    r = publish(client, org, lid)
    assert r.status_code == 200 and r.json()["state"] == "published"


def test_original_count_is_bounded(client, db, store):
    _, org, lid, _ = create(client, db)
    for _ in range(8):
        assert put(client, org, lid, image()).status_code == 201
    assert put(client, org, lid, image()).status_code == 409
