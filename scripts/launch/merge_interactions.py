"""Preserve raw outcomes and combine retests with explicit already-current dispositions."""

import json
from collections import Counter
from pathlib import Path

folder = Path("docs/launch/evidence")
initial = json.loads((folder / "interactions-initial.json").read_text())
recheck = json.loads((folder / "interactions-recheck.json").read_text())


def key(row):
    return row["route"], row["viewport"], row["control_id"]


latest = {key(row): row for row in recheck["results"]}
current = {
    "AI Personal Stylist": "/advisor",
    "Open profile": "/profile",
    "Privacy": "/privacy",
    "Change shopping location": "/complete",
    "Complete the Look": "/complete",
}
results = []
for original in initial["results"]:
    result = dict(latest.get(key(original), original))
    if result["status"] == "NO_OBSERVED_CHANGE" and current.get(result["name"]) == result["route"]:
        result["raw_status"] = result["status"]
        result["status"] = "SKIPPED_ALREADY_CURRENT"
        result["reason"] = (
            "Source handler targets the route already displayed; no new state response measured. "
            "Not counted as an additional pass."
        )
    results.append(result)
combined = {
    **initial,
    "results": results,
    "counts": dict(Counter(r["status"] for r in results)),
    "recheck_observed_at": recheck["observed_at"],
    "retest_note": (
        "Raw initial and recheck results preserved; no blocked/skipped case becomes a pass."
    ),
}
(folder / "interactions.json").write_text(json.dumps(combined, indent=2) + "\n")
print(json.dumps(combined["counts"]))
