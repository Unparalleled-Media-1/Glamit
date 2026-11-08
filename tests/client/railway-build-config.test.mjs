import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { validateRailwayConfig } from "../../scripts/check-railway-config.mjs";
for (const service of ["web", "api"]) {
  const config = JSON.parse(
    fs.readFileSync(`deploy/railway/${service}.railway.json`, "utf8"),
  );
  test(`${service}: actual Dockerfile and readiness path exist from repository root`, () => {
    assert.equal(validateRailwayConfig(config, service).rootDirectory, "/");
  });
  test(`${service}: empty, default-root and wrong-service Dockerfile paths are refused`, () => {
    for (const dockerfilePath of [
      "",
      "Dockerfile",
      "apps/web/Dockerfile",
      `deploy/railway/${service === "web" ? "api" : "web"}.Dockerfile`,
    ]) {
      assert.throws(
        () =>
          validateRailwayConfig(
            { ...config, build: { ...config.build, dockerfilePath } },
            service,
          ),
        /EXPLICIT_SERVICE_DOCKERFILE/,
      );
    }
    assert.throws(
      () => validateRailwayConfig(config, service, "/tmp/no-glam-repository"),
      /DOCKERFILE_NOT_FOUND/,
    );
  });
}
