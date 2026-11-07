"""Value-safe current-source and client-bundle scan; never prints matched credentials."""

import json
import os
import re
import subprocess
from datetime import UTC, datetime
from pathlib import Path


def main():
    names = (
        subprocess.check_output(
            ["git", "ls-files", "--cached", "--others", "--exclude-standard", "-z"]
        )
        .decode()
        .split("\0")
    )
    files = [Path(name) for name in names if name and Path(name).is_file()]
    bundles = [Path("dist/godaddy-web"), Path("apps/mobile/dist")]
    for directory in bundles:
        if directory.is_dir():
            files.extend(p for p in directory.rglob("*") if p.is_file())
    secrets = {
        k: v.encode()
        for k, v in os.environ.items()
        if len(v) > 12
        and any(
            s in k
            for s in ("SECRET", "TOKEN", "SERVICE_ROLE", "DATABASE_URL", "PASSWORD", "PRIVATE_KEY")
        )
        and not k.startswith(("NEXT_PUBLIC_", "EXPO_PUBLIC_"))
    }
    matches = []
    for file in files:
        raw = file.read_bytes()
        for name, value in secrets.items():
            if value in raw:
                matches.append(
                    {"file": str(file), "rule": "configured_privileged_value", "variable": name}
                )
        if re.search(rb"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----", raw):
            matches.append({"file": str(file), "rule": "private_key_marker_requires_review"})
    result = {
        "observed_at": datetime.now(UTC).isoformat(),
        "scope": (
            "Current tracked/untracked nonignored source plus prepared web/native bundles; "
            "not full Git history or remote secret rotation proof"
        ),
        "files_scanned": len(files),
        "privileged_values_checked": len(secrets),
        "matches": matches,
        "status": "PASSED" if not matches else "REVIEW_REQUIRED",
    }
    Path("docs/launch/evidence/secret-scan.json").write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps({k: v for k, v in result.items() if k != "matches"}))
    if matches:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
