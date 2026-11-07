"""Reviewed catalog publication and contextual requirement matching."""

from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

from fastapi import APIRouter, HTTPException
from sqlalchemy import bindparam, text
from sqlalchemy.dialects.postgresql import JSONB

from glam_api.catalog_contracts import (
    BulkListings,
    BulkPublication,
    EnhancementRequest,
    JobRead,
    ListingFacts,
    ListingRead,
    MatchResult,
    NewListing,
    PublishChoice,
    Requirement,
    ReviewChoice,
    RevisionChoice,
    SavedRead,
)
from glam_api.workspaces import Db, Identity, Key, authorize, eligible, require_staff_roles


def listing(db, org, lid, uid, write=False):
    row = (
        db.execute(
            text("SELECT * FROM catalog_listing WHERE id=:id AND organization_id=:o FOR UPDATE"),
            {"id": lid, "o": org},
        )
        .mappings()
        .first()
    )
    if not row:
        raise HTTPException(404, "Listing not available")
    authorize(db, uid, org, row["workspace"], write=write)
    return row


def read_listing(db, row):
    revision = (
        db.execute(
            text(
                "SELECT r.facts,r.merchant_reviewed,a.decision FROM catalog_revision r "
                "LEFT JOIN catalog_approval a ON a.listing_id=r.listing_id AND "
                "a.revision=r.revision "
                "WHERE r.listing_id=:id AND r.revision=:r"
            ),
            {"id": row["id"], "r": row["current_revision"]},
        )
        .mappings()
        .one()
    )
    return {
        **{
            key: row[key]
            for key in ["id", "organization_id", "current_revision", "published_revision", "state"]
        },
        **dict(revision),
    }


def signal_index(db, lid):
    db.execute(
        text(
            "INSERT INTO outbox_event(id,event_type,aggregate_id) "
            "VALUES (:id,'catalog.changed.v1',:listing)"
        ),
        {"id": uuid4(), "listing": lid},
    )


def validated_revision(db, row, revision):
    found = (
        db.execute(
            text(
                "SELECT r.facts,r.merchant_reviewed,a.decision FROM catalog_revision r "
                "LEFT JOIN catalog_approval a ON a.listing_id=r.listing_id AND "
                "a.revision=r.revision "
                "WHERE r.listing_id=:id AND r.revision=:r"
            ),
            {"id": row["id"], "r": revision},
        )
        .mappings()
        .first()
    )
    if not found or not found["merchant_reviewed"] or found["decision"] != "approved":
        raise HTTPException(
            409, "This exact revision requires merchant review and content approval"
        )
    facts = ListingFacts.model_validate(found["facts"])
    if facts.condition == "rental":
        raise HTTPException(
            409, "Rental deposits, return and damage obligations require qualification"
        )
    if facts.offer_expires_at > datetime.now(UTC) + timedelta(hours=24):
        raise HTTPException(
            409, "Initial catalog policy requires offer reconfirmation within 24 hours"
        )
    if facts.offer_expires_at <= datetime.now(UTC):
        raise HTTPException(409, "Source offer expired; review a fresh revision")
    if not db.scalar(
        text(
            "SELECT EXISTS(SELECT 1 FROM catalog_media WHERE listing_id=:id "
            "AND original_id IS NULL AND rights_confirmed AND validated)"
        ),
        {"id": row["id"]},
    ):
        raise HTTPException(409, "A validated, rights-confirmed original image is required")
    return facts


