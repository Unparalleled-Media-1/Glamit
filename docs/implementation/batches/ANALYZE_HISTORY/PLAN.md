# Analyze continuation — persistent history, private-photo reload and phone review build

Continue the controlled one-feature restart. Complete existing Analyze behavior; do not expand Home/Studio/Discover/Profile, apply production migrations or replace applications. Related approved requirements: GB-014, GB-019, GB-021, GB-022; no broader requirement is closed from these component checks.

Scope:

- GET /v1/analysis/jobs as actual bounded, owner-authenticated history, with server timestamps and selected canonical Passport badge; no local report list substitutes for this operation.
- Reopen a server job and fetch its verified report plus private PNG through the same authenticated origin. Require unexpired ready metadata, PNG type/signature and matching stored size. Never use a provider-supplied URL or disk cache for private photos.
- Hide private report/photo on revocation, session changes and expiry; reject late image responses. Image-fetch transport failures have a truthful retry state; no substituted portrait.
- Preserve another active request's recovery handle when saving/removing an older report.
- Retain tested x86_64 emulator APK separately and build a debug-signed ARM64 review APK. The ARM64 package permits manual phone testing; compilation/signature checks never imply physical-device testing or store readiness.
- Extend the existing isolated contract tests. Native Android/iOS tests remain separate from live API acceptance.

No new migrations or backend/Auth/financial changes. Existing live blockers remain subject to fresh read-only verification and the original separate production gates. Stop within Analyze until the real authenticated photo→analysis→saved/reopened account journey passes before requesting the first-feature design approval.
