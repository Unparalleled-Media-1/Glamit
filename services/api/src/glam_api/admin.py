# ruff: noqa: E501
"""Platform administration: read-only, role-scoped, audited views for each staff module.

Every endpoint requires a fresh MFA (aal2) staff session and an active `staff_grant` whose role owns the
module. Responses are aggregates and short, de-identified tables: no private photos, analysis results,
generated images, emails or secrets ever leave through here. There are NO write operations; operational
actions stay disabled until each has its own approved permission, evidence and audit design.
"""

import os
from datetime import UTC, datetime
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session

from glam_api.auth import Principal, get_principal
from glam_api.db import get_session
from glam_api.workspaces import STAFF_MODULES, require_staff_roles

Db = Annotated[Session, Depends(get_session, scope="function")]
Identity = Annotated[Principal, Depends(get_principal)]
ROW_LIMIT = 25
TITLES = {
    "executive": "Executive Overview",
    "users": "User Management",
    "ai": "AI Operations",
    "content": "Beauty Content",
    "merchants": "Merchant Management",
    "professionals": "Professional Management",
    "advertising": "Advertising",
    "commerce": "Commerce",
    "subscriptions": "Subscriptions",
    "creators": "Creators & Partners",
    "regions": "Regional Operations",
    "trust": "Trust & Safety",
    "privacy": "Privacy",
    "analytics": "Analytics",
    "configuration": "System Configuration",
}


class Metric(BaseModel):
    label: str
    value: str


class Table(BaseModel):
    title: str
    columns: list[str]
    rows: list[list[str]]


class ModuleView(BaseModel):
    module: str
    title: str
    available: bool
    reason: str | None = None
    generated_at: datetime
    read_only: bool = True
    metrics: list[Metric] = []
    tables: list[Table] = []


def has(db, table: str) -> bool:
    return db.scalar(text("SELECT to_regclass(:t)"), {"t": f"public.{table}"}) is not None


def one(db, sql: str, **args) -> Any:
    return db.scalar(text(sql), args)


def rows(db, sql: str, **args) -> list[list[str]]:
    return [["" if v is None else str(v) for v in r] for r in db.execute(text(sql), args).all()]


def by_state(db, table: str, label: str) -> list[Metric]:
    if not has(db, table):
        return [Metric(label=label, value="Not migrated")]
    found = {
        r[0]: r[1] for r in db.execute(text(f"SELECT state, count(*) FROM {table} GROUP BY 1"))
    }
    return [Metric(label=f"{label}: {k}", value=str(v)) for k, v in sorted(found.items())] or [
        Metric(label=label, value="0")
    ]


def short(column: str) -> str:
    return f"left({column}::text, 8)"


def view(module: str, db, **parts) -> ModuleView:
    return ModuleView(
        module=module, title=TITLES[module], available=True, generated_at=datetime.now(UTC), **parts
    )


def unavailable(module: str, reason: str) -> ModuleView:
    return ModuleView(
        module=module,
        title=TITLES[module],
        available=False,
        reason=reason,
        generated_at=datetime.now(UTC),
    )


def executive(db):
    metrics = [
        Metric(label="Users", value=str(one(db, "SELECT count(*) FROM app_user"))),
        Metric(
            label="New users, 7 days",
            value=str(
                one(db, "SELECT count(*) FROM app_user WHERE created_at>now()-interval '7 days'")
            ),
        ),
        Metric(label="Organizations", value=str(one(db, "SELECT count(*) FROM organizations"))),
        Metric(
            label="Suspended organizations",
            value=str(one(db, "SELECT count(*) FROM organizations WHERE suspended")),
        ),
        Metric(
            label="Audit events, 24 hours",
            value=str(
                one(db, "SELECT count(*) FROM audit_event WHERE created_at>now()-interval '1 day'")
            ),
        ),
        Metric(
            label="Undelivered outbox events",
            value=str(one(db, "SELECT count(*) FROM outbox_event WHERE delivered_at IS NULL")),
        ),
        *by_state(db, "private_media", "Private media"),
        *by_state(db, "analysis_job", "Analysis jobs"),
        *by_state(db, "tryon_job", "Try-on jobs"),
    ]
    return view("executive", db, metrics=metrics)


