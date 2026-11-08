"""CI UI-readiness helper tests, not native-device evidence."""

import importlib.util
from pathlib import Path

import pytest

spec = importlib.util.spec_from_file_location(
    "native_readiness", Path("scripts/mobile/android_startup_smoke.py")
)
helper = importlib.util.module_from_spec(spec)
spec.loader.exec_module(helper)


def test_waits_for_actual_native_tab_instead_of_accepting_fixed_delay(monkeypatch):
    frames = iter(
        [
            b'<hierarchy><node text="Starting" bounds="[0,0][100,50]"/></hierarchy>',
            b'<hierarchy><node text="Home" bounds="[0,0][100,50]"/></hierarchy>',
        ]
    )
    sleeps = []
    monkeypatch.setattr(helper, "hierarchy", lambda: next(frames))
    monkeypatch.setattr(helper, "adb", lambda *args: b"1234")
    monkeypatch.setattr(helper.time, "sleep", sleeps.append)
    _, point = helper.ready_tab("Home")
    assert point == ("50", "25") and sleeps == [1]


def test_missing_native_tab_remains_a_failure(monkeypatch):
    monkeypatch.setattr(
        helper, "hierarchy", lambda: b'<hierarchy><node text="Starting"/></hierarchy>'
    )
    monkeypatch.setattr(helper, "adb", lambda *args: b"1234")
    with pytest.raises(RuntimeError, match="Actual native tab not found"):
        helper.ready_tab("Home", timeout=0)


def test_crashed_native_process_is_not_reported_as_ready(monkeypatch):
    monkeypatch.setattr(helper, "hierarchy", lambda: b"<hierarchy/>")
    monkeypatch.setattr(helper, "adb", lambda *args: b"")
    with pytest.raises(RuntimeError, match="exited before UI readiness"):
        helper.ready_tab("Home")
