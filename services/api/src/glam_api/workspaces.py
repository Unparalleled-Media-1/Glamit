"""Server-side workspace authorization. The client cannot activate capabilities or roles."""

from datetime import datetime
from typing import Annotated, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import bindparam, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Session

from glam_api.auth import Principal, get_principal
from glam_api.db import get_session

Workspace = Literal["merchant", "advertiser", "professional", "creator", "affiliate"]
Db = Annotated[Session, Depends(get_session, scope="function")]
Identity = Annotated[Principal, Depends(get_principal)]
Key = Annotated[str, Header(alias="Idempotency-Key", min_length=1, max_length=160)]
WRITERS = {
    "merchant": {"catalog_manager"},
    "advertiser": {"campaign_manager"},
    "professional": {"booking_manager"},
    "creator": {"creator"},
    "affiliate": {"affiliate"},
}


class Strict(BaseModel):
    model_config = ConfigDict(extra="forbid")


class Draft(Strict):
    title: str = Field(min_length=1, max_length=160, pattern=r".*\S.*")
    notes: str = Field(default="", max_length=4000)


class DraftRead(Draft):
    id: UUID
    revision: int
    updated_at: datetime


class RoutineStep(Strict):
    text: str = Field(min_length=1, max_length=500, pattern=r".*\S.*")
    done: bool = False


class Routine(Strict):
    title: str = Field(min_length=1, max_length=160, pattern=r".*\S.*")
    steps: list[RoutineStep] = Field(min_length=1, max_length=30)


class RoutineRead(Routine):
    id: UUID
    revision: int
    updated_at: datetime


class WorkspaceRead(Strict):
    organization_id: UUID
    name: str
    workspace: Workspace
    can_write: bool


class RoutineUpdate(Routine):
    expected_revision: int = Field(ge=1)


class DraftUpdate(Draft):
    expected_revision: int = Field(ge=1)


class Invite(Strict):
    recipient_id: UUID
    role: Literal[
        "catalog_manager", "campaign_manager", "booking_manager", "creator", "affiliate", "analyst"
    ]


class InviteRead(Strict):
    id: UUID
    state: Literal["pending", "accepted", "revoked"]


class InvitationSummary(InviteRead):
    organization_id: UUID
    name: str
    workspace: Workspace
    role: str
    expires_at: datetime


class StaffContext(Strict):
    roles: list[str]
    modules: list[str]
    operational_actions_enabled: Literal[False] = False
    catalog_review_enabled: bool = False


class UnavailableResult(Strict):
    code: str
    detail: str


def eligible(db, uid):
    return bool(
        db.scalar(
            text(
                "SELECT EXISTS(SELECT 1 FROM account_eligibility "
                "WHERE user_id=:u AND age_band='eligible_adult' AND expires_at>now())"
            ),
            {"u": uid},
        )
    )


def authorize(db, uid, org, workspace, write=False):
    # Read authoritative state on every call. Unknown tenants and outsiders get identical 404s.
    row = db.execute(
        text(
            "SELECT m.role FROM organization_member m JOIN organization o "
            "ON o.id=m.organization_id "
            "JOIN workspace_capability c ON c.organization_id=o.id "
            "WHERE m.user_id=:u AND o.id=:o AND m.active AND NOT o.suspended "
            "AND c.workspace=:w AND c.status='verified' AND c.expires_at>now() FOR SHARE OF m,o,c"
        ),
        {"u": uid, "o": org, "w": workspace},
    ).first()
    if not row or not eligible(db, uid):
        raise HTTPException(404, "Workspace not available")
    roles = set(
        db.scalars(
            text(
                "SELECT role FROM workspace_role WHERE organization_id=:o "
                "AND user_id=:u AND workspace=:w FOR SHARE"
            ),
            {"u": uid, "o": org, "w": workspace},
        )
    )
    if row.role == "owner":
        roles.add("admin")
    if not roles:
        raise HTTPException(404, "Workspace not available")
    can_write = bool(roles & ({"admin"} | WRITERS[workspace]))
    if write and not can_write:
        raise HTTPException(403, "Workspace write permission required")
    return can_write


