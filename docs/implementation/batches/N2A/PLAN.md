# N2A — private-photo transport lifecycle

Scope: a prerequisite component of GB-022 / FINAL-GB-022 and GB-013 / FINAL-GB-013. Build on OAI1 and N1 without merging either draft dependency or changing their acceptance scope. User review: docs/specification/sources/2026-11-openai-integration-review.txt.

The existing shared private-media client has no caller cancellation/deadline and the native adapter uses global fetch. Repair these before wiring the photo screens to F1A. Preserve existing endpoints, identity checks, policy purposes, original photos, approval gates and financial rules. This batch is transport implementation, not completion of native upload UX or N2.

Affected files: packages/product/private-media.ts, apps/mobile/private-media.ts, tests/client/private-media.cjs, new private-media-lifecycle.cjs, package.json and scoped engineering evidence. No new dependency, server endpoint or migration. Existing candidate0014/0015 remain unapplied; no production data or settings change.

Acceptance tests first: pre-cancelled list must not send any HTTP request (failed before); abort while hashing or after intent must not submit photo bytes; bound network/body consumption; reject redirects/unexpected origins; validate/project private-photo policy and matching consent receipt; retain session fencing and safe errors. Verify native adapter selects Expo fetch using an explicit port double, then run photo/Auth/Advisor regressions and web/mobile type checks. Doubles are not installed-device evidence.

Follow-up N2 work remains required: native navigation stacks, authenticated application service composition, explicit upload consent and progress/recovery UI, durable references and cross-session retrieval/deletion, persistent analysis/jobs/reports/corrections/Style Passport. Do not bind an incompatible or nonexistent API to CompanionConnection merely to eliminate its missing configuration state.
