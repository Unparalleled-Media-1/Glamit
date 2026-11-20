import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export function validateRailwayConfig(config, component, root = process.cwd()) {
  const background = ["worker", "media-cleanup"];
  if (!["web", "api", ...background].includes(component))
    throw Error("UNKNOWN_SERVICE");
  if (config?.build?.builder !== "DOCKERFILE")
    throw Error("DOCKERFILE_BUILDER_REQUIRED");
  // Both background services share one image definition.
  const expected = `deploy/railway/${background.includes(component) ? "worker" : component}.Dockerfile`;
  if (config?.build?.dockerfilePath !== expected)
    throw Error("EXPLICIT_SERVICE_DOCKERFILE_REQUIRED");
  if (!fs.existsSync(path.join(root, expected)))
    throw Error("DOCKERFILE_NOT_FOUND");
  if (background.includes(component)) {
    // No HTTP server: a healthcheck path would keep the deployment from ever becoming healthy.
    if (config?.deploy?.healthcheckPath !== undefined)
      throw Error("BACKGROUND_SERVICE_MUST_NOT_DECLARE_HEALTHCHECK");
    const role = component === "worker" ? "privacy-worker" : "media-cleanup";
    if (config?.deploy?.startCommand !== `python scripts/start-worker.py ${role}`)
      throw Error("BACKGROUND_START_COMMAND_REQUIRED");
    return { component, dockerfile: expected, rootDirectory: "/", healthcheck: null };
  }
  const health = component === "web" ? "/api/health/ready" : "/health/ready";
  if (config?.deploy?.healthcheckPath !== health)
    throw Error("SERVICE_READINESS_PATH_REQUIRED");
  return {
    component,
    dockerfile: expected,
    rootDirectory: "/",
    healthcheck: health,
  };
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  for (const component of ["web", "api", "worker", "media-cleanup"]) {
    const config = JSON.parse(
      fs.readFileSync(`deploy/railway/${component}.railway.json`, "utf8"),
    );
    console.log(JSON.stringify(validateRailwayConfig(config, component)));
  }
}
