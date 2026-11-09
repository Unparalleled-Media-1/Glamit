"""Private corrected observations selected into the existing canonical Style Passport."""

import hashlib
import json
from datetime import datetime
from typing import Annotated, Literal
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse
from fastapi.routing import APIRoute
from pydantic import BaseModel, ConfigDict, Field, field_validator
from sqlalchemy import text
from sqlalchemy.orm import Session

from glam_api import analysis_jobs as jobs
from glam_api.contracts import PolicyRead
from glam_api.db import get_engine
from glam_api.integrations.private_storage import configured_storage
from glam_api.integrations.providers import Direction, ProviderAnalysis
from glam_api.integrations.runtime import State

Key = Literal["face-shape", "eyes", "brows", "lips", "undertone"]
SUPABASE_ISSUER = "https://bkkmsbxrxkqaveymcrgi.supabase.co/auth/v1"

Engine = Annotated[object, Depends(get_engine)]


class CorrectionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    expected_revision: int = Field(ge=0, le=2147483646, strict=True)
    corrections: dict[Key, str]

    @field_validator("corrections")
    @classmethod
    def bounded(cls, value):
        if len(value) > 5 or any(not v.strip() or len(v) > 240 for v in value.values()):
            raise ValueError("Corrections must be nonblank supported values up to240 characters")
        return {k: v.strip() for k, v in value.items()}


class EffectiveFinding(BaseModel):
    key: Key
    ai_estimate: str | None
    ai_certainty: Literal["supported", "tentative", "unavailable"]
    uncertainty: str
    user_correction: str | None
    display_value: str | None
    source: Literal["ai", "user"]


class CorrectedReportRead(BaseModel):
    id: UUID
    media_id: UUID
    subject: str
    provider: Literal["openai"] = "openai"
    model: str
    completed_at: datetime
    expires_at: datetime
    correction_revision: int
    corrections: dict[Key, str]
    findings: list[EffectiveFinding]
    directions: list[Direction]


class PassportRead(BaseModel):
    id: UUID
    profile_id: UUID
    revision: int
    analysis_state: Literal["empty", "ready", "expired"]
    analysis: CorrectedReportRead | None


class PassportSelection(BaseModel):
    model_config = ConfigDict(extra="forbid")
    job_id: UUID
    expected_passport_revision: int = Field(ge=1, le=2147483646, strict=True)
    expected_correction_revision: int = Field(ge=0, le=2147483646, strict=True)


class PurposePermission(BaseModel):
    policy: PolicyRead
    granted: bool


class AnalysisPermissions(BaseModel):
    storage: PurposePermission
    analysis: PurposePermission
    eligible: bool


class AnalysisJourneyStatus(BaseModel):
    state: Literal["NOT CONFIGURED", "DEGRADED", "CONNECTED"]
    scope: Literal["cosmetic_analysis_and_passport"] = "cosmetic_analysis_and_passport"
    code: str


class PassportRoute(APIRoute):
    def get_route_handler(self):
        handler = super().get_route_handler()

        async def bounded(request: Request):
            if request.method in {"POST", "PUT"}:
                body = bytearray()
                async for part in request.stream():
                    if len(body) + len(part) > 16384:
                        raise HTTPException(413, "analysis_request_too_large")
                    body.extend(part)
                request._body = bytes(body)
            response = await handler(request)
            response.headers["Cache-Control"] = "no-store, private"
            response.headers["Vary"] = "Authorization"
            return response

        return bounded


