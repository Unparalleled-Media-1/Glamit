"""Schema <-> application contract checks, run against the fully migrated test database.

A migration can run yet leave the app unable to use the new objects. These tests fail if the
FastAPI SQL, the Flutter client or the credit ledger drift from what migrations 0014-0018 create.
"""

import re
from pathlib import Path

import pytest
from glam_api.main import app
from sqlalchemy import text

ROOT = Path(__file__).resolve().parents[1]
SQL_REF = re.compile(
    r"\b(?:FROM|JOIN|INTO|UPDATE|TABLE)\s+(?:ONLY\s+)?(?:public\.)?([a-z_][a-z0-9_]*)(?=\s|\(|$)",
    re.I,
)
NOT_TABLES = {
    "select",
    "set",
    "values",
    "jsonb",
    "lateral",
    "unnest",
    "exists",
    "of",
    "public",
    "only",
    "each",
    "pg_class",
}
SET_VERSION = "UPDATE alembic_version SET version_num=:new WHERE version_num=:old"
NEW_PRIVATE_TABLES = [
    "private_media", "analysis_job", "analysis_correction", "style_passport_analysis",
    "tryon_job", "tryon_result", "generation_cost_event", "generation_price_rule",
]  # fmt: skip


def api_sql_tables():
    found = {}
    for path in (ROOT / "services/api/src/glam_api").rglob("*.py"):
        if (
            "payments" in path.parts
        ):  # isolated Stripe sandbox app (migration 0009, never in production)
            continue
        for match in re.finditer(
            r'text\(\s*f?(?:"""(.*?)"""|"((?:[^"\\]|\\.)*)")', path.read_text(), re.S
        ):
            for ref in SQL_REF.finditer(match.group(1) or match.group(2)):
                name = ref.group(1).lower()
                if name not in NOT_TABLES:
                    found.setdefault(name, set()).add(path.name)
    return found


def test_every_table_the_api_queries_exists_after_migration(db):
    with db.connect() as c:
        existing = {
            r[0]
            for r in c.execute(
                text("SELECT table_name FROM information_schema.tables WHERE table_schema='public'")
            )
        }
    external = {
        "sessions",
        "users",
        "buckets",
        "objects",
    }  # auth/storage schemas provided by Supabase
    missing = {t: sorted(f) for t, f in api_sql_tables().items() if t not in existing | external}
    assert missing == {}


def test_api_sql_never_depends_on_the_stripe_sandbox_migration():
    assert [t for t in api_sql_tables() if t.startswith("stripe_test_")] == []


def test_every_endpoint_the_flutter_app_calls_exists_in_the_api():
    spec = app.openapi()
    operations = {
        (method.upper(), re.sub(r"\{[^}]+\}", "{}", path))
        for path, ops in spec["paths"].items()
        for method in ops
        if method in {"get", "post", "put", "patch", "delete"}
    }
    called = set()
    for path in (ROOT / "apps/glam_mobile/lib").rglob("*.dart"):
        source = path.read_text()
        for m in re.finditer(
            r"""request\(\s*['"](/v1/[^'"?]*)['"](?:\s*,\s*method:\s*'(\w+)')?""", source
        ):
            called.add((m.group(2) or "GET", re.sub(r"\$\{[^}]+\}|\$\w+", "{}", m.group(1))))
        for m in re.finditer(r"""resolve\(\s*['"](/v1/[^'"?]*)['"]""", source):
            called.add(("GET", re.sub(r"\$\{[^}]+\}|\$\w+", "{}", m.group(1))))
    assert len(called) >= 20, "endpoint extraction found suspiciously few Flutter calls"
    assert sorted(called - operations) == []


@pytest.mark.parametrize("table", NEW_PRIVATE_TABLES)
def test_new_private_tables_are_rls_protected_and_closed_to_client_roles(db, table):
    with db.connect() as c:
        rls = c.scalar(
            text("SELECT relrowsecurity FROM pg_class WHERE oid=CAST(:t AS regclass)"),
            {"t": f"public.{table}"},
        )
        open_to = [
            role
            for role in ("anon", "authenticated")
            for priv in ("SELECT", "INSERT", "UPDATE", "DELETE")
            if c.scalar(
                text("SELECT has_table_privilege(:r,CAST(:t AS regclass),:p)"),
                {"r": role, "t": f"public.{table}", "p": priv},
            )
        ]
    assert rls is True and open_to == []


def test_credit_ledger_accepts_the_apis_account_insert_and_only_glam_ai_credits(db):
    with db.begin() as c:
        c.execute(
            text(
                "INSERT INTO app_user(id,issuer,subject) VALUES(gen_random_uuid(),'https://t.invalid','contract')"
            )
        )
        # exactly what main.user() runs: only user_id, relying on the column default
        c.execute(
            text(
                "INSERT INTO credit_account(user_id) "
                "SELECT id FROM app_user WHERE subject='contract'"
            )
        )
        assert c.scalar(text("SELECT credit_kind FROM credit_account")) == "glam_ai_credit"


def test_alembic_application_head_is_the_try_on_migration_and_chain_is_linear():
    from alembic.config import Config
    from alembic.script import ScriptDirectory

    script = ScriptDirectory.from_config(Config(str(ROOT / "alembic.ini")))
    chain = [script.get_revision("application@head").revision]
    while (down := script.get_revision(chain[-1]).down_revision) and chain[
        -1
    ] != "0013_passwordless_accounts":
        chain.append(down)
    assert list(reversed(chain[:6])) == [
        "0013_passwordless_accounts", "0014_creator_studio", "0015_private_media",
        "0016_analysis_jobs", "0017_analysis_passport", "0018_tryon",
    ]  # fmt: skip


def test_readiness_refuses_try_on_until_its_migration_is_applied(client, db, monkeypatch):
    from types import SimpleNamespace

    import glam_api.config as config

    monkeypatch.setattr(
        config, "get_settings", lambda: SimpleNamespace(oidc_issuer="https://test.invalid")
    )
    monkeypatch.setenv("GLAM_TRYON_ENABLED", "true")
    assert client.get("/health/ready").status_code == 200  # fully migrated database
    with db.begin() as c:
        c.execute(text(SET_VERSION), {"new": "0017_analysis_passport", "old": "0018_tryon"})
    try:
        response = client.get("/health/ready")
        assert response.status_code == 503
        assert "Try-on migration" in response.text
        monkeypatch.delenv("GLAM_TRYON_ENABLED")
        assert (
            client.get("/health/ready").status_code == 200
        )  # flag off: older schema is acceptable
    finally:
        with db.begin() as c:
            c.execute(text(SET_VERSION), {"new": "0018_tryon", "old": "0017_analysis_passport"})
