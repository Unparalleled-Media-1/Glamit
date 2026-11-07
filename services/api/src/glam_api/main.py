import hashlib
import json
from typing import Annotated
from uuid import UUID, uuid4

from fastapi import Depends, FastAPI, Header, HTTPException, Response
from fastapi.exceptions import RequestValidationError
from sqlalchemy import bindparam, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Session

from glam_api.auth import Principal, get_principal
from glam_api.catalog import build_catalog_router
from glam_api.contracts import (
    ConsentChoice,
    ConsentResult,
    CreditBalance,
    LookResult,
    NewLook,
    NewOrganization,
    NewRevision,
    OrganizationRead,
    OrganizationResult,
    PolicyRead,
    RevisionRead,
    RevisionResult,
    UserResult,
)
from glam_api.credits import balance
from glam_api.db import get_session
from glam_api.observability import http_error, request_evidence, validation_error
from glam_api.workspaces import build_router

app = FastAPI(title="GLAM AI", version="0.1.0", docs_url=None, redoc_url=None)
app.middleware("http")(request_evidence)
app.add_exception_handler(HTTPException, http_error)
app.add_exception_handler(RequestValidationError, validation_error)
Db = Annotated[Session, Depends(get_session, scope="function")]
Identity = Annotated[Principal, Depends(get_principal)]
Key = Annotated[str, Header(alias="Idempotency-Key", min_length=1, max_length=160)]


def digest(value) -> str:
    return hashlib.sha256(
        json.dumps(value, sort_keys=True, separators=(",", ":")).encode()
    ).hexdigest()


def user(db: Session, identity: Principal) -> UUID:
    db.execute(
        text(
            "INSERT INTO app_user(id,issuer,subject) VALUES (:id,:i,:s) "
            "ON CONFLICT (issuer,subject) DO NOTHING"
        ),
        {"id": uuid4(), "i": identity.issuer, "s": identity.subject},
    )
    uid = db.scalar(
        text("SELECT id FROM app_user WHERE issuer=:i AND subject=:s FOR UPDATE"),
        {"i": identity.issuer, "s": identity.subject},
    )
    db.execute(
        text("INSERT INTO credit_account(user_id) VALUES (:u) ON CONFLICT DO NOTHING"), {"u": uid}
    )
    return uid


def audit(db, uid, action, resource_id):
    db.execute(
        text("INSERT INTO audit_event(id,actor_id,action,resource_id) VALUES (:id,:u,:a,:r)"),
        {"id": uuid4(), "u": uid, "a": action, "r": resource_id},
    )


def replay(db, uid, route, key, body):
    row = db.execute(
        text(
            "SELECT request_hash,response FROM idempotency_record "
            "WHERE user_id=:u AND route=:r AND key=:k"
        ),
        {"u": uid, "r": route, "k": key},
    ).first()
    if row and row.request_hash != digest(body):
        raise HTTPException(409, "Idempotency key was used with a different request")
    return row.response if row else None


def remember(db, uid, route, key, body, result):
    statement = text(
        "INSERT INTO idempotency_record(user_id,route,key,request_hash,response) "
        "VALUES (:u,:r,:k,:h,:response)"
    ).bindparams(bindparam("response", type_=JSONB))
    db.execute(statement, {"u": uid, "r": route, "k": key, "h": digest(body), "response": result})
    return result


def owned_look(db, uid, look_id):
    row = (
        db.execute(
            text("SELECT * FROM look WHERE id=:id AND owner_id=:u FOR UPDATE"),
            {"id": look_id, "u": uid},
        )
        .mappings()
        .first()
    )
    if not row:
        raise HTTPException(404, "Look not found")
    return row