def matches(db, uid, req, only_lid=None):
    if not eligible(db, uid):
        return {
            "organic": [],
            "sponsored": [],
            "message": "Eligibility required; no commercial matches shown.",
        }
    market_active = db.scalar(
        text(
            "SELECT enabled AND expires_at>now() FROM market_policy_version "
            "WHERE country=:country AND currency=:currency AND capability='catalog_discovery' "
            "ORDER BY sequence DESC LIMIT 1"
        ),
        {"country": req.country, "currency": req.currency},
    )
    if not market_active:
        return {
            "organic": [],
            "sponsored": [],
            "message": "Catalog discovery is not qualified for this market/currency.",
        }
    rows = db.execute(
        text(
            "SELECT "
            "l.id,l.organization_id,l.published_revision,r.facts,a.identifier_verified,o.name "
            "FROM catalog_projection p JOIN catalog_listing l ON l.id=p.listing_id "
            "AND l.published_revision=p.revision AND l.state='published' "
            "JOIN catalog_revision r ON r.listing_id=l.id AND r.revision=p.revision "
            "JOIN catalog_approval a ON a.listing_id=r.listing_id AND a.revision=r.revision "
            "JOIN organizations o ON o.id=l.organization_id "
            "JOIN workspace_capability c ON c.organization_id=o.id AND c.workspace=l.workspace "
            "WHERE NOT o.suspended AND c.status='verified' AND c.expires_at>now() "
            "AND a.decision='approved' AND r.merchant_reviewed "
            "AND r.facts->>'category'=:category AND r.facts->>'currency'=:currency "
            "AND (r.facts->'countries') ? :country "
            "AND (CAST(:lid AS uuid) IS NULL OR l.id=CAST(:lid AS uuid)) "
            "AND (r.facts->>'offer_expires_at')::timestamptz>now() "
            "AND EXISTS(SELECT 1 FROM catalog_media m WHERE m.listing_id=l.id "
            "AND m.original_id IS NULL AND m.rights_confirmed AND m.validated) "
            "ORDER BY l.id"
        ),
        {
            "category": req.category,
            "currency": req.currency,
            "country": req.country,
            "lid": only_lid,
        },
    ).mappings()
    ranked = []
    for row in rows:
        f = ListingFacts.model_validate(row["facts"])
        if f.condition == "rental":
            continue
        if (f.category == "service" and not f.accepting_requests) or (
            f.category != "service" and f.stock_quantity <= 0
        ):
            continue
        overlap = set(f.tags) & set(req.tags)
        if not set(req.tags) <= set(f.tags):
            continue
        total = (
            None
            if f.shipping_minor is None
            or f.tax_minor is None
            or f.other_costs_minor is None
            or f.category == "service"
            else (f.price_minor + f.shipping_minor + f.tax_minor + f.other_costs_minor)
        )
        if req.budget_minor is not None and (total is None or total > req.budget_minor):
            continue
        exact = bool(
            req.source_sku
            and req.source_sku == f.source_sku
            and req.source_organization_id == row["organization_id"]
            and row["identifier_verified"]
        )
        result = {
            "listing_id": row["id"],
            "revision": row["published_revision"],
            "title": f.title,
            "merchant": row["name"],
            "category": f.category,
            "match_type": "Exact" if exact else "Similar",
            "currency": f.currency,
            "price_minor": f.price_minor,
            "delivered_total_minor": total,
            "purchase_url": str(f.purchase_url),
            "offer_expires_at": f.offer_expires_at,
            "service_quote_required": f.category == "service",
            "condition": None if f.category == "service" else f.condition,
        }
        ranked.append(
            (
                (
                    -int(exact),
                    -len(overlap),
                    total is None,
                    total if total is not None else f.price_minor,
                    str(row["id"]),
                ),
                result,
            )
        )
    organic = [r for _, r in sorted(ranked, key=lambda item: item[0])[:30]]
    return {
        "organic": organic,
        "sponsored": [],
        "message": "Reviewed merchant matches; sponsored delivery is not connected."
        if organic
        else "No verified matching listings currently available. Save your requirements for later.",
    }


