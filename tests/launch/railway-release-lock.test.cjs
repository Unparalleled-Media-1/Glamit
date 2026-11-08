/** Structural validator fixtures only. These are never real financial or deployed evidence. */
const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  crypto = require("node:crypto");
const { validateLaunch } = require("../../scripts/launch/release-gates.cjs");
function fixture() {
  const sha = "1".repeat(40);
  return {
    release_evidence_version: 2,
    observed_at: new Date().toISOString(),
    candidate_base_commit: sha,
    qa_release_gates: Array.from({ length: 15 }, (_, i) => ({
      id: "G" + (i + 1),
      status: "PASS",
      evidence: "synthetic structural fixture only",
      tested_commit: sha,
    })),
    gates: Array.from({ length: 12 }, (_, i) => ({
      id: "G" + (i + 1),
      status: "PASSED",
    })),
    workflows: [{ status: "PASSED" }],
    defects: [],
    stripe: {
      livemode: false,
      actual_payment_ids: ["pi_synthetic_validator_fixture"],
      actual_transfer_ids: ["tr_synthetic_validator_fixture"],
    },
    actual_financial_acceptance: true,
    test_webhook_configured: true,
    native_hardware_verified: true,
    final_launch_approved: true,
    input_hashes: {
      "package.json": crypto
        .createHash("sha256")
        .update(fs.readFileSync("package.json"))
        .digest("hex"),
    },
    railway: {
      evidence_kind: "live_railway",
      environment: "preview",
      deployment_id: "synthetic-validator-fixture-only",
      url: "https://glamit-web-production.up.railway.app",
      observed_at: new Date().toISOString(),
      deployed_commit: sha,
      live_status: 200,
      ready_status: 200,
      supabase_verified: true,
      frontend_backend_verified: true,
      oauth_cors_verified: true,
      rollback_verified: true,
      unhandled_runtime_errors: 0,
      clickthrough: {
        scope: "deployed",
        tested_commit: sha,
        critical_total: 5,
        critical_passed: 5,
        failed: 0,
        blocked: 0,
        skipped: 0,
      },
    },
  };
}
test("legacy eleven green labels cannot bypass the twelve current gates", () => {
  const f = fixture();
  f.gates.pop();
  assert(validateLaunch(f).some((e) => e.includes("G12")));
});
test("local success and fresh documents do not replace deployed Railway evidence", () => {
  const f = fixture();
  delete f.railway;
  assert(validateLaunch(f).some((e) => e.includes("Railway")));
});
test("structurally complete synthetic evidence validates; it proves no provider operation", () =>
  assert.deepEqual(validateLaunch(fixture()), []));
test("wrong deployed commit, failed readiness and blocked deployed journeys are rejected", () => {
  for (const mutate of [
    (f) => (f.railway.deployed_commit = "2".repeat(40)),
    (f) => (f.railway.ready_status = 503),
    (f) => (f.railway.clickthrough.blocked = 1),
    (f) => (f.railway.clickthrough.scope = "local"),
    (f) => (f.railway.url = "http://localhost:3000"),
    (f) => (f.railway.observed_at = "2020-01-01"),
  ]) {
    const f = fixture();
    mutate(f);
    assert(validateLaunch(f).some((e) => e.includes("Railway")));
  }
});
test("duplicate or malformed gate sets fail closed without crashing", () => {
  const f = fixture();
  f.gates.push(f.gates[0]);
  assert(validateLaunch(f).some((e) => e.includes("gate")));
  assert.doesNotThrow(() =>
    validateLaunch({ gates: {}, workflows: {}, defects: {} }),
  );
  assert(validateLaunch({ gates: {} }).length > 0);
});
