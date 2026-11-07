"""Transactional privacy worker; unknown event types remain pending for future consumers."""

import argparse
import time
from uuid import uuid4

from sqlalchemy import text
from sqlalchemy.orm import Session

from glam_api.db import get_engine


def process_one(engine) -> bool:
    with Session(engine) as db, db.begin():
        event = db.execute(
            text(
                "SELECT id,aggregate_id FROM outbox_event "
                "WHERE event_type='privacy.consent_withdrawn.v1' AND delivered_at IS NULL "
                "AND available_at<=clock_timestamp() ORDER BY created_at,id "
                "LIMIT 1 FOR UPDATE SKIP LOCKED"
            )
        ).first()
        if not event:
            return False
        consent = db.execute(
            text(
                "SELECT c.user_id,c.created_at,p.purpose FROM consent_event c "
                "JOIN policy_document p ON p.id=c.policy_id WHERE c.id=:id"
            ),
            {"id": event.aggregate_id},
        ).one()
        # Same lock as the API: deletion and new private writes cannot race.
        db.execute(text("SELECT id FROM app_user WHERE id=:id FOR UPDATE"), {"id": consent.user_id})
        if consent.purpose == "private_look_storage":
            look_ids = db.scalars(
                text("SELECT id FROM look WHERE owner_id=:u AND created_at<=:t"),
                {"u": consent.user_id, "t": consent.created_at},
            ).all()
            for look_id in look_ids:
                db.execute(
                    text(
                        "DELETE FROM idempotency_record WHERE user_id=:u AND "
                        "(route=:r OR (route='looks' AND response->>'id'=:id))"
                    ),
                    {"u": consent.user_id, "r": f"looks/{look_id}/revisions", "id": str(look_id)},
                )
                db.execute(text("DELETE FROM look WHERE id=:id"), {"id": look_id})
                db.execute(
                    text(
                        "INSERT INTO audit_event(id,action,resource_id) "
                        "VALUES (:id,'privacy.look_deleted',:r)"
                    ),
                    {"id": uuid4(), "r": look_id},
                )
        db.execute(
            text(
                "UPDATE outbox_event SET delivered_at=clock_timestamp(),attempts=attempts+1 "
                "WHERE id=:id"
            ),
            {"id": event.id},
        )
        return True


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--once", action="store_true", help="Drain supported pending events and exit"
    )
    args = parser.parse_args()
    engine = get_engine()
    while True:
        from glam_api.catalog_jobs import process_ai_one, process_index_one

        processed = process_one(engine)
        processed = process_index_one(engine) or processed
        processed = process_ai_one(engine) or processed
        if not processed:
            if args.once:
                return
            time.sleep(1)


if __name__ == "__main__":
    main()
