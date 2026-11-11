# Visual evidence protocol

The approved standalone HTML is a **reference**, never the native application. Input hashes are retained in [design-inputs.json](design-inputs.json). The wrapper HTML was inspected; its embedded standalone sources were reconciled with the previous v3 handover. The 28 handover JSX sources and 11 existing artwork files match the previously inspected package. No HTML is embedded in the app.

Reference capture:

```sh
node scripts/mobile-reskin/capture-reference.cjs \
  '/path/to/GLAM All Screens (Standalone).html' \
  /path/to/evidence/reference/dark/ios/default dark ios default
```

The tool renders all 232 design IDs at 390×844 CSS pixels / scale 1, with external network requests blocked. Only the illustrative black rounded phone frame is removed. The source's own screen content, typography, colors and chrome remain. Each variant directory has an input SHA-256 and complete inventory receipt. These images do not certify native rendering, installed navigation, camera or service behavior. The source's sample results/stock/prices/credits are reference content only, never fabricated user/account records in the application.

Comparison:

```sh
UV_CACHE_DIR=/tmp/glam-uv-cache uv run --frozen python \
  scripts/mobile-reskin/compare.py \
  /path/to/evidence/reference/dark/ios/default \
  /path/to/evidence/native/dark/ios/default \
  /path/to/evidence/comparison/dark/ios/default
```

Exit `2` means at least one screen lacks accepted parity; it is not a test success. The output contains `gallery.html` and `visual-difference-report.json`, with a row for every ID. Missing native captures are shown as **BLOCKED**, never synthesized or substituted with browser images. When actual matching native captures exist, the tool also writes difference PNGs.

Native capture directory schema:

```json
{
  "kind": "installed-native-capture",
  "source_commit": "ACTUAL_40_HEX_GIT_SHA",
  "build_id": "ACTUAL_BUILD_IDENTIFIER",
  "binary_sha256": "ACTUAL_64_HEX_BINARY_CHECKSUM",
  "device": "ACTUAL_DEVICE_AND_OS",
  "captured_at": "ACTUAL_ISO_TIMESTAMP",
  "package_identifier": "VERIFIED_TEST_APPLICATION_ID",
  "platform": "ios",
  "theme": "dark",
  "state": "default",
  "screens": {
    "home": {
      "file": "home.png",
      "sha256": "ACTUAL_PNG_CHECKSUM",
      "exclusions": [],
      "human_review": "pending"
    }
  }
}
```

These fields are receipts supplied by the native capture runner, not independent proof by themselves. A reviewer must inspect corresponding build/install logs and raw screenshot provenance. Native pixels must match reference dimensions; the tool refuses to resize images to make them pass. Configure a matching simulator/density/reference capture protocol before comparing a physical-resolution screenshot. Do not use a JS renderer, snapshot drawing tool or browser preview to populate this directory.

Metric: `100 × included pixels whose maximum absolute RGB-channel difference is ≤16 / included pixels`. Mean absolute channel error is reported separately. The acceptance target is at least 95% **and** a recorded human pass; a low score fails regardless of human input, and a high score alone remains awaiting review. Broad flat backgrounds can inflate pixel agreement, so reviewers must still inspect typography, alignment, controls, cropping, geometry, contrast and functional state.

Only recorded `personal data`, `camera imagery` or `platform-owned system chrome` rectangles may be excluded. Each needs a specific reason and in-bounds pixel rectangle. More than 10% masking is refused and requires a separately reviewed comparison protocol. Static layout, text styling, buttons, editorial imagery and navigation cannot be masked merely to improve a score. Keep full original screenshots alongside any approved crop/exclusion receipt.

Current result: **no accepted native screenshot, no native visual similarity score and no claimed 95% pass**. Default reference captures and blocked comparison galleries are retained in `/workspace/mobile-reskin-evidence/`. Loading/empty/error reference permutations, all corresponding native variants and human review remain outstanding. Prototype fixtures are not functional parity evidence.
