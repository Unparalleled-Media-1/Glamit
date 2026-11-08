"""Storage adapter contracts with explicit transports; no real provider credentials used."""

import json
from uuid import uuid4

import pytest
from glam_api.integrations.private_storage import (
    BUCKET,
    MAX_BYTES,
    ORIGIN,
    StorageError,
    StorageHTTP,
    SupabasePrivateStorage,
    configured_storage,
)

KEY = f"{uuid4()}/{uuid4()}.png"


class TransportDouble:
    def __init__(self, responses):
        self.responses = iter(responses)
        self.calls = []

    def request(self, method, url, headers, body=None, limit=MAX_BYTES):
        self.calls.append((method, url, headers, body, limit))
        return next(self.responses)


def bucket(**changes):
    return 200, json.dumps(
        {
            "id": BUCKET,
            "public": False,
            "file_size_limit": MAX_BYTES,
            "allowed_mime_types": ["image/png"],
            **changes,
        }
    ).encode()


def test_configuration_never_chooses_another_project_or_a_fake_fallback(monkeypatch):
    monkeypatch.setenv("GLAM_PRIVATE_MEDIA_ENABLED", "true")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "test-only-not-a-real-service-key")
    monkeypatch.setenv("SUPABASE_URL", "https://another-project.supabase.co")
    with pytest.raises(StorageError, match="not_configured"):
        configured_storage()
    monkeypatch.setenv("SUPABASE_URL", ORIGIN)
    result = configured_storage()
    assert isinstance(result, SupabasePrivateStorage)
    assert "test-only-not-a-real-service-key" not in repr(result)
    monkeypatch.setenv("GLAM_PRIVATE_MEDIA_ENABLED", "false")
    with pytest.raises(StorageError, match="not_configured"):
        configured_storage()
    assert isinstance(configured_storage(for_cleanup=True), SupabasePrivateStorage)


@pytest.mark.parametrize(
    "response", [bucket(public=True), bucket(file_size_limit=None), (404, b""), (200, b"malformed")]
)
def test_private_bucket_requires_successful_authenticated_qualification(response):
    transport = TransportDouble([response])
    store = SupabasePrivateStorage("test-only-server-key", transport)
    with pytest.raises(StorageError, match="not_qualified"):
        store.check_private_bucket()
    method, url, headers, _, _ = transport.calls[0]
    assert method == "GET" and url == ORIGIN + "/storage/v1/bucket/" + BUCKET
    assert headers["Authorization"] == "Bearer test-only-server-key"


def test_write_read_contract_has_no_public_or_signed_url():
    data = b"\x89PNG\r\n\x1a\ntest-contract-not-an-actual-photo"
    transport = TransportDouble([bucket(), (200, b"{}"), bucket(), (200, data)])
    store = SupabasePrivateStorage("test-only-server-key", transport)
    store.put(KEY, data)
    assert store.get(KEY) == data
    assert transport.calls[1][2]["x-upsert"] == "true"
    assert transport.calls[1][3] == data
    assert "/object/authenticated/" in transport.calls[3][1]
    assert all("/public/" not in c[1] and "/sign/" not in c[1] for c in transport.calls)


def test_delete_is_not_complete_until_object_absence_is_confirmed():
    transport = TransportDouble([(200, b"[]"), (206, b"x")])
    with pytest.raises(StorageError, match="not_confirmed"):
        SupabasePrivateStorage("test-only", transport).delete(KEY)
    assert transport.calls[1][2]["Range"] == "bytes=0-0"
    transport = TransportDouble([(200, b"[]"), (404, b"")])
    SupabasePrivateStorage("test-only", transport).delete(KEY)
    assert json.loads(transport.calls[0][3]) == {"prefixes": [KEY]}


def test_operator_empty_bucket_rollback_never_uses_empty_or_force_delete():
    transport = TransportDouble([(200, b"{}"), (404, b"")])
    SupabasePrivateStorage("test-only", transport).remove_empty_bucket()
    assert [c[0] for c in transport.calls] == ["DELETE", "GET"]
    assert all(c[1].endswith("/bucket/" + BUCKET) for c in transport.calls)
    assert all(c[3] is None for c in transport.calls)
    transport = TransportDouble([(409, b"not empty")])
    with pytest.raises(StorageError, match="removal_not_confirmed"):
        SupabasePrivateStorage("test-only", transport).remove_empty_bucket()
    assert len(transport.calls) == 1


def test_untrusted_object_key_never_reaches_the_transport():
    transport = TransportDouble([])
    store = SupabasePrivateStorage("test-only", transport)
    for invalid in ["../other/photo.png", "https://attacker.invalid/image", KEY + "?token=leak"]:
        with pytest.raises(StorageError, match="key_rejected"):
            store.get(invalid)
    assert not transport.calls


def test_http_transport_rejects_credential_forwarding_to_other_origins():
    with pytest.raises(StorageError, match="origin_rejected"):
        StorageHTTP().request(
            "GET",
            "https://attacker.invalid/storage/v1/bucket/test",
            {"Authorization": "Bearer test-only"},
        )


def test_http_transport_blocks_redirects_and_bounds_responses(monkeypatch):
    import glam_api.integrations.private_storage as module

    seen = []

    class Response:
        status = 200

        def __enter__(self):
            return self

        def __exit__(self, *args):
            return False

        def read(self, size):
            assert size == 3
            return b"xxx"

    class Opener:
        def open(self, request, timeout):
            assert timeout == 20
            return Response()

    def build(*handlers):
        seen.extend(handlers)
        return Opener()

    monkeypatch.setattr(module, "build_opener", build)
    with pytest.raises(StorageError, match="too_large"):
        StorageHTTP().request("GET", ORIGIN + "/storage/v1/object/test", {}, limit=2)
    redirect = next(h for h in seen if isinstance(h, module.HTTPRedirectHandler))
    assert redirect.redirect_request(None, None, 302, "", {}, "https://attacker.invalid") is None
