"""Deployment refusal boundaries; no live requests or schema mutations."""

import importlib.util
from pathlib import Path

import pytest

spec = importlib.util.spec_from_file_location(
    "foundation_deploy", Path("scripts/deploy_application_foundation.py")
)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def test_production_and_unrelated_branches_are_refused():
    for target, branches in [
        (module.PARENT, [{"project_ref": module.PARENT}]),
        ("unknown", []),
        (
            "child",
            [
                {
                    "project_ref": "child",
                    "is_default": True,
                    "parent_project_ref": module.PARENT,
                    "name": module.BRANCH,
                }
            ],
        ),
        (
            "child",
            [
                {
                    "project_ref": "child",
                    "is_default": False,
                    "parent_project_ref": "another",
                    "name": module.BRANCH,
                }
            ],
        ),
    ]:
        with pytest.raises(RuntimeError):
            module.validate_branch(branches, target)


def test_existing_data_or_schema_prevents_first_deployment():
    module.validate_empty({"public_tables": [], "auth_users": 0, "storage_objects": 0})
    for change in [{"public_tables": ["customer"]}, {"auth_users": 1}, {"storage_objects": 1}]:
        with pytest.raises(RuntimeError):
            module.validate_empty(
                {"public_tables": [], "auth_users": 0, "storage_objects": 0} | change
            )


def test_only_authorized_nondefault_branch_and_checksummed_sql_is_accepted():
    module.validate_branch(
        [
            {
                "project_ref": "child",
                "is_default": False,
                "parent_project_ref": module.PARENT,
                "name": module.BRANCH,
            }
        ],
        "child",
    )
    sql, manifest = module.validate_artifact()
    assert "CREATE TABLE public.profiles" in sql
    assert "CREATE TABLE stripe_test_order" not in sql
    assert manifest["revision"] == "0010_supabase_foundation"