def users(db):
    bands = rows(db, "SELECT age_band, count(*) FROM account_eligibility GROUP BY 1 ORDER BY 1")
    latest = rows(
        db,
        f"""SELECT {short("u.id")}, to_char(u.created_at,'YYYY-MM-DD'), coalesce(e.age_band,'none'),
          coalesce(e.expires_at>now(),false),
          (SELECT count(*) FROM consent_event c WHERE c.user_id=u.id AND c.action='granted'),
          (SELECT count(*) FROM consent_event c WHERE c.user_id=u.id AND c.action='withdrawn')
          FROM app_user u LEFT JOIN account_eligibility e ON e.user_id=u.id
          ORDER BY u.created_at DESC LIMIT {ROW_LIMIT}""",
    )
    return view(
        "users",
        db,
        metrics=[
            Metric(label="Users", value=str(one(db, "SELECT count(*) FROM app_user"))),
            Metric(
                label="Eligible adults (not expired)",
                value=str(
                    one(
                        db,
                        "SELECT count(*) FROM account_eligibility WHERE age_band='eligible_adult' "
                        "AND expires_at>now()",
                    )
                ),
            ),
        ],
        tables=[
            Table(title="Eligibility bands", columns=["Band", "Users"], rows=bands),
            Table(
                title="Latest users (pseudonymous id prefix; no contact details held here)",
                columns=[
                    "Id",
                    "Created",
                    "Age band",
                    "Eligibility valid",
                    "Consents granted",
                    "Withdrawn",
                ],
                rows=latest,
            ),
        ],
    )


def ai(db):
    tables, metrics = [], []
    for table, label in (("analysis_job", "Analysis"), ("tryon_job", "Try-on")):
        metrics += by_state(db, table, f"{label} jobs")
        if has(db, table):
            tables.append(
                Table(
                    title=f"{label}: failure codes (all time)",
                    columns=["Error code", "Jobs"],
                    rows=rows(
                        db,
                        f"SELECT error_code, count(*) FROM {table} WHERE error_code IS NOT NULL "
                        "GROUP BY 1 ORDER BY 2 DESC LIMIT 15",
                    ),
                )
            )
    if has(db, "generation_cost_summary"):
        tables.append(
            Table(
                title="Provider cost events (micros of billed currency; test rows flagged)",
                columns=[
                    "Provider",
                    "Outcome",
                    "Synthetic test",
                    "Events",
                    "Billed micros",
                    "Credits",
                ],
                rows=rows(
                    db,
                    "SELECT provider,outcome,synthetic_test,events,billed_cost_micros,credit_units "
                    "FROM generation_cost_summary ORDER BY provider,outcome",
                ),
            )
        )
        tables.append(
            Table(
                title="Credit price rules (none exist until the owner approves one)",
                columns=["Feature", "Version", "Credits", "Approved"],
                rows=rows(
                    db,
                    "SELECT feature,version,credit_units,approved_at IS NOT NULL "
                    "FROM generation_price_rule ORDER BY feature,version",
                ),
            )
        )
    return view("ai", db, metrics=metrics, tables=tables)


def content(db):
    if not has(db, "catalog_listing"):
        return unavailable("content", "Catalog tables are not present in this database.")
    return view(
        "content",
        db,
        metrics=by_state(db, "catalog_listing", "Listings"),
        tables=[
            Table(
                title="Latest listings",
                columns=["Id", "Workspace", "State", "Revision", "Published revision", "Created"],
                rows=rows(
                    db,
                    f"SELECT {short('id')}, workspace, state, current_revision, "
                    "coalesce(published_revision::text,''), to_char(created_at,'YYYY-MM-DD') "
                    f"FROM catalog_listing ORDER BY created_at DESC LIMIT {ROW_LIMIT}",
                ),
            )
        ],
    )