def require_staff_roles(db, uid, identity, allowed=None):
    import time

    age = time.time() - (identity.authenticated_at or 0)
    if identity.assurance != "aal2" or not 0 <= age <= 300 or not eligible(db, uid):
        raise HTTPException(403, "Fresh privileged verification required")
    roles = list(
        db.scalars(
            text(
                "SELECT role FROM staff_grant WHERE user_id=:u AND active AND expires_at>now() "
                "ORDER BY role FOR SHARE"
            ),
            {"u": uid},
        )
    )
    if not roles or (allowed is not None and not set(roles) & allowed):
        raise HTTPException(403, "Staff authorization required")
    return roles


def build_router(user, audit, replay, remember):
    router = APIRouter()

    @router.get("/v1/me/workspaces", response_model=list[WorkspaceRead])
    def list_workspaces(db: Db, identity: Identity):
        uid = user(db, identity)
        if not eligible(db, uid):
            return []
        rows = db.execute(
            text(
                "SELECT o.id AS organization_id,o.name,c.workspace,m.role "
                "FROM organization o JOIN organization_member m ON m.organization_id=o.id "
                "JOIN workspace_capability c ON c.organization_id=o.id "
                "WHERE m.user_id=:u AND m.active AND NOT o.suspended "
                "AND c.status='verified' AND c.expires_at>now() ORDER BY o.name,c.workspace"
            ),
            {"u": uid},
        ).mappings()
        result = []
        for row in rows:
            try:
                can_write = authorize(db, uid, row["organization_id"], row["workspace"])
            except HTTPException:
                continue
            result.append(
                {
                    "organization_id": row["organization_id"],
                    "name": row["name"],
                    "workspace": row["workspace"],
                    "can_write": can_write,
                }
            )
        return result

    @router.get(
        "/v1/organizations/{org}/workspaces/{workspace}/drafts", response_model=list[DraftRead]
    )
    def drafts(org: UUID, workspace: Workspace, db: Db, identity: Identity):
        uid = user(db, identity)
        authorize(db, uid, org, workspace)
        return [
            dict(r)
            for r in db.execute(
                text(
                    "SELECT id,title,notes,revision,updated_at FROM workspace_draft "
                    "WHERE organization_id=:o AND workspace=:w ORDER BY "
                    "updated_at DESC,id LIMIT 100"
                ),
                {"o": org, "w": workspace},
            ).mappings()
        ]

    @router.post(
        "/v1/organizations/{org}/workspaces/{workspace}/drafts",
        response_model=DraftRead,
        status_code=201,
    )
    def create_draft(
        org: UUID, workspace: Workspace, body: Draft, db: Db, identity: Identity, key: Key
    ):
        from uuid import uuid4

        uid = user(db, identity)
        authorize(db, uid, org, workspace, write=True)
        route = f"workspace/{org}/{workspace}/drafts"
        payload = body.model_dump(mode="json")
        if result := replay(db, uid, route, key, payload):
            if result.get("deleted"):
                raise HTTPException(410, "Draft was deleted")
            return result
        row = (
            db.execute(
                text(
                    "INSERT INTO "
                    "workspace_draft(id,organization_id,workspace,author_id,title,notes) "
                    "VALUES (:id,:o,:w,:u,:title,:notes) RETURNING "
                    "id,title,notes,revision,updated_at"
                ),
                {"id": uuid4(), "o": org, "w": workspace, "u": uid, **payload},
            )
            .mappings()
            .one()
        )
        audit(db, uid, "workspace.draft_created", row["id"])
        result = DraftRead(**dict(row)).model_dump(mode="json")
        return remember(db, uid, route, key, payload, result)

    @router.delete("/v1/organizations/{org}/workspaces/{workspace}/drafts/{draft}", status_code=204)
    def delete_draft(org: UUID, workspace: Workspace, draft: UUID, db: Db, identity: Identity):
        uid = user(db, identity)
        authorize(db, uid, org, workspace, write=True)
        found = db.scalar(
            text(
                "DELETE FROM workspace_draft WHERE id=:id AND organization_id=:o AND workspace=:w "
                "RETURNING id"
            ),
            {"id": draft, "o": org, "w": workspace},
        )
        if not found:
            raise HTTPException(404, "Draft not found")
        db.execute(
            text(
                "UPDATE idempotency_record SET response=:response "
                "WHERE user_id=:u AND route=:route "
                "AND response->>'id'=:id"
            ).bindparams(bindparam("response", type_=JSONB)),
            {
                "response": {"deleted": True},
                "u": uid,
                "route": f"workspace/{org}/{workspace}/drafts",
                "id": str(draft),
            },
        )
        audit(db, uid, "workspace.draft_deleted", draft)

    @router.get("/v1/me/routines", response_model=list[RoutineRead])
    def routines(db: Db, identity: Identity):
        uid = user(db, identity)
        return [
            dict(r)
            for r in db.execute(
                text(
                    "SELECT id,title,steps,revision,updated_at FROM personal_routine "
                    "WHERE owner_id=:u ORDER BY updated_at DESC,id LIMIT 100"
                ),
                {"u": uid},
            ).mappings()
        ]

    @router.post("/v1/me/routines", response_model=RoutineRead, status_code=201)
    def save_routine(body: Routine, db: Db, identity: Identity, key: Key):
        from uuid import uuid4

        uid = user(db, identity)
        payload = body.model_dump(mode="json")
        if result := replay(db, uid, "routines", key, payload):
            if result.get("deleted"):
                raise HTTPException(410, "Routine was deleted")
            return result
        row = (
            db.execute(
                text(
                    "INSERT INTO personal_routine(id,owner_id,title,steps) "
                    "VALUES (:id,:u,:title,:steps) "
                    "RETURNING id,title,steps,revision,updated_at"
                ).bindparams(bindparam("steps", type_=JSONB)),
                {"id": uuid4(), "u": uid, **payload},
            )
            .mappings()
            .one()
        )
        audit(db, uid, "routine.created", row["id"])
        return remember(
            db, uid, "routines", key, payload, RoutineRead(**dict(row)).model_dump(mode="json")
        )

    @router.delete("/v1/me/routines/{routine}", status_code=204)
    def delete_routine(routine: UUID, db: Db, identity: Identity):
        uid = user(db, identity)
        found = db.scalar(
            text("DELETE FROM personal_routine WHERE id=:id AND owner_id=:u RETURNING id"),
            {"id": routine, "u": uid},
        )
        if not found:
            raise HTTPException(404, "Routine not found")
        db.execute(
            text(
                "UPDATE idempotency_record SET response=:response "
                "WHERE user_id=:u AND route='routines' "
                "AND response->>'id'=:id"
            ).bindparams(bindparam("response", type_=JSONB)),
            {"response": {"deleted": True}, "u": uid, "id": str(routine)},
        )
        audit(db, uid, "routine.deleted", routine)

    @router.put("/v1/me/routines/{routine}", response_model=RoutineRead)
    def update_routine(routine: UUID, body: RoutineUpdate, db: Db, identity: Identity):
        uid = user(db, identity)
        row = db.execute(
            text("SELECT revision FROM personal_routine WHERE id=:id AND owner_id=:u FOR UPDATE"),
            {"id": routine, "u": uid},
        ).first()
        if not row:
            raise HTTPException(404, "Routine not found")
        if row.revision != body.expected_revision:
            raise HTTPException(409, "Routine changed; reload before editing")
        result = (
            db.execute(
                text(
                    "UPDATE personal_routine SET title=:title,steps=:steps,revision=revision+1,"
                    "updated_at=now() WHERE id=:id AND owner_id=:u "
                    "RETURNING id,title,steps,revision,updated_at"
                ).bindparams(bindparam("steps", type_=JSONB)),
                {
                    "id": routine,
                    "u": uid,
                    "title": body.title,
                    "steps": [step.model_dump() for step in body.steps],
                },
            )
            .mappings()
            .one()
        )
        audit(db, uid, "routine.updated", routine)
        return dict(result)

    @router.put(
        "/v1/organizations/{org}/workspaces/{workspace}/drafts/{draft}", response_model=DraftRead
    )
    def update_draft(
        org: UUID, workspace: Workspace, draft: UUID, body: DraftUpdate, db: Db, identity: Identity
    ):
        uid = user(db, identity)
        authorize(db, uid, org, workspace, write=True)
        row = db.execute(
            text(
                "SELECT revision FROM workspace_draft WHERE id=:id AND organization_id=:o "
                "AND workspace=:w FOR UPDATE"
            ),
            {"id": draft, "o": org, "w": workspace},
        ).first()
        if not row:
            raise HTTPException(404, "Draft not found")
        if row.revision != body.expected_revision:
            raise HTTPException(409, "Draft changed; reload before editing")
        result = (
            db.execute(
                text(
                    "UPDATE workspace_draft SET title=:title,notes=:notes,revision=revision+1,"
                    "updated_at=now() WHERE id=:id AND organization_id=:o AND workspace=:w "
                    "RETURNING id,title,notes,revision,updated_at"
                ),
                {"id": draft, "o": org, "w": workspace, "title": body.title, "notes": body.notes},
            )
            .mappings()
            .one()
        )
        audit(db, uid, "workspace.draft_updated", draft)
        return dict(result)

    def require_owner(db, uid, org, workspace):
        authorize(db, uid, org, workspace, write=True)
        if (
            db.scalar(
                text(
                    "SELECT role FROM organization_member WHERE organization_id=:o AND user_id=:u"
                ),
                {"o": org, "u": uid},
            )
            != "owner"
        ):
            raise HTTPException(403, "Organization owner required")

    @router.post(
        "/v1/organizations/{org}/workspaces/{workspace}/invitations",
        response_model=InviteRead,
        status_code=201,
    )
    def invite(org: UUID, workspace: Workspace, body: Invite, db: Db, identity: Identity, key: Key):
        from uuid import uuid4

        uid = user(db, identity)
        require_owner(db, uid, org, workspace)
        if body.role not in WRITERS[workspace] | {"analyst"}:
            raise HTTPException(422, "Role does not apply to this workspace")
        route = f"workspace/{org}/{workspace}/invite"
        payload = body.model_dump(mode="json")
        if result := replay(db, uid, route, key, payload):
            return result
        if body.recipient_id == uid or not db.scalar(
            text("SELECT EXISTS(SELECT 1 FROM app_user WHERE id=:id)"), {"id": body.recipient_id}
        ):
            raise HTTPException(422, "A different existing recipient account is required")
        invitation = uuid4()
        db.execute(
            text(
                "INSERT INTO workspace_invitation(id,organization_id,workspace,recipient_id,"
                "invited_by,role,expires_at) VALUES (:id,:o,:w,:r,:u,:role,now()+interval '7 days')"
            ),
            {
                "id": invitation,
                "o": org,
                "w": workspace,
                "r": body.recipient_id,
                "u": uid,
                "role": body.role,
            },
        )
        audit(db, uid, "workspace.invited", invitation)
        return remember(db, uid, route, key, payload, {"id": str(invitation), "state": "pending"})

    @router.get("/v1/me/workspace-invitations", response_model=list[InvitationSummary])
    def invitations(db: Db, identity: Identity):
        uid = user(db, identity)
        if not eligible(db, uid):
            return []
        rows = db.execute(
            text(
                "SELECT i.id,i.state,i.organization_id,o.name,i.workspace,i.role,i.expires_at,"
                "i.invited_by FROM workspace_invitation i "
                "JOIN organization o ON o.id=i.organization_id "
                "WHERE i.recipient_id=:u AND i.state='pending' AND i.expires_at>now() "
                "ORDER BY i.expires_at,i.id"
            ),
            {"u": uid},
        ).mappings()
        result = []
        for row in rows:
            try:
                require_owner(db, row["invited_by"], row["organization_id"], row["workspace"])
            except HTTPException:
                continue
            result.append({k: v for k, v in row.items() if k != "invited_by"})
        return result

    @router.post("/v1/me/workspace-invitations/{invitation}/accept", response_model=InviteRead)
    def accept(invitation: UUID, db: Db, identity: Identity):
        uid = user(db, identity)
        row = (
            db.execute(
                text(
                    "SELECT * FROM workspace_invitation WHERE id=:id AND recipient_id=:u "
                    "AND expires_at>now() AND state!='revoked' FOR UPDATE"
                ),
                {"id": invitation, "u": uid},
            )
            .mappings()
            .first()
        )
        if not row or not eligible(db, uid):
            raise HTTPException(404, "Invitation not available")
        # Revalidate the inviting owner's authority; stale invitations cannot revive permissions.
        require_owner(db, row["invited_by"], row["organization_id"], row["workspace"])
        membership = db.execute(
            text(
                "SELECT active FROM organization_member WHERE organization_id=:o AND user_id=:u "
                "FOR UPDATE"
            ),
            {"o": row["organization_id"], "u": uid},
        ).first()
        if membership and not membership.active:
            raise HTTPException(404, "Invitation not available")
        if row["state"] == "accepted":
            return {"id": invitation, "state": "accepted"}
        db.execute(
            text(
                "INSERT INTO "
                "organization_member(organization_id,user_id,role) VALUES (:o,:u,'analyst') "
                "ON CONFLICT DO NOTHING"
            ),
            {"o": row["organization_id"], "u": uid},
        )
        db.execute(
            text(
                "INSERT INTO workspace_role(organization_id,user_id,workspace,role) "
                "VALUES (:o,:u,:w,:r) ON CONFLICT DO NOTHING"
            ),
            {"o": row["organization_id"], "u": uid, "w": row["workspace"], "r": row["role"]},
        )
        db.execute(
            text("UPDATE workspace_invitation SET state='accepted' WHERE id=:id"),
            {"id": invitation},
        )
        audit(db, uid, "workspace.invitation_accepted", invitation)
        return {"id": invitation, "state": "accepted"}

    @router.delete(
        "/v1/organizations/{org}/workspaces/{workspace}/invitations/{invitation}", status_code=204
    )
    def revoke_invite(
        org: UUID, workspace: Workspace, invitation: UUID, db: Db, identity: Identity
    ):
        uid = user(db, identity)
        require_owner(db, uid, org, workspace)
        found = db.scalar(
            text(
                "UPDATE workspace_invitation SET state='revoked' "
                "WHERE id=:id AND organization_id=:o AND workspace=:w RETURNING id"
            ),
            {"id": invitation, "o": org, "w": workspace},
        )
        if not found:
            raise HTTPException(404, "Invitation not available")
        audit(db, uid, "workspace.invitation_revoked", invitation)

    @router.delete(
        "/v1/organizations/{org}/workspaces/{workspace}/roles/{member}/{role}", status_code=204
    )
    def revoke_role(
        org: UUID,
        workspace: Workspace,
        member: UUID,
        role: Literal[
            "catalog_manager",
            "campaign_manager",
            "booking_manager",
            "creator",
            "affiliate",
            "analyst",
        ],
        db: Db,
        identity: Identity,
    ):
        uid = user(db, identity)
        require_owner(db, uid, org, workspace)
        found = db.scalar(
            text(
                "DELETE FROM workspace_role WHERE organization_id=:o AND workspace=:w "
                "AND user_id=:u AND role=:r RETURNING user_id"
            ),
            {"o": org, "w": workspace, "u": member, "r": role},
        )
        if not found:
            raise HTTPException(404, "Role grant not found")
        audit(db, uid, "workspace.role_revoked", member)

    @router.get("/v1/admin/context", response_model=StaffContext)
    def staff_context(db: Db, identity: Identity):
        uid = user(db, identity)
        roles = require_staff_roles(db, uid, identity)
        modules = {
            "super_admin": [
                "executive",
                "users",
                "ai",
                "content",
                "merchants",
                "professionals",
                "advertising",
                "commerce",
                "subscriptions",
                "creators",
                "regions",
                "trust",
                "privacy",
                "analytics",
                "configuration",
            ],
            "support": ["users", "trust", "privacy"],
            "finance": ["commerce", "subscriptions"],
            "ai_operations": ["ai"],
            "content_moderation": ["content", "creators"],
            "trust_safety": ["trust"],
            "compliance": ["privacy", "trust"],
            "regional_operations": ["regions"],
            "analyst": ["analytics"],
        }
        audit(db, uid, "staff.context_read", uid)
        return {
            "roles": roles,
            "modules": sorted({m for role in roles for m in modules[role]}),
            "operational_actions_enabled": False,
            "catalog_review_enabled": bool(set(roles) & {"super_admin", "content_moderation"}),
        }

    @router.post("/v1/analysis/requests", response_model=UnavailableResult, status_code=503)
    def analysis_unavailable(identity: Identity):
        # No raw-media input accepted, no credit reserve or side effect before qualification.
        return {
            "code": "analysis_not_connected",
            "detail": "Identity, age/market/consent policy, private storage and analysis provider "
            "must be qualified before upload or dispatch.",
        }

    return router
