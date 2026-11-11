"""Compare approved references with installed-native captures; missing evidence blocks."""

import argparse
import hashlib
import html
import json
import os
import re
from pathlib import Path

from PIL import Image, ImageChops

ROOT = Path(__file__).resolve().parents[2]


def relative_file(root, name):
    path = (root / name).resolve()
    if not path.is_relative_to(root.resolve()) or path.suffix != ".png":
        raise ValueError("Capture must be a PNG inside its evidence directory")
    return path


def measure(reference, native, exclusions):
    if reference.size != native.size:
        raise ValueError("Viewport mismatch; screenshots must not be resized to pass")
    mask = Image.new("L", reference.size, 255)
    allowed = {"personal data", "camera imagery", "platform-owned system chrome"}
    excluded = []
    for region in exclusions:
        if region.get("category") not in allowed or not region.get("reason"):
            raise ValueError("Each exclusion needs an allowed category and reason")
        x, y, width, height = region["rect"]
        if (
            not all(isinstance(v, int) for v in [x, y, width, height])
            or min(x, y) < 0
            or min(width, height) <= 0
            or x + width > reference.width
            or y + height > reference.height
        ):
            raise ValueError("Invalid exclusion bounds")
        mask.paste(0, (x, y, x + width, y + height))
        excluded.append(region)
    included = sum(mask.histogram()[1:])
    total = reference.width * reference.height
    if included < total * 0.9:
        raise ValueError("More than 10% excluded; requires separate reviewed protocol")
    diff = ImageChops.difference(reference.convert("RGB"), native.convert("RGB"))
    different = error = 0
    for pixel, keep in zip(diff.get_flattened_data(), mask.get_flattened_data(), strict=True):
        if keep:
            different += max(pixel) > 16
            error += sum(pixel)
    return {
        "similarity_percent": round(100 * (1 - different / included), 4),
        "mean_absolute_channel_error": round(error / (included * 3), 4),
        "excluded_pixels": total - included,
        "exclusions": excluded,
    }, diff


def report(reference_dir, native_dir, output):
    registry = json.loads((ROOT / "apps/mobile/reskin/registry.json").read_text())
    reference_manifest = json.loads((reference_dir / "reference-manifest.json").read_text())
    expected = {r["id"] for r in registry}
    if set(reference_manifest["ids"]) != expected:
        raise ValueError("Reference inventory differs from the approved 232 entries")
    native_manifest = native_dir / "native-manifest.json"
    captures, invalid = {}, None
    if native_manifest.exists():
        manifest = json.loads(native_manifest.read_text())
        required = ["build_id", "device", "captured_at", "package_identifier"]
        if (
            manifest.get("kind") != "installed-native-capture"
            or not all(manifest.get(key) for key in required)
            or not re.fullmatch(r"[0-9a-f]{40}", manifest.get("source_commit", ""))
            or not re.fullmatch(r"[0-9a-f]{64}", manifest.get("binary_sha256", ""))
            or manifest.get("platform") != reference_manifest["platform"]
            or manifest.get("theme") != reference_manifest["theme"]
            or manifest.get("state") != reference_manifest["state"]
        ):
            invalid = "Native build/device/source receipt missing or variant mismatched"
        else:
            captures = manifest.get("screens", {})
    output.mkdir(parents=True, exist_ok=True)
    rows = []
    for screen in registry:
        id_ = screen["id"]
        row = {"id": id_, "title": screen["title"], "status": "BLOCKED"}
        ref = relative_file(reference_dir, id_ + ".png")
        if not ref.exists():
            row["reason"] = "Reference screenshot missing"
        elif invalid:
            row["reason"] = invalid
        elif id_ not in captures:
            row["reason"] = "Installed-native capture and receipt missing"
        else:
            try:
                capture = captures[id_]
                actual = relative_file(native_dir, capture["file"])
                if hashlib.sha256(actual.read_bytes()).hexdigest() != capture["sha256"]:
                    raise ValueError("Native screenshot checksum differs from receipt")
                with Image.open(ref) as before, Image.open(actual) as after:
                    values, diff = measure(before, after, capture.get("exclusions", []))
                    diff.save(output / (id_ + "-diff.png"))
                row.update(values)
                row["status"] = (
                    "PASS"
                    if values["similarity_percent"] >= 95 and capture.get("human_review") == "pass"
                    else "FAIL"
                    if values["similarity_percent"] < 95 or capture.get("human_review") == "fail"
                    else "AWAITING HUMAN REVIEW"
                )
            except (ValueError, KeyError, OSError) as error:
                row["reason"] = str(error)
        rows.append(row)
    result = {
        "metric": "100 * fraction of included pixels with all RGB deltas <= 16",
        "threshold_percent": 95,
        "human_review_required": True,
        "reference": reference_manifest,
        "native_manifest_present": native_manifest.exists(),
        "screens": rows,
        "passed": sum(r["status"] == "PASS" for r in rows),
    }
    (output / "visual-difference-report.json").write_text(json.dumps(result, indent=2))
    gallery = [
        "<!doctype html><meta charset=utf-8><title>GLAM parity evidence</title>",
        "<style>body{font:16px sans-serif;background:#f8f4f0;color:#17151a}"
        "article{display:inline-block;vertical-align:top;width:400px;margin:8px}"
        "img{width:195px;vertical-align:top}p{overflow-wrap:anywhere}</style>",
        "<h1>Approved reference versus installed native</h1>",
        "<p>HTML references are design evidence only. Missing native images are blocked. "
        "No native image is synthesized. A passing metric requires human review.</p>",
    ]
    for row in rows:
        id_ = row["id"]
        ref_url = html.escape(os.path.relpath(reference_dir / (id_ + ".png"), output))
        detail = html.escape(row.get("reason", str(row.get("similarity_percent", ""))))
        gallery.append(
            f"<article><h2>{html.escape(id_ + ' · ' + row['title'])}</h2>"
            f"<p>{row['status']}: {detail}</p>"
            f'<img alt="Approved HTML reference {id_}" src="{ref_url}">'
        )
        if id_ in captures and not row.get("reason"):
            native_url = html.escape(
                os.path.relpath(relative_file(native_dir, captures[id_]["file"]), output)
            )
            gallery.append(f'<img alt="Installed native {id_}" src="{native_url}">')
        else:
            gallery.append("<p>Native: BLOCKED — no accepted screenshot.</p>")
        gallery.append("</article>")
    (output / "gallery.html").write_text("\n".join(gallery))
    print(f"{result['passed']}/{len(rows)} visually accepted; report: {output}")
    return 0 if result["passed"] == len(rows) else 2


if __name__ == "__main__":
    parser = argparse.ArgumentParser(__doc__)
    parser.add_argument("reference", type=Path)
    parser.add_argument("native", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    raise SystemExit(report(args.reference, args.native, args.output))
