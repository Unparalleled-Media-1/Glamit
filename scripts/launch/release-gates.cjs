/** Fail-closed local certification guard. This command never deploys or activates providers. */
const fs = require("node:fs"),
  path = require("node:path"),
  crypto = require("node:crypto");
function validateLaunch(r, root = process.cwd()) {
  const errors = [];
  const expected = Array.from({ length: 12 }, (_, i) => "G" + (i + 1));
  if (!r || typeof r !== "object") return ["Launch evidence missing"];
  if (r.release_evidence_version !== 2) errors.push("Unsupported release evidence schema");
  const gates = Array.isArray(r.gates) ? r.gates : [];
  if (gates.length !== expected.length || new Set(gates.map(g => g?.id)).size !== expected.length || gates.some(g => !expected.includes(g?.id))) errors.push("Invalid or duplicate gate set");
  for (const id of expected) {
    if (gates.find((g) => g?.id === id)?.status !== "PASSED") {
      errors.push(id + " is not passed");
    }
  }
  if (!Array.isArray(r.workflows) || !r.workflows.length || r.workflows.some((w) => w?.status !== "PASSED")) {
    errors.push("Critical journeys incomplete");
  }
  if (
    !Array.isArray(r.defects) || r.defects.some((d) =>
      d.status !== "FIXED" && ["P0", "P1"].includes(d.severity)
    )
  ) errors.push("Open critical defects");
  if (
    r.stripe?.livemode !== false || r.actual_financial_acceptance !== true ||
    !r.test_webhook_configured || !r.stripe?.actual_payment_ids?.length ||
    !r.stripe?.actual_transfer_ids?.length
  ) errors.push("Actual test-mode financial evidence missing");
  if (r.native_hardware_verified !== true) {
    errors.push("Native hardware verification missing");
  }
  if (r.final_launch_approved !== true) {
    errors.push("Explicit final launch approval missing");
  }
  const railway = r.railway;
  const commit = r.candidate_base_commit;
  let publicUrl = false;
  try {
    const url = new URL(railway?.url);
    publicUrl = url.protocol === "https:" && !url.username && !url.password && !url.search && !url.hash &&
      (["www.glam.beauty", "api.glam.beauty"].includes(url.hostname) || url.hostname.endsWith(".up.railway.app"));
  } catch {}
  const checkedAt = Date.parse(railway?.observed_at);
  const crawl = railway?.clickthrough;
  if (!railway || railway.evidence_kind !== "live_railway" || !["preview", "staging", "production"].includes(railway.environment) ||
      !/^[a-f0-9]{40}$/i.test(commit || "") || railway.deployed_commit !== commit || !railway.deployment_id || !publicUrl ||
      !Number.isFinite(checkedAt) || Date.now() - checkedAt > 24*60*60*1000 || checkedAt > Date.now()+300000 ||
      railway.live_status !== 200 || railway.ready_status !== 200 || railway.supabase_verified !== true ||
      railway.frontend_backend_verified !== true || railway.oauth_cors_verified !== true || railway.rollback_verified !== true ||
      railway.unhandled_runtime_errors !== 0 || crawl?.scope !== "deployed" || crawl?.tested_commit !== commit ||
      !Number.isInteger(crawl?.critical_total) || crawl.critical_total <= 0 || crawl.critical_passed !== crawl.critical_total ||
      crawl.failed !== 0 || crawl.blocked !== 0 || crawl.skipped !== 0) {
    errors.push("Railway deployed release, health, critical journey or rollback evidence missing or invalid");
  }
  const time = Date.parse(r.observed_at);
  if (
    !Number.isFinite(time) || Date.now() - time > 48 * 60 * 60 * 1000 ||
    time > Date.now() + 300000
  ) errors.push("Evidence stale or invalid");
  if (!r.input_hashes || Object.keys(r.input_hashes).length === 0) {
    errors.push("Source provenance missing");
  } else {for (const [name, digest] of Object.entries(r.input_hashes)) {
      const file = path.resolve(root, name);
      if (
        !file.startsWith(path.resolve(root) + path.sep) ||
        !fs.existsSync(file) ||
        crypto.createHash("sha256").update(fs.readFileSync(file)).digest(
            "hex",
          ) !== digest
      ) {
        errors.push("Source drift: " + name);
        break;
      }
    }}
  return errors;
}
module.exports = { validateLaunch };
if (require.main === module) {
  let result;
  try {
    const r = JSON.parse(
      fs.readFileSync("docs/launch/evidence/launch-summary.json", "utf8"),
    );
    const errors = validateLaunch(r);
    result = {
      decision: errors.length ? "NO-GO" : "EVIDENCE_GATES_PASSED",
      errors,
      deployed: false,
    };
  } catch {
    result = {
      decision: "NO-GO",
      errors: ["Evidence could not be loaded"],
      deployed: false,
    };
  }
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = result.errors.length ? 1 : 0;
}
