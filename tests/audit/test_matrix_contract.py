"""Audit integrity only: these checks do not certify any product feature."""

import csv
import json
from pathlib import Path

BASE = Path("docs/audit")


def test_every_requirement_has_unique_traceable_row_and_module():
    spec = json.loads((BASE / "requirements.json").read_text())
    rows = list(csv.DictReader((BASE / "GLAM_BEAUTY_MASTER_FEATURE_MATRIX.csv").open()))
    assert {r["feature_id"] for r in rows} == {r["id"] for r in spec["features"]}
    assert len(rows) == len({r["feature_id"] for r in rows})
    assert len({r["module"] for r in rows}) == 27
    for row in rows:
        assert all(value.strip() for value in row.values())
        for reference in row["component_and_source"].split("; "):
            file, line = reference.rsplit(":", 1)
            assert Path(file).is_file()
            assert 0 < int(line) <= len(Path(file).read_text().splitlines())


def test_coverage_counts_cannot_inflate_blocked_or_placeholder_readiness():
    rows = list(csv.DictReader((BASE / "GLAM_BEAUTY_MASTER_FEATURE_MATRIX.csv").open()))
    summary = json.loads((BASE / "evidence/feature-summary.json").read_text())
    verified = sum(r["implementation_status"] == "VERIFIED COMPLETE" for r in rows)
    assert summary["fully_verified"] == verified
    assert summary["operationally_verified_percent"] == round(100 * verified / len(rows), 2)
    assert summary["total_atomic_requirements"] == len(rows)
    for row in rows:
        if row["implementation_status"] == "MISSING":
            assert row["api_endpoint_or_service"].startswith("NONE for this feature")
        assert row["deferral_approval"].startswith("NONE")


def test_production_catalog_and_deployed_source_are_separate_from_local_fixtures():
    actual = json.loads((BASE / "evidence/production-catalog.json").read_text())
    assert actual["project_ref"] == "bkkmsbxrxkqaveymcrgi"
    assert all(t["rowsecurity"] for t in actual["tables"])
    assert not any(t["tablename"].startswith("stripe_test_") for t in actual["tables"])
    ci = json.loads((BASE / "evidence/railway-ci-receipt.json").read_text())
    assert ci["counts"]["critical_passed"] == 0
    assert ci["decision"] == "NO-GO"
