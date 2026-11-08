/** Structural fixtures only; none is real QA, provider, payment or owner approval evidence. */
const { test } = require("node:test"),
  assert = require("node:assert/strict");
const { validateLaunch } = require("../../scripts/launch/release-gates.cjs");
const base = {
  release_evidence_version: 2,
  gates: [],
  workflows: [],
  defects: [],
};
test("legacy gates cannot omit the fifteen current QA review gates", () => {
  assert(validateLaunch(base).some((e) => e.includes("fifteen QA")));
});
test("duplicate, blocked and missing QA gates cannot be treated as passes", () => {
  for (const gates of [
    Array.from({ length: 15 }, (_, i) => ({
      id: "G" + (i + 1),
      status: i === 14 ? "BLOCKED" : "PASS",
    })),
    Array.from({ length: 15 }, () => ({ id: "G1", status: "PASS" })),
    [],
  ])
    assert(
      validateLaunch({ ...base, qa_release_gates: gates }).some((e) =>
        e.includes("QA"),
      ),
    );
});

test("fifteen green labels without commit-bound evidence cannot certify QA", () => {
  const gates = Array.from({ length: 15 }, (_, i) => ({
    id: "G" + (i + 1),
    status: "PASS",
  }));
  assert(
    validateLaunch({ ...base, qa_release_gates: gates }).some((e) =>
      e.includes("QA"),
    ),
  );
});
