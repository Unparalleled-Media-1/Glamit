"""Durable cosmetic-analysis jobs. Dispatch is default-off; no automatic billable retry."""

import hashlib
import json
import os
import re
from datetime import datetime, timedelta
from typing import Annotated, Literal
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, Header, HTTPException, Request, Response
from fastapi.responses import JSONResponse
from fastapi.routing import APIRoute
from pydantic import BaseModel, ConfigDict, Field, field_validator
from sqlalchemy import text
from sqlalchemy.orm import Session

from glam_api.auth import Principal, get_principal
from glam_api.contracts import PolicyRead
from glam_api.db import get_session
from glam_api.integrations.private_storage import configured_storage
from glam_api.integrations.providers import OpenAI, ProviderAnalysis
from glam_api.integrations.runtime import IntegrationError, ProviderConfig
from glam_api.private_media import LIVE_SQL, ensure_schema, owned, require_live

PURPOSE = "cosmetic_photo_analysis"
GOALS = Literal[
    "Understand my features",
    "Discover my colors",
    "Makeup techniques",
    "Hair & grooming",
    "A practical routine",
]
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
  AND (j.state='completed' OR j.session_id IS NULL OR EXISTS(SELECT 1 FROM auth.sessions s
    JOIN app_user u ON u.id=j.owner_id AND u.subject=s.user_id::text
    WHERE s.id=j.session_id AND (s.not_after IS NULL OR s.not_after>clock_timestamp())))