def build_catalog_router(user, audit, replay, remember):
    router = APIRouter()

    @router.post(
        "/v1/organizations/{org}/catalog/listings", response_model=ListingRead, status_code=201
    )
    def create(org: UUID, body: NewListing, db: Db, identity: Identity, key: Key):
        uid = user(db, identity)
        workspace = "professional" if body.facts.category == "service" else "merchant"
        authorize(db, uid, org, workspace, write=True)
        route = f"catalog/{org}/listings"
        payload = body.model_dump(mode="json")
        if result := replay(db, uid, route, key, payload):
            return result
        lid = uuid4()
        inserted = db.scalar(
            text(
                "INSERT INTO catalog_listing(id,organization_id,workspace,source_sku) "
                "VALUES (:id,:o,:w,:sku) ON CONFLICT(organization_id,workspace,source_sku) "
                "DO NOTHING RETURNING id"
            ),
            {"id": lid, "o": org, "w": workspace, "sku": body.facts.source_sku.lower()},
        )
        if not inserted:
            raise HTTPException(409, "This organization already has this source SKU")
        db.execute(
            text(
                "INSERT INTO catalog_revision(listing_id,revision,facts,author_id) "
                "VALUES (:id,1,:facts,:u)"
            ).bindparams(bindparam("facts", type_=JSONB)),
            {"id": lid, "facts": payload["facts"], "u": uid},
        )
        audit(db, uid, "catalog.draft_created", lid)
        result = ListingRead(**read_listing(db, listing(db, org, lid, uid))).model_dump(mode="json")
        return remember(db, uid, route, key, payload, result)

    @router.post(
        "/v1/organizations/{org}/catalog/listings/bulk",
        response_model=list[ListingRead],
        status_code=201,
    )
    def bulk_create(org: UUID, body: BulkListings, db: Db, identity: Identity, key: Key):
        import hashlib

        uid = user(db, identity)
        for item in body.listings:
            workspace = "professional" if item.facts.category == "service" else "merchant"
            authorize(db, uid, org, workspace, write=True)
        payload = body.model_dump(mode="json")
        route = f"catalog/{org}/bulk"
        if result := replay(db, uid, route, key, payload):
            return result
        result = []
        for i, item in enumerate(body.listings):
            item_key = hashlib.sha256(f"{key}/{i}".encode()).hexdigest()
            result.append(create(org, item, db, identity, "bulk-" + item_key))
        return remember(db, uid, route, key, payload, result)

    @router.get("/v1/organizations/{org}/catalog/listings", response_model=list[ListingRead])
    def list_owned(org: UUID, db: Db, identity: Identity):
        uid = user(db, identity)
        allowed = []
        for workspace in ["merchant", "professional"]:
            try:
                authorize(db, uid, org, workspace)
            except HTTPException:
                continue
            allowed.append(workspace)
        if not allowed:
            raise HTTPException(404, "Catalog not available")
        rows = db.execute(
            text(
                "SELECT * FROM catalog_listing WHERE organization_id=:o "
                "AND workspace=ANY(:workspaces) ORDER BY created_at DESC,id LIMIT 100"
            ),
            {"o": org, "workspaces": allowed},
        ).mappings()
        return [read_listing(db, row) for row in rows]

    @router.get("/v1/organizations/{org}/catalog/listings/{lid}", response_model=ListingRead)
    def detail(org: UUID, lid: UUID, db: Db, identity: Identity):
        uid = user(db, identity)
        return read_listing(db, listing(db, org, lid, uid))

    @router.post(
        "/v1/organizations/{org}/catalog/listings/{lid}/revisions", response_model=ListingRead
    )
    def revise(org: UUID, lid: UUID, body: RevisionChoice, db: Db, identity: Identity, key: Key):
        uid = user(db, identity)
        row = listing(db, org, lid, uid, write=True)
        if (body.facts.category == "service") != (row["workspace"] == "professional"):
            raise HTTPException(422, "Cannot change the listing's business capability")
        if body.facts.source_sku.lower() != row["source_sku"]:
            raise HTTPException(422, "Use a separate listing for a different source SKU")
        route = f"catalog/{org}/{lid}/revisions"
        payload = body.model_dump(mode="json")
        if result := replay(db, uid, route, key, payload):
            return result
        if row["current_revision"] != body.expected_revision:
            raise HTTPException(409, "Listing changed; reload before reviewing")
        revision = row["current_revision"] + 1
        db.execute(
            text(
                "INSERT INTO catalog_revision(listing_id,revision,facts,merchant_reviewed,"
                "author_id) VALUES (:id,:r,:f,true,:u)"
            ).bindparams(bindparam("f", type_=JSONB)),
            {"id": lid, "r": revision, "f": payload["facts"], "u": uid},
        )
        db.execute(
            text(
                "UPDATE catalog_listing SET current_revision=:r,state='draft',"
                "published_revision=NULL WHERE id=:id"
            ),
            {"r": revision, "id": lid},
        )
        signal_index(db, lid)
        audit(db, uid, "catalog.merchant_reviewed", lid)
        result = ListingRead(**read_listing(db, listing(db, org, lid, uid))).model_dump(mode="json")
        return remember(db, uid, route, key, payload, result)

    @router.get("/v1/admin/catalog/review-queue", response_model=list[ListingRead])
    def review_queue(db: Db, identity: Identity):
        uid = user(db, identity)
        require_staff_roles(db, uid, identity, {"super_admin", "content_moderation"})
        rows = db.execute(
            text(
                "SELECT l.* FROM catalog_listing l JOIN catalog_revision r "
                "ON r.listing_id=l.id AND r.revision=l.current_revision "
                "LEFT JOIN catalog_approval a ON a.listing_id=r.listing_id "
                "AND a.revision=r.revision "
                "WHERE l.state='draft' AND r.merchant_reviewed AND a.decision IS NULL "
                "ORDER BY l.created_at,l.id LIMIT 100"
            )
        ).mappings()
        audit(db, uid, "catalog.review_queue_read", uid)
        return [read_listing(db, row) for row in rows]

    @router.post("/v1/admin/catalog/{lid}/revisions/{revision}/review", response_model=ReviewChoice)
    def review(lid: UUID, revision: int, body: ReviewChoice, db: Db, identity: Identity, key: Key):
        uid = user(db, identity)
        require_staff_roles(db, uid, identity, {"super_admin", "content_moderation"})
        row = db.execute(
            text("SELECT current_revision FROM catalog_listing WHERE id=:id FOR UPDATE"),
            {"id": lid},
        ).first()
        route = f"catalog/{lid}/{revision}/approval"
        payload = body.model_dump(mode="json")
        if result := replay(db, uid, route, key, payload):
            return result
        if not row or row.current_revision != revision:
            raise HTTPException(409, "Review the current listing revision")
        if not db.scalar(
            text(
                "SELECT merchant_reviewed FROM catalog_revision "
                "WHERE listing_id=:id AND revision=:r"
            ),
            {"id": lid, "r": revision},
        ):
            raise HTTPException(409, "Merchant factual review required")
        if db.scalar(
            text(
                "SELECT EXISTS(SELECT 1 FROM catalog_approval WHERE listing_id=:id AND revision=:r)"
            ),
            {"id": lid, "r": revision},
        ):
            raise HTTPException(409, "Decision already recorded; create a new revision")
        db.execute(
            text(
                "INSERT INTO catalog_approval(listing_id,revision,decision,"
                "identifier_verified,reviewer_id) VALUES (:id,:r,:d,:v,:u)"
            ),
            {"id": lid, "r": revision, "d": body.decision, "v": body.identifier_verified, "u": uid},
        )
        audit(db, uid, "catalog.content_reviewed", lid)
        return remember(db, uid, route, key, payload, payload)

    @router.post(
        "/v1/organizations/{org}/catalog/listings/{lid}/publish", response_model=ListingRead
    )
    def publish(org: UUID, lid: UUID, body: PublishChoice, db: Db, identity: Identity):
        uid = user(db, identity)
        row = listing(db, org, lid, uid, write=True)
        if row["current_revision"] != body.revision:
            raise HTTPException(409, "Publish only the current reviewed revision")
        validated_revision(db, row, body.revision)
        if row["published_revision"] != body.revision:
            db.execute(
                text(
                    "UPDATE catalog_listing SET state='published',published_revision=:r "
                    "WHERE id=:id"
                ),
                {"id": lid, "r": body.revision},
            )
            signal_index(db, lid)
            audit(db, uid, "catalog.published", lid)
        return read_listing(db, listing(db, org, lid, uid))

    @router.post("/v1/organizations/{org}/catalog/publish-bulk", response_model=list[ListingRead])
    def publish_bulk(org: UUID, body: BulkPublication, db: Db, identity: Identity):
        # Stable lock ordering; transaction rollback protects the whole batch on any invalid item.
        return [
            publish(org, item.listing_id, PublishChoice(revision=item.revision), db, identity)
            for item in sorted(body.listings, key=lambda item: str(item.listing_id))
        ]

    @router.post(
        "/v1/organizations/{org}/catalog/listings/{lid}/withdraw", response_model=ListingRead
    )
    def withdraw(org: UUID, lid: UUID, db: Db, identity: Identity):
        uid = user(db, identity)
        listing(db, org, lid, uid, write=True)
        db.execute(
            text(
                "UPDATE catalog_listing SET state='withdrawn',published_revision=NULL WHERE id=:id"
            ),
            {"id": lid},
        )
        signal_index(db, lid)
        audit(db, uid, "catalog.withdrawn", lid)
        return read_listing(db, listing(db, org, lid, uid))

    @router.post(
        "/v1/organizations/{org}/catalog/listings/{lid}/rollback", response_model=ListingRead
    )
    def rollback(org: UUID, lid: UUID, body: PublishChoice, db: Db, identity: Identity):
        uid = user(db, identity)
        row = listing(db, org, lid, uid, write=True)
        if body.revision >= row["current_revision"]:
            raise HTTPException(409, "Rollback requires an earlier approved revision")
        validated_revision(db, row, body.revision)
        # Copy, do not rewind a version number; stale events can never re-publish old content.
        facts = db.scalar(
            text("SELECT facts FROM catalog_revision WHERE listing_id=:id AND revision=:r"),
            {"id": lid, "r": body.revision},
        )
        revision = row["current_revision"] + 1
        db.execute(
            text(
                "INSERT INTO catalog_revision(listing_id,revision,facts,merchant_reviewed,"
                "author_id) VALUES (:id,:r,:f,true,:u)"
            ).bindparams(bindparam("f", type_=JSONB)),
            {"id": lid, "r": revision, "f": facts, "u": uid},
        )
        db.execute(
            text(
                "UPDATE catalog_listing SET current_revision=:r,state='draft',"
                "published_revision=NULL WHERE id=:id"
            ),
            {"r": revision, "id": lid},
        )
        signal_index(db, lid)
        audit(db, uid, "catalog.rollback_draft", lid)
        return read_listing(db, listing(db, org, lid, uid))

    @router.post("/v1/recommendations/matches", response_model=MatchResult)
    def match_requirements(body: Requirement, db: Db, identity: Identity):
        return matches(db, user(db, identity), body)

    @router.post("/v1/recommendations/listings/{lid}", response_model=MatchResult)
    def qualified_detail(lid: UUID, body: Requirement, db: Db, identity: Identity):
        result = matches(db, user(db, identity), body, only_lid=lid)
        if not result["organic"]:
            raise HTTPException(404, "Listing is no longer eligible for this requirement")
        return result

    @router.post("/v1/me/saved-requirements", response_model=SavedRead, status_code=201)
    def save_requirement(body: Requirement, db: Db, identity: Identity, key: Key):
        uid = user(db, identity)
        payload = body.model_dump(mode="json")
        if result := replay(db, uid, "saved-requirements", key, payload):
            if result.get("deleted"):
                raise HTTPException(410, "Saved requirement was deleted")
            return result
        sid = uuid4()
        db.execute(
            text(
                "INSERT INTO saved_requirement(id,owner_id,requirement) VALUES (:id,:u,:r)"
            ).bindparams(bindparam("r", type_=JSONB)),
            {"id": sid, "u": uid, "r": payload},
        )
        audit(db, uid, "recommendation.saved", sid)
        return remember(
            db, uid, "saved-requirements", key, payload, {"id": str(sid), "requirement": payload}
        )

    @router.get("/v1/me/saved-requirements", response_model=list[SavedRead])
    def saved(db: Db, identity: Identity):
        uid = user(db, identity)
        return [
            dict(r)
            for r in db.execute(
                text(
                    "SELECT id,requirement FROM saved_requirement "
                    "WHERE owner_id=:u ORDER BY created_at,id LIMIT 100"
                ),
                {"u": uid},
            ).mappings()
        ]

    @router.delete("/v1/me/saved-requirements/{sid}", status_code=204)
    def delete_saved(sid: UUID, db: Db, identity: Identity):
        uid = user(db, identity)
        found = db.scalar(
            text("DELETE FROM saved_requirement WHERE id=:id AND owner_id=:u RETURNING id"),
            {"id": sid, "u": uid},
        )
        if not found:
            raise HTTPException(404, "Saved requirement not found")
        db.execute(
            text(
                "UPDATE idempotency_record SET response=:r WHERE user_id=:u "
                "AND route='saved-requirements' AND response->>'id'=:id"
            ).bindparams(bindparam("r", type_=JSONB)),
            {"r": {"deleted": True}, "u": uid, "id": str(sid)},
        )
        audit(db, uid, "recommendation.deleted", sid)

    @router.post(
        "/v1/organizations/{org}/catalog/listings/{lid}/enhancements",
        response_model=JobRead,
        status_code=201,
    )
    def enhance(
        org: UUID, lid: UUID, body: EnhancementRequest, db: Db, identity: Identity, key: Key
    ):
        from glam_api.catalog_jobs import provider

        uid = user(db, identity)
        row = listing(db, org, lid, uid, write=True)
        route = f"catalog/{org}/{lid}/enhance"
        payload = body.model_dump(mode="json")
        if result := replay(db, uid, route, key, payload):
            return result
        adapter = provider()
        if not adapter or not adapter.qualified:
            raise HTTPException(503, "No qualified catalog AI provider is connected")
        if row["current_revision"] != body.expected_revision:
            raise HTTPException(409, "Listing changed; review before processing")
        if not db.scalar(
            text(
                "SELECT EXISTS(SELECT 1 FROM catalog_media WHERE listing_id=:id "
                "AND original_id IS NULL AND rights_confirmed AND validated)"
            ),
            {"id": lid},
        ):
            raise HTTPException(409, "A validated rights-confirmed original is required")
        jid = uuid4()
        db.execute(
            text(
                "INSERT INTO catalog_ai_job(id,listing_id,base_revision,requester_id,"
                "provider,features,state) VALUES (:id,:l,:r,:u,:p,:f,'queued')"
            ).bindparams(bindparam("f", type_=JSONB)),
            {
                "id": jid,
                "l": lid,
                "r": body.expected_revision,
                "u": uid,
                "p": adapter.name,
                "f": body.features,
            },
        )
        audit(db, uid, "catalog.enhancement_queued", jid)
        return remember(
            db, uid, route, key, payload, {"id": str(jid), "state": "queued", "suggestions": None}
        )

    @router.get(
        "/v1/organizations/{org}/catalog/listings/{lid}/enhancements/{jid}", response_model=JobRead
    )
    def job(org: UUID, lid: UUID, jid: UUID, db: Db, identity: Identity):
        uid = user(db, identity)
        listing(db, org, lid, uid)
        row = (
            db.execute(
                text(
                    "SELECT id,state,suggestions FROM catalog_ai_job WHERE id=:id AND listing_id=:l"
                ),
                {"id": jid, "l": lid},
            )
            .mappings()
            .first()
        )
        if not row:
            raise HTTPException(404, "Enhancement not found")
        return dict(row)

    return router
