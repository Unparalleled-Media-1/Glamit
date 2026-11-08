## Current Railway-first audit — 7 November

New feature development is frozen. Start with [Railway root cause](RAILWAY_ROOT_CAUSE_REPORT.md), [actual deployment verification](DEPLOYMENT_VERIFICATION.md), [current inventory/results](CLICKTHROUGH_RESULTS.md) and the [12-gate NO-GO decision](PUBLIC_LAUNCH_GO_NO_GO.md). Current raw results live in `evidence/railway-rescue`; prior evidence remains historical and separately scoped. `python scripts/launch/rescue_report.py` generates the requested reports; the normal report entry point selects it when the current Railway evidence exists. `node scripts/launch/release-gates.cjs` must reject incomplete deployed evidence.

# GLAM AI launch audit

Start with [NO-GO decision](PUBLIC_LAUNCH_GO_NO_GO.md), [defects](DEFECT_REGISTER.md) and [click-through results](CLICKTHROUGH_TEST_REPORT.md). The local interactive dashboard is `/workspace/artifacts/glam-launch/index.html`.

Reproduce: locked installs; `npm run build:web`; `npm run audit:launch:discover`; `npm run audit:launch:routes`; `npm run audit:launch:actions`; `npm run audit:launch:workspaces`. Use `GLAM_AUDIT_AXE=1`, optional recording with a supported Playwright FFmpeg runtime, and `GLAM_AUDIT_STRICT=1`. Run `npm run test:login-hydration`, `npm run test:launch-accessibility`, `npm run test:launch-keyboard`. Remote scripts require secure authorized credentials and must never target another project. `scripts/launch/report.py` assembles measured evidence; the release guard intentionally fails for this candidate.