def ensure_schema(db):
    jobs.schema(db)
    for table, privileges in [
        ("analysis_correction", ["SELECT", "INSERT", "UPDATE"]),
        ("style_passport_analysis", ["SELECT", "INSERT", "UPDATE", "DELETE"]),
    ]:
        if db.scalar(text("SELECT to_regclass(:t)"), {"t": "public." + table}) is None:
            raise HTTPException(503, "analysis_passport_migration_required")
        safe = db.scalar(
            text(
                """
SELECT NOT row_security_active(:t) AND (SELECT relrowsecurity FROM pg_class WHERE
oid=to_regclass(:t)) AND NOT EXISTS(SELECT 1 FROM (VALUES('anon'),('authenticated'))
r(name) CROSS JOIN (VALUES('SELECT'),('INSERT'),('UPDATE'),('DELETE')) p(priv) WHERE
has_table_privilege(r.name,:t,p.priv))
"""
            ),
            {"t": "public." + table},
        )
        if not safe or any(
            not db.scalar(
                text("SELECT has_table_privilege(:t,:p)"), {"t": "public." + table, "p": privilege}
            )
            for privilege in privileges
        ):
            raise HTTPException(503, "analysis_passport_runtime_permissions_required")

    for table in ["profiles", "style_passports"]:
        if db.scalar(text("SELECT row_security_active(:t)"), {"t": "public." + table}):
            raise HTTPException(503, "analysis_passport_runtime_permissions_required")
    for table, column, privilege in [
        ("profiles", "id", "SELECT"),
        ("style_passports", "id", "SELECT"),
        ("style_passports", "profile_id", "SELECT"),
        ("style_passports", "revision", "SELECT"),
        ("style_passports", "profile_id", "INSERT"),
        ("style_passports", "revision", "UPDATE"),
        ("style_passports", "updated_at", "UPDATE"),
    ]:
        if not db.scalar(
            text("SELECT has_column_privilege(:t,:c,:p)"),
            {"t": "public." + table, "c": column, "p": privilege},
        ):
            raise HTTPException(503, "analysis_passport_runtime_permissions_required")


def corrected(db, row, subject, revision=None):
    if row["state"] != "completed":
        raise HTTPException(
            410 if row["state"] == "expired" else 409, "analysis_report_unavailable"
        )
    try:
        original = ProviderAnalysis.model_validate(row["result"])
    except ValueError:
        raise HTTPException(503, "analysis_report_invalid") from None
    correction = None
    if revision != 0:
        correction = (
            db.execute(
                text(
                    """
SELECT * FROM analysis_correction WHERE job_id=:id AND owner_id=:u AND (CAST(:revision
AS integer) IS NULL OR revision=CAST(:revision AS integer)) ORDER BY revision DESC LIMIT
1
"""
                ),
                {"id": row["id"], "u": row["owner_id"], "revision": revision},
            )
            .mappings()
            .first()
        )
    if (revision and correction is None) or (correction and correction["corrections"] is None):
        raise HTTPException(410, "analysis_correction_unavailable")
    try:
        values = CorrectionRequest(
            expected_revision=0, corrections=correction["corrections"] if correction else {}
        ).corrections
    except ValueError:
        raise HTTPException(503, "analysis_correction_invalid") from None
    fields = [
        EffectiveFinding(
            key=f.key,
            ai_estimate=f.estimate,
            ai_certainty=f.certainty,
            uncertainty=f.uncertainty,
            user_correction=values.get(f.key),
            display_value=values.get(f.key, f.estimate),
            source="user" if f.key in values else "ai",
        )
        for f in original.findings
    ]
    return CorrectedReportRead(
        id=row["id"],
        media_id=row["media_id"],
        subject=subject,
        model=row["model"],
        completed_at=row["finished_at"],
        expires_at=row["expires_at"],
        correction_revision=correction["revision"] if correction else 0,
        corrections=values,
        findings=fields,
        directions=original.directions,
    )


def canonical_passport(db, uid):
    profile = db.scalar(
        text(
            """
SELECT p.id FROM profiles p JOIN app_user u ON u.subject=p.id::text AND u.issuer=:issuer
WHERE u.id=:u
"""
        ),
        {"issuer": SUPABASE_ISSUER, "u": uid},
    )
    if profile is None:
        raise HTTPException(409, "canonical_style_profile_required")
    db.execute(
        text(
            "INSERT INTO style_passports(profile_id) VALUES(:id) ON CONFLICT(profile_id) DO NOTHING"
        ),
        {"id": profile},
    )
    return (
        db.execute(
            text(
                "SELECT id,profile_id,revision FROM style_passports WHERE profile_id=:id FOR UPDATE"
            ),
            {"id": profile},
        )
        .mappings()
        .one()
    )


