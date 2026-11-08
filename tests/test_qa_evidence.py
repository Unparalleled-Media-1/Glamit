"""QA reporting contracts do not assert product readiness."""

import csv
import json
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "docs/qa"


def test_control_evidence_has_unique_ids_and_honest_statuses():
    with (ROOT / "CONTROL_CLICKTHROUGH_RESULTS.csv").open() as stream:
        rows = list(csv.DictReader(stream))
    summary = json.loads((ROOT / "evidence/qa-summary.json").read_text())
    assert len(rows) == len({row["Control ID"] for row in rows})
    assert dict(Counter(row["Status"] for row in rows)) == summary["status_counts"]
    assert set(summary["status_counts"]) <= {
        "PASS",
        "FAIL",
        "BLOCKED",
        "NOT TESTED",
        "NOT APPLICABLE",
    }
    assert all(
        row["Status"] != "PASS" for row in rows if row["Control ID"].startswith("ASSERT-AUTH-")
    )
    qualified = [r for r in rows if r["Control ID"].startswith("DOM-") and r["Status"] == "PASS"]
    assert len(qualified) == summary["qualified_actionable_control_passes"]
    assert all(r["Expected Database Effect"] == "NONE" for r in qualified)


def test_no_go_retains_all_fifteen_review_gates_and_role_denominator():
    gates = json.loads((ROOT / "evidence/qa-release-gates.json").read_text())
    summary = json.loads((ROOT / "evidence/qa-summary.json").read_text())
    journeys = json.loads((ROOT / "evidence/role-journeys.json").read_text())
    assert {g["id"] for g in gates} == {f"G{i}" for i in range(1, 16)}
    assert len(gates) == 15
    assert len(journeys) == summary["latest_role_journeys"] == 71
    assert summary["qualified_role_journeys_passed"] == 0
    assert summary["decision"] == "NO-GO"
    assert any(g["status"] != "PASS" for g in gates)
