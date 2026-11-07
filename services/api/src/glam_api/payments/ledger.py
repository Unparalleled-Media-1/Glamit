import hashlib
import json
from contextlib import contextmanager
from contextvars import ContextVar
from uuid import uuid4

from sqlalchemy import text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import bindparam

from glam_api.payments.config import PaymentError


def digest(value):
    return hashlib.sha256(
        json.dumps(value, sort_keys=True, separators=(",", ":")).encode()
    ).hexdigest()


def lock(db, order):
    db.execute(text("SELECT pg_advisory_xact_lock(hashtextextended(:key,0))"), {"key": str(order)})


def row(db, query, **params):
    return db.execute(text(query), params).mappings().first()


def rows(db, query, **params):
    return db.execute(text(query), params).mappings().all()


def post(db, order, key, kind, evidence, entries):
    entries = sorted((a, n) for a, n in entries if n)
    if (
        len(entries) < 2
        or sum(n for _, n in entries)
        or any(type(n) is not int for _, n in entries)
    ):
        raise PaymentError("unbalanced_journal")
    canonical = {"evidence": evidence, "entries": entries}
    existing = row(db, "SELECT * FROM stripe_test_journal WHERE business_key=:k", k=key)
    if existing:
        if (
            existing.order_id != order
            or existing.kind != kind
            or existing.evidence != json.loads(json.dumps(canonical))
        ):
            raise PaymentError("journal_idempotency_conflict")
        return existing.id
    identifier = uuid4()
    db.execute(
        text(
            "INSERT INTO stripe_test_journal(id,order_id,business_key,kind,currency,evidence) "
            "VALUES(:id,:o,:k,:kind,'usd',:e)"
        ).bindparams(bindparam("e", type_=JSONB)),
        {"id": identifier, "o": order, "k": key, "kind": kind, "e": canonical},
    )
    for account, amount in entries:
        db.execute(
            text("INSERT INTO stripe_test_posting(journal_id,account,amount) VALUES(:j,:a,:n)"),
            {"j": identifier, "a": account, "n": amount},
        )
    return identifier


def test_object(value, prefix):
    if (
        not value
        or value.get("livemode") is not False
        or not str(value.get("id", "")).startswith(prefix)
    ):
        raise PaymentError("test_stripe_object_required")
    return value


def balance(db, gateway, order, identifier, source, kind):
    bt = gateway.call("GET", "/v1/balance_transactions/" + identifier)
    if bt.get("id") != identifier or bt.get("source") != source or bt.get("currency") != "usd":
        raise PaymentError("balance_transaction_source_mismatch")
    if any(type(bt.get(k)) is not int for k in ["amount", "fee", "net"]) or (
        bt["amount"] - bt["fee"] != bt["net"]
    ):
        raise PaymentError("invalid_balance_transaction_arithmetic")
    existing = row(db, "SELECT * FROM stripe_test_balance_evidence WHERE id=:id", id=identifier)
    facts = {k: bt[k] for k in ["amount", "fee", "net"]}
    if existing:
        if existing.source != source or any(existing[k] != v for k, v in facts.items()):
            raise PaymentError("balance_evidence_conflict")
        return bt
    db.execute(
        text(
            "INSERT INTO stripe_test_balance_evidence"
            "(id,order_id,source,kind,currency,amount,fee,net,fee_details) "
            "VALUES(:id,:o,:s,:k,'usd',:a,:f,:n,:d)"
        ).bindparams(bindparam("d", type_=JSONB)),
        {
            "id": identifier,
            "o": order,
            "s": source,
            "k": kind,
            "a": bt["amount"],
            "f": bt["fee"],
            "n": bt["net"],
            "d": bt.get("fee_details", []),
        },
    )
    return bt


_held = ContextVar("stripe_test_order_locks", default=frozenset())


@contextmanager
def serialized(engine, order):
    """Session lock spans durable-intent/network/journal transactions across processes."""
    key = str(order)
    if key in _held.get():
        yield
        return
    with engine.connect() as guard:
        guard.execute(
            text("SELECT pg_advisory_lock(hashtextextended(:k,0))"), {"k": "stripe-outer:" + key}
        )
        token = _held.set(_held.get() | {key})
        try:
            yield
        finally:
            _held.reset(token)
            guard.execute(
                text("SELECT pg_advisory_unlock(hashtextextended(:k,0))"),
                {"k": "stripe-outer:" + key},
            )
            guard.commit()


def serialized_line(method):
    from functools import wraps

    @wraps(method)
    def invoke(self, line_id, *args, **kwargs):
        with self.engine.connect() as db:
            line = row(db, "SELECT order_id FROM stripe_test_line WHERE id=:id", id=line_id)
        if not line:
            raise PaymentError("unknown_order_line")
        with serialized(self.engine, line.order_id):
            return method(self, line_id, *args, **kwargs)

    return invoke
