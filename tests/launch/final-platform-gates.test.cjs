/** Synthetic validator inputs, never actual device/release evidence. */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { validateFinalPlatforms } = require("../../scripts/launch/final-platform-gates.cjs");
const { fixture } = require("./final-platform-fixture.cjs");

test("final evidence cannot be omitted by an older release receipt", () => {
  assert(validateFinalPlatforms({}).length >= 4);
});
test("browser emulation and JS exports cannot certify either native application", () => {
  for (const p of ["ios", "android"]) {
    const f = fixture(); f.platforms[p].build_kind = "browser-emulation";
    assert(validateFinalPlatforms(f).some(e => e.startsWith(p + ": native")));
    f.platforms[p].build_kind = "javascript-export";
    assert(validateFinalPlatforms(f).some(e => e.startsWith(p + ": native")));
  }
});
test("missing, duplicate, blocked and unapproved N/A features prevent certification", () => {
  for (const p of ["web", "ios", "android"]) for (const status of ["FAIL", "BLOCKED", "NOT TESTED", "N/A"]) {
    const f = fixture(); f.platforms[p].features[0].status = status;
    assert(validateFinalPlatforms(f).some(e => e.startsWith(p + ": complete")));
  }
  const f = fixture(); f.platforms.android.features[1] = f.platforms.android.features[0];
  assert(validateFinalPlatforms(f).some(e => e.startsWith("android: complete")));
});
test("green gates for another candidate cannot certify the current commit", () => {
  const f = fixture(); f.final_release_gates[19].tested_commit = "3".repeat(40);
  assert(validateFinalPlatforms(f).some(e => e.includes("twenty")));
});
test("structurally complete synthetic evidence is accepted; it is not a real release", () => {
  assert.deepEqual(validateFinalPlatforms(fixture()), []);
});