def provider_view(module: str, table: str, workspace: str):
    def build(db):
        if not has(db, table):
            return unavailable(module, f"{table} is not present in this database.")
        found = {
            r[0]: r[1]
            for r in db.execute(
                text(f"SELECT verification_status, count(*) FROM {table} GROUP BY 1")
            )
        }
        return view(
            module,
            db,
            metrics=[
                Metric(label=f"Verification: {k}", value=str(v)) for k, v in sorted(found.items())
            ]
            or [Metric(label="Profiles", value="0")],
            tables=[
                Table(
                    title="Latest profiles (business display names only)",
                    columns=[
                        "Organization",
                        "Name",
                        "Verification",
                        "Org suspended",
                        f"{workspace} capability",
                    ],
                    rows=rows(
                        db,
                        f"""SELECT {short("p.organization_id")}, p.display_name, p.verification_status,
                          coalesce(o.suspended,false),
                          coalesce((SELECT c.status FROM workspace_capability c
                            WHERE c.organization_id=p.organization_id AND c.workspace=:w
                            ORDER BY c.expires_at DESC LIMIT 1),'none')
                          FROM {table} p LEFT JOIN organizations o ON o.id=p.organization_id
                          ORDER BY p.created_at DESC LIMIT {ROW_LIMIT}""",
                        w=workspace,
                    ),
                )
            ],
        )

    return build


def creators(db):
    if not has(db, "creator_profiles"):
        return unavailable("creators", "Creator Studio migration 0014 has not been applied here.")
    return view(
        "creators",
        db,
        metrics=[
            Metric(
                label="Creator profiles",
                value=str(one(db, "SELECT count(*) FROM creator_profiles")),
            ),
            Metric(
                label="Connected accounts",
                value=str(one(db, "SELECT count(*) FROM connected_social_accounts")),
            ),
            Metric(
                label="Campaign applications",
                value=str(one(db, "SELECT count(*) FROM creator_campaign_applications")),
            ),
        ],
        tables=[
            Table(
                title="Creator profiles by status",
                columns=["Status", "Profiles"],
                rows=rows(
                    db, "SELECT status, count(*) FROM creator_profiles GROUP BY 1 ORDER BY 1"
                ),
            )
        ],
    )


def regions(db):
    if not has(db, "market_policy_version"):
        return unavailable("regions", "Market policy table is not present in this database.")
    return view(
        "regions",
        db,
        tables=[
            Table(
                title="Latest market policy versions",
                columns=["Country", "Currency", "Capability", "Enabled", "Expires", "Policy ref"],
                rows=rows(
                    db,
                    "SELECT DISTINCT ON (country, capability) country, currency, capability, enabled, "
                    "to_char(expires_at,'YYYY-MM-DD'), policy_ref FROM market_policy_version "
                    "ORDER BY country, capability, sequence DESC",
                ),
            )
        ],
    )


def trust(db):
    return view(
        "trust",
        db,
        metrics=[
            Metric(
                label="Consent withdrawals, 7 days",
                value=str(
                    one(
                        db,
                        "SELECT count(*) FROM consent_event WHERE action='withdrawn' "
                        "AND created_at>now()-interval '7 days'",
                    )
                ),
            ),
            Metric(label="Content moderation queue", value="Not connected"),
        ],
        tables=[
            Table(
                title="Audit actions, last 7 days",
                columns=["Action", "Events"],
                rows=rows(
                    db,
                    "SELECT action, count(*) FROM audit_event WHERE created_at>now()-interval '7 days' "
                    "GROUP BY 1 ORDER BY 2 DESC LIMIT 20",
                ),
            ),
            Table(
                title="Most recent audit events (append-only log)",
                columns=["Time (UTC)", "Action", "Actor", "Resource"],
                rows=rows(
                    db,
                    f"SELECT to_char(created_at at time zone 'utc','YYYY-MM-DD HH24:MI'), action, "
                    f"{short('actor_id')}, {short('resource_id')} FROM audit_event "
                    f"ORDER BY created_at DESC LIMIT {ROW_LIMIT}",
                ),
            ),
        ],
    )


