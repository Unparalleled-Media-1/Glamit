from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, datetime, timedelta
from uuid import uuid4

import pytest
from glam_api.credits import CreditConflict, balance, finish, grant, reserve
from sqlalchemy import text
from sqlalchemy.exc import DBAPIError
from sqlalchemy.orm import Session


def test_idempotent_grant_and_reservation_lifecycle(db, customer):
    expiry = datetime.now(UTC) + timedelta(minutes=5)
    with Session(db) as session, session.begin():
        journal = grant(session, customer, "verified-source-1", 10)
        assert grant(session, customer, "verified-source-1", 10) == journal
        with pytest.raises(CreditConflict):
            grant(session, customer, "verified-source-1", 11)
        reservation = reserve(session, customer, "quote-1", 4, expiry)
        assert reserve(session, customer, "quote-1", 4, expiry) == reservation
        assert balance(session, customer) == {"available": 6, "held": 4}
        finish(session, customer, reservation, capture=True)
        finish(session, customer, reservation, capture=True)
        assert balance(session, customer) == {"available": 6, "held": 0}
        with pytest.raises(CreditConflict):
            finish(session, customer, reservation, capture=False)


def test_parallel_reservations_cannot_overspend(db, customer):
    with Session(db) as session, session.begin():
        grant(session, customer, "source", 10)
    expiry = datetime.now(UTC) + timedelta(minutes=5)

    def attempt(i):
        try:
            with Session(db) as session, session.begin():
                reserve(session, customer, f"quote-{i}", 3, expiry)
            return True
        except CreditConflict:
            return False

    with ThreadPoolExecutor(max_workers=8) as executor:
        results = list(executor.map(attempt, range(12)))
    assert sum(results) == 3
    with Session(db) as session:
        assert balance(session, customer) == {"available": 1, "held": 9}
        assert session.scalar(text("SELECT count(*) FROM credit_reservation")) == 3


def test_failure_release_expiry_and_owner_scope(db, customer):
    with Session(db) as session, session.begin():
        grant(session, customer, "source", 5)
        reservation = reserve(
            session, customer, "quote", 5, datetime.now(UTC) + timedelta(seconds=30)
        )
        with pytest.raises(CreditConflict):
            reserve(session, customer, "over", 1, datetime.now(UTC) + timedelta(minutes=1))
        session.execute(text("UPDATE credit_reservation SET expires_at=now()-interval '1 second'"))
        with pytest.raises(CreditConflict):
            finish(session, customer, reservation, capture=True)
        finish(session, customer, reservation, capture=False)
        finish(session, customer, reservation, capture=False)
        assert balance(session, customer) == {"available": 5, "held": 0}


def test_db_rejects_unbalanced_and_mutated_financial_records(db, customer):
    with pytest.raises(DBAPIError, match="balanced"):
        with Session(db) as session, session.begin():
            journal = uuid4()
            session.execute(
                text(
                    "INSERT INTO credit_journal(id,user_id,operation,business_key,units) "
                    "VALUES (:id,:u,'grant','bad',10)"
                ),
                {"id": journal, "u": customer},
            )
            session.execute(
                text(
                    "INSERT INTO credit_posting(journal_id,user_id,bucket,units) "
                    "VALUES (:j,:u,'available',10)"
                ),
                {"j": journal, "u": customer},
            )
            session.execute(
                text("UPDATE credit_journal SET sealed=true WHERE id=:id"), {"id": journal}
            )
    with Session(db) as session, session.begin():
        grant(session, customer, "good", 10)
    with pytest.raises(DBAPIError, match="append-only"):
        with db.begin() as connection:
            connection.execute(text("UPDATE credit_posting SET units=11"))
    with pytest.raises(DBAPIError, match="immutable"):
        with db.begin() as connection:
            connection.execute(text("UPDATE credit_journal SET units=11"))


def test_transaction_rollback_cannot_emit_or_grant(db, customer):
    with pytest.raises(RuntimeError):
        with Session(db) as session, session.begin():
            grant(session, customer, "rolled-back", 10)
            raise RuntimeError("Simulated crash")
    with Session(db) as session:
        assert balance(session, customer) == {"available": 0, "held": 0}
        assert session.scalar(text("SELECT count(*) FROM outbox_event")) == 0
