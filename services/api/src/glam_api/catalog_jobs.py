"""Qualified adapter port, leased AI preparation and rebuildable transactional indexing."""

from typing import Protocol
from uuid import uuid4

from fastapi import HTTPException
from sqlalchemy import bindparam, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Session

from glam_api.catalog_contracts import Suggestions
from glam_api.workspaces import authorize


class CatalogProvider(Protocol):
    name: str
    qualified: bool

    def prepare(
        self, facts: dict, originals: list[dict], features: list[str], idempotency_key: str
    ) -> Suggestions: ...


# An actual selected/qualified SDK adapter must be connected explicitly. No fixture default.
_adapter: CatalogProvider | None = None


def provider():
    return _adapter


def process_index_one(engine):
    with Session(engine) as db, db.begin():
        event = db.execute(
            text(
                "SELECT id,aggregate_id FROM outbox_event WHERE event_type='catalog.changed.v1' "
                "AND delivered_at IS NULL AND available_at<=clock_timestamp() "
                "ORDER BY created_at,id LIMIT 1 FOR UPDATE SKIP LOCKED"
            )
        ).first()
        if not event:
            return False
        listing = db.execute(
            text("SELECT state,published_revision FROM catalog_listing WHERE id=:id FOR SHARE"),
            {"id": event.aggregate_id},
        ).first()
        if listing and listing.state == "published":
            db.execute(
                text(
                    "INSERT INTO catalog_projection(listing_id,revision) VALUES (:id,:r) "
                    "ON CONFLICT(listing_id) DO UPDATE SET revision=EXCLUDED.revision,"
                    "indexed_at=now()"
                ),
                {"id": event.aggregate_id, "r": listing.published_revision},
            )
        else:
            db.execute(
                text("DELETE FROM catalog_projection WHERE listing_id=:id"),
                {"id": event.aggregate_id},
            )
        db.execute(
            text(
                "UPDATE outbox_event SET delivered_at=clock_timestamp(),"
                "attempts=attempts+1 WHERE id=:id"
            ),
            {"id": event.id},
        )
        return True


