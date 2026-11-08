"""Capture canonical application Alembic SQL from a validated empty LOCAL build database."""

import argparse
import hashlib
import json
import os
import re
from pathlib import Path

from alembic import command
from alembic.config import Config
from glam_api.config import get_settings
from sqlalchemy import create_engine, event, text
from sqlalchemy.engine import Engine, make_url


def export(
    start=None,
    revision="0010_supabase_foundation",
    output="db/migrations/releases/0010_application.sql",
):
    raw = os.environ.get("GLAM_MIGRATION_BUILD_DATABASE_URL", "")
    target = make_url(raw)
    if (
        target.drivername != "postgresql+psycopg"
        or target.host not in {"127.0.0.1", "localhost"}
        or not (target.database or "").startswith("glam_foundation_export_")
        or not target.database.endswith("_test")
    ):
        raise RuntimeError("Explicit empty local foundation export test database required")
    engine = create_engine(raw, hide_parameters=True)
    with engine.begin() as c:
        if c.scalar(text("SELECT count(*) FROM pg_tables WHERE schemaname='public'")):
            raise RuntimeError("Build database must be empty; no automatic deletion is permitted")
        c.execute(text(Path("tests/fixtures/supabase_auth.sql").read_text()))
        c.execute(text(Path("tests/fixtures/supabase_storage.sql").read_text()))
    statements = []

    def capture(conn, cursor, statement, parameters, context, executemany):
        executable = re.sub(r"(?m)^\s*--[^\n]*(?:\n|$)", "", statement).lstrip()
        prefix = executable.split(None, 1)[0].upper() if executable else ""
        if prefix not in {"CREATE", "ALTER", "DO", "GRANT", "REVOKE", "INSERT", "UPDATE", "DELETE"}:
            return
        if parameters:
            raise RuntimeError("Parameterized migration SQL requires explicit literal rendering")
        normalized = "\n".join(line.rstrip() for line in statement.replace("%%", "%").splitlines())
        statements.append(normalized.strip().rstrip(";") + ";")

    previous = os.environ.get("GLAM_DATABASE_URL")
    os.environ["GLAM_DATABASE_URL"] = raw
    get_settings.cache_clear()
    if start:
        command.upgrade(Config("alembic.ini"), start)
    event.listen(Engine, "before_cursor_execute", capture)
    try:
        command.upgrade(Config("alembic.ini"), revision)
    finally:
        event.remove(Engine, "before_cursor_execute", capture)
        if previous is None:
            os.environ.pop("GLAM_DATABASE_URL", None)
        else:
            os.environ["GLAM_DATABASE_URL"] = previous
        get_settings.cache_clear()
    with engine.connect() as c:
        head = c.scalar(text("SELECT version_num FROM alembic_version"))
        assert head == revision
        assert c.scalar(text("SELECT to_regclass('public.stripe_test_order')")) is None
    out = Path(output)
    content = (
        "-- GENERATED from canonical Alembic application@head; do not edit.\n"
        f"-- Starting revision: {start or 'empty'}; excludes Stripe sandbox0009.\n"
        "BEGIN;\nSET LOCAL lock_timeout='5s';\nSET LOCAL statement_timeout='60s';\n"
        + "\n\n".join(statements)
        + "\nCOMMIT;\n"
    )
    out.write_text(content)
    manifest = {
        "target": revision,
        "starting_revision": start,
        "revision": head,
        "excluded_sandbox": "0009_stripe_test_ledger",
        "artifact": str(out),
        "sha256": hashlib.sha256(out.read_bytes()).hexdigest(),
        "statement_count": len(statements),
        "canonical_sources": {
            str(p): hashlib.sha256(p.read_bytes()).hexdigest()
            for p in sorted(Path("db/migrations/versions").glob("*"))
            if p.suffix in {".sql", ".py"}
        },
    }
    out.with_suffix(".manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    print(json.dumps({"artifact": str(out), "revision": head, "sha256": manifest["sha256"]}))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--start")
    parser.add_argument("--revision", default="0010_supabase_foundation")
    parser.add_argument("--output", default="db/migrations/releases/0010_application.sql")
    args = parser.parse_args()
    export(args.start, args.revision, args.output)
