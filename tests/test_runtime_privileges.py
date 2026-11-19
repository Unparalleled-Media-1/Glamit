"""The runtime-role grant proposal is derived from the API's SQL and must stay least-privilege."""

import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location(
    "runtime_privileges", ROOT / "scripts/db/runtime_privileges.py"
)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def grants():
    return module.needed(ROOT)


def test_try_on_and_credit_tables_get_exactly_what_the_code_needs():
    g = module.render(grants()).splitlines()
    assert "GRANT SELECT, INSERT, UPDATE ON public.tryon_job TO glam_api_runtime;" in g
    assert "GRANT SELECT, INSERT, UPDATE ON public.tryon_result TO glam_api_runtime;" in g
    assert "GRANT SELECT, INSERT, UPDATE ON public.credit_reservation TO glam_api_runtime;" in g
    assert "GRANT SELECT ON auth.sessions TO glam_api_runtime;" in g


def test_proposal_never_grants_client_roles_public_or_the_sandbox():
    sql = module.render(grants())
    for banned in (
        "anon",
        "authenticated",
        "PUBLIC",
        "stripe_test_",
        "ALL PRIVILEGES",
        "SUPERUSER",
    ):
        assert banned not in sql
    assert "TO glam_api_runtime" in sql and "WITH GRANT OPTION" not in sql


def test_no_table_the_code_deletes_from_is_granted_more_than_needed():
    g = grants()
    assert "DELETE" not in g["private_media"] and "DELETE" not in g["tryon_job"]
    assert "DELETE" not in g["credit_posting"]  # the ledger is append-only


def test_checked_in_proposal_matches_the_generator():
    committed = (
        ROOT / "docs/database/migration-approval-pack/runtime_role_proposal.sql"
    ).read_text()
    assert committed == module.render(grants())
