"""Exact candidate SQL verified against disposable PostgreSQL Storage catalog fixtures."""

import importlib.util
import sys
from pathlib import Path
from uuid import uuid4

import pytest
from alembic.migration import MigrationContext
from alembic.operations import Operations
from sqlalchemy import text
from sqlalchemy.exc import DBAPIError
from test_private_media import create
from test_private_media import media as media


def migration():
    file = Path("db/migrations/versions/0015_private_media.py")
    spec = importlib.util.spec_from_file_location("private_media_migration", file)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_restrictive_storage_guard_survives_an_unrelated_permissive_policy(db):
    with db.connect() as c:
        transaction = c.begin()
        try:
            c.execute(
                text("""
              INSERT INTO storage.objects(id,bucket_id,name)
              VALUES(:id,'glam-private-media','private.png')
            """),
                {"id": uuid4()},
            )
            c.execute(text("INSERT INTO storage.buckets(id,name) VALUES('unrelated','unrelated')"))
            c.execute(
                text("""
              INSERT INTO storage.objects(id,bucket_id,name) VALUES(:id,'unrelated','allowed.png')
            """),
                {"id": uuid4()},
            )
            c.execute(
                text("""
              CREATE POLICY f1a_test_broad ON storage.objects TO authenticated
              USING(true) WITH CHECK(true)
            """)
            )
            c.execute(text("SET LOCAL ROLE authenticated"))
            assert c.scalar(text("SELECT count(*) FROM storage.objects")) == 1
            with pytest.raises(DBAPIError), c.begin_nested():
                c.execute(
                    text("""
                  INSERT INTO storage.objects(id,bucket_id,name)
                  VALUES(:id,'glam-private-media','bypass.png')
                """),
                    {"id": uuid4()},
                )
            with pytest.raises(DBAPIError), c.begin_nested():
                c.execute(text("SELECT * FROM private_media"))
            c.execute(text("SET LOCAL ROLE anon"))
            with pytest.raises(DBAPIError), c.begin_nested():
                c.execute(text("SELECT * FROM private_media"))
        finally:
            transaction.rollback()


def test_candidate_bucket_is_private_with_only_normalized_images(db):
    with db.begin() as c:
        row = c.execute(
            text("""
          SELECT public,file_size_limit,allowed_mime_types FROM storage.buckets
          WHERE id='glam-private-media'
        """)
        ).one()
        assert row.public is False
        assert row.file_size_limit == 10485760
        assert row.allowed_mime_types == ["image/png"]


def test_empty_only_rollback_and_reapply_are_transactionally_reversible(db):
    with db.connect() as c:
        transaction = c.begin()
        try:
            context = MigrationContext.configure(c)
            with Operations.context(context):
                with (
                    pytest.raises(DBAPIError, match="Storage API before rollback"),
                    c.begin_nested(),
                ):
                    migration().downgrade()
                # Test-only simulation of the provider API's protected empty-bucket deletion.
                # No production migration or application path sets this internal Storage GUC.
                c.execute(text("SET LOCAL storage.allow_delete_query='true'"))
                c.execute(text("DELETE FROM storage.buckets WHERE id='glam-private-media'"))
                migration().downgrade()
                assert c.scalar(text("SELECT to_regclass('public.private_media')")) is None
                migration().upgrade()
                assert c.scalar(text("SELECT to_regclass('public.private_media')")) is not None
        finally:
            transaction.rollback()


def test_rollback_refuses_to_delete_existing_objects(db):
    with db.connect() as c:
        transaction = c.begin()
        try:
            c.execute(
                text("""
              INSERT INTO storage.objects(id,bucket_id,name)
              VALUES(:id,'glam-private-media','must-not-delete.png')
            """),
                {"id": uuid4()},
            )
            with pytest.raises(DBAPIError, match="empty registry and bucket"), c.begin_nested():
                with Operations.context(MigrationContext.configure(c)):
                    migration().downgrade()
            assert c.scalar(text("SELECT count(*) FROM storage.objects")) == 1
        finally:
            transaction.rollback()


def test_rollback_preserves_even_an_unuploaded_media_intent(client, db, media):
    media_id = create(client, media).json()["id"]
    with db.connect() as c:
        transaction = c.begin()
        try:
            with pytest.raises(DBAPIError, match="empty registry and bucket"), c.begin_nested():
                with Operations.context(MigrationContext.configure(c)):
                    migration().downgrade()
            assert (
                c.scalar(text("SELECT count(*) FROM private_media WHERE id=:id"), {"id": media_id})
                == 1
            )
        finally:
            transaction.rollback()


def test_deployment_verifier_checks_actual_storage_and_metadata_guards(db):
    sys.path.insert(0, str(Path("scripts").resolve()))
    try:
        from deploy_hosted_api import PRIVATE_MEDIA_CATALOG_SQL, validate_private_media_catalog
    finally:
        sys.path.pop(0)
    with db.begin() as c:
        rows = [dict(r) for r in c.execute(text(PRIVATE_MEDIA_CATALOG_SQL)).mappings()]
    validate_private_media_catalog(rows)
    for field in rows[0]:
        with pytest.raises(RuntimeError, match="catalog_verification_failed"):
            validate_private_media_catalog([{**rows[0], field: False}])
