"""Production target checks remain strict when forbidden preview automation is disabled."""

import importlib

import pytest


@pytest.fixture
def deploy_module(monkeypatch):
    monkeypatch.syspath_prepend("scripts")
    return importlib.import_module("deploy_hosted_api")


def test_preview_disabled_original_project_is_valid_without_creating_a_branch(deploy_module):
    m = deploy_module
    m.validate_original_target(
        [],
        {
            "id": m.PROJECT,
            "status": "ACTIVE_HEALTHY",
            "database": {"host": f"db.{m.PROJECT}.supabase.co"},
        },
    )


@pytest.mark.parametrize(
    "changed",
    [
        {"id": "another-project"},
        {"status": "INACTIVE"},
        {"database": {"host": "another-database.invalid"}},
        {"database": {}},
    ],
)
def test_empty_inventory_does_not_allow_wrong_or_unhealthy_project(deploy_module, changed):
    m = deploy_module
    metadata = {
        "id": m.PROJECT,
        "status": "ACTIVE_HEALTHY",
        "database": {"host": f"db.{m.PROJECT}.supabase.co"},
    }
    with pytest.raises(RuntimeError, match="original_production_project_required"):
        m.validate_original_target([], metadata | changed)
