"""Execute the repository's local regression commands and retain exit codes/logs."""

import json
import os
import subprocess
import time
from datetime import UTC, datetime
from pathlib import Path

CHECKS = [
    (
        "client-contracts",
        ["npm", "run", "test:client"],
        "Shared product contracts; no live providers",
    ),
    (
        "web-journeys",
        ["npm", "run", "test:web"],
        "Existing local browser journeys; disconnected AI remains unavailable",
    ),
    (
        "golden-patterns",
        ["npm", "run", "test:golden"],
        "Candidate visual invariants; not owner approval",
    ),
    ("connected-contracts", ["npm", "run", "test:connections"], "Adapter/UI doubles only"),
    (
        "auth-ui",
        ["npm", "run", "test:hosted-account"],
        "Mocked Auth transport; no SMS/OAuth delivery",
    ),
    (
        "auth-native-gate",
        ["npm", "run", "test:auth"],
        "Contract/OS storage doubles; no physical device",
    ),
    ("public-key-guard", ["npm", "run", "test:public-config"], "Privileged key rejection"),
    ("client-types", ["npm", "run", "typecheck"], "Web and Expo TypeScript"),
    ("cpanel-types", ["npm", "run", "typecheck:godaddy"], "Static host entry point"),
    (
        "production-dependency-audit",
        ["npm", "audit", "--omit=dev", "--audit-level=moderate"],
        "Registry advisory snapshot",
    ),
    (
        "edge-security",
        ["/workspace/glam-tools/backend-cli/node_modules/.bin/deno", "test", "tests/edge"],
        "Cryptographic/handler regression",
    ),
    (
        "native-compatibility",
        ["npm", "exec", "--workspace=@glam/mobile", "--", "expo", "install", "--check"],
        "Installed Expo SDK compatibility map",
    ),
    (
        "native-exports",
        ["npm", "run", "export", "--workspace=@glam/mobile"],
        "iOS/Android Metro exports; not installed binaries",
    ),
]


def main():
    out = Path("/workspace/artifacts/glam-launch/checks")
    out.mkdir(parents=True, exist_ok=True)
    report = {"observed_at": datetime.now(UTC).isoformat(), "checks": []}
    for name, command, scope in CHECKS:
        started = time.monotonic()
        env = {
            **os.environ,
            "EXPO_OFFLINE": "1",
            "EXPO_NO_TELEMETRY": "1",
            "NEXT_TELEMETRY_DISABLED": "1",
        }
        with (out / (name + ".log")).open("w") as log:
            result = subprocess.run(
                command, env=env, stdout=log, stderr=subprocess.STDOUT, timeout=600
            )
        item = {
            "name": name,
            "command": command,
            "scope": scope,
            "status": "PASSED" if result.returncode == 0 else "FAILED",
            "exit_code": result.returncode,
            "seconds": round(time.monotonic() - started, 2),
            "log": "checks/" + name + ".log",
        }
        report["checks"].append(item)
        Path("docs/launch/evidence/regression-checks.json").write_text(
            json.dumps(report, indent=2) + "\n"
        )
        print(json.dumps(item), flush=True)
    if any(c["status"] != "PASSED" for c in report["checks"]):
        raise SystemExit(1)


if __name__ == "__main__":
    main()
