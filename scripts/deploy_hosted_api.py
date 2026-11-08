"""Apply verified incremental hosted API releases only to the original production project."""

import argparse
import hashlib
import json
import os
from datetime import UTC, datetime
from pathlib import Path

import httpx
from deploy_application_foundation import PROJECT, validate_backup, validate_branch
from glam_api.private_media import PRIVATE_MEDIA_CATALOG_SQL, validate_private_media_catalog


def validate_original_target(branches, metadata):
    if branches:
        validate_branch(branches, PROJECT, production_approved=True)
    elif not (
        metadata.get("id") == PROJECT
        and metadata.get("status") == "ACTIVE_HEALTHY"
        and metadata.get("database", {}).get("host") == f"db.{PROJECT}.supabase.co"
    ):
        raise RuntimeError("original_production_project_required")
    # An empty branch inventory is expected after disabling unauthorized preview automation.
    # Never enable branching or create another project to satisfy a deployment guard.


def deploy(apply=False, release="0011"):
    lineage = {
        "0011": ("0010_supabase_foundation", "0011_hosted_api"),
        "0012": ("0011_hosted_api", "0012_hosted_routines"),
        "0013": ("0012_hosted_routines", "0013_passwordless_accounts"),
        "0014": ("0013_passwordless_accounts", "0014_creator_studio"),
        "0015": ("0014_creator_studio", "0015_private_media"),
    }
    predecessor, revision = lineage[release]
    artifact = Path(f"db/migrations/releases/{release}_application.sql")
    manifest = json.loads(artifact.with_suffix(".manifest.json").read_text())
    if manifest.get("starting_revision") != predecessor or manifest["revision"] != revision:
        raise RuntimeError("unexpected_release_lineage")
    if hashlib.sha256(artifact.read_bytes()).hexdigest() != manifest["sha256"]:
        raise RuntimeError("artifact_checksum_mismatch")
    for name, digest in manifest["canonical_sources"].items():
        if hashlib.sha256(Path(name).read_bytes()).hexdigest() != digest:
            raise RuntimeError("source_checksum_mismatch")
    report = {
        "project_ref": PROJECT,
        "branch": "main",
        "observed_at": datetime.now(UTC).isoformat(),
        "release_sha256": manifest["sha256"],
        "production_modified": False,
    }
    with httpx.Client(
        headers={"Authorization": "Bearer " + os.environ["SUPABASE_ACCESS_TOKEN"]},
        timeout=90,
        follow_redirects=False,
    ) as client:
        base = "https://api.supabase.com/v1/projects/" + PROJECT

        def request(method, path, **kwargs):
            result = client.request(method, base + path, **kwargs)
            if not result.is_success:
                raise RuntimeError("management_request_http_" + str(result.status_code))
            return result.json()

        def query(sql):
            return request("POST", "/database/query", json={"query": sql, "read_only": False})

        validate_original_target(request("GET", "/branches"), request("GET", ""))
        report["recovery_point"] = validate_backup(request("GET", "/database/backups")["backups"])
        before = query("SELECT version_num FROM public.alembic_version ORDER BY version_num")
        report["previous_revisions"] = before
        if apply:
            if before != [{"version_num": manifest["starting_revision"]}]:
                raise RuntimeError("unexpected_predecessor_no_reapplication")
            query(artifact.read_text())
            report["production_modified"] = True
        report["revisions"] = query(
            "SELECT version_num FROM public.alembic_version ORDER BY version_num"
        )
        report["tables"] = query(
            """SELECT c.relname AS name,c.relrowsecurity AS rls FROM pg_class c
            JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public'
            AND c.relkind='r' ORDER BY c.relname"""
        )
        report["rpc_permissions"] = query(
            """SELECT p.proname,has_function_privilege('anon',p.oid,'EXECUTE') AS anon_execute,
            has_function_privilege('authenticated',p.oid,'EXECUTE') AS user_execute
            FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
            WHERE n.nspname='public' AND p.proname IN
            ('glam_api_gate','glam_api_v1','glam_backend_status') ORDER BY p.proname"""
        )
        if report["revisions"] != [{"version_num": manifest["revision"]}]:
            raise RuntimeError("revision_verification_failed")
        if len(report["rpc_permissions"]) != 3 or any(
            r["anon_execute"] or not r["user_execute"] for r in report["rpc_permissions"]
        ):
            raise RuntimeError("rpc_permissions_verification_failed")
        if any(not r["rls"] for r in report["tables"]):
            raise RuntimeError("rls_verification_failed")
        if release == "0015":
            report["private_media_catalog"] = query(PRIVATE_MEDIA_CATALOG_SQL)
            validate_private_media_catalog(report["private_media_catalog"])
        report["status"] = "VERIFIED"
    return report


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply-production-approved", action="store_true")
    parser.add_argument("--report", required=True)
    parser.add_argument(
        "--release", choices=["0011", "0012", "0013", "0014", "0015"], default="0011"
    )
    args = parser.parse_args()
    try:
        result = deploy(args.apply_production_approved, args.release)
    except (RuntimeError, httpx.HTTPError, KeyError, ValueError) as error:
        result = {
            "status": "BLOCKED_OR_UNKNOWN",
            "reason": str(error)
            if isinstance(error, RuntimeError)
            else "request_or_configuration_error",
            "instruction": "Inspect actual state before any retry.",
        }
    Path(args.report).write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps({k: v for k, v in result.items() if k not in {"tables", "rpc_permissions"}}))
    if result["status"] != "VERIFIED":
        raise SystemExit(2)
