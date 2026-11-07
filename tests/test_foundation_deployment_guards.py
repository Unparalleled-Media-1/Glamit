"""Explicit production authorization, target and recovery-point refusal boundaries."""

import importlib.util
from datetime import UTC, datetime, timedelta
from pathlib import Path

import pytest

spec = importlib.util.spec_from_file_location(
    "foundation_deploy", Path("scripts/deploy_application_foundation.py")
)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def target():
    return {
        "project_ref": module.PROJECT,
        "parent_project_ref": module.PROJECT,
        "name": "main",
        "is_default": True,
    }


def test_wrong_targets_and_missing_explicit_production_authorization_are_refused():
    for project, branches, approved in [
        (module.PROJECT, [target()], False),
        ("unknown", [], True),
        ("other-project", [{"project_ref": "other-project", "is_default": False}], True),
        (module.PROJECT, [target() | {"is_default": False}], True),
        (module.PROJECT, [target() | {"name": "another"}], True),
    ]:
        with pytest.raises(RuntimeError):
            module.validate_branch(branches, project, approved)


def test_existing_data_or_schema_prevents_first_deployment():
    module.validate_empty({"public_tables": [], "auth_users": 0, "storage_objects": 0})
    for change in [{"public_tables": ["customer"]}, {"auth_users": 1}, {"storage_objects": 1}]:
        with pytest.raises(RuntimeError):
            module.validate_empty(
                {"public_tables": [], "auth_users": 0, "storage_objects": 0} | change
            )


def test_completed_recent_physical_recovery_point_is_required():
    backup = {
        "id": 123,
        "status": "COMPLETED",
        "is_physical_backup": True,
        "inserted_at": datetime.now(UTC).isoformat(),
    }
    assert module.validate_backup([backup])["id"] == 123
    for entries in [
        [],
        [backup | {"status": "FAILED"}],
        [backup | {"is_physical_backup": False}],
        [backup | {"inserted_at": (datetime.now(UTC) - timedelta(days=3)).isoformat()}],
    ]:
        with pytest.raises(RuntimeError):
            module.validate_backup(entries)


def test_only_explicitly_authorized_original_main_and_checksummed_sql_is_accepted():
    module.validate_branch([target()], module.PROJECT, True)
    sql, manifest = module.validate_artifact()
    assert "CREATE TABLE public.profiles" in sql
    assert "CREATE TABLE stripe_test_order" not in sql
    assert manifest["revision"] == "0010_supabase_foundation"
