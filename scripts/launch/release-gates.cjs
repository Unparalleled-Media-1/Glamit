/** Fail-closed local certification guard. This command never deploys or activates providers. */
const fs = require("node:fs"),
  path = require("node:path"),
  crypto = require("node:crypto");
function validateLaunch(r, root = process.cwd()) {
  const errors = [];
  const expected = Array.from({ length: 11 }, (_, i) => "G" + (i + 1));
  if (!r || typeof r !== "object") return ["Launch evidence missing"];
  for (const id of expected) {
    if (r.gates?.find((g) => g.id === id)?.status !== "PASSED") {
      errors.push(id + " is not passed");
    }
  }
  if (!r.workflows?.length || r.workflows.some((w) => w.status !== "PASSED")) {
    errors.push("Critical journeys incomplete");
  }
  if (
    r.defects?.some((d) =>
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
