"""Bounded labels from the credential-free Analyze runner; no screenshots in logs."""

import json
import os
import subprocess
import sys
import xml.etree.ElementTree as ET
from pathlib import Path


def main():
    if os.environ.get("GLAM_ANALYZE_REVIEW") != "1":
        raise SystemExit("Analyze review runner only")
    root = Path(os.environ["GLAM_FLUTTER_EVIDENCE"])
    if sys.argv[1] == "android":
        subprocess.run(
            ["adb", "shell", "uiautomator", "dump", "/sdcard/analyze-failure.xml"],
            check=True,
            capture_output=True,
            timeout=20,
        )
        value = subprocess.check_output(
            ["adb", "exec-out", "cat", "/sdcard/analyze-failure.xml"], timeout=20
        )
        root.joinpath("failure-ui.xml").write_bytes(value)
        labels = [
            node.get(key, "")[:120]
            for node in ET.fromstring(value).iter("node")
            if node.get("password") != "true"
            for key in ["text", "content-desc", "resource-id"]
            if node.get(key)
        ]
        print("Actual failure labels: " + json.dumps(sorted(set(labels))[:32]))
    else:
        try:
            result = subprocess.run(
                ["maestro", "--device", sys.argv[2], "hierarchy", "--no-reinstall-driver"],
                capture_output=True,
                text=True,
                timeout=90,
            )
            root.joinpath("failure-ui.txt").write_text(result.stdout + result.stderr)
            print("Actual native hierarchy (bounded): " + result.stdout[-2800:])
        except subprocess.TimeoutExpired:
            print("Native hierarchy unavailable; retained Maestro debug output is still required")
        # Maestro's existing failure JSON may retain the hierarchy without a new driver.
        labels = set()

        def walk(v):
            if isinstance(v, dict):
                for key, value in v.items():
                    if (
                        key in {"text", "label", "accessibilityText", "resourceId"}
                        and isinstance(value, str)
                        and not any(
                            word in value.lower() for word in ["password", "token", "secret"]
                        )
                    ):
                        labels.add(value[:120])
                    elif isinstance(value, (dict, list)):
                        walk(value)
            elif isinstance(v, list):
                for item in v:
                    walk(item)

        for file in root.rglob("*.json"):
            if file.stat().st_size < 5_000_000:
                try:
                    walk(json.loads(file.read_text()))
                except (ValueError, UnicodeError):
                    pass
        print("Retained failure JSON labels: " + json.dumps(sorted(labels)[:32]))


if __name__ == "__main__":
    main()