def require_look_consent(db, uid):
    latest = db.execute(
        text(
            "SELECT c.action,c.policy_id FROM consent_event c "
            "JOIN policy_document p ON p.id=c.policy_id "
            "WHERE c.user_id=:u AND p.purpose='private_look_storage' "
            "ORDER BY c.sequence DESC LIMIT 1"
        ),
        {"u": uid},
    ).first()
    policy_id = db.scalar(
        text(
            "SELECT id FROM policy_document WHERE purpose='private_look_storage' "
            "ORDER BY approved_at DESC,id DESC LIMIT 1"
        )
    )
    if not latest or latest.action != "granted" or latest.policy_id != policy_id:
        raise HTTPException(403, "Current private look storage consent is required")


@app.get("/health/live")
def live():
    return {"status": "alive"}


@app.get("/health/ready")
def ready(db: Db):
    from glam_api.config import get_settings

    head = db.scalar(text("SELECT version_num FROM alembic_version"))
    if head != "0008_catalog_market_policy":
        raise HTTPException(503, "Database migration is not current")
    if not get_settings().oidc_issuer:
        raise HTTPException(503, "Identity provider is not configured")
    return {"status": "ready", "scope": "foundation_api"}


@app.get("/v1/me", response_model=UserResult)
def me(db: Db, identity: Identity):
    return {"id": str(user(db, identity))}


@app.get("/v1/me/credits", response_model=CreditBalance)
def credits(db: Db, identity: Identity):
    return balance(db, user(db, identity))


@app.get("/v1/policies", response_model=list[PolicyRead])
def policies(db: Db):
    return [
        dict(row)
        for row in db.execute(
            text(
                "SELECT id,purpose,version,content FROM policy_document "
                "ORDER BY purpose,approved_at"
            )
        ).mappings()
    ]


@app.post("/v1/policies/{policy_id}/consent", status_code=201, response_model=ConsentResult)
def consent(policy_id: UUID, body: ConsentChoice, db: Db, identity: Identity, key: Key):
    uid = user(db, identity)
    purpose = db.scalar(text("SELECT purpose FROM policy_document WHERE id=:id"), {"id": policy_id})
    if not purpose:
        raise HTTPException(404, "Policy not found")
    route = f"consent/{policy_id}"
    payload = body.model_dump(mode="json")
    if result := replay(db, uid, route, key, payload):
        return result
    event_id = uuid4()
    db.execute(
        text("INSERT INTO consent_event(id,user_id,policy_id,action) VALUES (:id,:u,:p,:a)"),
        {"id": event_id, "u": uid, "p": policy_id, "a": body.action},
    )
    if body.action == "withdrawn":
        db.execute(
            text("INSERT INTO outbox_event(id,event_type,aggregate_id) VALUES (:id,:t,:a)"),
            {"id": uuid4(), "t": "privacy.consent_withdrawn.v1", "a": event_id},
        )
    audit(db, uid, f"consent.{body.action}", event_id)
    return remember(db, uid, route, key, payload, {"id": str(event_id), "action": body.action})


@app.post("/v1/organizations", status_code=201, response_model=OrganizationResult)
def create_organization(body: NewOrganization, db: Db, identity: Identity, key: Key):
    uid = user(db, identity)
    payload = body.model_dump(mode="json")
    if result := replay(db, uid, "organizations", key, payload):
        return result
    org_id = uuid4()
    db.execute(
        text("INSERT INTO organization(id,name) VALUES (:id,:name)"),
        {"id": org_id, "name": body.name},
    )
    db.execute(
        text(
            "INSERT INTO organization_member(organization_id,user_id,role) VALUES (:o,:u,'owner')"
        ),
        {"o": org_id, "u": uid},
    )
    audit(db, uid, "organization.created", org_id)
    return remember(db, uid, "organizations", key, payload, {"id": str(org_id), "name": body.name})


