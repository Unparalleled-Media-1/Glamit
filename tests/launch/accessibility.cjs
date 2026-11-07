/** Targeted real-browser regression for the audit's contrast and conversation semantics defects. */
const { spawnSync } = require("node:child_process");
const run = spawnSync(process.execPath, ["scripts/launch/clickthrough.cjs"], {
  stdio: "inherit",
  env: {
    ...process.env,
    GLAM_AUDIT_ROUTES:
      "/offer,/shop,/product,/event,/report,/color,/advisor,/screenshot",
    GLAM_AUDIT_VIEWPORTS: "desktop,iphone-web",
    GLAM_AUDIT_AXE: "1",
    GLAM_AUDIT_STRICT: "1",
    GLAM_LAUNCH_REPORT: process.env.GLAM_ACCESSIBILITY_REPORT ||
      "/tmp/glam-accessibility-regression.json",
    GLAM_LAUNCH_ARTIFACTS: "/tmp/glam-accessibility-artifacts",
  },
});
process.exitCode = run.status ?? 1;
