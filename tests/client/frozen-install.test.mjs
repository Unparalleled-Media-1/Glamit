import test from "node:test";
import assert from "node:assert/strict";
import {
  failureSummary,
  redactInstallOutput,
} from "../../scripts/ci/frozen-install.mjs";
test("install diagnostics redact environment credentials, URLs and bearer values", () => {
  const secret = "private_fixture_credential_12345";
  const input = `error: ${secret} https://user:pass@registry.example/file?signature=private Bearer bearer_value`;
  const output = redactInstallOutput(input, { CI_TOKEN: secret });
  for (const value of [
    secret,
    "user:pass",
    "signature=private",
    "bearer_value",
  ])
    assert(!output.includes(value));
});
test("actual installer error classifications remain visible without credential values", () => {
  assert.match(
    failureSummary("npm error code EUSAGE\nnpm error lock file needs update"),
    /EUSAGE.*lock file/,
  );
  assert.match(
    failureSummary(
      "error: Failed to download package\nCaused by: Connection refused",
    ),
    /Failed to download.*Connection refused/,
  );
});
