# Main and baseline verification

- Remote repository: https://github.com/Unparalleled-Media-1/Glamit
- Remote default: `feat/platform-foundations` at `d03f6d45a8ffb99a26fd1a5a7df6c51689185ffb`.
- Main branch: **ABSENT** locally and remotely at inventory time. Main SHA: **NOT AVAILABLE**.
- Audited candidate source: `1060e34263f0a980ba8ef66a8c148077a4a1355e`. Core application consolidation proposal: `b97f1d6db1ad96b78d62e451c88a7bffbd212da4`.
- Audit working branch: `audit/pre-supabase-g0`; audit snapshot starts at candidate SHA. Subsequent audit commit is documentation/tooling evidence, not an approved main release.
- Clean build from main: **BLOCKED** because main does not exist. A clean candidate source archive/install/build is separately tested; it cannot satisfy the main gate.
- PR merges performed: ** 0**. Approval/check/protection evidence: **UNAVAILABLE / API FORBIDDEN**.
- Baseline tag: **NOT CREATED**. No tags existed at discovery. Proposed only after gates pass: `pre-supabase-g0-YYYYMMDD-<main-short-sha>`.
- Working tree was clean before audit. Generated sandbox fixture IDs may change on disposable rerun; no production data was touched.

Use [branch inventory](evidence/branch-inventory.json) for immutable discovered refs. After approved consolidation, fetch main, clean-clone at its exact SHA, run the full required suite, record CI URLs and create the approved baseline tag. This document does not substitute candidate checks for main verification.
