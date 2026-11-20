"""Server-only object storage for merchant product originals (separate private bucket)."""

import json
import os
import re
from dataclasses import dataclass, field
from typing import Protocol

from glam_api.integrations.private_storage import (
    MAX_BYTES,
    ORIGIN,
    BinaryTransport,
    StorageError,
    StorageHTTP,
)

BUCKET = "glam-catalog-media"
KEY = re.compile(r"^[0-9a-f-]{36}/[0-9a-f-]{36}\.png$")


class CatalogStorage(Protocol):
    def put(self, key: str, content: bytes) -> None: ...
    def get(self, key: str) -> bytes: ...


@dataclass
class SupabaseCatalogStorage:
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

    def check_bucket(self):
        status, raw = self.call("GET", "bucket/" + BUCKET, limit=128 * 1024)
        try:
            value = json.loads(raw) if status == 200 else {}
            valid = (
                value.get("id") == BUCKET
                and value.get("public") is False
                and value.get("allowed_mime_types") == ["image/png"]
            )
        except (ValueError, AttributeError):
            valid = False
        if not valid:
            raise StorageError("catalog_bucket_not_qualified", False)

    def path(self, key):
        if not KEY.fullmatch(key):
            raise StorageError("storage_key_rejected", False)
        return BUCKET + "/" + key

    def put(self, key, content):
        path = self.path(key)
        if not content.startswith(b"\x89PNG\r\n\x1a\n") or not 0 < len(content) <= MAX_BYTES:
            raise StorageError("storage_content_rejected", False)
        self.check_bucket()
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
        self.check_bucket()
        status, raw = self.call("GET", "object/authenticated/" + path)
        if status == 404:
            raise StorageError("storage_object_missing", False)
        if status != 200:
            raise StorageError("storage_unavailable")
        return raw


def configured_catalog_storage() -> CatalogStorage:
    if os.environ.get("GLAM_CATALOG_MEDIA_ENABLED") != "true":
        raise StorageError("catalog_media_not_configured", False)
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    if os.environ.get("SUPABASE_URL", "").rstrip("/") != ORIGIN or not key:
        raise StorageError("catalog_storage_not_configured", False)
    return SupabaseCatalogStorage(key)
