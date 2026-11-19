# ruff: noqa: E501
"""Durable virtual try-on jobs. Default-off; GLAM AI credits only; no automatic billable retry."""

import hashlib
import io
import json
import os
import time
from datetime import datetime, timedelta
from typing import Annotated, Literal
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, Header, HTTPException, Request, Response
from fastapi.responses import JSONResponse
from fastapi.routing import APIRoute
from PIL import Image, ImageDraw, UnidentifiedImageError
from pydantic import BaseModel, ConfigDict, Field, field_validator
from sqlalchemy import text
from sqlalchemy.orm import Session

from glam_api import credits
from glam_api.auth import Principal, get_principal
from glam_api.contracts import PolicyRead
from glam_api.db import get_session
from glam_api.integrations.private_storage import MAX_BYTES, StorageError, configured_storage
from glam_api.private_media import (
    LIVE_SQL,
    ensure_schema,
    owned,
    require_live,
    storage_dependency,
)
from glam_api.tryon_providers import (
    DeterministicTestProvider,
    ProviderAmbiguous,
    ProviderFailed,
    ProviderRejected,
)

PURPOSE = "ai_look_generation"
LABEL_VERSION = "ai-preview-1"
LABEL_TEXT = "AI-generated preview - not a guarantee of fit"
FEATURES = {
    "full_body": "tryon_full_body",
    "torso": "tryon_torso",
    "face_hair_makeup": "tryon_face_hair_makeup",
}
TABLES = ("tryon_job", "tryon_result", "generation_cost_event", "generation_price_rule")
BACKOFF = 0.2  # seconds between safe retries; tests set this to 0
POLL_INTERVAL = 1.0
Db = Annotated[Session, Depends(get_session, scope="function")]
Identity = Annotated[Principal, Depends(get_principal)]
Key = Annotated[UUID, Header(alias="Idempotency-Key")]
LIVE_JOB_SQL = f"""
  j.expires_at>clock_timestamp()
  AND EXISTS(SELECT 1 FROM private_media m WHERE m.id=j.media_id AND m.owner_id=j.owner_id
             AND m.state='ready' AND ({LIVE_SQL}))
  AND j.policy_id=(SELECT id FROM policy_document WHERE purpose='{PURPOSE}'
    AND approved_at<=clock_timestamp() ORDER BY approved_at DESC,id DESC LIMIT 1)
  AND j.consent_sequence=(SELECT c.sequence FROM consent_event c JOIN policy_document p
    ON p.id=c.policy_id WHERE c.user_id=j.owner_id AND p.purpose='{PURPOSE}'
    ORDER BY c.sequence DESC LIMIT 1)
  AND EXISTS(SELECT 1 FROM consent_event c WHERE c.sequence=j.consent_sequence
    AND c.user_id=j.owner_id AND c.policy_id=j.policy_id AND c.action='granted')
"""


class Garment(BaseModel):
    model_config = ConfigDict(extra="forbid")
    label: str = Field(min_length=1, max_length=80)
    category: Literal["dress", "top", "bottom", "suit", "outerwear", "headwear", "other"]
    media_id: UUID | None = None


class OutfitBrief(BaseModel):
    model_config = ConfigDict(extra="forbid")
    occasion: str = Field(min_length=1, max_length=80)
    notes: str | None = Field(default=None, max_length=280)


class TryOnRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    media_id: UUID
    policy_id: UUID
    consent: Literal[True]
    scope: Literal["full_body", "torso", "face_hair_makeup"] = "full_body"
    outfit: OutfitBrief
    garments: list[Garment] = Field(min_length=1, max_length=6)

    @field_validator("consent", mode="before")
    @classmethod
    def explicit(cls, value):
        if value is not True:
            raise ValueError("Explicit consent required")
        return value


class TryOnJobRead(BaseModel):
    id: UUID
    media_id: UUID
    scope: str
    state: Literal["queued", "running", "completed", "failed", "cancelled", "expired"]
    created_at: datetime
    expires_at: datetime
    finished_at: datetime | None
    error_code: str | None
    credit_units: int
    result_available: bool = False
    synthetic_test: bool = False
    label: str = LABEL_TEXT


