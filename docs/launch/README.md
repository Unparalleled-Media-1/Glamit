# GLAM AI launch audit

Start with [NO-GO decision](PUBLIC_LAUNCH_GO_NO_GO.md), [defects](DEFECT_REGISTER.md) and [click-through results](CLICKTHROUGH_TEST_REPORT.md). The local interactive dashboard is `/workspace/artifacts/glam-launch/index.html`.

Reproduce: locked installs; `npm run build:web`; `npm run audit:launch:discover`; `npm run audit:launch:routes`; `npm run audit:launch:actions`; `npm run audit:launch:workspaces`. Use `GLAM_AUDIT_AXE=1`, optional recording with a supported Playwright FFmpeg runtime, and `GLAM_AUDIT_STRICT=1`. Run `npm run test:login-hydration`, `npm run test:launch-accessibility`, `npm run test:launch-keyboard`. Remote scripts require secure authorized credentials and must never target another project. `scripts/launch/report.py` assembles measured evidence; the release guard intentionally fails for this candidate.
