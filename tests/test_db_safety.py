from uuid import uuid4

import pytest
from glam_api.credits import grant
from sqlalchemy import text
from sqlalchemy.exc import DBAPIError
from sqlalchemy.orm import Session


def test_balanced_but_negative_postings_rejected(db, customer):
    with pytest.raises(DBAPIError, match="negative balance"):
        with db.begin() as connection:
            journal = uuid4()
            connection.execute(
                text(
                    "INSERT INTO credit_journal(id,user_id,operation,business_key,units) "
                    "VALUES (:id,:u,'capture','invalid',1)"
                ),
                {"id": journal, "u": customer},
            )
            connection.execute(
                text(
                    "INSERT INTO credit_posting(journal_id,user_id,bucket,units) "
                    "VALUES (:j,:u,'held',-1),(:j,NULL,'consumed',1)"
                ),
                {"j": journal, "u": customer},
            )
            connection.execute(
                text("UPDATE credit_journal SET sealed=true WHERE id=:j"), {"j": journal}
            )


def test_cannot_append_to_sealed_journal(db, customer):
    with Session(db) as session, session.begin():
        journal = grant(session, customer, "source", 5)
    with pytest.raises(DBAPIError, match="open journal"):
        with db.begin() as connection:
            connection.execute(
                text(
                    "INSERT INTO credit_posting(journal_id,user_id,bucket,units) "
                    "VALUES (:j,:u,'available',1)"
                ),
                {"j": journal, "u": customer},
            )
