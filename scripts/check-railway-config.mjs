import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export function validateRailwayConfig(config, component, root = process.cwd()) {
  if (!["web", "api"].includes(component)) throw Error("UNKNOWN_SERVICE");
  if (config?.build?.builder !== "DOCKERFILE")
    throw Error("DOCKERFILE_BUILDER_REQUIRED");
  const expected = `deploy/railway/${component}.Dockerfile`;
  if (config?.build?.dockerfilePath !== expected)
    throw Error("EXPLICIT_SERVICE_DOCKERFILE_REQUIRED");
  if (!fs.existsSync(path.join(root, expected)))
    throw Error("DOCKERFILE_NOT_FOUND");
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
  for (const component of ["web", "api"]) {
    const config = JSON.parse(
      fs.readFileSync(`deploy/railway/${component}.railway.json`, "utf8"),
    );
    console.log(JSON.stringify(validateRailwayConfig(config, component)));
  }
}
