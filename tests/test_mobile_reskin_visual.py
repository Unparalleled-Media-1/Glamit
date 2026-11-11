"""Prevent unmeasured/masked/unaligned screenshots becoming native parity passes."""

import importlib.util
import json
from pathlib import Path

import pytest
from PIL import Image

spec = importlib.util.spec_from_file_location(
    "reskin_compare", Path("scripts/mobile-reskin/compare.py")
)
comparison = importlib.util.module_from_spec(spec)
spec.loader.exec_module(comparison)


def test_visual_measure_rejects_geometry_and_excessive_masks():
    image = Image.new("RGB", (100, 100), "white")
    with pytest.raises(ValueError, match="Viewport mismatch"):
        comparison.measure(image, Image.new("RGB", (99, 100)), [])
    with pytest.raises(ValueError, match="More than 10%"):
        comparison.measure(
            image,
            image,
            [{"category": "personal data", "reason": "fixture", "rect": [0, 0, 11, 100]}],
        )
    other = image.copy()
    other.paste("black", (0, 0, 20, 100))
    score, _ = comparison.measure(image, other, [])
    assert score["similarity_percent"] == 80
    assert score["mean_absolute_channel_error"] == 51


def test_missing_native_receipt_blocks_every_entry(tmp_path):
    reference = tmp_path / "reference"
    reference.mkdir()
    ids = [row["id"] for row in json.loads(Path("apps/mobile/reskin/registry.json").read_text())]
    (reference / "reference-manifest.json").write_text(
        json.dumps({"ids": ids, "platform": "ios", "theme": "dark", "state": "default"})
    )
    Image.new("RGB", (10, 10)).save(reference / "home.png")
    output = tmp_path / "report"
    assert comparison.report(reference, tmp_path / "native", output) == 2
    result = json.loads((output / "visual-difference-report.json").read_text())
    assert len(result["screens"]) == 232
    assert result["passed"] == 0
    assert {row["status"] for row in result["screens"]} == {"BLOCKED"}
