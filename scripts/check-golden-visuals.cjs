/** Candidate validation plus opt-in comparison against explicitly approved baselines. */
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const sharp = require("sharp");
(async () => {
  const root = path.resolve("docs/application-preview/golden");
  const manifest = JSON.parse(
    fs.readFileSync(path.join(root, "candidate-manifest.json"), "utf8"),
  );
  assert.equal(
    manifest.files.length,
    24,
    "Six substates across four viewports are required",
  );
  for (const row of manifest.files) {
    assert(
      /^(iphone|android|tablet|desktop)-(home|analyze|report|studio|shop|product)\.png$/.test(
        row.file,
      ),
    );
    const metadata = await sharp(path.join(root, row.file)).metadata();
    assert.equal(metadata.width, row.viewport.width);
    assert.equal(metadata.height, row.viewport.height);
  }
  if (!process.argv.includes("--compare-approved")) {
    console.log(
      "PASS 24 golden candidate capture dimensions. Visual approval and approved-baseline comparison are still pending.",
    );
    return;
  }
  const approvedRoot = path.join(root, "approved");
  const approved = JSON.parse(
    fs.readFileSync(path.join(approvedRoot, "manifest.json"), "utf8"),
  );
  assert.equal(
    approved.approved,
    true,
    "Baselines require explicit recorded user approval",
  );
  assert(
    approved.approval_record,
    "Provide the actual approval record, not a generated rating",
  );
  assert.equal(
    approved.browser,
    manifest.browser,
    "Review matching browser/font/platform baselines before comparison",
  );
  for (const row of manifest.files) {
    const expected = await sharp(path.join(approvedRoot, row.file))
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const actual = await sharp(path.join(root, row.file))
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    assert.deepEqual(
      actual.info,
      expected.info,
      row.file + " dimensions/channels differ",
    );
    let changed = 0;
    const channels = actual.info.channels;
    for (let i = 0; i < actual.data.length; i += channels) {
      let delta = false;
      for (let c = 0; c < channels; c++)
        if (Math.abs(actual.data[i + c] - expected.data[i + c]) > 12)
          delta = true;
      if (delta) changed++;
    }
    assert(
      changed / (actual.info.width * actual.info.height) <= 0.002,
      row.file + " exceeds the approved visual-difference threshold",
    );
  }
  console.log(
    "PASS approved golden-screen pixel regressions. This does not verify native devices, provider fidelity or commercial readiness.",
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
