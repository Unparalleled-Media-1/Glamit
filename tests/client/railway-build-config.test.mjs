import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { validateRailwayConfig } from "../../scripts/check-railway-config.mjs";
for (const service of ["web", "api", "worker", "media-cleanup"]) {
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

for (const [service, role] of [
  ["worker", "privacy-worker"],
  ["media-cleanup", "media-cleanup"],
]) {
  const config = JSON.parse(
    fs.readFileSync(`deploy/railway/${service}.railway.json`, "utf8"),
  );
  test(`${service}: background service has no healthcheck and the exact start command`, () => {
    assert.equal(validateRailwayConfig(config, service).healthcheck, null);
    assert.throws(
      () =>
        validateRailwayConfig(
          { ...config, deploy: { ...config.deploy, healthcheckPath: "/health/ready" } },
          service,
        ),
      /BACKGROUND_SERVICE_MUST_NOT_DECLARE_HEALTHCHECK/,
    );
    for (const startCommand of [
      undefined,
      "python scripts/start-api.py",
      `python scripts/start-worker.py ${role === "media-cleanup" ? "privacy-worker" : "media-cleanup"}`,
    ]) {
      assert.throws(
        () =>
          validateRailwayConfig(
            { ...config, deploy: { ...config.deploy, startCommand } },
            service,
          ),
        /BACKGROUND_START_COMMAND_REQUIRED/,
      );
    }
  });
}
