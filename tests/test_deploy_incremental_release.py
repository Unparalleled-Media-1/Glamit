# ruff: noqa: E501
"""The incremental production executor is exercised only against an in-memory Management API double."""

import hashlib
import importlib.util
import json
import shutil
from datetime import UTC, datetime, timedelta
from pathlib import Path

import httpx
import pytest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location(
    "incremental", ROOT / "scripts/deploy_incremental_release.py"
)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
PROJECT = mod.foundation.PROJECT
ARTIFACT = ROOT / "db/migrations/releases/0014_application.sql"
REVISION = "0014_creator_studio"
DIGEST = hashlib.sha256(ARTIFACT.read_bytes()).hexdigest()


class Api:
    """Pretends to be the Supabase Management API and records every request."""

    def __init__(self, version="0013_passwordless_accounts", backup_age_hours=2, fail_write=False):
        self.version, self.fail_write, self.writes, self.reads = version, fail_write, [], 0
        when = (
            (datetime.now(UTC) - timedelta(hours=backup_age_hours))
            .isoformat()
            .replace("+00:00", "Z")
        )
        self.backups = [
            {"id": 1, "inserted_at": when, "status": "COMPLETED", "is_physical_backup": True}
        ]

    def handler(self, request: httpx.Request) -> httpx.Response:
        path = request.url.path
        if path.endswith("/branches"):
            return httpx.Response(
                200,
                json=[
                    {
                        "project_ref": PROJECT,
                        "is_default": True,
                        "parent_project_ref": PROJECT,
                        "name": "main",
                    }
                ],
            )
        if path.endswith("/database/backups"):
            return httpx.Response(200, json={"backups": self.backups})
        body = json.loads(request.content)
        if body["read_only"]:
            self.reads += 1
            if "alembic_version" in body["query"]:
                return httpx.Response(
                    200,
                    json=[
                        {"version_num": self.version},
                        {"version_num": "0009_stripe_test_ledger"},
                    ],
                )
            return httpx.Response(200, json=[{"n": 0}])
        self.writes.append(body["query"])
        if self.fail_write:
            return httpx.Response(500, json={})
        self.version = REVISION
        return httpx.Response(200, json=[])

    def client(self):
        return httpx.Client(transport=httpx.MockTransport(self.handler))


def run(api, **kw):
    args = {"apply": True, "production_approved": True, "approved_sha256": DIGEST, **kw}
    return mod.deploy(PROJECT, REVISION, ARTIFACT, client=api.client(), **args)


def test_dry_run_is_read_only_and_reports_the_checksum():
    api = Api()
    report = run(api, apply=False, production_approved=False, approved_sha256=None)
    assert report["status"] == "DRY_RUN_OK" and report["release_sha256"] == DIGEST
    assert api.writes == [] and report["production_modified"] is False


def test_apply_runs_the_sql_exactly_once_then_verifies_the_new_revision():
    api = Api()
    report = run(api)
    assert report["status"] == "VERIFIED" and report["revision_after"] == [REVISION]
    assert len(api.writes) == 1 and api.writes[0] == ARTIFACT.read_text()
    assert report["recovery_point"]["id"] == 1


@pytest.mark.parametrize(
    ("kw", "reason"),
    [
        ({"production_approved": False}, "explicit_production_authorization_required"),
        ({"approved_sha256": None}, "approved_sha256_required"),
        ({"approved_sha256": "0" * 64}, "approved_sha256_does_not_match_release"),
    ],
)
def test_missing_or_wrong_owner_approval_blocks_before_any_request_changes_anything(kw, reason):
    api = Api()
    with pytest.raises(RuntimeError, match=reason):
        run(api, **kw)
    assert api.writes == []


def test_stale_backup_blocks_the_write():
    api = Api(backup_age_hours=72)
    with pytest.raises(RuntimeError, match="recent_completed_recovery_point_required"):
        run(api)
    assert api.writes == []


def test_wrong_starting_revision_blocks_the_write():
    api = Api(version="0015_private_media")
    with pytest.raises(RuntimeError, match="starting_revision_mismatch"):
        run(api)
    assert api.writes == []


def test_a_failed_write_is_never_retried():
    api = Api(fail_write=True)
    with pytest.raises(RuntimeError, match="management_sql_rejected_http_500"):
        run(api)
    assert len(api.writes) == 1


def test_tampered_artifact_manifest_or_unsupported_revision_is_refused(tmp_path):
    for name in ("0014_application.sql", "0014_application.manifest.json"):
        shutil.copy(ROOT / "db/migrations/releases" / name, tmp_path / name)
    tampered = tmp_path / "0014_application.sql"
    tampered.write_text(tampered.read_text() + "\nDROP TABLE public.profiles;\n")
    with pytest.raises(RuntimeError, match="release_checksum_mismatch"):
        mod.validate_release(REVISION, tampered)
    with pytest.raises(RuntimeError, match="unsupported_release_revision"):
        mod.validate_release("0010_supabase_foundation", ARTIFACT)
    with pytest.raises(RuntimeError, match="unexpected_release_revision"):
        mod.validate_release("0015_private_media", ARTIFACT)


def test_the_five_candidate_releases_pass_structural_validation():
    pack = ROOT / "docs/database/migration-approval-pack/exact-sql"
    for revision in mod.CHAIN:
        number = revision[:4]
        path = ROOT / f"db/migrations/releases/{number}_application.sql"
        path = path if path.exists() else pack / f"{number}_application.sql"
        mod.validate_release(revision, path)
