"""Protect the actual merged-lock regressions without downloading or ignoring artifacts."""

import importlib.util
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("lock_check", ROOT / "scripts/ci/check_lockfiles.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def fixture(tmp_path):
    for name in [
        "package.json",
        "package-lock.json",
        "uv.lock",
        "apps/web/package.json",
        "apps/mobile/package.json",
    ]:
        target = tmp_path / name
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes((ROOT / name).read_bytes())
    return tmp_path


def test_actual_workspace_and_python_lock_metadata_are_consistent():
    assert module.check(ROOT) == []


def test_merged_python_version_cannot_keep_old_wheel_filenames(tmp_path):
    root = fixture(tmp_path)
    lock = root / "uv.lock"
    lock.write_text(
        lock.read_text().replace(
            'name = "sqlalchemy"\nversion = "2.1.8"', 'name = "sqlalchemy"\nversion = "2.1.9"'
        )
    )
    assert any("sqlalchemy: wheel" in error for error in module.check(root))


def test_react_patch_cannot_leave_stale_workspace_lock_and_overrides(tmp_path):
    root = fixture(tmp_path)
    p = root / "apps/mobile/package.json"
    value = json.loads(p.read_text())
    value["dependencies"]["react"] = "19.3.1"
    p.write_text(json.dumps(value))
    errors = module.check(root)
    assert any("package-lock.json" in error for error in errors)
    assert any("same version" in error for error in errors)