def privacy(db):
    metrics = [
        Metric(
            label="Undelivered privacy outbox events",
            value=str(
                one(
                    db,
                    "SELECT count(*) FROM outbox_event WHERE delivered_at IS NULL "
                    "AND event_type LIKE 'privacy.%'",
                )
            ),
        ),
        *by_state(db, "private_media", "Private media"),
        *by_state(db, "tryon_result", "Try-on results"),
    ]
    return view(
        "privacy",
        db,
        metrics=metrics,
        tables=[
            Table(
                title="Consent events by purpose and action",
                columns=["Purpose", "Action", "Events"],
                rows=rows(
                    db,
                    "SELECT p.purpose, c.action, count(*) FROM consent_event c "
                    "JOIN policy_document p ON p.id=c.policy_id GROUP BY 1,2 ORDER BY 1,2",
                ),
            )
        ],
    )


def analytics(db):
    return view(
        "analytics",
        db,
        tables=[
            Table(
                title="Daily counts, last 14 days",
                columns=["Day", "New users", "Analysis jobs", "Try-on jobs"],
                rows=rows(
                    db,
                    f"""SELECT to_char(d,'YYYY-MM-DD'),
                      (SELECT count(*) FROM app_user WHERE created_at::date=d),
                      {"(SELECT count(*) FROM analysis_job WHERE created_at::date=d)" if has(db, "analysis_job") else "0"},
                      {"(SELECT count(*) FROM tryon_job WHERE created_at::date=d)" if has(db, "tryon_job") else "0"}
                      FROM generate_series(current_date-13,current_date,interval '1 day') g(d)
                      ORDER BY d DESC""",
                ),
            )
        ],
    )


def configuration(db):
    def flag(name):
        return "on" if os.environ.get(name) == "true" else "off"

    return view(
        "configuration",
        db,
        metrics=[
            Metric(
                label="Deployment environment", value=os.environ.get("GLAM_DEPLOYMENT_ENV", "unset")
            ),
            Metric(label="Private media", value=flag("GLAM_PRIVATE_MEDIA_ENABLED")),
            Metric(label="Photo analysis", value=flag("GLAM_ANALYSIS_ENABLED")),
            Metric(label="Virtual try-on", value=flag("GLAM_TRYON_ENABLED")),
            Metric(
                label="Try-on provider selected",
                value="yes" if os.environ.get("GLAM_TRYON_PROVIDER") else "no",
            ),
            Metric(
                label="Served commit",
                value=(os.environ.get("RAILWAY_GIT_COMMIT_SHA") or "unknown")[:12],
            ),
        ],
        tables=[
            Table(
                title="Applied database revisions",
                columns=["Revision"],
                rows=rows(db, "SELECT version_num FROM alembic_version ORDER BY 1"),
            )
        ],
    )


NOT_CONNECTED = {
    "advertising": "No advertiser, campaign or placement tables or service exist yet. The advertiser "
    "placement screens are in-memory previews only.",
    "commerce": "Orders, payments and payouts are not deployed. The Stripe ledger is an isolated test "
    "sandbox and live payments are disabled.",
    "subscriptions": "No subscription or billing tables exist. Plans are design previews only.",
}
BUILDERS = {
    "executive": executive,
    "users": users,
    "ai": ai,
    "content": content,
    "merchants": provider_view("merchants", "merchant_profiles", "merchant"),
    "professionals": provider_view("professionals", "professional_profiles", "professional"),
    "creators": creators,
    "regions": regions,
    "trust": trust,
    "privacy": privacy,
    "analytics": analytics,
    "configuration": configuration,
    **{m: (lambda db, m=m: unavailable(m, NOT_CONNECTED[m])) for m in NOT_CONNECTED},
}
assert set(BUILDERS) == set(TITLES) == set(STAFF_MODULES["super_admin"])


def build_admin_router(user, audit):
    router = APIRouter()

    @router.get("/v1/admin/modules/{module}", response_model=ModuleView)
    def module_view(module: str, db: Db, identity: Identity, response: Response):
        response.headers["Cache-Control"] = "no-store, private"
        response.headers["Vary"] = "Authorization"
        if module not in BUILDERS:
            raise HTTPException(404, "Unknown admin module")
        uid = user(db, identity)
        owners = {role for role, modules in STAFF_MODULES.items() if module in modules}
        require_staff_roles(db, uid, identity, owners)
        audit(db, uid, f"admin.read.{module}", uid)
        return BUILDERS[module](db)

    return router
