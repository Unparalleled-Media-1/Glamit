"""Authenticated transient OpenAI styling advice; no photos or production fallback.

Only opaque attempt/actor metadata is retained. Customer pricing/credits are unchanged.
"""

import os
import re
from datetime import UTC, datetime
from typing import Annotated, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException, Request, Response
from fastapi.routing import APIRoute
from pydantic import BaseModel, ConfigDict, Field, field_validator
from sqlalchemy import text
from sqlalchemy.orm import Session

from glam_api.auth import Principal, get_principal
from glam_api.contracts import PolicyRead
from glam_api.db import get_engine
from glam_api.integrations.providers import OpenAI, ProviderAdvice
from glam_api.integrations.runtime import IntegrationError, ProviderConfig

Identity = Annotated[Principal, Depends(get_principal)]
Attempt = Annotated[UUID, Header(alias="Idempotency-Key")]
PURPOSE = "ai_styling_advice"
ACTION = "ai.stylist.attempt"


class BoundedStylingRequest(Request):
    async def body(self):
        if not hasattr(self, "_body"):
            content = bytearray()
            async for chunk in self.stream():
                if len(content) + len(chunk) > 65536:
                    raise HTTPException(413, "styling_request_too_large")
                content.extend(chunk)
            self._body = bytes(content)
        return self._body


class StylingRoute(APIRoute):
    def get_route_handler(self):
        handler = super().get_route_handler()

        async def bounded(request):
            if request.method == "POST":
                request = BoundedStylingRequest(request.scope, request.receive)
            return await handler(request)

        return bounded


def stylist_engine():
    return get_engine()


def openai_provider():
    return OpenAI(ProviderConfig.from_environment())


Engine = Annotated[object, Depends(stylist_engine)]
Provider = Annotated[OpenAI, Depends(openai_provider)]


class AdviceRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    messages: list[str] = Field(min_length=1, max_length=10)
    policy_id: UUID
    consent: Literal[True]

    @field_validator("consent", mode="before")
    @classmethod
    def explicit_consent(cls, value):
        if value is not True:
            raise ValueError("Explicit consent is required")
        return value

    @field_validator("messages")
    @classmethod
    def bounded_brief(cls, values):
        if any(not v.strip() or len(v) > 2000 for v in values) or sum(map(len, values)) > 8000:
            raise ValueError("Invalid styling brief")
        return values


class AdviceRead(BaseModel):
    id: UUID
    subject: str
    provider: Literal["openai"] = "openai"
    model: str
    completed_at: datetime
    advice: ProviderAdvice


class OpenAIStatus(BaseModel):
    service: Literal["openai"] = "openai"
    configured: bool
    state: Literal["NOT CONFIGURED", "CONNECTED", "DEGRADED"]
    reason: str
    scope: Literal["openai_authenticated_api"] = "openai_authenticated_api"
    model_configured: bool
    advice_enabled: bool
    response_persistence: Literal["transient"] = "transient"


def enabled_limit():
    raw = os.environ.get("GLAM_OPENAI_MAX_REQUESTS_PER_HOUR", "")
    if os.environ.get("GLAM_OPENAI_ADVISOR_ENABLED") != "true":
        raise HTTPException(503, "openai_advisor_not_enabled")
    if not re.fullmatch(r"[1-9][0-9]{0,2}", raw) or int(raw) > 100:
        raise HTTPException(503, "reviewed_advisor_request_limit_required")
    return int(raw)


def require_attempt_permissions(db):
    if db.scalar(text("SELECT to_regclass('public.audit_event')")) is None:
        raise HTTPException(503, "styling_runtime_permissions_required")
    if not db.scalar(
        text("""
        SELECT has_table_privilege('public.audit_event','SELECT')
          AND has_table_privilege('public.audit_event','INSERT')
          AND NOT row_security_active('public.audit_event')
    """)
    ):
        raise HTTPException(503, "styling_runtime_permissions_required")


def current_policy(db):
    row = (
        db.execute(
            text("""
        SELECT id,purpose,version,content FROM policy_document
        WHERE purpose=:purpose AND approved_at<=clock_timestamp()
        ORDER BY approved_at DESC,id DESC LIMIT 1
    """),
            {"purpose": PURPOSE},
        )
        .mappings()
        .first()
    )
    if row is None:
        raise HTTPException(403, "approved_styling_advice_policy_required")
    return row


