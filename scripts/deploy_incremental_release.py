"""Apply ONE reviewed incremental application release (0014+) to the authorized production project.

Safe by default: without --apply this is a read-only dry run. Applying needs all of:
  * --production-approved and --approved-sha256 equal to the reviewed artifact's checksum;
  * an untouched manifest and canonical sources;
  * a completed physical backup under 48 hours old;
  * an alembic_version equal to the release's starting revision.
The SQL runs once, as one request, never retried; after any unclear outcome verify state by hand.
Nothing here has been run against production. Credentials come only from SUPABASE_ACCESS_TOKEN.
"""

import argparse
import hashlib
import importlib.util
import json
import os
from datetime import UTC, datetime
from pathlib import Path

import httpx

ROOT = Path(__file__).resolve().parents[1]
_spec = importlib.util.spec_from_file_location(
    "foundation", ROOT / "scripts/deploy_application_foundation.py"
)
foundation = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(foundation)

CHAIN = {
    "0014_creator_studio": "0013_passwordless_accounts",
    "0015_private_media": "0014_creator_studio",
    "0016_analysis_jobs": "0015_private_media",
    "0017_analysis_passport": "0016_analysis_jobs",
    "0018_tryon": "0017_analysis_passport",
    "0019_professional_bookings": "0018_tryon",
}
SANDBOX = "0009_stripe_test_ledger"
BASE = "https://api.supabase.com/v1/projects/"


def validate_release(revision, artifact, root=ROOT):
    if revision not in CHAIN:
        raise RuntimeError("unsupported_release_revision")
    artifact = Path(artifact)
    manifest = json.loads(artifact.with_suffix(".manifest.json").read_text())
    sql = artifact.read_text()
    digest = hashlib.sha256(sql.encode()).hexdigest()
    if digest != manifest["sha256"]:
        raise RuntimeError("release_checksum_mismatch")
    if manifest["revision"] != revision or manifest.get("starting_revision") != CHAIN[revision]:
        raise RuntimeError("unexpected_release_revision")
    if manifest.get("excluded_sandbox") != SANDBOX:
        raise RuntimeError("sandbox_exclusion_required")
    for name, expected in manifest["canonical_sources"].items():
        if hashlib.sha256((root / name).read_bytes()).hexdigest() != expected:
            raise RuntimeError("canonical_source_drift")
    statements = [
        line.strip() for line in sql.splitlines() if line.strip() and not line.startswith("--")
    ]
    expected_stamp = (
        f"UPDATE alembic_version SET version_num='{revision}' "
        f"WHERE alembic_version.version_num = '{CHAIN[revision]}';"
    )
    if statements[0] != "BEGIN;" or statements[-1] != "COMMIT;" or statements[-2] != expected_stamp:
        raise RuntimeError("release_must_be_one_transaction_ending_in_its_version_stamp")
    return sql, manifest, digest


def deploy(
    target,
    revision,
    artifact,
    apply=False,
    production_approved=False,
    approved_sha256=None,
    client=None,
):
    sql, manifest, digest = validate_release(revision, artifact)
    token = os.environ.get("SUPABASE_ACCESS_TOKEN")
    if not token and client is None:
        raise RuntimeError("management_api_token_required")
    if apply and not approved_sha256:
        raise RuntimeError("approved_sha256_required")
    if apply and approved_sha256 != digest:
        raise RuntimeError("approved_sha256_does_not_match_release")
    report = {
        "observed_at": datetime.now(UTC).isoformat(),
        "project_ref": target,
        "revision": revision,
        "release_sha256": digest,
        "apply_requested": apply,
        "production_modified": False,
    }
    own = client is None
    client = client or httpx.Client(
        headers={"Authorization": "Bearer " + token},
        timeout=60,
        follow_redirects=False,
        trust_env=True,
    )
    try:
        branches = client.get(BASE + foundation.PROJECT + "/branches")
        if not branches.is_success:
            raise RuntimeError("branch_inventory_failed")
        foundation.validate_branch(branches.json(), target, production_approved or not apply)

        def query(statement, readonly=True):
            response = client.post(
                BASE + target + "/database/query", json={"query": statement, "read_only": readonly}
            )
            if not response.is_success:
                raise RuntimeError("management_sql_rejected_http_" + str(response.status_code))
            return response.json()

        def versions():
            rows = query("SELECT version_num FROM public.alembic_version ORDER BY version_num")
            return sorted(r["version_num"] for r in rows if r["version_num"] != SANDBOX)

        before = versions()
        report["revision_before"] = before
        if before != [CHAIN[revision]]:
            raise RuntimeError("starting_revision_mismatch")
        if apply:
            backups = client.get(BASE + foundation.PROJECT + "/database/backups")
            if not backups.is_success:
                raise RuntimeError("backup_verification_unavailable")
            report["recovery_point"] = foundation.validate_backup(backups.json().get("backups", []))
            query(sql, False)  # exactly one attempt
            report["production_modified"] = True
            after = versions()
            report["revision_after"] = after
            if after != [revision]:
                raise RuntimeError("post_execution_revision_unconfirmed_verify_manually")
            unvalidated = query(
                "SELECT count(*) AS n FROM pg_constraint WHERE contype='f' "
                "AND connamespace='public'::regnamespace AND NOT convalidated"
            )[0]["n"]
            if unvalidated:
                raise RuntimeError("unvalidated_foreign_key")
            report["status"] = "VERIFIED"
        else:
            report["status"] = "DRY_RUN_OK"
        return report
    finally:
        if own:
            client.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--project-ref", required=True)
    parser.add_argument("--revision", required=True)
    parser.add_argument("--artifact", required=True)
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--production-approved", action="store_true")
    parser.add_argument("--approved-sha256")
    parser.add_argument("--report", required=True)
    args = parser.parse_args()
    try:
        result = deploy(
            args.project_ref,
            args.revision,
            args.artifact,
            args.apply,
            args.production_approved,
            args.approved_sha256,
        )
    except (RuntimeError, httpx.HTTPError, ValueError, KeyError) as error:
        result = {
            "status": "BLOCKED_OR_UNKNOWN",
            "project_ref": args.project_ref,
            "reason": str(error) if isinstance(error, RuntimeError) else "request_failed",
            "instruction": "Verify target state before any retry; no automatic reapplication.",
        }
        Path(args.report).write_text(json.dumps(result, indent=2) + "\n")
        print(json.dumps(result))
        raise SystemExit(2) from None
    Path(args.report).write_text(json.dumps(result, indent=2) + "\n")
    print(
        json.dumps(
            {k: result[k] for k in ("status", "revision", "release_sha256", "production_modified")}
        )
    )