class Quote(BaseModel):
    scope: str
    credit_units: int
    price_rule_version: int
    credit_kind: Literal["glam_ai_credit"] = "glam_ai_credit"


class TryOnRoute(APIRoute):
    def get_route_handler(self):
        handler = super().get_route_handler()

        async def bounded(request: Request):
            if request.method == "POST":
                body = bytearray()
                async for chunk in request.stream():
                    if len(body) + len(chunk) > 8192:
                        raise HTTPException(413, "tryon_request_too_large")
                    body.extend(chunk)
                request._body = bytes(body)
            return await handler(request)

        return bounded


def tryon_provider():
    """Fail closed. Only the explicitly enabled, non-production test provider can run today."""
    name = os.environ.get("GLAM_TRYON_PROVIDER", "")
    if name == "deterministic_test":
        if (
            os.environ.get("GLAM_DEPLOYMENT_ENV") == "production"
            or os.environ.get("GLAM_TRYON_ALLOW_TEST_PROVIDER") != "true"
        ):
            raise HTTPException(503, "tryon_test_provider_forbidden")
        return DeterministicTestProvider()
    raise HTTPException(503, "tryon_provider_not_qualified")


def settings():
    if os.environ.get("GLAM_TRYON_ENABLED") != "true":
        raise HTTPException(503, "tryon_not_enabled")
    if os.environ.get("GLAM_TRYON_PROVIDER_DATA_APPROVED") != "true":
        raise HTTPException(503, "tryon_provider_data_review_required")
    try:
        ttl = int(os.environ.get("GLAM_TRYON_RETENTION_SECONDS", ""))
        limit = int(os.environ.get("GLAM_TRYON_MAX_REQUESTS_PER_HOUR", ""))
        if not 60 <= ttl <= 30 * 86400 or not 1 <= limit <= 100:
            raise ValueError
    except ValueError:
        raise HTTPException(503, "qualified_tryon_configuration_required") from None
    return ttl, limit


def provider_timeout():
    try:
        return max(1, min(300, int(os.environ.get("GLAM_TRYON_PROVIDER_TIMEOUT_SECONDS", "90"))))
    except ValueError:
        return 90


def schema(db):
    ensure_schema(db)
    for table in TABLES:
        if db.scalar(text("SELECT to_regclass(:t)"), {"t": f"public.{table}"}) is None:
            raise HTTPException(503, "tryon_migration_required")
    valid = db.scalar(
        text("""
      SELECT bool_and(NOT row_security_active(t.name) AND c.relrowsecurity
        AND has_table_privilege(t.name,'SELECT') AND has_table_privilege(t.name,'INSERT')
        AND has_table_privilege(t.name,'UPDATE')
        AND NOT EXISTS(SELECT 1 FROM (VALUES('anon'),('authenticated')) r(name)
          CROSS JOIN (VALUES('SELECT'),('INSERT'),('UPDATE'),('DELETE')) p(priv)
          WHERE has_table_privilege(r.name,t.name,p.priv)))
      FROM (SELECT 'public.'||x AS name FROM unnest(CAST(:tables AS text[])) x) t
      JOIN pg_class c ON c.oid=t.name::regclass
    """),
        {"tables": list(TABLES)},
    )
    if not valid:
        raise HTTPException(503, "tryon_runtime_permissions_required")


def current_policy(db):
    row = (
        db.execute(
            text("""SELECT id,purpose,version,content FROM policy_document WHERE purpose=:p
          AND approved_at<=clock_timestamp() ORDER BY approved_at DESC,id DESC LIMIT 1"""),
            {"p": PURPOSE},
        )
        .mappings()
        .first()
    )
    if row is None:
        raise HTTPException(503, "approved_tryon_policy_required")
    return row


def grant(db, uid, policy):
    if current_policy(db)["id"] != policy:
        raise HTTPException(403, "current_tryon_consent_required")
    row = db.execute(
        text("""SELECT c.sequence,c.policy_id,c.action FROM consent_event c JOIN policy_document p
      ON p.id=c.policy_id WHERE c.user_id=:u AND p.purpose=:p ORDER BY c.sequence DESC LIMIT 1"""),
        {"u": uid, "p": PURPOSE},
    ).first()
    if row is None or row.policy_id != policy or row.action != "granted":
        raise HTTPException(403, "current_tryon_consent_required")
    return row.sequence


