"""Owner-authorized private-photo intents, validated uploads and non-cacheable retrieval."""

import hashlib
import io
import json
import os
from datetime import datetime
from typing import Annotated, Literal
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, Header, HTTPException, Request, Response
from fastapi.responses import JSONResponse
from PIL import Image, ImageOps, UnidentifiedImageError
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import text
from sqlalchemy.orm import Session
from starlette.concurrency import run_in_threadpool

from glam_api.auth import Principal, get_principal
from glam_api.contracts import PolicyRead
from glam_api.db import get_session
from glam_api.integrations.private_storage import (
    MAX_BYTES,
    PrivateStorage,
    StorageError,
    configured_storage,
)

Db = Annotated[Session, Depends(get_session, scope="function")]
Identity = Annotated[Principal, Depends(get_principal)]
MediaKey = Annotated[UUID, Header(alias="Idempotency-Key")]

# A consent epoch is never revived by withdrawing and subsequently regranting consent.
LIVE_SQL = """
  m.expires_at>clock_timestamp()
  AND EXISTS(SELECT 1 FROM account_eligibility e WHERE e.user_id=m.owner_id
             AND e.age_band='eligible_adult' AND e.expires_at>clock_timestamp())
  AND m.policy_id=(SELECT p.id FROM policy_document p
    WHERE p.purpose='private_photo_storage' AND p.approved_at<=clock_timestamp()
    ORDER BY p.approved_at DESC,p.id DESC LIMIT 1)
  AND m.consent_sequence=(SELECT c.sequence FROM consent_event c
    JOIN policy_document p ON p.id=c.policy_id
    WHERE c.user_id=m.owner_id AND p.purpose='private_photo_storage'
    ORDER BY c.sequence DESC LIMIT 1)
  AND EXISTS(SELECT 1 FROM consent_event c WHERE c.sequence=m.consent_sequence
    AND c.user_id=m.owner_id AND c.policy_id=m.policy_id AND c.action='granted')
"""


PRIVATE_MEDIA_GUARD_SQL = """
SELECT
  (SELECT relrowsecurity FROM pg_class WHERE oid='storage.objects'::regclass) AS storage_rls,
  (SELECT relrowsecurity FROM pg_class WHERE oid='public.private_media'::regclass) AS metadata_rls,
  EXISTS(SELECT 1 FROM pg_policy p WHERE p.polrelid='storage.objects'::regclass
    AND p.polname='glam_private_media_server_only' AND NOT p.polpermissive
    AND p.polcmd='*' AND p.polroles=ARRAY[0::oid]
    AND pg_get_expr(p.polqual,p.polrelid)='(bucket_id <> ''glam-private-media''::text)'
    AND pg_get_expr(p.polwithcheck,p.polrelid)='(bucket_id <> ''glam-private-media''::text)'
  ) AS restrictive_guard,
  NOT EXISTS(SELECT 1 FROM (VALUES('anon'),('authenticated')) AS r(name)
    CROSS JOIN (VALUES('SELECT'),('INSERT'),('UPDATE'),('DELETE')) AS p(privilege)
    WHERE has_table_privilege(r.name,'public.private_media',p.privilege)) AS metadata_restricted
"""

PRIVATE_MEDIA_CATALOG_SQL = (
    "SELECT g.*, EXISTS(SELECT 1 FROM storage.buckets "
    "WHERE id='glam-private-media' AND NOT public AND file_size_limit=10485760 "
    "AND allowed_mime_types=ARRAY['image/png']) AS private_bucket FROM ("
    + PRIVATE_MEDIA_GUARD_SQL
    + ") g"
)


def validate_private_media_catalog(rows, *, require_bucket=True):
    required = {"storage_rls", "metadata_rls", "restrictive_guard", "metadata_restricted"}
    if require_bucket:
        required.add("private_bucket")
    if len(rows) != 1 or set(rows[0]) != required or any(v is not True for v in rows[0].values()):
        raise RuntimeError("private_media_catalog_verification_failed")


class MediaIntent(BaseModel):
    model_config = ConfigDict(extra="forbid")
    content_type: Literal["image/jpeg", "image/png", "image/webp"]
    size_bytes: int = Field(ge=1, le=MAX_BYTES)
    sha256: str = Field(pattern=r"^[0-9a-f]{64}$")
    policy_id: UUID


class MediaRead(BaseModel):
    id: UUID
    state: Literal["pending", "ready", "deletion_pending", "deleted"]
    content_type: Literal["image/png"] = "image/png"
    width: int | None
    height: int | None
    stored_size: int | None
    created_at: datetime
    expires_at: datetime
    deleted_at: datetime | None
    last_error_code: str | None


