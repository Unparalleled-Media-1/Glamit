"""Safety tests for emulator startup diagnostics; OS calls are explicit doubles."""

import importlib.util
from pathlib import Path

import pytest


def load(tmp_path):
    spec = importlib.util.spec_from_file_location(
        "native_startup_fixture", Path("scripts/mobile/android_startup_smoke.py")
    )
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    module.OUTPUT = tmp_path
    return module


def xml(label, wait=False):
    return (
        f'<hierarchy><node text="{label}" bounds="[0,0][100,100]"/>'
        + ('<node text="Wait" bounds="[0,100][100,200]"/>' if wait else "")
        + "</hierarchy>"
    ).encode()


def test_only_known_launcher_dialog_is_retained_dismissed_and_app_foregrounded(
    tmp_path, monkeypatch
):
    module = load(tmp_path)
    states = iter([xml("Quickstep isn't responding", True), xml("Home")])
    calls = []
    monkeypatch.setattr(module, "hierarchy", lambda: next(states))
    monkeypatch.setattr(module, "adb", lambda *args: calls.append(args) or b"ISOLATED UNIT FIXTURE")
    _, point = module.ready_tab("Home")
    assert point == ("50", "50")
    assert ("shell", "input", "tap", "50", "150") in calls
    assert ("shell", "am", "start", "-W", "-n", module.PACKAGE + "/.MainActivity") in calls
    assert (tmp_path / "launcher-anr.xml").exists()


def test_glam_anr_is_not_dismissed_or_treated_as_success(tmp_path, monkeypatch):
    module = load(tmp_path)
    calls = []
    monkeypatch.setattr(module, "hierarchy", lambda: xml("GLAM Beauty isn't responding", True))
    monkeypatch.setattr(module, "adb", lambda *args: calls.append(args) or b"123")
    with pytest.raises(RuntimeError, match="Actual native tab not found"):
        module.ready_tab("Home", timeout=0)
    assert not any(args[:3] == ("shell", "input", "tap") for args in calls)
    assert not (tmp_path / "launcher-anr.xml").exists()
