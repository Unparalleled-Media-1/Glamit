"""Optional test-only API. Existing production app and authentication are unchanged.

Run factory only with environment test secrets and a local _test database. No auth bypass.
"""

import hashlib
from typing import Annotated
from uuid import UUID

from fastapi import Depends, FastAPI, Header, HTTPException, Request
from pydantic import BaseModel, ConfigDict, Field, StrictInt
from sqlalchemy import create_engine

from glam_api.auth import Principal, get_principal
from glam_api.payments.config import PaymentError, StripeTestConfig
from glam_api.payments.ledger import row
from glam_api.payments.service import PaymentSandbox
from glam_api.payments.stripe import StripeTestGateway
from glam_api.payments.webhooks import process_webhook


class Choice(BaseModel):
    model_config = ConfigDict(extra="forbid")
    offer_id: UUID
    quantity: StrictInt = Field(ge=1, le=100)


class Checkout(BaseModel):
    model_config = ConfigDict(extra="forbid")
    lines: list[Choice] = Field(min_length=1, max_length=20)


def owner_ref(principal: Principal):
    return hashlib.sha256((principal.issuer + "\0" + principal.subject).encode()).hexdigest()


def create_app(config=None, engine=None, gateway=None):
    config = config or StripeTestConfig.from_environment()
    engine = engine or create_engine(config.database_url, hide_parameters=True, pool_pre_ping=True)
    service = PaymentSandbox(engine, gateway or StripeTestGateway(config), config)
    app = FastAPI(title="GLAM AI — isolated Stripe test sandbox", docs_url=None, redoc_url=None)
    app.state.payments = service

    @app.exception_handler(PaymentError)
    async def failed(request, exc):
        from fastapi.responses import JSONResponse

        return JSONResponse({"error": str(exc), "completion_confirmed": False}, status_code=409)

    @app.post("/stripe-test/orders")
    def order(
        body: Checkout,
        identity: Annotated[Principal, Depends(get_principal)],
        key: Annotated[str, Header(alias="Idempotency-Key", min_length=1, max_length=160)],
    ):
        identifier = service.create_order(
            owner_ref(identity), key, [(line.offer_id, line.quantity) for line in body.lines]
        )
        return {"id": str(identifier), "mode": "test"}

    @app.post("/stripe-test/orders/{identifier}/checkout")
    def checkout(identifier: UUID, identity: Annotated[Principal, Depends(get_principal)]):
        result = service.checkout(identifier, owner_ref(identity))
        return {"session_id": result["id"], "url": result.get("url"), "mode": "test"}

    @app.post("/stripe-test/merchants/{account}/onboarding")
    def onboarding(
        account: str,
        identity: Annotated[Principal, Depends(get_principal)],
        key: Annotated[str, Header(alias="Idempotency-Key", min_length=1, max_length=100)],
    ):
        with engine.connect() as db:
            allowed = row(
                db,
                "SELECT 1 FROM stripe_test_offer WHERE account=:a AND owner_ref=:u",
                a=account,
                u=owner_ref(identity),
            )
        if not allowed:
            raise HTTPException(403, "Authorized merchant binding required")
        return service.onboarding(account, key)

    @app.post("/stripe-test/webhook")
    async def webhook(request: Request):
        body = bytearray()
        async for part in request.stream():
            body.extend(part)
            if len(body) > 1024 * 1024:
                raise HTTPException(413, "Webhook body too large")
        # Database/network work must not block the ASGI event loop.
        from starlette.concurrency import run_in_threadpool

        return await run_in_threadpool(
            process_webhook, service, bytes(body), request.headers.get("stripe-signature", "")
        )

    return app