def storage_dependency() -> PrivateStorage:
    try:
        return configured_storage()
    except StorageError as error:
        raise HTTPException(503, error.code) from None


Store = Annotated[PrivateStorage, Depends(storage_dependency)]


def ensure_schema(db, *, for_cleanup=False):
    if db.scalar(text("SELECT to_regclass('public.private_media')")) is None:
        raise HTTPException(503, "private_media_migration_required")
    permissions = db.scalar(
        text("""
      SELECT has_table_privilege('public.private_media','SELECT')
        AND has_table_privilege('public.private_media','INSERT')
        AND has_table_privilege('public.private_media','UPDATE')
    """)
    )
    if not permissions or db.scalar(text("SELECT row_security_active('public.private_media')")):
        raise HTTPException(503, "private_media_runtime_permissions_required")
    if not for_cleanup:
        if db.scalar(text("SELECT to_regclass('storage.objects')")) is None:
            raise HTTPException(503, "private_storage_catalog_required")
        rows = [dict(row) for row in db.execute(text(PRIVATE_MEDIA_GUARD_SQL)).mappings()]
        try:
            validate_private_media_catalog(rows, require_bucket=False)
        except RuntimeError:
            raise HTTPException(503, "private_media_privacy_guards_required") from None


def retention_seconds():
    try:
        seconds = int(os.environ.get("GLAM_PRIVATE_MEDIA_RETENTION_SECONDS", ""))
        if not 60 <= seconds <= 30 * 24 * 3600:
            raise ValueError
        return seconds
    except ValueError:
        # This bound is an infrastructure cap, not an automatically approved retention policy.
        raise HTTPException(503, "reviewed_media_retention_configuration_required") from None


def read_row(row):
    return MediaRead.model_validate(dict(row)).model_dump(mode="json")


def owned(db, uid, media_id):
    row = (
        db.execute(
            text("SELECT * FROM private_media WHERE id=:id AND owner_id=:u FOR UPDATE"),
            {"id": media_id, "u": uid},
        )
        .mappings()
        .first()
    )
    if row is None:
        raise HTTPException(404, "private_media_not_found")
    return row


def require_live(db, media_id):
    if not db.scalar(
        text(f"SELECT ({LIVE_SQL}) FROM private_media m WHERE m.id=:id"), {"id": media_id}
    ):
        raise HTTPException(410, "media_expired_or_consent_epoch_changed")


def normalize_photo(content, declared_mime):
    try:
        with Image.open(io.BytesIO(content)) as probe:
            fmt = {"JPEG": "image/jpeg", "PNG": "image/png", "WEBP": "image/webp"}
            if fmt.get(probe.format) != declared_mime:
                raise ValueError
            w, h = probe.size
            if min(w, h) < 480 or w * h > 16_000_000 or getattr(probe, "is_animated", False):
                raise ValueError
            probe.verify()
        with Image.open(io.BytesIO(content)) as original:
            original.load()
            oriented = ImageOps.exif_transpose(original).convert("RGBA")
            oriented.thumbnail((1600, 1600), Image.Resampling.LANCZOS)
            clean = Image.new("RGB", oriented.size, "white")
            clean.paste(oriented, mask=oriented.getchannel("A"))
            output = io.BytesIO()
            # New pixel-only image: no EXIF/GPS, comments, source filename, ICC or trailing data.
            clean.save(output, format="PNG")
            value = output.getvalue()
            if len(value) > MAX_BYTES:
                raise ValueError
            return value, clean.width, clean.height
    except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError):
        raise HTTPException(422, "unsupported_or_invalid_private_photo") from None


