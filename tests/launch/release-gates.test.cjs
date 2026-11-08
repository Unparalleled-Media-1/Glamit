const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  { validateLaunch } = require("../../scripts/launch/release-gates.cjs");
test("Missing or partial evidence cannot certify launch", () => {
  assert(validateLaunch(null).length);
  assert(validateLaunch({}).length);
});
test("Green gate labels do not replace actual financial, hardware or approval evidence", () => {
  const errors = validateLaunch({
    observed_at: new Date().toISOString(),
    gates: Array.from(
      { length: 12 },
      (_, i) => ({ id: "G" + (i + 1), status: "PASSED" }),
    ),
    workflows: [{ status: "PASSED" }],
    defects: [],
    stripe: { livemode: true },
  });
  assert(errors.some((e) => e.includes("financial")));
  assert(errors.some((e) => e.includes("hardware")));
  assert(errors.some((e) => e.includes("approval")));
});
test("Stale evidence and changed source are rejected", () => {
  const errors = validateLaunch({
    observed_at: "2020-01-01",
    input_hashes: { "package.json": "incorrect" },
  });
  assert(errors.some((e) => e.includes("stale")));
  assert(errors.some((e) => e.includes("Source drift")));
});
