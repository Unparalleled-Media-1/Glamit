"""Enroll the isolated emulator's virtual fingerprint through actual Settings UI."""

import re
import subprocess
import time
import xml.etree.ElementTree as ET
from pathlib import Path

OUTPUT = Path("artifacts/native-device")


def adb(*args):
    return subprocess.check_output(["adb", *args], stderr=subprocess.STDOUT)


def tap(node):
    numbers = re.findall(r"\d+", node.get("bounds", ""))
    if len(numbers) != 4:
        raise RuntimeError("Missing native Settings bounds")
    left, top, right, bottom = map(int, numbers)
    adb("shell", "input", "tap", str((left + right) // 2), str((top + bottom) // 2))


def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    # Only called on the disposable local-verification CI emulator, never a real device.
    if "emulator-" not in adb("get-serialno").decode():
        raise RuntimeError("Fingerprint fixture enrollment requires an emulator")
    adb("shell", "locksettings", "set-pin", "1234")
    adb("shell", "am", "start", "-a", "android.settings.FINGERPRINT_ENROLL")
    entered_pin = False
    for _attempt in range(35):
        adb("shell", "uiautomator", "dump", "/sdcard/glam-enrollment.xml")
        raw = adb("exec-out", "cat", "/sdcard/glam-enrollment.xml")
        (OUTPUT / "fingerprint-settings.xml").write_bytes(raw)
        nodes = list(ET.fromstring(raw).iter("node"))
        fields = [n for n in nodes if n.get("class", "").endswith("EditText")]
        if fields and not entered_pin:
            tap(fields[0])
            adb("shell", "input", "text", "1234")
            adb("shell", "input", "keyevent", "66")
            entered_pin = True
        else:
            done = next((n for n in nodes if n.get("text", "").lower() == "done"), None)
            if done is not None:
                tap(done)
                (OUTPUT / "fingerprint-enrollment.png").write_bytes(
                    adb("exec-out", "screencap", "-p")
                )
                print("Native emulator fingerprint Settings enrollment completed")
                return
            target = next(
                (
                    n
                    for n in nodes
                    if n.get("text", "").lower()
                    in {"next", "i agree", "agree", "continue", "start", "set up", "more"}
                    and n.get("enabled") == "true"
                ),
                None,
            )
            if target is not None:
                tap(target)
            else:
                adb("emu", "finger", "touch", "1")
        time.sleep(0.5)
    (OUTPUT / "fingerprint-enrollment-failed.png").write_bytes(adb("exec-out", "screencap", "-p"))
    visible = sorted(
        {
            node.get(key, "")[:100]
            for node in nodes
            if node.get("password") != "true"
            for key in ["text", "content-desc"]
            if node.get(key)
        }
    )[:20]
    raise RuntimeError(
        "Native enrollment did not complete; visible Settings labels: " + repr(visible)
    )


if __name__ == "__main__":
    main()
