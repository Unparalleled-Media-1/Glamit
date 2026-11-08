"""Confirmed private-object erasure. Run only against an explicitly approved environment."""

import argparse
import time
from uuid import uuid4

from sqlalchemy import text
from sqlalchemy.orm import Session

from glam_api.db import get_engine
from glam_api.integrations.private_storage import PrivateStorage, StorageError, configured_storage
from glam_api.private_media import LIVE_SQL, ensure_schema


def purge_one(engine, storage: PrivateStorage) -> bool:
    with Session(engine) as db, db.begin():
        ensure_schema(db, for_cleanup=True)
        due = f"""m.state<>'deleted' AND m.next_purge_at<=clock_timestamp()
          AND (m.state='deletion_pending' OR NOT coalesce(({LIVE_SQL}),false))"""
        # Owner-before-row matches API/consent locking, avoiding inverse-order deadlocks.
        owner = db.scalar(
            text(f"""
          SELECT u.id FROM app_user u WHERE EXISTS(
            SELECT 1 FROM private_media m WHERE m.owner_id=u.id AND ({due}))
          ORDER BY u.id LIMIT 1 FOR UPDATE OF u SKIP LOCKED
        """)
        )
        if owner is None:
            return False
        row = (
            db.execute(
                text(f"""
          SELECT m.* FROM private_media m WHERE m.owner_id=:u AND ({due})
          ORDER BY m.created_at,m.id LIMIT 1 FOR UPDATE OF m SKIP LOCKED
        """),
                {"u": owner},
            )
            .mappings()
            .first()
        )
        if row is None:
            return False
        try:
            storage.delete(row["object_key"])
        except StorageError as error:
            db.execute(
                text("""
              UPDATE private_media SET state='deletion_pending',
                deletion_requested_at=coalesce(deletion_requested_at,clock_timestamp()),
                purge_attempts=purge_attempts+1,last_error_code=:error,
                next_purge_at=clock_timestamp()+
                  least(3600,power(2,least(purge_attempts+1,11))) * interval '1 second'
              WHERE id=:id
            """),
                {"id": row["id"], "error": error.code},
            )
            return True
        db.execute(
            text("""
          UPDATE private_media SET state='deleted',deleted_at=clock_timestamp(),
            deletion_requested_at=coalesce(deletion_requested_at,clock_timestamp()),
            purge_attempts=purge_attempts+1,last_error_code=NULL,
            input_size=NULL,input_sha256=NULL,stored_size=NULL,stored_sha256=NULL,
            width=NULL,height=NULL,request_hash=NULL WHERE id=:id
        """),
            {"id": row["id"]},
        )
        db.execute(
            text("""
          INSERT INTO audit_event(id,actor_id,action,resource_id)
          VALUES(:id,:u,'media.deleted',:media)
        """),
            {"id": uuid4(), "u": owner, "media": row["id"]},
        )
        return True


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--once", action="store_true")
    parser.add_argument("--batch-limit", type=int, default=50, choices=range(1, 501))
    args = parser.parse_args()
    # Disabling new uploads must not disable an explicitly configured erasure worker.
    storage = configured_storage(for_cleanup=True)
    engine = get_engine()
    while True:
        for _ in range(args.batch_limit):
            if not purge_one(engine, storage):
                break
        if args.once:
            return
        time.sleep(5)


if __name__ == "__main__":
    main()
