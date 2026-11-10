"""Deployment guard checks; no test contacts production or restores a project."""

import importlib.util
from copy import deepcopy
from pathlib import Path

import pytest

spec = importlib.util.spec_from_file_location(
    "analysis_deploy", Path("scripts/deploy_analysis_schema.py")
)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
PROJECT = module.PROJECT
START = module.START
TABLES = module.TABLES
TARGET = module.TARGET
guarded_sql = module.guarded_sql
load_release = module.load_release
validate_final = module.validate_final
validate_start = module.validate_start
validate_target = module.validate_target


def test_exact_release_and_transaction_guard_follow_canonical_history():
    sql, manifest = load_release()
    protected = guarded_sql(sql)
    assert manifest["starting_revision"] == START
    assert manifest["revision"] == TARGET
    assert len(TABLES) == 19
    assert protected.index("LOCK TABLE public.alembic_version") < protected.index("CREATE TABLE")
    assert protected.endswith("COMMIT;\n")
    assert "0009_stripe_test_ledger" not in protected


def test_original_project_without_branching_is_valid_but_other_hosts_are_rejected():
    project = {
        "id": PROJECT,
        "status": "ACTIVE_HEALTHY",
        "database": {"host": f"db.{PROJECT}.supabase.co"},
    }
    validate_target(project, [])
    project["database"]["host"] = "deleted-project.invalid"
    with pytest.raises(RuntimeError, match="original_database_host"):
        validate_target(project, [])


def test_branch_inventory_cannot_silently_select_a_different_project():
    project = {
        "id": PROJECT,
        "status": "ACTIVE_HEALTHY",
        "database": {"host": f"db.{PROJECT}.supabase.co"},
    }
    with pytest.raises(RuntimeError, match="unexpected_branch_inventory"):
        validate_target(project, [{"project_ref": "wrong", "is_default": True, "name": "main"}])


@pytest.mark.parametrize(
    "change",
    [
        {"revisions": [TARGET]},
        {"revisions": [START, "0009_stripe_test_ledger"]},
        {"tables": [{"name": "public.private_media"}]},
        {"bucket": {"public": False}},
        {"storage_policy": {"kind": "RESTRICTIVE"}},
    ],
)
def test_partial_or_already_applied_state_cannot_be_reapplied(change):
    snapshot = {"revisions": [START], "tables": [], "bucket": None, "storage_policy": None}
    validate_start(snapshot)
    with pytest.raises(RuntimeError):
        validate_start(snapshot | change)


def reference():
    return {
        "revisions": [TARGET],
        "tables": [
            {
                "name": name,
                "rls": True,
                "anon_select": False,
                "anon_write": False,
                "authenticated_select": False,
                "authenticated_write": False,
            }
            for name in TABLES
        ],
        **{
            name: []
            for name in ["columns", "constraints", "indexes", "policies", "triggers", "functions"]
        },
        "bucket": {"public": False},
        "storage_policy": {"kind": "RESTRICTIVE"},
    }


def test_post_verification_rejects_missing_constraints_or_public_media_access():
    expected = reference()
    validate_final(expected, expected)
    altered = deepcopy(expected)
    altered["constraints"] = [{"validated": False}]
    with pytest.raises(RuntimeError, match="catalog_mismatch_constraints"):
        validate_final(altered, expected)
    altered = deepcopy(expected)
    next(t for t in altered["tables"] if t["name"] == "public.private_media")[
        "authenticated_select"
    ] = True
    with pytest.raises(RuntimeError, match="private_table_exposed"):
        validate_final(altered, expected)