def price(db, scope):
    row = (
        db.execute(
            text("""SELECT id,version,credit_units FROM generation_price_rule
          WHERE feature=:f AND approved_at IS NOT NULL AND approved_at<=clock_timestamp()
          AND retired_at IS NULL ORDER BY version DESC LIMIT 1"""),
            {"f": FEATURES[scope]},
        )
        .mappings()
        .first()
    )
    if row is None:
        raise HTTPException(503, "tryon_price_not_configured")
    return row


def live(db, row):
    return (
        db.scalar(
            text(f"SELECT coalesce(({LIVE_JOB_SQL}),false) FROM tryon_job j WHERE j.id=:id"),
            {"id": row["id"]},
        )
        is True
    )


def release_if_held(db, row):
    state = db.scalar(
        text("SELECT state FROM credit_reservation WHERE id=:r"),
        {"r": row["credit_reservation_id"]},
    )
    if state == "held":
        credits.finish(db, row["owner_id"], row["credit_reservation_id"], capture=False)


def drop_result(db, job_id):
    db.execute(
        text("""UPDATE tryon_result SET state='deletion_pending',next_purge_at=clock_timestamp()
          WHERE job_id=:id AND state IN ('stored')"""),
        {"id": job_id},
    )


def finalize(db, row, state, error):
    """Terminal transition from any non-terminal state; always releases an uncaptured hold."""
    release_if_held(db, row)
    drop_result(db, row["id"])
    db.execute(
        text("""UPDATE tryon_job SET state=:s,error_code=:e,
          finished_at=coalesce(finished_at,clock_timestamp()) WHERE id=:id"""),
        {"s": state, "e": error, "id": row["id"]},
    )


def expire(db, row):
    if row["state"] in ("queued", "running", "completed"):
        finalize(db, row, "expired", "tryon_privacy_scope_expired")


def job(db, uid, job_id):
    row = (
        db.execute(
            text("SELECT * FROM tryon_job WHERE id=:id AND owner_id=:u FOR UPDATE"),
            {"id": job_id, "u": uid},
        )
        .mappings()
        .first()
    )
    if row is None:
        raise HTTPException(404, "tryon_job_not_found")
    if not live(db, row):
        expire(db, dict(row))
        row = (
            db.execute(text("SELECT * FROM tryon_job WHERE id=:id"), {"id": job_id})
            .mappings()
            .one()
        )
    return row


def read(db, row):
    units = db.scalar(
        text("SELECT units FROM credit_reservation WHERE id=:r"),
        {"r": row["credit_reservation_id"]},
    )
    result = db.execute(
        text("SELECT synthetic_test FROM tryon_result WHERE job_id=:id AND state='stored'"),
        {"id": row["id"]},
    ).first()
    return TryOnJobRead(
        **{k: row[k] for k in ("id", "media_id", "scope", "state", "created_at", "expires_at")},
        finished_at=row["finished_at"],
        error_code=row["error_code"],
        credit_units=units,
        result_available=result is not None and row["state"] == "completed",
        synthetic_test=bool(result and result.synthetic_test),
    )