def build_media_router(user, audit):
    router = APIRouter()

    @router.get("/v1/media/status")
    def status(db: Db, identity: Identity):
        user(db, identity)
        try:
            storage = configured_storage()
            retention_seconds()
            ensure_schema(db)
            storage.check_private_bucket()
        except StorageError as error:
            return {
                "state": "NOT CONFIGURED" if "not_configured" in error.code else "DEGRADED",
                "code": error.code,
                "scope": "private_media_storage",
            }
        except HTTPException as error:
            return {
                "state": "NOT CONFIGURED",
                "code": error.detail,
                "scope": "private_media_storage",
            }
        return {"state": "CONNECTED", "scope": "private_media_storage"}

    @router.get("/v1/media/policy", response_model=PolicyRead)
    def policy(db: Db, identity: Identity):
        user(db, identity)
        current = (
            db.execute(
                text("""
          SELECT id,purpose,version,content FROM policy_document
          WHERE purpose='private_photo_storage' AND approved_at<=clock_timestamp()
          ORDER BY approved_at DESC,id DESC LIMIT 1
        """)
            )
            .mappings()
            .first()
        )
        if current is None:
            raise HTTPException(503, "approved_photo_storage_policy_required")
        return dict(current)

    @router.post("/v1/media", response_model=MediaRead, status_code=201)
    def create(body: MediaIntent, db: Db, identity: Identity, key: MediaKey, storage: Store):
        ensure_schema(db)
        uid = user(db, identity)
        payload_hash = hashlib.sha256(
            json.dumps(body.model_dump(mode="json"), sort_keys=True).encode()
        ).hexdigest()
        previous = (
            db.execute(
                text(
                    "SELECT * FROM private_media WHERE owner_id=:u AND request_key=:key FOR UPDATE"
                ),
                {"u": uid, "key": key},
            )
            .mappings()
            .first()
        )
        if previous:
            if previous["state"] in {"deletion_pending", "deleted"}:
                raise HTTPException(410, "media_deletion_requested")
            require_live(db, previous["id"])
            if previous["request_hash"] != payload_hash:
                raise HTTPException(409, "media_idempotency_conflict")
            return read_row(previous)
        seconds = retention_seconds()
        consent = db.execute(
            text("""
          SELECT c.sequence,c.policy_id,c.action FROM consent_event c
          JOIN policy_document p ON p.id=c.policy_id
          WHERE c.user_id=:u AND p.purpose='private_photo_storage'
          ORDER BY c.sequence DESC LIMIT 1
        """),
            {"u": uid},
        ).first()
        approved = db.scalar(
            text("""
          SELECT id FROM policy_document WHERE purpose='private_photo_storage'
          AND approved_at<=clock_timestamp() ORDER BY approved_at DESC,id DESC LIMIT 1
        """)
        )
        if (
            not consent
            or consent.action != "granted"
            or consent.policy_id != approved
            or approved != body.policy_id
        ):
            raise HTTPException(403, "current_photo_storage_consent_required")
        if not db.scalar(
            text("""
          SELECT EXISTS(SELECT 1 FROM account_eligibility WHERE user_id=:u
          AND age_band='eligible_adult' AND expires_at>clock_timestamp())
        """),
            {"u": uid},
        ):
            raise HTTPException(403, "qualified_photo_eligibility_required")
        active = db.scalar(
            text("""
          SELECT count(*) FROM private_media WHERE owner_id=:u AND state<>'deleted'
        """),
            {"u": uid},
        )
        if active >= 100:
            raise HTTPException(429, "private_media_capacity_reached")
        try:
            storage.check_private_bucket()
        except StorageError as error:
            raise HTTPException(503, error.code) from None
        media_id = uuid4()
        row = (
            db.execute(
                text("""
          INSERT INTO private_media(id,owner_id,request_key,request_hash,policy_id,consent_sequence,
             object_key,input_mime,input_size,input_sha256,expires_at)
          VALUES (:id,:u,:key,:hash,:policy,:seq,:object,:mime,:size,:sha,
             clock_timestamp()+:seconds*interval '1 second') RETURNING *
        """),
                {
                    "id": media_id,
                    "u": uid,
                    "key": key,
                    "hash": payload_hash,
                    "policy": body.policy_id,
                    "seq": consent.sequence,
                    "object": f"{uid}/{media_id}.png",
                    "mime": body.content_type,
                    "size": body.size_bytes,
                    "sha": body.sha256,
                    "seconds": seconds,
                },
            )
            .mappings()
            .one()
        )
        audit(db, uid, "media.intent_created", media_id)
        return read_row(row)

    @router.get("/v1/media", response_model=list[MediaRead])
    def listing(db: Db, identity: Identity, storage: Store):
        ensure_schema(db)
        uid = user(db, identity)
        return [
            read_row(row)
            for row in db.execute(
                text(f"""
          SELECT m.* FROM private_media m WHERE m.owner_id=:u
          AND m.state IN ('pending','ready') AND ({LIVE_SQL}) ORDER BY m.created_at DESC,m.id
        """),
                {"u": uid},
            ).mappings()
        ]

    @router.get("/v1/media/{media_id}", response_model=MediaRead)
    def metadata(media_id: UUID, db: Db, identity: Identity):
        ensure_schema(db)
        return read_row(owned(db, user(db, identity), media_id))

    def accept_content(media_id, content, content_type, db, identity, storage):
        ensure_schema(db)
        uid = user(db, identity)
        row = owned(db, uid, media_id)
        if row["state"] not in {"pending", "ready"}:
            raise HTTPException(410, "media_deletion_requested")
        require_live(db, media_id)
        if content_type != row["input_mime"]:
            raise HTTPException(415, "private_photo_mime_mismatch")
        if (
            len(content) != row["input_size"]
            or hashlib.sha256(content).hexdigest() != row["input_sha256"]
        ):
            raise HTTPException(409, "private_photo_content_mismatch")
        if row["state"] == "ready":
            return read_row(row)
        value, width, height = normalize_photo(content, content_type)
        try:
            storage.put(row["object_key"], value)
        except StorageError as error:
            db.execute(
                text("UPDATE private_media SET last_error_code=:e WHERE id=:id"),
                {"id": media_id, "e": error.code},
            )
            # Return an error response without rolling back the durable pending intent.
            return JSONResponse(
                status_code=503, content={"code": error.code, "retryable": error.retryable}
            )
        # Slow external writes must not turn an expired intent into a successful result.
        # If this fails, the previously committed pending intent still tracks the bytes.
        require_live(db, media_id)
        row = (
            db.execute(
                text("""
          UPDATE private_media SET state='ready',stored_size=:size,stored_sha256=:sha,
            width=:w,height=:h,last_error_code=NULL WHERE id=:id RETURNING *
        """),
                {
                    "id": media_id,
                    "size": len(value),
                    "sha": hashlib.sha256(value).hexdigest(),
                    "w": width,
                    "h": height,
                },
            )
            .mappings()
            .one()
        )
        audit(db, uid, "media.uploaded", media_id)
        return read_row(row)

    @router.put(
        "/v1/media/{media_id}/content",
        response_model=MediaRead,
        openapi_extra={
            "requestBody": {
                "required": True,
                "content": {
                    mime: {"schema": {"type": "string", "format": "binary"}}
                    for mime in ("image/jpeg", "image/png", "image/webp")
                },
            }
        },
    )
    async def upload(media_id: UUID, request: Request, db: Db, identity: Identity, storage: Store):
        def preflight():
            # Release locks before receiving a potentially slow request body, so consent
            # withdrawal/logout is not blocked by the upload stream. Recheck before storage.
            with Session(db.get_bind()) as check, check.begin():
                ensure_schema(check)
                row = owned(check, user(check, identity), media_id)
                if row["state"] not in {"pending", "ready"}:
                    raise HTTPException(410, "media_deletion_requested")
                require_live(check, media_id)

        await run_in_threadpool(preflight)
        content = bytearray()
        async for chunk in request.stream():
            if len(content) + len(chunk) > MAX_BYTES:
                raise HTTPException(413, "private_photo_too_large")
            content.extend(chunk)
        return await run_in_threadpool(
            accept_content,
            media_id,
            bytes(content),
            request.headers.get("content-type", "").split(";")[0].lower(),
            db,
            identity,
            storage,
        )

    @router.get(
        "/v1/media/{media_id}/content",
        response_class=Response,
        responses={
            200: {
                "content": {
                    "image/png": {
                        "schema": {"type": "string", "format": "binary"},
                    }
                }
            }
        },
    )
    def download(media_id: UUID, db: Db, identity: Identity, storage: Store):
        ensure_schema(db)
        row = owned(db, user(db, identity), media_id)
        if row["state"] != "ready":
            raise HTTPException(410 if row["state"] != "pending" else 409, "media_not_ready")
        require_live(db, media_id)
        try:
            value = storage.get(row["object_key"])
        except StorageError as error:
            raise HTTPException(503, error.code) from None
        if (
            len(value) != row["stored_size"]
            or hashlib.sha256(value).hexdigest() != row["stored_sha256"]
        ):
            raise HTTPException(502, "private_photo_integrity_failed")
        require_live(db, media_id)
        return Response(
            value,
            media_type="image/png",
            headers={
                "Cache-Control": "no-store",
                "Vary": "Authorization",
                "Content-Disposition": 'inline; filename="private-photo.png"',
                "Content-Security-Policy": "default-src 'none'; sandbox",
            },
        )

    @router.delete("/v1/media/{media_id}", response_model=MediaRead, status_code=202)
    def delete(media_id: UUID, db: Db, identity: Identity):
        ensure_schema(db, for_cleanup=True)
        uid = user(db, identity)
        row = owned(db, uid, media_id)
        if row["state"] not in {"deletion_pending", "deleted"}:
            row = (
                db.execute(
                    text("""
              UPDATE private_media SET state='deletion_pending',
                deletion_requested_at=clock_timestamp() WHERE id=:id RETURNING *
            """),
                    {"id": media_id},
                )
                .mappings()
                .one()
            )
            audit(db, uid, "media.deletion_requested", media_id)
        return read_row(row)

    return router