"""


class JobRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    media_id: UUID
    policy_id: UUID
    consent: Literal[True]
    goals: list[GOALS] = Field(min_length=1, max_length=5)

    @field_validator("consent", mode="before")
    @classmethod
    def explicit(cls, value):
        if value is not True:
            raise ValueError("Explicit consent required")
        return value

    @field_validator("goals")
    @classmethod
    def unique(cls, values):
        if len(set(values)) != len(values):
            raise ValueError("Duplicate goals")
        return values


class AnalysisJobRead(BaseModel):
    id: UUID
    media_id: UUID
    state: Literal["queued", "running", "completed", "failed", "cancelled", "expired"]
    created_at: datetime
    expires_at: datetime
    finished_at: datetime | None
    error_code: str | None


class AnalysisReportRead(BaseModel):
    id: UUID
    provider: Literal["openai"] = "openai"
    model: str
    completed_at: datetime
    observations: ProviderAnalysis


class AnalysisRoute(APIRoute):
    def get_route_handler(self):
        handler = super().get_route_handler()

        async def bounded(request: Request):
            if request.method == "POST":
                body = bytearray()
                async for chunk in request.stream():
                    if len(body) + len(chunk) > 4096:
                        raise HTTPException(413, "analysis_request_too_large")
                    body.extend(chunk)
                request._body = bytes(body)
            return await handler(request)

        return bounded


def analysis_provider():
    return OpenAI(ProviderConfig.from_environment())


def dispatch_settings(provider):
    if os.environ.get("GLAM_ANALYSIS_ENABLED") != "true":
        raise HTTPException(503, "analysis_not_enabled")
    if os.environ.get("GLAM_ANALYSIS_PROVIDER_DATA_APPROVED") != "true":
        raise HTTPException(503, "analysis_provider_data_review_required")
    try:
        ttl = int(os.environ.get("GLAM_ANALYSIS_RETENTION_SECONDS", ""))
        limit = int(os.environ.get("GLAM_ANALYSIS_MAX_REQUESTS_PER_HOUR", ""))
        if not 60 <= ttl <= 30 * 86400 or not 1 <= limit <= 100:
            raise ValueError
        provider.config.secret("OPENAI_API_KEY")
        if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9._-]{0,127}", provider.config.openai_model):
            raise ValueError
    except (ValueError, RuntimeError, IntegrationError):
        raise HTTPException(503, "qualified_analysis_configuration_required") from None
    return ttl, limit


def schema(db):
    ensure_schema(db)
    if db.scalar(text("SELECT to_regclass('public.analysis_job')")) is None:
        raise HTTPException(503, "analysis_migration_required")
    valid = db.scalar(
        text("""
      SELECT NOT row_security_active('public.analysis_job')
        AND (SELECT relrowsecurity FROM pg_class WHERE oid='public.analysis_job'::regclass)
        AND has_table_privilege('public.analysis_job','SELECT')
        AND has_table_privilege('public.analysis_job','INSERT')
        AND has_table_privilege('public.analysis_job','UPDATE')
        AND NOT EXISTS(SELECT 1 FROM (VALUES('anon'),('authenticated')) r(name)
          CROSS JOIN (VALUES('SELECT'),('INSERT'),('UPDATE'),('DELETE')) p(priv)
          WHERE has_table_privilege(r.name,'public.analysis_job',p.priv))
    """)
    )
    if not valid:
        raise HTTPException(503, "analysis_runtime_permissions_required")


def current_policy(db):
    row = (
        db.execute(
            text("""
      SELECT id,purpose,version,content FROM policy_document WHERE purpose=:p
      AND approved_at<=clock_timestamp() ORDER BY approved_at DESC,id DESC LIMIT 1
    """),
            {"p": PURPOSE},
        )
        .mappings()
        .first()
    )
    if row is None:
        raise HTTPException(503, "approved_analysis_policy_required")
    return row


def grant(db, uid, policy):
    if current_policy(db)["id"] != policy:
        raise HTTPException(403, "current_analysis_consent_required")
    row = db.execute(
        text("""
      SELECT c.sequence,c.policy_id,c.action FROM consent_event c JOIN policy_document p
      ON p.id=c.policy_id WHERE c.user_id=:u AND p.purpose=:p ORDER BY c.sequence DESC LIMIT 1
    """),
        {"u": uid, "p": PURPOSE},
    ).first()
    if row is None or row.policy_id != policy or row.action != "granted":
        raise HTTPException(403, "current_analysis_consent_required")
    return row.sequence


def live(db, row):
    return (
        db.scalar(
            text(f"SELECT coalesce(({LIVE_JOB_SQL}),false) FROM analysis_job j WHERE j.id=:id"),
            {"id": row["id"]},
        )
        is True
    )


def expire(db, job_id):
    from glam_api.analysis_privacy import redact_analysis_dependents

    redact_analysis_dependents(db, job_id)
    db.execute(
        text("""UPDATE analysis_job SET state='expired',result=NULL,
      finished_at=coalesce(finished_at,clock_timestamp()),error_code='analysis_privacy_scope_expired'
      WHERE id=:id"""),
        {"id": job_id},
    )


def job(db, uid, job_id):
    row = (
        db.execute(
            text("SELECT * FROM analysis_job WHERE id=:id AND owner_id=:u FOR UPDATE"),
            {"id": job_id, "u": uid},
        )
        .mappings()
        .first()
    )
    if row is None:
        raise HTTPException(404, "analysis_job_not_found")
    if not live(db, row):
        expire(db, job_id)
        row = (
            db.execute(text("SELECT * FROM analysis_job WHERE id=:id"), {"id": job_id})
            .mappings()
            .one()
        )
    return row


def read(row):
    return AnalysisJobRead.model_validate(dict(row))


def build_analysis_router(user, audit):
    router = APIRouter(route_class=AnalysisRoute)

    @router.get("/v1/analysis/policy", response_model=PolicyRead)
    def policy(db: Db, identity: Identity, response: Response):
        response.headers["Cache-Control"] = "no-store, private"
        user(db, identity)
        return dict(current_policy(db))

    @router.post("/v1/analysis/jobs", response_model=AnalysisJobRead, status_code=202)
    def submit(
        body: JobRequest,
        key: Key,
        db: Db,
        identity: Identity,
        response: Response,
        provider: Annotated[OpenAI, Depends(analysis_provider)],
    ):
        response.headers["Cache-Control"] = "no-store, private"
        ttl, limit = dispatch_settings(provider)
        uid = user(db, identity)
        schema(db)
        media = owned(db, uid, body.media_id)
        require_live(db, body.media_id)
        if media["state"] != "ready":
            raise HTTPException(409, "analysis_media_not_ready")
        consent = grant(db, uid, body.policy_id)
        digest = hashlib.sha256(
            json.dumps(body.model_dump(mode="json"), sort_keys=True).encode()
        ).hexdigest()
        previous = (
            db.execute(
                text("SELECT * FROM analysis_job WHERE owner_id=:u AND request_key=:k"),
                {"u": uid, "k": key},
            )
            .mappings()
            .first()
        )
        if previous:
            if previous["request_hash"] != digest:
                raise HTTPException(409, "analysis_idempotency_conflict")
            return read(job(db, uid, previous["id"]))
        count = db.scalar(
            text(
                "SELECT count(*) FROM analysis_job WHERE owner_id=:u AND "
                "created_at>clock_timestamp()-interval '1 hour'"
            ),
            {"u": uid},
        )
        if count >= limit:
            raise HTTPException(429, "analysis_request_limit_reached")
        created_at = db.scalar(text("SELECT clock_timestamp()"))
        expires_at = min(media["expires_at"], created_at + timedelta(seconds=ttl))
        if expires_at <= created_at:
            raise HTTPException(410, "analysis_media_expired")
        row = (
            db.execute(
                text("""
          INSERT INTO analysis_job(id,owner_id,media_id,request_key,request_hash,policy_id,
            consent_sequence,session_id,goals,model,created_at,expires_at)
          VALUES(:id,:u,:m,:k,:hash,:p,:c,:session,CAST(:goals AS jsonb),:model,
            :created,:expires) RETURNING *
        """),
                {
                    "id": uuid4(),
                    "u": uid,
                    "m": body.media_id,
                    "k": key,
                    "hash": digest,
                    "p": body.policy_id,
                    "c": consent,
                    "session": identity.session_id,
                    "goals": json.dumps(body.goals),
                    "model": provider.config.openai_model,
                    "created": created_at,
                    "expires": expires_at,
                },
            )
            .mappings()
            .one()
        )
        audit(db, uid, "analysis.queued", row["id"])
        return read(row)

    @router.get("/v1/analysis/jobs", response_model=list[AnalysisJobRead])
    def history(db: Db, identity: Identity, response: Response):
        response.headers["Cache-Control"] = "no-store, private"
        uid = user(db, identity)
        schema(db)
        ids = db.scalars(
            text(
                "SELECT id FROM analysis_job WHERE owner_id=:u ORDER BY created_at "
                "DESC,id DESC LIMIT 100"
            ),
            {"u": uid},
        ).all()
        return [read(job(db, uid, identifier)) for identifier in ids]

    @router.get("/v1/analysis/jobs/{job_id}", response_model=AnalysisJobRead)
    def status(job_id: UUID, db: Db, identity: Identity, response: Response):
        response.headers["Cache-Control"] = "no-store, private"
        uid = user(db, identity)
        schema(db)
        return read(job(db, uid, job_id))

    @router.delete("/v1/analysis/jobs/{job_id}", response_model=AnalysisJobRead)
    def cancel(job_id: UUID, db: Db, identity: Identity, response: Response):
        response.headers["Cache-Control"] = "no-store, private"
        uid = user(db, identity)
        schema(db)
        row = job(db, uid, job_id)
        if row["state"] != "expired":
            from glam_api.analysis_privacy import redact_analysis_dependents

            redact_analysis_dependents(db, job_id)
            row = (
                db.execute(
                    text(
                        "UPDATE analysis_job SET "
                        "state='cancelled',result=NULL,finished_at=clock_timestamp(),"
                        "error_code=NULL WHERE id=:id RETURNING *"
                    ),
                    {"id": job_id},
                )
                .mappings()
                .one()
            )
            audit(db, uid, "analysis.cancelled", job_id)
        return read(row)

    @router.get("/v1/analysis/jobs/{job_id}/report", response_model=AnalysisReportRead)
    def report(job_id: UUID, db: Db, identity: Identity, response: Response):
        response.headers["Cache-Control"] = "no-store, private"
        uid = user(db, identity)
        schema(db)
        row = job(db, uid, job_id)
        if row["state"] != "completed":
            if row["state"] == "expired":
                return JSONResponse(
                    status_code=410,
                    content={"code": "HTTP_410", "message": "analysis_report_unavailable"},
                    headers={"Cache-Control": "no-store, private", "Vary": "Authorization"},
                )
            raise HTTPException(
                410 if row["state"] == "expired" else 409, "analysis_report_unavailable"
            )
        try:
            observations = ProviderAnalysis.model_validate(row["result"])
        except ValueError:
            raise HTTPException(503, "analysis_report_invalid") from None
        return AnalysisReportRead(
            id=row["id"],
            model=row["model"],
            completed_at=row["finished_at"],
            observations=observations,
        )

    return router


def process_one(engine, provider=None, storage=None):
    """One claim or privacy sweep. A crashed/ambiguous attempt is never redispatched."""
    provider = provider or analysis_provider()
    try:
        dispatch_settings(provider)
        dispatch = True
    except HTTPException:
        dispatch = False
    with Session(engine) as db, db.begin():
        if db.scalar(text("SELECT to_regclass('public.analysis_job')")) is None:
            return False
        schema(db)
        due = f"""j.state IN ('queued','running','completed') AND
          (NOT coalesce(({LIVE_JOB_SQL}),false) OR
           (j.state='running' AND j.attempted_at<clock_timestamp()-interval '120 seconds')
           OR (:dispatch AND j.state='queued'))"""
        uid = db.scalar(
            text(
                f"SELECT u.id FROM app_user u WHERE EXISTS(SELECT 1 FROM analysis_job "
                f"j WHERE j.owner_id=u.id AND ({due})) ORDER BY u.id LIMIT 1 FOR "
                f"UPDATE OF u SKIP LOCKED"
            ),
            {"dispatch": dispatch},
        )
        if uid is None:
            return False
        row = (
            db.execute(
                text(
                    f"SELECT j.* FROM analysis_job j WHERE j.owner_id=:u AND ({due}) "
                    f"ORDER BY j.created_at,j.id LIMIT 1 FOR UPDATE OF j SKIP LOCKED"
                ),
                {"u": uid, "dispatch": dispatch},
            )
            .mappings()
            .first()
        )
        if row is None:
            return False
        row = dict(row)
        if not live(db, row):
            expire(db, row["id"])
            return True
        if row["state"] == "running":
            db.execute(
                text(
                    "UPDATE analysis_job SET "
                    "state='failed',error_code='analysis_processing_interrupted',"
                    "finished_at=clock_timestamp() WHERE id=:id"
                ),
                {"id": row["id"]},
            )
            return True
        attempt = uuid4()
        db.execute(
            text(
                "UPDATE analysis_job SET "
                "state='running',attempt_id=:a,attempted_at=clock_timestamp() WHERE id=:id"
            ),
            {"a": attempt, "id": row["id"]},
        )
        source = (
            db.execute(
                text("SELECT object_key,stored_sha256,stored_size FROM private_media WHERE id=:id"),
                {"id": row["media_id"]},
            )
            .mappings()
            .one()
        )
        source = dict(source)
    # All database locks are released; the attempt is durable before any external call.
    result, error = None, None
    try:
        if provider.config.openai_model != row["model"]:
            raise ValueError("Pinned model changed")
        store = storage or configured_storage()
        store.check_private_bucket()
        image = store.get(source["object_key"])
        if (
            len(image) != source["stored_size"]
            or hashlib.sha256(image).hexdigest() != source["stored_sha256"]
        ):
            raise ValueError("Private image mismatch")
        dispatch_settings(provider)
        with Session(engine) as db, db.begin():
            db.execute(text("SELECT id FROM app_user WHERE id=:u FOR UPDATE"), {"u": uid})
            current = (
                db.execute(
                    text("SELECT * FROM analysis_job WHERE id=:id FOR UPDATE"), {"id": row["id"]}
                )
                .mappings()
                .one()
            )
            if current["state"] != "running" or current["attempt_id"] != attempt:
                return True
            if not live(db, current):
                expire(db, row["id"])
                return True
        result = ProviderAnalysis.model_validate(
            provider.analyze(image, "image/png", row["goals"], consent=True)
        ).model_dump(mode="json")
    except Exception:
        # No provider exception, bytes or inferred features enter logs/audit metadata.
        error = "analysis_provider_or_storage_failed"
    with Session(engine) as db, db.begin():
        db.execute(text("SELECT id FROM app_user WHERE id=:u FOR UPDATE"), {"u": uid})
        current = (
            db.execute(
                text("SELECT * FROM analysis_job WHERE id=:id FOR UPDATE"), {"id": row["id"]}
            )
            .mappings()
            .first()
        )
        if current is None or current["state"] != "running" or current["attempt_id"] != attempt:
            return True
        if not live(db, current):
            expire(db, row["id"])
            return True
        db.execute(
            text(
                "UPDATE analysis_job SET state=:state,result=CAST(:result AS "
                "jsonb),error_code=:error,finished_at=clock_timestamp() WHERE id=:id"
            ),
            {
                "id": row["id"],
                "state": "failed" if error else "completed",
                "result": json.dumps(result) if result is not None else None,
                "error": error,
            },
        )
    return True
