"""Fail before dependency installation when merged manifests and lock metadata disagree."""

import json
import sys
import tomllib
from pathlib import Path
from urllib.parse import unquote, urlsplit


def check(root: Path) -> list[str]:
    errors = []
    lock = json.loads((root / "package-lock.json").read_text())
    manifests = {}
    for workspace in ["", "apps/web", "apps/mobile"]:
        manifest = json.loads((root / workspace / "package.json").read_text())
        manifests[workspace] = manifest
        entry = lock["packages"].get(workspace, {})
        for field in ["dependencies", "devDependencies", "optionalDependencies"]:
            if manifest.get(field, {}) != entry.get(field, {}):
                errors.append(f"{workspace or 'root'}: {field} do not match package-lock.json")
    react = manifests["apps/web"]["dependencies"]["react"]
    if (
        manifests["apps/mobile"]["dependencies"]["react"] != react
        or manifests["apps/web"]["dependencies"]["react-dom"] != react
        or manifests[""]["devDependencies"]["react-test-renderer"] != react
        or manifests[""]["overrides"]["react"] != react
        or manifests[""]["overrides"]["react-dom"] != react
    ):
        errors.append("React, DOM, native client, renderer and overrides must use the same version")
    pylock = tomllib.loads((root / "uv.lock").read_text())
    for package in pylock.get("package", []):
        for wheel in package.get("wheels", []):
            filename = unquote(urlsplit(wheel["url"]).path.rsplit("/", 1)[-1])
            parts = filename.split("-")
            if len(parts) < 5 or parts[1] != package["version"]:
                errors.append(f"{package['name']}: wheel filename disagrees with locked version")
    return errors


if __name__ == "__main__":
    failures = check(Path.cwd())
    for failure in failures:
        print(f"::error title=Dependency lock consistency::{failure}")
    if failures:
        sys.exit(1)
    print("Workspace dependency metadata, shared React versions and Python wheel versions agree")
