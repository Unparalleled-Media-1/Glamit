/** Structural fixtures only; never real provider, device or approval evidence. */
const requirements = require("../../docs/audit/requirements.json").features;
function fixture() {
  const sha = "1".repeat(40);
  return {
    candidate_base_commit: sha,
    final_release_gates: Array.from({ length: 20 }, (_, i) => ({ id: `G${i + 1}`, status: "PASS", tested_commit: sha, evidence: "synthetic fixture" })),
    platforms: Object.fromEntries(["web", "ios", "android"].map(p => [p, {
      tested_commit: sha, evidence: "synthetic fixture", credential_independent_tests: "PASS",
      features: requirements.map(r => ({ id: r.id, status: "PASS" })),
      build_kind: p === "ios" ? "ios-ipa" : "android-apk",
      native_binary_sha256: "2".repeat(64), device_tests: "PASS", device_evidence: "synthetic fixture",
    }])),
  };
}
module.exports = { fixture };
