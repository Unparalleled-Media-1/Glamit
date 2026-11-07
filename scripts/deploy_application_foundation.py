"""Deploy the canonical, locally replayed application SQL to an empty DEV BRANCH only."""

import argparse
import hashlib
import json
import os
from datetime import UTC, datetime
from pathlib import Path

import httpx

PARENT = "bkkmsbxrxkqaveymcrgi"
BRANCH = "glam-foundation-dev"
EXPECTED = {
    "profiles",
    "organizations",
    "organization_members",
    "user_preferences",
    "style_passports",
    "merchant_profiles",
    "professional_profiles",
    "product_categories",
    "products",
    "product_variants",
}


def validate_branch(branches, target):
    matches = [b for b in branches if b.get("project_ref") == target]
    if target == PARENT or len(matches) != 1:
        raise RuntimeError("production_or_unknown_project_refused")
    branch = matches[0]
    if (
        branch.get("is_default") is not False
        or branch.get("parent_project_ref") != PARENT
        or branch.get("name") != BRANCH
    ):
        raise RuntimeError("authorized_development_branch_required")


def validate_empty(snapshot):
    if (
        snapshot.get("public_tables") != []
        or snapshot.get("auth_users") != 0
        or snapshot.get("storage_objects") != 0
    ):
        raise RuntimeError("existing_schema_or_valuable_data_requires_review")


def validate_artifact():
    artifact = Path("db/migrations/releases/0010_application.sql")
    manifest = json.loads(artifact.with_suffix(".manifest.json").read_text())
    if hashlib.sha256(artifact.read_bytes()).hexdigest() != manifest["sha256"]:
        raise RuntimeError("release_checksum_mismatch")
    for name, expected in manifest["canonical_sources"].items():
        if hashlib.sha256(Path(name).read_bytes()).hexdigest() != expected:
            raise RuntimeError("canonical_source_drift")
    if manifest["revision"] != "0010_supabase_foundation":
        raise RuntimeError("unexpected_application_revision")
    return artifact.read_text(), manifest


def deploy(target, apply=False):
    sql, manifest = validate_artifact()
    token = os.environ.get("SUPABASE_ACCESS_TOKEN")
    if not token:
        raise RuntimeError("management_api_token_required")
    report = {
        "observed_at": datetime.now(UTC).isoformat(),
        "parent_project": PARENT,
        "project_ref": target,
        "branch": BRANCH,
        "production_modified": False,
        "apply_requested": apply,
        "revision": manifest["revision"],
        "release_sha256": manifest["sha256"],
    }
    with httpx.Client(
        headers={"Authorization": "Bearer " + token},
        timeout=60,
        follow_redirects=False,
        trust_env=True,
    ) as client:
        base = "https://api.supabase.com/v1/projects/"
        response = client.get(base + PARENT + "/branches")
        if not response.is_success:
            raise RuntimeError("branch_inventory_failed")
        validate_branch(response.json(), target)

        def query(statement, readonly=True):
            response = client.post(
                base + target + "/database/query", json={"query": statement, "read_only": readonly}
            )
            if not response.is_success:
                raise RuntimeError("management_sql_rejected_http_" + str(response.status_code))
            return response.json()

        if apply:
            snapshot = query(
                """SELECT COALESCE((SELECT json_agg(tablename) FROM pg_tables WHERE
                schemaname='public'),'[]'::json) AS public_tables,
                (SELECT count(*) FROM auth.users) AS auth_users,(SELECT count(*) FROM
                storage.objects) AS storage_objects""",
                False,
            )[0]
            validate_empty(snapshot)
            report["pre_migration_snapshot"] = snapshot
            # No automatic retries: after an unknown result, verify before any new attempt.
            query(sql, False)
            report["migration_execution"] = "CONFIRMED_SUCCESS"
        report["public_tables"] = [
            r["table_name"]
            for r in query(
                "SELECT table_name FROM information_schema.tables WHERE table_schema='public' "
                "AND table_type='BASE TABLE' ORDER BY table_name"
            )
        ]
        if not EXPECTED <= set(report["public_tables"]):
            raise RuntimeError("requested_tables_missing")
        report["alembic_revisions"] = [
            r["version_num"]
            for r in query(
                "SELECT version_num FROM public.alembic_version ORDER BY version_num", False
            )
        ]
        if report["alembic_revisions"] != ["0010_supabase_foundation"]:
            raise RuntimeError("application_history_mismatch")
        report["requested_table_security"] = (
            query("""SELECT c.relname AS table_name,c.relrowsecurity AS rls_enabled,
          (SELECT count(*) FROM pg_policy p WHERE p.polrelid=c.oid) AS policy_count
          FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
          WHERE n.nspname='public' AND c.relkind='r' ORDER BY c.relname""")
        )
        requested = [r for r in report["requested_table_security"] if r["table_name"] in EXPECTED]
        if len(requested) != 10 or any(
            not r["rls_enabled"] or r["policy_count"] < 1 for r in requested
        ):
            raise RuntimeError("requested_table_rls_or_policy_missing")
        report["foreign_keys"] = (
            query("""SELECT conrelid::regclass::text AS source,confrelid::regclass::text AS target,
            conname AS constraint_name,convalidated AS validated FROM pg_constraint
            WHERE contype='f' AND connamespace='public'::regnamespace ORDER BY
            source,constraint_name""")
        )
        if not all(r["validated"] for r in report["foreign_keys"]):
            raise RuntimeError("unvalidated_foreign_key")
        if "stripe_test_order" in report["public_tables"]:
            raise RuntimeError("sandbox_tables_must_not_be_deployed")
        report["status"] = "VERIFIED"
    return report


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--project-ref", required=True)
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--report", required=True)
    args = parser.parse_args()
    try:
        result = deploy(args.project_ref, args.apply)
    except (RuntimeError, httpx.HTTPError, ValueError) as error:
        # Network exception strings can contain private context; emit stable codes only.
        result = {
            "status": "BLOCKED_OR_UNKNOWN",
            "project_ref": args.project_ref,
            "reason": str(error)
            if isinstance(error, RuntimeError)
            else "management_request_failed",
            "instruction": "Verify target state before retry; no automatic reapplication.",
        }
        Path(args.report).write_text(json.dumps(result, indent=2) + "\n")
        print(json.dumps(result))
        raise SystemExit(2) from None
    Path(args.report).write_text(json.dumps(result, indent=2) + "\n")
    print(
        json.dumps(
            {
                "status": result["status"],
                "project_ref": result["project_ref"],
                "requested_tables_verified": 10,
                "total_public_tables": len(result["public_tables"]),
                "revision": result["revision"],
                "production_modified": False,
            },
            indent=2,
        )
    )