def process_ai_one(engine):
    adapter = provider()
    if not adapter or not adapter.qualified:
        return False
    lease = uuid4()
    with Session(engine) as db, db.begin():
        row = (
            db.execute(
                text(
                    "SELECT j.*,l.organization_id,l.workspace,l.current_revision,r.facts "
                    "FROM catalog_ai_job j JOIN catalog_listing l ON l.id=j.listing_id "
                    "JOIN catalog_revision r ON r.listing_id=j.listing_id AND "
                    "r.revision=j.base_revision "
                    "WHERE j.provider=:p AND (j.state='queued' OR (j.state='processing' "
                    "AND j.lease_until<now())) ORDER BY j.created_at,j.id "
                    "LIMIT 1 FOR UPDATE OF j SKIP LOCKED"
                ),
                {"p": adapter.name},
            )
            .mappings()
            .first()
        )
        if not row:
            return False
        job = dict(row)
        if job["attempts"] >= 3:
            db.execute(
                text(
                    "UPDATE catalog_ai_job SET state='failed',lease_token=NULL,"
                    "lease_until=NULL WHERE id=:id"
                ),
                {"id": job["id"]},
            )
            return True
        try:
            authorize(db, job["requester_id"], job["organization_id"], job["workspace"], write=True)
        except HTTPException:
            db.execute(
                text(
                    "UPDATE catalog_ai_job SET state='cancelled',lease_token=NULL,"
                    "lease_until=NULL WHERE id=:id"
                ),
                {"id": job["id"]},
            )
            return True
        if job["current_revision"] != job["base_revision"]:
            db.execute(
                text(
                    "UPDATE catalog_ai_job SET state='cancelled',lease_token=NULL,"
                    "lease_until=NULL WHERE id=:id"
                ),
                {"id": job["id"]},
            )
            return True
        originals = [
            dict(r)
            for r in db.execute(
                text(
                    "SELECT id,storage_ref,sha256 FROM catalog_media WHERE listing_id=:id "
                    "AND original_id IS NULL AND validated AND rights_confirmed "
                    "ORDER BY id FOR SHARE"
                ),
                {"id": job["listing_id"]},
            ).mappings()
        ]
        if not originals:
            db.execute(
                text(
                    "UPDATE catalog_ai_job SET state='cancelled',lease_token=NULL,"
                    "lease_until=NULL WHERE id=:id"
                ),
                {"id": job["id"]},
            )
            return True
        db.execute(
            text(
                "UPDATE catalog_ai_job SET state='processing',lease_token=:lease,"
                "lease_until=now()+interval '5 minutes',attempts=attempts+1 WHERE id=:id"
            ),
            {"lease": lease, "id": job["id"]},
        )
    # Never hold database locks during provider calls. Retry uses the same provider idempotency key.
    result = None
    try:
        result = Suggestions.model_validate(
            adapter.prepare(job["facts"], originals, job["features"], str(job["id"]))
        )
        if not set(job["features"]) <= set(result.completed_features):
            raise ValueError("Requested preparation features were not completed")
        if (
            set(job["features"]) & {"background", "lighting", "advertising"}
            and not result.derivatives
        ):
            raise ValueError("Image work requires distinct stored derivative evidence")
        if "advertising" in job["features"] and not any(d.advertising for d in result.derivatives):
            raise ValueError("Generated advertising derivatives require explicit disclosure")
        originals_by_id = {r["id"]: r for r in originals}
        for derivative in result.derivatives:
            original = originals_by_id.get(derivative.original_id)
            if not original or original["storage_ref"] == derivative.storage_ref:
                raise ValueError(
                    "Derivative must reference a distinct original without overwriting it"
                )
    except Exception:
        # Provider exception bodies may contain image references or secrets; never persist/log them.
        result = None
    with Session(engine) as db, db.begin():
        locked = db.execute(
            text("SELECT state,lease_token FROM catalog_ai_job WHERE id=:id FOR UPDATE"),
            {"id": job["id"]},
        ).first()
        if not locked or locked.state != "processing" or locked.lease_token != lease:
            return True
        current = db.scalar(
            text("SELECT current_revision FROM catalog_listing WHERE id=:id FOR SHARE"),
            {"id": job["listing_id"]},
        )
        active = current == job["base_revision"]
        try:
            authorize(db, job["requester_id"], job["organization_id"], job["workspace"], write=True)
        except HTTPException:
            active = False
        # Original permission may have been withdrawn during processing.
        original_ids = list(originals_by_id) if result else [r["id"] for r in originals]
        valid_count = db.scalar(
            text(
                "SELECT count(*) FROM catalog_media WHERE id=ANY(:ids) "
                "AND validated AND rights_confirmed"
            ),
            {"ids": original_ids},
        )
        active = active and valid_count == len(originals)
        state = "cancelled" if not active else "review_ready" if result else "failed"
        if state == "review_ready":
            for derivative in result.derivatives:
                db.execute(
                    text(
                        "INSERT INTO catalog_media(id,listing_id,organization_id,original_id,"
                        "storage_ref,sha256,rights_confirmed,generated_advertising) "
                        "VALUES (:id,:l,:o,:original,:ref,:sha,true,:ad)"
                    ),
                    {
                        "id": uuid4(),
                        "l": job["listing_id"],
                        "o": job["organization_id"],
                        "original": derivative.original_id,
                        "ref": derivative.storage_ref,
                        "sha": derivative.sha256,
                        "ad": derivative.advertising,
                    },
                )
        db.execute(
            text(
                "UPDATE catalog_ai_job SET state=:s,suggestions=:r,lease_token=NULL,"
                "lease_until=NULL WHERE id=:id"
            ).bindparams(bindparam("r", type_=JSONB)),
            {
                "id": job["id"],
                "s": state,
                "r": result.model_dump(mode="json") if state == "review_ready" else None,
            },
        )
        db.execute(
            text(
                "INSERT INTO audit_event(id,actor_id,action,resource_id) "
                "VALUES (:id,:u,:action,:resource)"
            ),
            {
                "id": uuid4(),
                "u": job["requester_id"],
                "action": "catalog.enhancement_" + state,
                "resource": job["id"],
            },
        )
    return True
