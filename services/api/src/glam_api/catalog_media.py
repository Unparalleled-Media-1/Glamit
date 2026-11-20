"""Merchant product originals: validated, re-encoded, rights-confirmed, stored privately."""

import hashlib
import io
from typing import Annotated
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from PIL import Image, ImageOps, UnidentifiedImageError
from sqlalchemy import text
from starlette.concurrency import run_in_threadpool

from glam_api.integrations.catalog_storage import (
    CatalogStorage,
    StorageError,
    configured_catalog_storage,
)
from glam_api.integrations.private_storage import MAX_BYTES
from glam_api.workspaces import Db, Identity, authorize

MAX_ORIGINALS = 8
MIMES = {"JPEG": "image/jpeg", "PNG": "image/png", "WEBP": "image/webp"}


def storage_dependency() -> CatalogStorage:
    try:
        return configured_catalog_storage()
    except StorageError as error:
        raise HTTPException(503, error.code) from None


Store = Annotated[CatalogStorage, Depends(storage_dependency)]


def normalize_product_image(content: bytes, declared: str):
    try:
        with Image.open(io.BytesIO(content)) as probe:
            if MIMES.get(probe.format) != declared:
                raise ValueError
            w, h = probe.size
            if min(w, h) < 480 or w * h > 16_000_000 or getattr(probe, "is_animated", False):
                raise ValueError
            probe.verify()
        with Image.open(io.BytesIO(content)) as original:
            original.load()
            oriented = ImageOps.exif_transpose(original).convert("RGBA")
            oriented.thumbnail((2000, 2000), Image.Resampling.LANCZOS)
            clean = Image.new("RGB", oriented.size, "white")
            clean.paste(oriented, mask=oriented.getchannel("A"))
            out = io.BytesIO()
            clean.save(out, format="PNG")  # pixel-only: no EXIF/GPS, comments or trailing data
            value = out.getvalue()
            if len(value) > MAX_BYTES:
                raise ValueError
            return value, clean.width, clean.height
    except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError):
        raise HTTPException(422, "Unsupported or invalid product image") from None


def build_catalog_media_router(user, audit):
    router = APIRouter()

    def owned(db, org, lid, uid):
        row = (
            db.execute(
                text(
                    "SELECT workspace FROM catalog_listing WHERE id=:id AND organization_id=:o "
                    "FOR UPDATE"
                ),
                {"id": lid, "o": org},
            )
            .mappings()
            .first()
        )
        if not row:
            raise HTTPException(404, "Listing not available")
        authorize(db, uid, org, row["workspace"], write=True)

    def accept(org, lid, content, mime, db, identity, storage):
        uid = user(db, identity)
        owned(db, org, lid, uid)
        if (
            db.scalar(
                text(
                    "SELECT count(*) FROM catalog_media WHERE listing_id=:id "
                    "AND original_id IS NULL"
                ),
                {"id": lid},
            )
            >= MAX_ORIGINALS
        ):
            raise HTTPException(409, f"A listing can have at most {MAX_ORIGINALS} original images")
        value, width, height = normalize_product_image(content, mime)
        media_id = uuid4()
        try:
            storage.put(f"{org}/{media_id}.png", value)
        except StorageError as error:
            raise HTTPException(503, error.code) from None
        db.execute(
            text(
                "INSERT INTO catalog_media(id,listing_id,organization_id,storage_ref,sha256,"
                "rights_confirmed,validated) VALUES (:id,:l,:o,:ref,:sha,true,true)"
            ),
            {
                "id": media_id,
                "l": lid,
                "o": org,
                "ref": f"{org}/{media_id}.png",
                "sha": hashlib.sha256(value).hexdigest(),
            },
        )
        audit(db, uid, "catalog.original_image_added", media_id)
        return {"id": str(media_id), "width": width, "height": height}

    @router.put(
        "/v1/organizations/{org}/catalog/listings/{lid}/original-images",
        status_code=201,
        openapi_extra={
            "requestBody": {
                "required": True,
                "content": {
                    m: {"schema": {"type": "string", "format": "binary"}} for m in MIMES.values()
                },
            }
        },
    )
    async def upload(
        org: UUID,
        lid: UUID,
        request: Request,
        db: Db,
        identity: Identity,
        storage: Store,
        rights: Annotated[str, Header(alias="X-Rights-Confirmed")] = "",
    ):
        if rights.lower() != "true":
            raise HTTPException(
                422, "Confirm you own or are licensed to use this image (X-Rights-Confirmed: true)"
            )
        content = bytearray()
        async for chunk in request.stream():
            if len(content) + len(chunk) > MAX_BYTES:
                raise HTTPException(413, "Product image is too large")
            content.extend(chunk)
        mime = request.headers.get("content-type", "").split(";")[0].lower()
        if mime not in MIMES.values():
            raise HTTPException(415, "Use a JPEG, PNG or WebP image")
        return await run_in_threadpool(
            accept, org, lid, bytes(content), mime, db, identity, storage
        )

    @router.get("/v1/organizations/{org}/catalog/listings/{lid}/original-images")
    def list_images(org: UUID, lid: UUID, db: Db, identity: Identity):
        uid = user(db, identity)
        row = (
            db.execute(
                text("SELECT workspace FROM catalog_listing WHERE id=:id AND organization_id=:o"),
                {"id": lid, "o": org},
            )
            .mappings()
            .first()
        )
        if not row:
            raise HTTPException(404, "Listing not available")
        authorize(db, uid, org, row["workspace"])
        return [
            {"id": str(r[0])}
            for r in db.execute(
                text(
                    "SELECT id FROM catalog_media WHERE listing_id=:id AND original_id IS NULL "
                    "ORDER BY id"
                ),
                {"id": lid},
            )
        ]

    return router