def consent_epoch(db, uid, policy_id):
    if current_policy(db)["id"] != policy_id:
        raise HTTPException(403, "current_styling_advice_consent_required")
    if not db.scalar(
        text("""
        SELECT EXISTS(SELECT 1 FROM account_eligibility WHERE user_id=:u
          AND age_band='eligible_adult' AND expires_at>clock_timestamp())
    """),
        {"u": uid},
    ):
        raise HTTPException(403, "qualified_styling_advice_eligibility_required")
    row = db.execute(
        text("""
        SELECT c.sequence,c.policy_id,c.action FROM consent_event c
        JOIN policy_document p ON p.id=c.policy_id
        WHERE c.user_id=:u AND p.purpose=:purpose ORDER BY c.sequence DESC LIMIT 1
    """),
        {"u": uid, "purpose": PURPOSE},
    ).first()
    if row is None or row.policy_id != policy_id or row.action != "granted":
        raise HTTPException(403, "current_styling_advice_consent_required")
    return row.sequence


def private(response):
    response.headers["Cache-Control"] = "no-store, private"
    response.headers["Vary"] = "Authorization"


def build_stylist_router(user, audit):
    router = APIRouter(route_class=StylingRoute)

    @router.get("/v1/ai/openai/status", response_model=OpenAIStatus)
    def status(engine: Engine, identity: Identity, provider: Provider, response: Response):
        private(response)
        with Session(engine) as db, db.begin():
            user(db, identity)
        # No locks are held while the authenticated read-only provider probe runs.
        health = provider.model_health() if provider.config.openai_model else provider.health()
        try:
            enabled_limit()
            enabled = True
        except HTTPException:
            enabled = False
        return {
            **health.public(),
            "model_configured": bool(provider.config.openai_model),
            "advice_enabled": enabled,
        }

    @router.get("/v1/ai/stylist/policy", response_model=PolicyRead)
    def policy(engine: Engine, identity: Identity, response: Response):
        private(response)
        with Session(engine) as db, db.begin():
            user(db, identity)
            return dict(current_policy(db))

    @router.post("/v1/ai/stylist/advice", response_model=AdviceRead)
    def advice(
        body: AdviceRequest,
        key: Attempt,
        engine: Engine,
        identity: Identity,
        provider: Provider,
        response: Response,
    ):
        private(response)
        limit = enabled_limit()
        try:
            provider.config.secret("OPENAI_API_KEY")
        except IntegrationError:
            raise HTTPException(503, "openai_not_configured") from None
        if not re.fullmatch(r"[A-Za-z0-9._:-]{1,160}", provider.config.openai_model):
            raise HTTPException(503, "qualified_openai_model_required")
        with Session(engine) as db, db.begin():
            require_attempt_permissions(db)
            uid = user(db, identity)  # Existing user/session check also serializes actor attempts.
            epoch = consent_epoch(db, uid, body.policy_id)
            if db.scalar(
                text("""
                SELECT EXISTS(SELECT 1 FROM audit_event WHERE actor_id=:u
                  AND action=:action AND resource_id=:key)
            """),
                {"u": uid, "action": ACTION, "key": key},
            ):
                raise HTTPException(409, "styling_attempt_already_consumed")
            count = db.scalar(
                text("""
                SELECT count(*) FROM audit_event WHERE actor_id=:u AND action=:action
                  AND created_at>clock_timestamp()-interval '1 hour'
            """),
                {"u": uid, "action": ACTION},
            )
            if count >= limit:
                raise HTTPException(429, "styling_request_limit_reached")
            audit(db, uid, ACTION, key)
        # Attempt is committed before I/O; no prompt/reply is persisted or automatically replayed.
        try:
            result = provider.advise(body.messages, consent=True)
        except IntegrationError as error:
            code = (
                "styling_provider_unavailable"
                if error.retryable
                else "styling_response_unavailable"
            )
            raise HTTPException(503, code) from None
        # Auth/session, eligibility and exact consent epoch are checked again before disclosure.
        with Session(engine) as db, db.begin():
            final_uid = user(db, identity)
            if final_uid != uid or consent_epoch(db, uid, body.policy_id) != epoch:
                raise HTTPException(409, "styling_scope_changed")
        return AdviceRead(
            id=key,
            subject=identity.subject,
            model=provider.config.openai_model,
            completed_at=datetime.now(UTC),
            advice=result,
        )

    return router
