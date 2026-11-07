"""Select real audit page recordings and package portable, non-production evidence."""

import argparse
import hashlib
import json
import os
import shutil
import subprocess
import zipfile
from pathlib import Path

ART = Path("/workspace/artifacts/glam-launch")
DOC = Path("docs/launch")
SIZES = {
    (1440, 1000): "desktop-web",
    (390, 844): "iphone-web",
    (412, 914): "android-web",
    (412, 915): "android-web",
    (768, 1024): "tablet-web",
    (844, 390): "landscape-web",
}


def main(recordings_only=False):
    selected = {}
    for file in sorted((ART / "final/video").glob("*.webm")):
        info = json.loads(
            subprocess.check_output(
                [
                    "ffprobe",
                    "-v",
                    "error",
                    "-select_streams",
                    "v:0",
                    "-show_entries",
                    "stream=width,height:format=duration",
                    "-of",
                    "json",
                    str(file),
                ]
            )
        )
        stream = info["streams"][0]
        label = SIZES[(stream["width"], stream["height"])]
        duration = float(info["format"]["duration"])
        # Axe opens short-lived auxiliary pages in the same context. Retain the
        # longest recording for each viewport: the actual route-traversal page.
        if duration <= selected.get(label, {}).get("seconds", 0):
            continue
        selected[label] = {
            "label": label,
            "width": stream["width"],
            "height": stream["height"],
            "seconds": duration,
            "source_video": str(file.relative_to(ART)),
            "file": "recordings/" + label + ".webm",
            "scope": "Local browser route traversal; not native hardware",
        }
    if len(selected) != 5 or any(r["seconds"] < 10 for r in selected.values()):
        raise RuntimeError("substantive_recording_missing")
    (ART / "recordings").mkdir(exist_ok=True)
    for row in selected.values():
        shutil.copyfile(ART / row["source_video"], ART / row["file"])
    (DOC / "evidence/recordings.json").write_text(
        json.dumps(list(selected.values()), indent=2) + "\n"
    )
    print(
        json.dumps(
            {
                "recordings": [
                    {"label": r["label"], "seconds": r["seconds"]} for r in selected.values()
                ]
            }
        )
    )
    if recordings_only:
        return
    files = [(p, "reports/" + str(p.relative_to(DOC))) for p in DOC.rglob("*") if p.is_file()]
    files += [(p, str(p.relative_to(ART))) for p in (ART / "final").glob("*.png")]
    files += [(ART / r["file"], r["file"]) for r in selected.values()]
    files += [
        (ART / "index.html", "index.html"),
        (ART / "dashboard-desktop.png", "dashboard-desktop.png"),
    ]
    private = [
        value.encode()
        for key, value in os.environ.items()
        if len(value) > 12
        and any(
            part in key
            for part in (
                "SECRET",
                "TOKEN",
                "SERVICE_ROLE",
                "DATABASE_URL",
                "PASSWORD",
                "PRIVATE_KEY",
            )
        )
        and not key.startswith(("NEXT_PUBLIC_", "EXPO_PUBLIC_"))
    ]
    provenance = {
        "source_commit": subprocess.check_output(["git", "rev-parse", "HEAD"], text=True).strip(),
        "public_launch": "NO-GO",
        "privileged_value_scan": "PASSED",
        "files": [],
    }
    output = Path("/workspace/artifacts/glam-launch-audit-evidence.zip")
    with zipfile.ZipFile(output, "w", zipfile.ZIP_DEFLATED) as archive:
        for file, name in files:
            data = file.read_bytes()
            if any(value in data for value in private):
                raise RuntimeError("privileged_value_archive_blocked")
            archive.writestr(name, data)
            provenance["files"].append({"file": name, "sha256": hashlib.sha256(data).hexdigest()})
        archive.writestr("provenance.json", json.dumps(provenance, indent=2) + "\n")
        archive.writestr(
            "READ_ME.txt",
            "Open index.html for the searchable audit dashboard. "
            "Reports and raw JSON are in reports/. Recordings depict browser viewport emulation, "
            "not native apps or completed AI/payment workflows. Public launch is NO-GO. "
            "Full Playwright traces remain separate local artifacts under glam-launch/final/.\n",
        )
    print(
        json.dumps(
            {
                "archive": str(output),
                "bytes": output.stat().st_size,
                "sha256": hashlib.sha256(output.read_bytes()).hexdigest(),
            }
        )
    )


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--recordings-only", action="store_true")
    main(parser.parse_args().recordings_only)
