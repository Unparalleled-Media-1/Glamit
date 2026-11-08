"""Real, server-only binary Supabase Storage transport. No production test-double fallback."""

import json
import os
import re
import ssl
from dataclasses import dataclass, field
from typing import Protocol
from urllib.error import HTTPError, URLError
from urllib.request import HTTPRedirectHandler, HTTPSHandler, ProxyHandler, Request, build_opener

MAX_BYTES = 10 * 1024 * 1024
ORIGIN = "https://bkkmsbxrxkqaveymcrgi.supabase.co"
BUCKET = "glam-private-media"
KEY = re.compile(r"^[0-9a-f-]{36}/[0-9a-f-]{36}\.png$")


class StorageError(Exception):
    def __init__(self, code: str, retryable: bool = True):
        super().__init__(code)
        self.code = code
        self.retryable = retryable


class PrivateStorage(Protocol):
    def check_private_bucket(self) -> None: ...
    def put(self, key: str, content: bytes) -> None: ...
    def get(self, key: str) -> bytes: ...
    def delete(self, key: str) -> None:
        """Return only after confirming the object is absent, or raise."""
        ...


class BinaryTransport(Protocol):
    def request(self, method, url, headers, body=None, limit=MAX_BYTES) -> tuple[int, bytes]: ...


class StorageHTTP:
    def request(self, method, url, headers, body=None, limit=MAX_BYTES):
        if not url.startswith(ORIGIN + "/storage/v1/"):
            raise StorageError("storage_origin_rejected", False)

        class NoRedirect(HTTPRedirectHandler):
            def redirect_request(self, req, fp, code, msg, headers, newurl):
                return None

        opener = build_opener(
            ProxyHandler(), HTTPSHandler(context=ssl.create_default_context()), NoRedirect()
        )
        try:
            request = Request(url, method=method, headers=headers, data=body)
            with opener.open(request, timeout=20) as response:
                raw = response.read(limit + 1)
                if len(raw) > limit:
                    raise StorageError("storage_response_too_large", False)
                return response.status, raw
        except HTTPError as error:
            status = error.code
            error.close()
            if status == 404:
                return 404, b""
            if 300 <= status < 400:
                raise StorageError("storage_redirect_rejected", False) from None
            raise StorageError(
                "storage_auth_rejected" if status in {401, 403} else "storage_unavailable",
                status in {408, 429} or status >= 500,
            ) from None
        except (URLError, TimeoutError, OSError):
            raise StorageError("storage_unavailable") from None


@dataclass
class SupabasePrivateStorage:
    service_key: str = field(repr=False)
    transport: BinaryTransport = field(default_factory=StorageHTTP, repr=False)

    def call(self, method, path, body=None, *, headers=None, limit=MAX_BYTES):
        return self.transport.request(
            method,
            ORIGIN + "/storage/v1/" + path,
            {
                "apikey": self.service_key,
                "Authorization": "Bearer " + self.service_key,
                **(headers or {}),
            },
            body,
            limit=limit,
        )

    def check_private_bucket(self):
        status, raw = self.call("GET", "bucket/" + BUCKET, limit=128 * 1024)
        try:
            value = json.loads(raw) if status == 200 else {}
            valid = (
                value.get("id") == BUCKET
                and value.get("public") is False
                and value.get("file_size_limit") == MAX_BYTES
                and value.get("allowed_mime_types") == ["image/png"]
            )
        except (ValueError, AttributeError):
            valid = False
        if not valid:
            raise StorageError("private_bucket_not_qualified", False)

    def path(self, key):
        if not KEY.fullmatch(key):
            raise StorageError("storage_key_rejected", False)
        return BUCKET + "/" + key

    def put(self, key, content):
        path = self.path(key)
        if not content.startswith(b"\x89PNG\r\n\x1a\n") or not 0 < len(content) <= MAX_BYTES:
            raise StorageError("storage_content_rejected", False)
        self.check_private_bucket()
        # The intent is committed before upload. Repeating this deterministic write is safe
        # after an ambiguous network failure; the API verifies the original input hash.
        status, _ = self.call(
            "POST",
            "object/" + path,
            content,
            headers={"Content-Type": "image/png", "x-upsert": "true"},
            limit=128 * 1024,
        )
        if status not in {200, 201}:
            raise StorageError("storage_write_not_confirmed")

    def get(self, key):
        path = self.path(key)
        self.check_private_bucket()
        status, raw = self.call("GET", "object/authenticated/" + path)
        if status == 404:
            raise StorageError("storage_object_missing", False)
        if status != 200:
            raise StorageError("storage_unavailable")
        return raw

    def delete(self, key):
        self.path(key)
        status, _ = self.call(
            "DELETE",
            "object/" + BUCKET,
            json.dumps({"prefixes": [key]}).encode(),
            headers={"Content-Type": "application/json"},
            limit=128 * 1024,
        )
        if status not in {200, 204, 404}:
            raise StorageError("storage_delete_not_confirmed")
        # Do not claim erasure from an ACK alone. Range bounds any remaining-object probe.
        status, _ = self.call(
            "GET",
            "object/authenticated/" + self.path(key),
            headers={"Range": "bytes=0-0"},
            limit=1,
        )
        if status != 404:
            raise StorageError("storage_delete_not_confirmed")

    def remove_empty_bucket(self):
        """Operator rollback only. Never empties a bucket; the provider must refuse nonempty."""
        status, _ = self.call("DELETE", "bucket/" + BUCKET, limit=128 * 1024)
        if status not in {200, 204, 404}:
            raise StorageError("empty_bucket_removal_not_confirmed")
        status, _ = self.call("GET", "bucket/" + BUCKET, limit=128 * 1024)
        if status != 404:
            raise StorageError("empty_bucket_removal_not_confirmed")


def configured_storage(*, for_cleanup=False) -> PrivateStorage:
    if not for_cleanup and os.environ.get("GLAM_PRIVATE_MEDIA_ENABLED") != "true":
        raise StorageError("private_media_not_configured", False)
    origin = os.environ.get("SUPABASE_URL", "").rstrip("/")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    if origin != ORIGIN or not key:
        raise StorageError("private_storage_not_configured", False)
    return SupabasePrivateStorage(key)
