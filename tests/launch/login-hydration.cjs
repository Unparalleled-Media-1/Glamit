/** Real SSR + Chromium regression; no provider response doubles. */
const { spawnSync } = require("node:child_process");
const run = spawnSync(process.execPath, ["scripts/launch/clickthrough.cjs"], {
  stdio: "inherit",
  env: {
    ...process.env,
    GLAM_AUDIT_ROUTES: "/login",
    GLAM_AUDIT_VIEWPORTS: "desktop,iphone-web",
    GLAM_AUDIT_STRICT: "1",
    GLAM_LAUNCH_REPORT: "/tmp/glam-login-hydration.json",
    GLAM_LAUNCH_ARTIFACTS: "/tmp/glam-login-hydration-artifacts",
  },
});
process.exitCode = run.status ?? 1;