@app.get("/v1/organizations/{org_id}", response_model=OrganizationRead)
def get_organization(org_id: UUID, db: Db, identity: Identity):
    uid = user(db, identity)
    row = (
        db.execute(
            text(
                "SELECT o.id,o.name,m.role FROM organization o "
                "JOIN organization_member m ON m.organization_id=o.id "
                "WHERE o.id=:id AND m.user_id=:u AND m.active AND NOT o.suspended"
            ),
            {"id": org_id, "u": uid},
        )
        .mappings()
        .first()
    )
    if not row:
        raise HTTPException(404, "Organization not found")
    return dict(row)


@app.post("/v1/looks", status_code=201, response_model=LookResult)
def create_look(body: NewLook, db: Db, identity: Identity, key: Key):
    uid = user(db, identity)
    require_look_consent(db, uid)
    payload = body.model_dump(mode="json")
    if result := replay(db, uid, "looks", key, payload):
        return result
    look_id = uuid4()
    db.execute(
        text("INSERT INTO look(id,owner_id,title,source_type) VALUES (:id,:u,:t,'user_authored')"),
        {"id": look_id, "u": uid, "t": body.title},
    )
    audit(db, uid, "look.created", look_id)
    return remember(db, uid, "looks", key, payload, {"id": str(look_id), **payload})


@app.post("/v1/looks/{look_id}/revisions", status_code=201, response_model=RevisionResult)
def revise_look(look_id: UUID, body: NewRevision, db: Db, identity: Identity, key: Key):
    uid = user(db, identity)
    require_look_consent(db, uid)
    owned_look(db, uid, look_id)
    payload = body.model_dump(mode="json")
    route = f"looks/{look_id}/revisions"
    if result := replay(db, uid, route, key, payload):
        return result
    current = db.scalar(
        text("SELECT coalesce(max(revision_no),0) FROM look_revision WHERE look_id=:id"),
        {"id": look_id},
    )
    if body.base_revision != current:
        raise HTTPException(412, "Look revision changed; reload before editing")
    revision_id = uuid4()
    content_hash = digest(payload["components"])
    db.execute(
        text(
            "INSERT INTO look_revision(id,look_id,revision_no,components,content_hash) "
            "VALUES (:id,:look,:n,:c,:h)"
        ).bindparams(bindparam("c", type_=JSONB)),
        {
            "id": revision_id,
            "look": look_id,
            "n": current + 1,
            "c": payload["components"],
            "h": content_hash,
        },
    )
    audit(db, uid, "look.revised", revision_id)
    return remember(
        db,
        uid,
        route,
        key,
        payload,
        {"id": str(revision_id), "revision_no": current + 1, "content_hash": content_hash},
    )


@app.get("/v1/looks/{look_id}/revisions/{revision_no}", response_model=RevisionRead)
def get_revision(look_id: UUID, revision_no: int, db: Db, identity: Identity):
    uid = user(db, identity)
    owned_look(db, uid, look_id)
    row = (
        db.execute(
            text(
                "SELECT id,revision_no,components,content_hash FROM look_revision "
                "WHERE look_id=:id AND revision_no=:n"
            ),
            {"id": look_id, "n": revision_no},
        )
        .mappings()
        .first()
    )
    if not row:
        raise HTTPException(404, "Revision not found")
    return dict(row)


@app.delete("/v1/looks/{look_id}", status_code=204)
def delete_look(look_id: UUID, db: Db, identity: Identity):
    uid = user(db, identity)
    owned_look(db, uid, look_id)
    db.execute(text("DELETE FROM look WHERE id=:id"), {"id": look_id})
    # Remove cached private revision bodies; keep only minimal deletion audit.
    db.execute(
        text(
            "DELETE FROM idempotency_record WHERE user_id=:u AND "
            "(route=:r OR (route='looks' AND response->>'id'=:id))"
        ),
        {"u": uid, "r": f"looks/{look_id}/revisions", "id": str(look_id)},
    )
    audit(db, uid, "look.deleted", look_id)
    return Response(status_code=204)


app.include_router(build_router(user, audit, replay, remember))

app.include_router(build_catalog_router(user, audit, replay, remember))
