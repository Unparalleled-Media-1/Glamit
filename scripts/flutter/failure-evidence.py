"""Bounded public F1 UI diagnostics, never a native acceptance substitute."""

import json
import os
import subprocess
import sys
import xml.etree.ElementTree as ET
from pathlib import Path


def main():
    if os.environ.get("GLAM_FLUTTER_VISUAL_GATE") != "F1":
        raise SystemExit("Isolated visual-review runner only")
    root = Path(os.environ["GLAM_FLUTTER_EVIDENCE"])
    if sys.argv[1] == "android":
        subprocess.run(
            ["adb", "shell", "uiautomator", "dump", "/sdcard/glam-flutter-failure.xml"],
            check=True,
            capture_output=True,
            timeout=20,
        )
        value = subprocess.check_output(
            ["adb", "exec-out", "cat", "/sdcard/glam-flutter-failure.xml"], timeout=20
        )
        root.joinpath("failure-native-ui.xml").write_bytes(value)
        labels = [
            node.get(key, "")[:100]
            for node in ET.fromstring(value).iter("node")
            if node.get("password") != "true"
            for key in ["text", "content-desc", "resource-id"]
            if node.get(key)
        ]
        print("Actual native failure labels: " + json.dumps(sorted(set(labels))[:24]))
    else:
        try:
            value = subprocess.run(
                ["maestro", "--device", sys.argv[2], "hierarchy", "--no-reinstall-driver"],
                capture_output=True,
                text=True,
                timeout=40,
            )
        except subprocess.TimeoutExpired:
            print("Native hierarchy capture timed out; UI failure remains unresolved")
            return
        root.joinpath("failure-native-ui.txt").write_text(value.stdout + value.stderr)
        print("Actual native hierarchy (bounded): " + value.stdout[-1800:])


if __name__ == "__main__":
    main()