def stamp(png: bytes) -> bytes:
    with Image.open(io.BytesIO(png)) as source:
        image = source.convert("RGB")
    band = max(24, image.height // 20)
    canvas = Image.new("RGB", (image.width, image.height + band), "black")
    canvas.paste(image, (0, 0))
    ImageDraw.Draw(canvas).text((8, image.height + band // 4), LABEL_TEXT, fill="white")
    out = io.BytesIO()
    canvas.save(out, format="PNG")
    return out.getvalue()


def validate_output(content: bytes):
    """Decode and re-encode provider bytes: allowed types only, bounded, metadata stripped."""
    if not content or len(content) > MAX_BYTES:
        raise ValueError("size")
    try:
        with Image.open(io.BytesIO(content)) as probe:
            if probe.format not in ("PNG", "JPEG", "WEBP") or getattr(probe, "is_animated", False):
                raise ValueError("type")
            w, h = probe.size
            if min(w, h) < 64 or max(w, h) > 8192 or w * h > 16_000_000:
                raise ValueError("dimensions")
            probe.verify()
        with Image.open(io.BytesIO(content)) as original:
            original.load()
            clean = Image.new("RGB", original.size, "white")
            rgba = original.convert("RGBA")
            clean.paste(rgba, mask=rgba.getchannel("A"))
            out = io.BytesIO()
            clean.save(out, format="PNG")
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError):
        raise ValueError("decode") from None
    value = out.getvalue()
    if len(value) > MAX_BYTES:
        raise ValueError("size")
    return value, clean.width, clean.height


def build_tryon_router(user, audit):
    router = APIRouter(route_class=TryOnRoute)

    def private(response):
        response.headers["Cache-Control"] = "no-store, private"
        response.headers["Vary"] = "Authorization"

    @router.get("/v1/tryon/policy", response_model=PolicyRead)
    def policy(db: Db, identity: Identity, response: Response):
        private(response)
        user(db, identity)
        return dict(current_policy(db))

    @router.get("/v1/tryon/quote", response_model=Quote)
    def quote(db: Db, identity: Identity, response: Response, scope: str = "full_body"):
        private(response)
        user(db, identity)
        schema(db)
        if scope not in FEATURES:
            raise HTTPException(422, "tryon_scope_invalid")
        rule = price(db, scope)
        return Quote(
            scope=scope, credit_units=rule["credit_units"], price_rule_version=rule["version"]
        )

    @router.post("/v1/tryon/jobs", response_model=TryOnJobRead, status_code=202)
    def submit(
        body: TryOnRequest,
        key: Key,
        db: Db,
        identity: Identity,
        response: Response,
        provider: Annotated[object, Depends(tryon_provider)],
    ):
        private(response)
        ttl, limit = settings()
        uid = user(db, identity)  # also takes the per-user row lock that serializes retries
        schema(db)
        media = owned(db, uid, body.media_id)
        require_live(db, body.media_id)
        if media["state"] != "ready":
            raise HTTPException(409, "tryon_media_not_ready")
        for garment in body.garments:
            if garment.media_id is not None:
                owned(db, uid, garment.media_id)
                require_live(db, garment.media_id)
        consent = grant(db, uid, body.policy_id)
        digest = hashlib.sha256(
            json.dumps(body.model_dump(mode="json"), sort_keys=True).encode()
        ).hexdigest()
        previous = (
            db.execute(
                text("SELECT * FROM tryon_job WHERE owner_id=:u AND request_key=:k"),
                {"u": uid, "k": key},
            )
            .mappings()
            .first()
        )
        if previous:
            if previous["request_hash"] != digest:
                raise HTTPException(409, "tryon_idempotency_conflict")
            return read(db, job(db, uid, previous["id"]))
        count = db.scalar(
            text(
                "SELECT count(*) FROM tryon_job WHERE owner_id=:u AND "
                "created_at>clock_timestamp()-interval '1 hour'"
            ),
            {"u": uid},
        )
        if count >= limit:
            raise HTTPException(429, "tryon_request_limit_reached")
        rule = price(db, body.scope)
        created_at = db.scalar(text("SELECT clock_timestamp()"))
        expires_at = min(media["expires_at"], created_at + timedelta(seconds=ttl))
        if expires_at <= created_at:
            raise HTTPException(410, "tryon_media_expired")
        try:
            reservation = credits.reserve(db, uid, f"tryon:{key}", rule["credit_units"], expires_at)
        except credits.CreditConflict:
            raise HTTPException(402, "tryon_insufficient_credits") from None
        row = (
            db.execute(
                text("""
          INSERT INTO tryon_job(id,owner_id,media_id,request_key,request_hash,policy_id,
            consent_sequence,scope,outfit_brief,garment_refs,provider,provider_model_version,
            price_rule_id,credit_reservation_id,created_at,expires_at)
          VALUES(:id,:u,:m,:k,:hash,:p,:c,:scope,CAST(:brief AS jsonb),CAST(:g AS jsonb),
            :provider,:version,:rule,:res,:created,:expires) RETURNING *"""),
                {
                    "id": uuid4(),
                    "u": uid,
                    "m": body.media_id,
                    "k": key,
                    "hash": digest,
                    "p": body.policy_id,
                    "c": consent,
                    "scope": body.scope,
                    "brief": body.outfit.model_dump_json(),
                    "g": json.dumps(body.model_dump(mode="json")["garments"]),
                    "provider": provider.name,
                    "version": provider.model_version,
                    "rule": rule["id"],
                    "res": reservation,
                    "created": created_at,
                    "expires": expires_at,
                },
            )
            .mappings()
            .one()
        )
        audit(db, uid, "tryon.queued", row["id"])
        return read(db, row)

    @router.get("/v1/tryon/jobs", response_model=list[TryOnJobRead])
    def history(db: Db, identity: Identity, response: Response):
        private(response)
        uid = user(db, identity)
        schema(db)
        ids = db.scalars(
            text(
                "SELECT id FROM tryon_job WHERE owner_id=:u ORDER BY created_at DESC,id DESC LIMIT 100"
            ),
            {"u": uid},
        ).all()
        return [read(db, job(db, uid, i)) for i in ids]

    @router.get("/v1/tryon/jobs/{job_id}", response_model=TryOnJobRead)
    def status(job_id: UUID, db: Db, identity: Identity, response: Response):
        private(response)
        uid = user(db, identity)
        schema(db)
        return read(db, job(db, uid, job_id))

    @router.delete("/v1/tryon/jobs/{job_id}", response_model=TryOnJobRead)
    def remove(job_id: UUID, db: Db, identity: Identity, response: Response):
        """Cancel before completion, or delete the stored preview after it. Idempotent."""
        private(response)
        uid = user(db, identity)
        schema(db)
        row = dict(job(db, uid, job_id))
        if row["state"] in ("queued", "running"):
            finalize(db, row, "cancelled", None)
            audit(db, uid, "tryon.cancelled", job_id)
        elif row["state"] == "completed":
            finalize(db, row, "expired", "tryon_deleted_by_owner")
            audit(db, uid, "tryon.deleted", job_id)
        return read(
            db,
            db.execute(text("SELECT * FROM tryon_job WHERE id=:id"), {"id": job_id})
            .mappings()
            .one(),
        )

    @router.get("/v1/tryon/jobs/{job_id}/result")
    def result(
        job_id: UUID,
        db: Db,
        identity: Identity,
        storage: Annotated[object, Depends(storage_dependency)],
        export: bool = False,
    ):
        """Authenticated, owner-only, retention-bounded retrieval; bytes are never a public URL."""
        uid = user(db, identity)
        schema(db)
        row = job(db, uid, job_id)
        res = (
            db.execute(
                text("""SELECT * FROM tryon_result WHERE job_id=:id AND state='stored'
              AND expires_at>clock_timestamp()"""),
                {"id": job_id},
            )
            .mappings()
            .first()
        )
        if row["state"] == "expired":
            # Returned, not raised: raising rolls back the privacy expiry just performed.
            return JSONResponse(
                status_code=410,
                content={"code": "HTTP_410", "message": "tryon_result_unavailable"},
                headers={"Cache-Control": "no-store, private", "Vary": "Authorization"},
            )
        if row["state"] != "completed" or res is None:
            raise HTTPException(
                410 if row["state"] == "expired" else 409, "tryon_result_unavailable"
            )
        try:
            content = storage.get(res["object_key"])
        except (StorageError, KeyError):
            raise HTTPException(503, "tryon_result_storage_unavailable") from None
        if hashlib.sha256(content).hexdigest() != res["stored_sha256"]:
            raise HTTPException(503, "tryon_result_integrity_failed")
        audit(db, uid, "tryon.result_read", job_id)
        headers = {
            "Cache-Control": "no-store, private",
            "Vary": "Authorization",
            "X-GLAM-Label": "ai-generated-preview",
            "X-Content-Type-Options": "nosniff",
            "Content-Disposition": 'inline; filename="glam-preview.png"',
        }
        if res["synthetic_test"]:
            headers["X-GLAM-Synthetic-Test"] = "true"
        return Response(
            stamp(content) if export else content, media_type="image/png", headers=headers
        )

    return router


def retry_safe(operation, tries=3):
    """Retry only idempotent reads/writes that report themselves retryable."""
    for attempt in range(tries):
        try:
            return operation()
        except StorageError as error:
            if not error.retryable or attempt == tries - 1:
                raise
            time.sleep(BACKOFF * (2**attempt))


def cost_event(db, row, attempt, outcome, units, captured, cost=None, currency=None):
    db.execute(
        text("""INSERT INTO generation_cost_event(id,job_id,attempt_id,provider,outcome,
          billed_cost_micros,currency,credit_units,credits_captured,synthetic_test)
          VALUES(:id,:j,:a,:p,:o,:c,:cur,:u,:cap,:syn) ON CONFLICT(job_id,attempt_id) DO NOTHING"""),
        {
            "id": uuid4(),
            "j": row["id"],
            "a": attempt,
            "p": row["provider"],
            "o": outcome,
            "c": cost,
            "cur": currency,
            "u": units,
            "cap": captured,
            "syn": row["provider"] == "deterministic_test",
        },
    )


def purge_results(engine, storage) -> bool:
    """Erase result objects that are pending deletion, past retention, or whose job ended."""
    with Session(engine) as db, db.begin():
        row = (
            db.execute(
                text("""SELECT r.* FROM tryon_result r JOIN tryon_job j ON j.id=r.job_id
              WHERE r.state<>'deleted' AND r.next_purge_at<=clock_timestamp()
              AND (r.state='deletion_pending' OR r.expires_at<=clock_timestamp()
                   OR j.state<>'completed')
              ORDER BY r.created_at,r.id LIMIT 1 FOR UPDATE OF r SKIP LOCKED""")
            )
            .mappings()
            .first()
        )
        if row is None:
            return False
        try:
            storage.delete(row["object_key"])
        except StorageError:
            db.execute(
                text("""UPDATE tryon_result SET state='deletion_pending',
                  purge_attempts=purge_attempts+1,next_purge_at=clock_timestamp()+
                  least(3600,power(2,least(purge_attempts+1,11)))*interval '1 second'
                  WHERE id=:id"""),
                {"id": row["id"]},
            )
            return True
        db.execute(
            text(
                "UPDATE tryon_result SET state='deleted',deleted_at=clock_timestamp() WHERE id=:id"
            ),
            {"id": row["id"]},
        )
        return True


def expire_owner(db, uid):
    """Eager privacy sweep used by the consent-withdrawal worker (owner row already locked)."""
    for row in (
        db.execute(
            text(
                "SELECT * FROM tryon_job WHERE owner_id=:u AND state IN ('queued','running','completed')"
            ),
            {"u": uid},
        )
        .mappings()
        .all()
    ):
        if not live(db, row):
            expire(db, dict(row))


def units_of(db, row):
    return db.scalar(
        text("SELECT units FROM credit_reservation WHERE id=:r"),
        {"r": row["credit_reservation_id"]},
    )


def locked(db, uid, job_id):
    db.execute(text("SELECT id FROM app_user WHERE id=:u FOR UPDATE"), {"u": uid})
    return (
        db.execute(text("SELECT * FROM tryon_job WHERE id=:id FOR UPDATE"), {"id": job_id})
        .mappings()
        .first()
    )


def current(row, attempt):
    return row is not None and row["state"] == "running" and row["attempt_id"] == attempt


def worker_audit(db, uid, action, job_id):
    db.execute(
        text("INSERT INTO audit_event(id,actor_id,action,resource_id) VALUES(:id,:u,:a,:r)"),
        {"id": uuid4(), "u": uid, "a": action, "r": job_id},
    )


def conclude(
    engine, row, attempt, state, error, outcome, *, cost=None, currency=None, captured=False
):
    """Definite end of an attempt: failure releases credits; a late return cannot overwrite."""
    with Session(engine) as db, db.begin():
        now = locked(db, row["owner_id"], row["id"])
        if now is None:
            return
        cost_event(db, now, attempt, outcome, units_of(db, now), captured, cost, currency)
        if current(now, attempt):
            finalize(db, dict(now), state, error)
            worker_audit(db, row["owner_id"], f"tryon.{state}", row["id"])


def dispatch(engine, row, attempt, provider, store):
    uid, job_id = row["owner_id"], row["id"]
    try:
        source = bytes(retry_safe(lambda: store.get(row["source_key"])))
        if hashlib.sha256(source).hexdigest() != row["source_sha256"]:
            raise ValueError("source mismatch")
        garments = []
        for g in row["garment_refs"]:
            item = dict(g)
            if g.get("media_id"):
                with Session(engine) as db:
                    key = db.scalar(
                        text(
                            "SELECT object_key FROM private_media WHERE id=:m AND owner_id=:u AND state='ready'"
                        ),
                        {"m": g["media_id"], "u": uid},
                    )
                item["image"] = bytes(retry_safe(lambda k=key: store.get(k))) if key else None
            garments.append(item)
    except Exception:
        return conclude(
            engine, row, attempt, "failed", "tryon_source_unavailable", "provider_failure"
        )
    with Session(engine) as db, db.begin():
        now = locked(db, uid, job_id)
        if not current(now, attempt):
            return
        if not live(db, now):
            expire(db, dict(now))
            return
    # Locks released. The attempt is durable before the first external call.
    try:
        provider_job = provider.submit(source, garments, row["scope"], consent=True)
    except ProviderRejected as rejected:
        outcome = "moderation_reject" if rejected.moderation else "provider_failure"
        return conclude(engine, row, attempt, "failed", "tryon_provider_rejected", outcome, cost=0)
    except Exception:  # ambiguous: the provider may have started billable work
        return conclude(engine, row, attempt, "failed", "tryon_outcome_ambiguous", "ambiguous")
    with Session(engine) as db, db.begin():
        db.execute(
            text(
                "UPDATE tryon_job SET provider_job_id=:p WHERE id=:id AND attempt_id=:a AND state='running'"
            ),
            {"p": provider_job, "id": job_id, "a": attempt},
        )
    deadline = time.monotonic() + provider_timeout()
    output, failures = None, 0
    while output is None:
        if time.monotonic() >= deadline:
            return conclude(engine, row, attempt, "failed", "tryon_provider_timeout", "ambiguous")
        try:
            output = provider.poll(provider_job)
        except ProviderFailed as failed:
            return conclude(
                engine,
                row,
                attempt,
                "failed",
                "tryon_provider_failed",
                "provider_failure",
                cost=failed.billed_cost_micros,
                currency=failed.currency,
            )
        except (ProviderAmbiguous, Exception):
            failures += 1  # polling is a read: safe to retry a few times
            if failures >= 3:
                return conclude(
                    engine, row, attempt, "failed", "tryon_outcome_ambiguous", "ambiguous"
                )
        if output is None:
            time.sleep(min(POLL_INTERVAL, max(0.0, deadline - time.monotonic())))
    try:
        png, width, height = validate_output(output.image)
    except ValueError:
        return conclude(
            engine,
            row,
            attempt,
            "failed",
            "tryon_result_invalid",
            "provider_failure",
            cost=output.billed_cost_micros,
            currency=output.currency,
        )
    result_id = uuid4()
    key = f"{uid}/{result_id}.png"
    with Session(engine) as db, db.begin():  # phase A: durable pending marker before the write
        now = locked(db, uid, job_id)
        if not current(now, attempt) or not live(db, now):
            if now is not None and current(now, attempt):
                expire(db, dict(now))
            cost_event(
                db,
                row,
                attempt,
                "success",
                units_of(db, row),
                False,
                output.billed_cost_micros,
                output.currency,
            )
            return
        db.execute(
            text("""INSERT INTO tryon_result(id,job_id,owner_id,object_key,stored_sha256,stored_size,
              width,height,label_version,synthetic_test,state,expires_at,next_purge_at)
              VALUES(:id,:j,:u,:k,:h,:s,:w,:ht,:l,:syn,'deletion_pending',:exp,
                clock_timestamp()+interval '10 minutes')"""),
            {
                "id": result_id,
                "j": job_id,
                "u": uid,
                "k": key,
                "h": hashlib.sha256(png).hexdigest(),
                "s": len(png),
                "w": width,
                "ht": height,
                "l": LABEL_VERSION,
                "syn": provider.synthetic,
                "exp": now["expires_at"],
            },
        )
    try:
        retry_safe(lambda: store.put(key, png))
    except StorageError:
        return conclude(
            engine,
            row,
            attempt,
            "failed",
            "tryon_result_storage_failed",
            "success",
            cost=output.billed_cost_micros,
            currency=output.currency,
        )
    with Session(engine) as db, db.begin():  # phase B: validated, stored -> capture, atomically
        now = locked(db, uid, job_id)
        stored = db.scalar(
            text("""UPDATE tryon_result SET state='stored' WHERE id=:id AND state='deletion_pending'
              AND next_purge_at>clock_timestamp() RETURNING id"""),
            {"id": result_id},
        )
        if not current(now, attempt) or not live(db, now) or stored is None:
            if now is not None and current(now, attempt):
                expire(db, dict(now))
            db.execute(
                text(
                    "UPDATE tryon_result SET state='deletion_pending',next_purge_at=clock_timestamp() WHERE id=:id AND state<>'deleted'"
                ),
                {"id": result_id},
            )
            cost_event(
                db,
                row,
                attempt,
                "success",
                units_of(db, row),
                False,
                output.billed_cost_micros,
                output.currency,
            )
            return
        credits.finish(db, uid, now["credit_reservation_id"], capture=True)
        db.execute(
            text(
                "UPDATE tryon_job SET state='completed',finished_at=clock_timestamp() WHERE id=:id"
            ),
            {"id": job_id},
        )
        cost_event(
            db,
            now,
            attempt,
            "success",
            units_of(db, now),
            True,
            output.billed_cost_micros,
            output.currency,
        )
        worker_audit(db, uid, "tryon.completed", job_id)


def process_one(engine, provider=None, storage=None):
    """One privacy sweep or claim. A crashed/ambiguous attempt is never redispatched."""
    try:
        store = storage or configured_storage()
    except StorageError:
        store = None
    if store is not None:
        try:
            if purge_results(engine, store):
                return True
        except Exception:
            pass
    try:
        provider = provider or tryon_provider()
        settings()
        enabled = True
    except HTTPException:
        enabled = False
    stale = provider_timeout() + 60
    with Session(engine) as db, db.begin():
        if db.scalar(text("SELECT to_regclass('public.tryon_job')")) is None:
            return False
        schema(db)
        due = f"""j.state IN ('queued','running','completed') AND
          (NOT coalesce(({LIVE_JOB_SQL}),false) OR
           (j.state='running' AND j.attempted_at<clock_timestamp()-make_interval(secs=>:stale))
           OR (:enabled AND j.state='queued'))"""
        args = {"stale": stale, "enabled": enabled}
        uid = db.scalar(
            text(f"""SELECT u.id FROM app_user u WHERE EXISTS(SELECT 1 FROM tryon_job j
              WHERE j.owner_id=u.id AND ({due})) ORDER BY u.id LIMIT 1 FOR UPDATE OF u SKIP LOCKED"""),
            args,
        )
        if uid is None:
            return False
        row = (
            db.execute(
                text(f"""SELECT j.* FROM tryon_job j WHERE j.owner_id=:u AND ({due})
                  ORDER BY j.created_at,j.id LIMIT 1 FOR UPDATE OF j SKIP LOCKED"""),
                {"u": uid, **args},
            )
            .mappings()
            .first()
        )
        if row is None:
            return False
        row = dict(row)
        if not live(db, row):
            expire(db, row)
            return True
        if row["state"] == "running":
            cost_event(db, row, row["attempt_id"], "ambiguous", units_of(db, row), False)
            finalize(db, row, "failed", "tryon_processing_interrupted")
            return True
        attempt = uuid4()
        db.execute(
            text(
                "UPDATE tryon_job SET state='running',attempt_id=:a,attempted_at=clock_timestamp() WHERE id=:id"
            ),
            {"a": attempt, "id": row["id"]},
        )
        source = db.execute(
            text("SELECT object_key,stored_sha256 FROM private_media WHERE id=:id"),
            {"id": row["media_id"]},
        ).one()
        row["source_key"], row["source_sha256"] = source.object_key, source.stored_sha256
    if store is None:
        return conclude(
            engine, row, attempt, "failed", "tryon_source_unavailable", "provider_failure"
        )
    dispatch(engine, row, attempt, provider, store)
    return True
