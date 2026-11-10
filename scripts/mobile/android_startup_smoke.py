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
    visible = sorted(
        {
            node.get(key, "")
            for node in ET.fromstring(xml).iter("node")
            for key in ("text", "content-desc")
            if node.get(key)
        }
    )
    raise RuntimeError(
        f"Actual native tab not found: {label}; visible native labels: {visible[:30]}"
    )


def ready_tab(label, timeout=30):
    deadline = time.monotonic() + timeout
    launcher_waited = False
    while True:
        xml = hierarchy()
        # An emulator launcher ANR can overlay the already-started app. Dismiss
        # only this exact unrelated dialog once; a GLAM ANR remains a failure.
        if not launcher_waited and b"Quickstep isn't responding" in xml:
            OUTPUT.mkdir(parents=True, exist_ok=True)
            (OUTPUT / "launcher-anr.xml").write_bytes(xml)
            (OUTPUT / "launcher-anr.png").write_bytes(adb("exec-out", "screencap", "-p"))
            x, y = target(xml, "Wait")
            adb("shell", "input", "tap", x, y)
            adb("shell", "am", "start", "-W", "-n", PACKAGE + "/.MainActivity")
            launcher_waited = True
            continue
        try:
            return xml, target(xml, label)
        except RuntimeError:
            if not adb("shell", "pidof", PACKAGE).strip():
                raise RuntimeError("Native application exited before UI readiness") from None
            if time.monotonic() >= deadline:
                raise
            time.sleep(1)


def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    for label, name in [
        ("Home", "home"),
        ("Analyze", "analysis"),
        ("AI Studio", "studio"),
        ("AI Advisor", "advisor"),
        ("Profile", "profile"),
    ]:
        xml, (x, y) = ready_tab(label)
        (OUTPUT / f"before-{name}.xml").write_bytes(xml)
        (OUTPUT / f"before-{name}.png").write_bytes(adb("exec-out", "screencap", "-p"))
        adb("shell", "input", "tap", x, y)
        time.sleep(2)
        if not adb("shell", "pidof", PACKAGE).strip():
            raise RuntimeError("Native app exited during navigation")
        (OUTPUT / f"{name}.png").write_bytes(adb("exec-out", "screencap", "-p"))
        (OUTPUT / f"{name}.xml").write_bytes(hierarchy())
        print(f"Captured actual Android native tab: {label}", flush=True)


if __name__ == "__main__":
    try:
        main()
    finally:
        OUTPUT.mkdir(parents=True, exist_ok=True)
        try:
            (OUTPUT / "runtime.txt").write_bytes(
                adb("logcat", "-d", "-t", "500", "ReactNativeJS:E", "AndroidRuntime:E", "*:S")
            )
        except subprocess.CalledProcessError:
            pass
