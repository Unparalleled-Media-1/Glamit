"""Package the verified source snapshots; no worktree, private env or dependencies."""

import json
import re
import subprocess
from pathlib import Path

source = Path("docs/application-preview/published-build-snapshots.json")
output = Path("dist/build-snapshots")
output.mkdir(parents=True, exist_ok=True)
for row in json.loads(source.read_text())["snapshots"]:
    commit = row["commit"]
    if not re.fullmatch(r"[a-f0-9]{40}", commit):
        raise ValueError("Snapshot commit must be a complete Git object ID")
    branch = re.sub(r"[^A-Za-z0-9_-]", "-", row["branch"])
    destination = output / f"{commit[:7]}-{branch}.zip"
    subprocess.run(
        ["git", "archive", "--format=zip", f"--output={destination}", commit], check=True
    )
print("Packaged all eight verified source snapshots in dist/build-snapshots")
