/** Additional certification checks; this validator never builds, deploys or grants approval. */
const requirements = require("../../docs/audit/requirements.json").features;
const platforms = ["web", "ios", "android"];
function validateFinalPlatforms(report) {
  const errors = [];
  if (!/^[0-9a-f]{40}$/.test(report?.candidate_base_commit || "")) {
    errors.push("Final platform evidence requires an exact candidate commit");
  }
  const gates = report?.final_release_gates;
  if (!Array.isArray(gates) || gates.length !== 20 ||
      new Set(gates.map(g => g?.id)).size !== 20 ||
      Array.from({ length: 20 }, (_, i) => `G${i + 1}`).some(id =>
        !gates.some(g => g?.id === id && g.status === "PASS" &&
          g.tested_commit === report?.candidate_base_commit && typeof g.evidence === "string" && g.evidence.trim()))) {
    errors.push("Final twenty gates require independent commit-bound passing evidence");
  }
  for (const platform of platforms) {
    const evidence = report?.platforms?.[platform];
    const features = evidence?.features;
    if (!Array.isArray(features) || features.length !== requirements.length ||
        new Set(features.map(f => f?.id)).size !== requirements.length ||
        requirements.some(r => !features.some(f => f?.id === r.id &&
          (f.status === "PASS" || (f.status === "N/A" && typeof f.scope_approval === "string" && f.scope_approval.trim()))))) {
      errors.push(`${platform}: complete applicable requirement acceptance missing`);
    }
    if (evidence?.tested_commit !== report?.candidate_base_commit ||
        !evidence?.evidence || evidence?.credential_independent_tests !== "PASS") {
      errors.push(`${platform}: independent candidate test evidence missing`);
    }
    if (platform !== "web" &&
        (!evidence?.native_binary_sha256 || !/^[0-9a-f]{64}$/.test(evidence.native_binary_sha256) ||
         !["ios-ipa", "android-apk", "android-aab"].includes(evidence?.build_kind) ||
         (platform === "ios" && evidence.build_kind !== "ios-ipa") ||
         (platform === "android" && evidence.build_kind === "ios-ipa") ||
         evidence?.device_tests !== "PASS" || !evidence?.device_evidence)) {
      errors.push(`${platform}: native binary and independent device verification missing; browser/export evidence is insufficient`);
    }
  }
  return errors;
}
module.exports = { validateFinalPlatforms };