def passport_read(db, uid, subject):
    passport = canonical_passport(db, uid)
    link = (
        db.execute(
            text("SELECT * FROM style_passport_analysis WHERE passport_id=:id AND owner_id=:u"),
            {"id": passport["id"], "u": uid},
        )
        .mappings()
        .first()
    )
    state, analysis = "empty", None
    if link:
        row = jobs.job(db, uid, link["job_id"])
        if row["state"] == "completed":
            analysis = corrected(db, row, subject, link["correction_revision"])
            state = "ready"
        else:
            from glam_api.analysis_privacy import redact_analysis_dependents

            redact_analysis_dependents(db, link["job_id"])
            state = "expired"
            passport = canonical_passport(db, uid)
    return PassportRead(**dict(passport), analysis_state=state, analysis=analysis)


def build_passport_router(user, audit):
    router = APIRouter(route_class=PassportRoute)

    @router.get("/v1/analysis/permissions", response_model=AnalysisPermissions)
    def permissions(db: jobs.Db, identity: jobs.Identity):
        uid = user(db, identity)
        result = {}
        for name, purpose in [("storage", "private_photo_storage"), ("analysis", jobs.PURPOSE)]:
            policy = (
                db.execute(
                    text(
                        """
SELECT id,purpose,version,content FROM policy_document WHERE purpose=:p AND
approved_at<=clock_timestamp() ORDER BY approved_at DESC,id DESC LIMIT 1
"""
                    ),
                    {"p": purpose},
                )
                .mappings()
                .first()
            )
            if policy is None or len(policy["content"]) > 30000:
                raise HTTPException(503, "approved_analysis_permissions_required")
            consent = db.execute(
                text(
                    """
SELECT c.policy_id,c.action FROM consent_event c JOIN policy_document p ON
p.id=c.policy_id WHERE c.user_id=:u AND p.purpose=:p ORDER BY c.sequence DESC LIMIT 1
"""
                ),
                {"u": uid, "p": purpose},
            ).first()
            result[name] = PurposePermission(
                policy=dict(policy),
                granted=bool(
                    consent and consent.policy_id == policy["id"] and consent.action == "granted"
                ),
            )
        eligible = db.scalar(
            text(
                """
SELECT EXISTS(SELECT 1 FROM account_eligibility WHERE user_id=:u AND
age_band='eligible_adult' AND expires_at>clock_timestamp())
"""
            ),
            {"u": uid},
        )
        return AnalysisPermissions(**result, eligible=eligible)

    @router.get("/v1/analysis/status", response_model=AnalysisJourneyStatus)
    def status(
        engine: Engine,
        identity: jobs.Identity,
        provider: Annotated[jobs.OpenAI, Depends(jobs.analysis_provider)],
    ):
        with Session(engine) as db, db.begin():
            user(db, identity)
            try:
                ensure_schema(db)
                jobs.dispatch_settings(provider)
            except HTTPException as error:
                return AnalysisJourneyStatus(state="NOT CONFIGURED", code=error.detail)
        # Auth and schema checks commit before remote I/O; no owner locks span the probe.
        try:
            configured_storage().check_private_bucket()
        except Exception:
            return AnalysisJourneyStatus(
                state="NOT CONFIGURED", code="private_storage_not_configured"
            )
        health = provider.model_health()
        return AnalysisJourneyStatus(
            state="CONNECTED" if health.state == State.CONNECTED else "DEGRADED",
            code="authenticated_model_access"
            if health.state == State.CONNECTED
            else "analysis_provider_unavailable",
        )

    @router.get("/v1/analysis/jobs/{job_id}/corrected-report", response_model=CorrectedReportRead)
    def report(job_id: UUID, db: jobs.Db, identity: jobs.Identity):
        uid = user(db, identity)
        ensure_schema(db)
        row = jobs.job(db, uid, job_id)
        if row["state"] == "expired":
            return JSONResponse(status_code=410, content={"message": "analysis_report_unavailable"})
        return corrected(db, row, identity.subject)

    @router.post("/v1/analysis/jobs/{job_id}/corrections", response_model=CorrectedReportRead)
    def save_correction(
        job_id: UUID, body: CorrectionRequest, key: jobs.Key, db: jobs.Db, identity: jobs.Identity
    ):
        uid = user(db, identity)
        ensure_schema(db)
        row = jobs.job(db, uid, job_id)
        if row["state"] == "expired":
            return JSONResponse(status_code=410, content={"message": "analysis_report_unavailable"})
        current = corrected(db, row, identity.subject)
        payload = {"job_id": str(job_id), **body.model_dump(mode="json")}
        digest = hashlib.sha256(json.dumps(payload, sort_keys=True).encode()).hexdigest()
        previous = db.execute(
            text(
                "SELECT request_hash FROM analysis_correction WHERE owner_id=:u AND request_key=:k"
            ),
            {"u": uid, "k": key},
        ).first()
        if previous:
            if previous.request_hash != digest:
                raise HTTPException(409, "analysis_correction_idempotency_conflict")
            return current
        if current.correction_revision != body.expected_revision:
            raise HTTPException(409, "analysis_correction_revision_conflict")
        identifier = uuid4()
        db.execute(
            text(
                """
INSERT INTO
analysis_correction(id,job_id,owner_id,revision,request_key,request_hash,corrections)
VALUES(:id,:job,:u,:r,:k,:hash,CAST(:values AS jsonb))
"""
            ),
            {
                "id": identifier,
                "job": job_id,
                "u": uid,
                "r": body.expected_revision + 1,
                "k": key,
                "hash": digest,
                "values": json.dumps(body.corrections),
            },
        )
        audit(db, uid, "analysis.correction_saved", identifier)
        return corrected(db, row, identity.subject)

    @router.get("/v1/me/analysis-passport", response_model=PassportRead)
    def get_passport(db: jobs.Db, identity: jobs.Identity):
        uid = user(db, identity)
        ensure_schema(db)
        return passport_read(db, uid, identity.subject)

    @router.put("/v1/me/analysis-passport", response_model=PassportRead)
    def select_analysis(body: PassportSelection, db: jobs.Db, identity: jobs.Identity):
        uid = user(db, identity)
        ensure_schema(db)
        row = jobs.job(db, uid, body.job_id)
        if row["state"] == "expired":
            return JSONResponse(status_code=410, content={"message": "analysis_report_unavailable"})
        report = corrected(db, row, identity.subject)
        if report.correction_revision != body.expected_correction_revision:
            raise HTTPException(409, "analysis_correction_revision_conflict")
        passport = canonical_passport(db, uid)
        previous = db.execute(
            text(
                """
SELECT job_id,correction_revision FROM style_passport_analysis WHERE passport_id=:id AND
owner_id=:u
"""
            ),
            {"id": passport["id"], "u": uid},
        ).first()
        if (
            previous
            and previous.job_id == body.job_id
            and previous.correction_revision == body.expected_correction_revision
        ):
            return passport_read(db, uid, identity.subject)
        if passport["revision"] != body.expected_passport_revision:
            raise HTTPException(409, "style_passport_revision_conflict")
        db.execute(
            text(
                """
INSERT INTO style_passport_analysis(passport_id,owner_id,job_id,correction_revision)
VALUES(:id,:u,:job,:rev) ON CONFLICT(passport_id) DO UPDATE SET job_id=EXCLUDED.job_id,
correction_revision=EXCLUDED.correction_revision,selected_at=clock_timestamp()
"""
            ),
            {
                "id": passport["id"],
                "u": uid,
                "job": body.job_id,
                "rev": body.expected_correction_revision,
            },
        )
        db.execute(
            text(
                "UPDATE style_passports SET revision=revision+1,updated_at=clock_timestamp() "
                "WHERE id=:id"
            ),
            {"id": passport["id"]},
        )
        audit(db, uid, "analysis.passport_selected", passport["id"])
        return passport_read(db, uid, identity.subject)

    return router
