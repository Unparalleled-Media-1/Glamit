"""Internal credit posting API. No public grant endpoint; callers must verify grant sources.

All calls require the caller's existing PostgreSQL transaction. Locking serializes a user's
operations, while journal business keys survive retries. Lots/expiry allocation and billing
provider integration are later work; this kernel must not issue commercial entitlements yet.
"""

from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import text
from sqlalchemy.orm import Session


class CreditConflict(ValueError):
    pass


def lock_account(db: Session, user_id: UUID) -> None:
    found = db.execute(
        text("SELECT user_id FROM credit_account WHERE user_id=:u FOR UPDATE"), {"u": user_id}
    ).first()
    if not found:
        raise CreditConflict("Unknown credit account")


def balance(db: Session, user_id: UUID) -> dict[str, int]:
    rows = db.execute(
        text("SELECT bucket, sum(units) FROM credit_posting WHERE user_id=:u GROUP BY bucket"),
        {"u": user_id},
    )
    result = {"available": 0, "held": 0}
    result.update({bucket: int(units) for bucket, units in rows})
    return result


def post(db, user_id, operation, key, units, entries) -> UUID:
    if not isinstance(units, int) or isinstance(units, bool) or not 0 < units < 2**53:
        raise CreditConflict("Units must be a positive bounded integer")
    if not key or len(key) > 160:
        raise CreditConflict("Invalid business key")
    existing = db.execute(
        text(
            "SELECT id, units FROM credit_journal WHERE user_id=:u "
            "AND operation=:o AND business_key=:k"
        ),
        {"u": user_id, "o": operation, "k": key},
    ).first()
    if existing:
        if existing.units != units:
            raise CreditConflict("Idempotency key reused with different units")
        return existing.id
    journal_id = uuid4()
    db.execute(
        text(
            "INSERT INTO credit_journal(id,user_id,operation,business_key,units) "
            "VALUES (:id,:u,:o,:k,:n)"
        ),
        {"id": journal_id, "u": user_id, "o": operation, "k": key, "n": units},
    )
    for bucket, amount in entries:
        db.execute(
            text(
                "INSERT INTO credit_posting(journal_id,user_id,bucket,units) VALUES (:j,:u,:b,:n)"
            ),
            {
                "j": journal_id,
                "u": user_id if bucket in ("available", "held") else None,
                "b": bucket,
                "n": amount,
            },
        )
    db.execute(text("UPDATE credit_journal SET sealed=true WHERE id=:id"), {"id": journal_id})
    db.execute(
        text("INSERT INTO outbox_event(id,event_type,aggregate_id) VALUES (:id,:t,:a)"),
        {"id": uuid4(), "t": f"credits.{operation}.v1", "a": journal_id},
    )
    return journal_id


def grant(db: Session, user_id: UUID, key: str, units: int) -> UUID:
    lock_account(db, user_id)
    return post(db, user_id, "grant", key, units, [("issuance", -units), ("available", units)])


def reserve(db: Session, user_id: UUID, key: str, units: int, expires_at: datetime) -> UUID:
    lock_account(db, user_id)
    existing = (
        db.execute(
            text("SELECT * FROM credit_reservation WHERE user_id=:u AND business_key=:k"),
            {"u": user_id, "k": key},
        )
        .mappings()
        .first()
    )
    if existing:
        if existing["units"] != units or existing["expires_at"] != expires_at:
            raise CreditConflict("Idempotency key reused with different reservation")
        return existing["id"]
    now = db.scalar(text("SELECT clock_timestamp()"))
    if expires_at.tzinfo is None or expires_at <= now:
        raise CreditConflict("Reservation expiry must be in the future")
    if balance(db, user_id)["available"] < units:
        raise CreditConflict("Insufficient available credits")
    reservation_id = uuid4()
    post(db, user_id, "reserve", key, units, [("available", -units), ("held", units)])
    db.execute(
        text(
            "INSERT INTO credit_reservation(id,user_id,business_key,units,state,expires_at) "
            "VALUES (:id,:u,:k,:n,'held',:expiry)"
        ),
        {"id": reservation_id, "u": user_id, "k": key, "n": units, "expiry": expires_at},
    )
    return reservation_id


def finish(db: Session, user_id: UUID, reservation_id: UUID, *, capture: bool) -> None:
    lock_account(db, user_id)
    row = (
        db.execute(
            text("SELECT * FROM credit_reservation WHERE id=:id AND user_id=:u FOR UPDATE"),
            {"id": reservation_id, "u": user_id},
        )
        .mappings()
        .first()
    )
    if not row:
        raise CreditConflict("Unknown reservation")
    target = "captured" if capture else "released"
    if row["state"] == target:
        return
    if row["state"] != "held":
        raise CreditConflict("Reservation already finalized differently")
    if capture and row["expires_at"] <= db.scalar(text("SELECT clock_timestamp()")):
        raise CreditConflict("Expired reservation cannot be captured")
    post(
        db,
        user_id,
        "capture" if capture else "release",
        str(reservation_id),
        row["units"],
        [("held", -row["units"]), ("consumed" if capture else "available", row["units"])],
    )
    db.execute(
        text("UPDATE credit_reservation SET state=:state WHERE id=:id"),
        {"state": target, "id": reservation_id},
    )
