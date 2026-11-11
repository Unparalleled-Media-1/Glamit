"""Bounded actual native UI labels for failed isolated runs; never a success signal."""

import json
import os
import subprocess
import sys
import xml.etree.ElementTree as ET
from pathlib import Path


def json_labels(value):
    labels = []
    if isinstance(value, dict):
        attributes = value.get("attributes", value)
        if isinstance(attributes, dict) and attributes.get("password") in [True, "true"]:
            return []
        for key, item in value.items():
            if (
                key in {"text", "label", "accessibilityText", "hint"}
                and isinstance(item, str)
                and item.strip()
            ):
                labels.append(item[:120])
            else:
                labels.extend(json_labels(item))
    elif isinstance(value, list):
        for item in value:
            labels.extend(json_labels(item))
    return labels


def main():
    if os.environ.get("GLAM_NATIVE_DEVICE_JOURNEY") != "true":
        raise SystemExit("Only the isolated device acceptance runner can capture diagnostics")
    target = Path("artifacts/native-device")
    if sys.argv[1] == "android":
        subprocess.run(
            ["adb", "shell", "uiautomator", "dump", "/sdcard/glam-failure.xml"],
            check=True,
            capture_output=True,
        )
        raw = subprocess.check_output(["adb", "exec-out", "cat", "/sdcard/glam-failure.xml"])
        (target / "failed-native-hierarchy.xml").write_bytes(raw)
        labels = [
            node.get(key, "")[:120]
            for node in ET.fromstring(raw).iter("node")
            if node.get("password") != "true"
            for key in ["text", "content-desc"]
            if node.get(key)
        ]
    else:
        try:
            result = subprocess.run(
                ["maestro", "hierarchy", "--no-reinstall-driver"],
                capture_output=True,
                text=True,
                timeout=30,
            )
        except subprocess.TimeoutExpired:
            print("Native hierarchy timed out; retained UI failure remains unresolved")
            return
        (target / "failed-native-hierarchy.txt").write_text(result.stdout + result.stderr)
        if result.returncode:
            print("Native hierarchy capture unavailable; retained failure remains unresolved")
            return
        try:
            labels = json_labels(json.loads(result.stdout))
        except ValueError:
            print("Native hierarchy format not parsed; no visual pass is inferred")
            return
    print("Actual isolated native failure labels: " + json.dumps(sorted(set(labels))[:20]))


if __name__ == "__main__":
    main()
