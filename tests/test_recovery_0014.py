# ruff: noqa: E501
"""The 0014 recovery script returns a database at 0014 to the exact 0013 catalog, and refuses unsafe states."""

import os
import re
from pathlib import Path
from uuid import uuid4

import psycopg
import pytest
from alembic import command
from alembic.config import Config
from glam_api.config import get_settings
from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url

ROOT = Path(__file__).resolve().parents[1]
FINGERPRINT = (ROOT / "docs/database/migration-approval-pack/schema_fingerprint.sql").read_text()
ROLLBACK = (ROOT / "db/migrations/recovery/0014_creator_studio_rollback.sql").read_text()


def build(admin, revision):
    name = f"glam_recovery_{uuid4().hex[:10]}_test"
    with admin.connect() as c:
        c.execute(text(f'CREATE DATABASE "{name}"'))
    url = make_url(os.environ["GLAM_TEST_DATABASE_URL"]).set(database=name)
    engine = create_engine(url, hide_parameters=True)
    with engine.begin() as c:
        c.execute(text((ROOT / "tests/fixtures/supabase_auth.sql").read_text()))
        c.execute(text((ROOT / "tests/fixtures/supabase_storage.sql").read_text()))
    previous = os.environ.get("GLAM_DATABASE_URL")
    os.environ["GLAM_DATABASE_URL"] = url.render_as_string(hide_password=False)
    get_settings.cache_clear()
    try:
        command.upgrade(Config(str(ROOT / "alembic.ini")), revision)
    finally:
        if previous is None:
            os.environ.pop("GLAM_DATABASE_URL", None)
        else:
            os.environ["GLAM_DATABASE_URL"] = previous
        get_settings.cache_clear()
    return name, engine


def run_script(engine, sql):
    """Execute a whole psql-style script (it carries its own BEGIN/COMMIT) on a raw autocommit connection."""
    raw = engine.raw_connection()
    try:
        raw.driver_connection.autocommit = True
        raw.driver_connection.execute(sql)  # no params: "%" is left alone, as psql would
    finally:
        raw.close()


def fingerprint(engine):
    with engine.connect() as c:
        return [tuple(r) for r in c.execute(text(FINGERPRINT))]


@pytest.fixture
def admin():
    url = make_url(os.environ.get("GLAM_TEST_DATABASE_URL", "")).set(database="postgres")
    engine = create_engine(url, isolation_level="AUTOCOMMIT")
    created = []
    yield engine, created
    for name in created:
        with engine.connect() as c:
            c.execute(text(f'DROP DATABASE IF EXISTS "{name}" WITH (FORCE)'))


def test_rollback_restores_the_exact_0013_catalog_and_the_original_rpc(admin, engine):
    admin_engine, created = admin
    base, base_engine = build(admin_engine, "0013_passwordless_accounts")
    created.append(base)
    target, target_engine = build(admin_engine, "0014_creator_studio")
    created.append(target)
    assert fingerprint(target_engine) != fingerprint(base_engine)
    run_script(target_engine, ROLLBACK)
    assert fingerprint(target_engine) == fingerprint(base_engine)
    with target_engine.connect() as c:
        assert (
            c.scalar(text("SELECT version_num FROM alembic_version WHERE version_num LIKE '001%'"))
            == "0013_passwordless_accounts"
        )
        assert (
            c.scalar(
                text(
                    "SELECT to_regprocedure('glam_private.glam_account_api_v1(text,text,jsonb,text)')"
                )
            )
            is None
        )
        assert c.scalar(
            text(
                "SELECT has_function_privilege('authenticated','public.glam_api_v1(text,text,jsonb,text)','EXECUTE')"
            )
        )
        assert not c.scalar(
            text(
                "SELECT has_function_privilege('anon','public.glam_api_v1(text,text,jsonb,text)','EXECUTE')"
            )
        )


def test_rollback_refuses_wrong_head_and_existing_creator_data(admin, engine):
    admin_engine, created = admin
    name, e = build(admin_engine, "0015_private_media")
    created.append(name)
    with pytest.raises(psycopg.errors.RaiseException, match="exactly 0014_creator_studio"):
        run_script(e, ROLLBACK)
    name, e = build(admin_engine, "0014_creator_studio")
    created.append(name)
    with e.begin() as c:
        uid = c.scalar(text("SELECT gen_random_uuid()"))
        c.execute(text("INSERT INTO auth.users(id) VALUES (:u)"), {"u": uid})
        c.execute(text("INSERT INTO public.profiles(id) VALUES (:u)"), {"u": uid})
        c.execute(
            text(
                "INSERT INTO public.creator_profiles(profile_id,handle,display_name) VALUES (:u,'sample_handle','Sample')"
            ),
            {"u": uid},
        )
    with pytest.raises(psycopg.errors.RaiseException, match="Creator data exists"):
        run_script(e, ROLLBACK)
    with e.connect() as c:
        assert (
            c.scalar(text("SELECT count(*) FROM public.creator_profiles")) == 1
        )  # nothing was dropped
        assert re.fullmatch(
            r"0014_creator_studio",
            c.scalar(text("SELECT version_num FROM alembic_version WHERE version_num LIKE '001%'")),
        )
