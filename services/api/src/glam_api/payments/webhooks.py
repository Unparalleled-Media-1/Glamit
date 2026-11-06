import hashlib
import hmac
import json
import time
from uuid import UUID

from sqlalchemy import text

from glam_api.payments.config import PaymentError
from glam_api.payments.ledger import digest, row, serialized, test_object


def verify_signature(body: bytes, signature: str, secret: str, now=None):
    if len(body) > 1024 * 1024 or len(signature) > 4096:
        raise PaymentError("invalid_webhook_size")
    try:
        parts = [p.strip().split("=", 1) for p in signature.split(",")]
        stamps = [int(v) for k, v in parts if k == "t"]
        signatures = [v for k, v in parts if k == "v1"]
        if len(stamps) != 1 or abs((time.time() if now is None else now) - stamps[0]) > 300:
            raise ValueError
        expected = hmac.new(
            secret.encode(), str(stamps[0]).encode() + b"." + body, hashlib.sha256
        ).hexdigest()
        if not any(hmac.compare_digest(expected, s) for s in signatures):
            raise ValueError
        event = json.loads(body)
        if (
            not isinstance(event, dict)
            or event.get("livemode") is not False
            or not str(event.get("id", "")).startswith("evt_")
            or not isinstance(event.get("type"), str)
        ):
            raise ValueError
        data = event.get("data")
        if not isinstance(data, dict) or not isinstance(data.get("object"), dict):
            raise ValueError
        if not isinstance(data["object"].get("id"), str) or not data["object"]["id"]:
            raise ValueError
        if event.get("account") is not None and not isinstance(event.get("account"), str):
            raise ValueError
        if not isinstance(event.get("data", {}).get("object", {}).get("id"), str):
            raise ValueError
        return event
    except (ValueError, TypeError, KeyError):
        raise PaymentError("invalid_test_webhook_signature_or_event") from None


def process_webhook(service, body, signature):
    event = verify_signature(body, signature, service.config.webhook_secret.get_secret_value())
    if event.get("account") not in {None, service.config.platform}:
        raise PaymentError("connected_account_event_not_platform_payment")
    identity, kind = event["id"], event["type"]
    object_id = event["data"]["object"]["id"]
    event_hash = digest(event)
    with serialized(service.engine, "event:" + identity):
        with service.engine.connect() as db:
            old = row(db, "SELECT digest FROM stripe_test_event WHERE id=:id", id=identity)
        if old:
            if old.digest != event_hash:
                raise PaymentError("webhook_idempotency_conflict")
            return {"received": True, "duplicate": True}
        if kind.startswith("payment_intent."):
            pi = test_object(service.gateway.call("GET", "/v1/payment_intents/" + object_id), "pi_")
            if pi.get("metadata", {}).get("glam_test_order"):
                service.observe_payment(object_id)
        elif kind.startswith("checkout.session."):
            session = test_object(
                service.gateway.call("GET", "/v1/checkout/sessions/" + object_id), "cs_test_"
            )
            if session.get("metadata", {}).get("glam_test_order") and session.get("payment_intent"):
                service.observe_payment(session["payment_intent"])
        elif kind.startswith("refund.") or kind == "charge.refund.updated":
            service.observe_refund(object_id)
        elif kind == "charge.refunded":
            for refund in list_stripe(service.gateway, "/v1/refunds", {"charge": object_id}):
                service.observe_refund(refund["id"])
        elif kind.startswith("charge.dispute."):
            service.observe_dispute(object_id)
        elif kind.startswith("transfer."):
            transfer = test_object(service.gateway.call("GET", "/v1/transfers/" + object_id), "tr_")
            value = transfer.get("metadata", {}).get("glam_test_line")
            if value:
                with service.engine.connect() as db:
                    completed = row(
                        db,
                        "SELECT evidence_ref FROM stripe_test_fulfillment WHERE line_id=:l",
                        l=UUID(value),
                    )
                if completed:
                    service.fulfill(UUID(value), completed.evidence_ref)
        with service.engine.begin() as db:
            db.execute(
                text(
                    "INSERT INTO stripe_test_event(id,type,object_id,digest) VALUES(:id,:t,:o,:h)"
                ),
                {"id": identity, "t": kind, "o": object_id, "h": event_hash},
            )
    return {"received": True, "duplicate": False}


def list_stripe(gateway, path, filters):
    result, cursor = [], None
    while True:
        page = gateway.call(
            "GET", path, {**filters, "limit": 100, **({"starting_after": cursor} if cursor else {})}
        )
        data = page.get("data")
        if not isinstance(data, list) or (page.get("has_more") and not data):
            raise PaymentError("invalid_stripe_pagination")
        result.extend(data)
        if not page.get("has_more"):
            return result
        new_cursor = data[-1]["id"]
        if new_cursor == cursor or len(result) > 10000:
            raise PaymentError("stripe_pagination_bound_exceeded")
        cursor = new_cursor
