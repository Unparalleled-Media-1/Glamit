"""Tap real installed Android tabs using UIAutomator; never a web renderer.

Run only on an isolated emulator with the credential-free local verification app.
Screenshots/XML prove startup/navigation only, not provider/commerce acceptance.
"""

import re
import subprocess
import time
import xml.etree.ElementTree as ET
from pathlib import Path

PACKAGE = "com.glambeauty.localverification"
OUTPUT = Path("artifacts/native-android")


def adb(*args):
    return subprocess.check_output(["adb", *args])


def hierarchy():
    adb("shell", "uiautomator", "dump", "/sdcard/glam-native-ui.xml")
    return adb("exec-out", "cat", "/sdcard/glam-native-ui.xml")


def target(xml, label):
    for node in ET.fromstring(xml).iter("node"):
        values = [" ".join(node.get(key, "").split()) for key in ("text", "content-desc")]
        if not any(v == label or v.endswith(" " + label) for v in values):
            continue
        numbers = re.fullmatch(r"\[(\d+),(\d+)\]\[(\d+),(\d+)\]", node.get("bounds", ""))
        if numbers:
            left, top, right, bottom = map(int, numbers.groups())
            if right > left and bottom > top:
                return str((left + right) // 2), str((top + bottom) // 2)
    raise RuntimeError(f"Actual native tab not found: {label}")


def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    for label, name in [
        ("Home", "home"),
        ("Analyze", "analysis"),
        ("AI Studio", "studio"),
        ("AI Advisor", "advisor"),
        ("Profile", "profile"),
    ]:
        xml = hierarchy()
        x, y = target(xml, label)
        adb("shell", "input", "tap", x, y)
        time.sleep(2)
        if not adb("shell", "pidof", PACKAGE).strip():
            raise RuntimeError("Native app exited during navigation")
        (OUTPUT / f"{name}.png").write_bytes(adb("exec-out", "screencap", "-p"))
        (OUTPUT / f"{name}.xml").write_bytes(hierarchy())
        print(f"Captured actual Android native tab: {label}", flush=True)


if __name__ == "__main__":
    main()
