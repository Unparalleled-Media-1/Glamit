# Complete Railway Docker build repair and restored previews

8 November2026. The user selects the proper Docker path and authorizes pushing/merging the verified repair for the existing services. This is maintenance of existing deployments, not approval of migration0014, live payments, new services, domain changes or a public-launch readiness claim.

## Findings and repair

The reported error, `couldn't locate a dockerfile at path Dockerfile`, occurs before application compilation. The repository has service-specific Dockerfiles under `deploy/railway`; there is no root Dockerfile. Empty service path/config selection must be corrected in the actual Railway service. Source code alone cannot modify an unrelated dashboard override.

The earlier external patch was not attached in this chat or found in the workspace. The repair was implemented directly against the existing Dockerfiles and tested, rather than claiming that an unseen patch was applied with git am.

Both Dockerfiles now install a real system CA bundle in a shared base stage inherited by build/runtime. Node and Python use verified TLS; local proxy trust is mounted only as a BuildKit secret and never copied into layers. Non-root users, PORT binding, health checks, frozen dependencies, public-key build validation, original-project guards and no-startup-migration behavior remain intact.

`npm run check:railway` validates both checked-in configurations and refuses empty, root-default, nonexistent or wrong-service Dockerfile paths. It does not claim the actual Railway settings have been changed. A root fallback Dockerfile was deliberately avoided because the web and API share this repository and must not select each other's image.

The full candidate includes original artwork from PR31 plus the photo/private-dashboard fixes already merged through f033f16. Reverting to f033f16 alone would omit the new original artwork and this Docker repair.

## Exact existing-service settings

| Setting | glamit-web | glamit-api |
| --- | --- | --- |
| Project | existing elegant-dedication | same existing project |
| Source branch | feat/platform-foundations | feat/platform-foundations |
| Root directory | repository root `/` | repository root `/` |
| Railway config file | `/deploy/railway/web.railway.json` | `/deploy/railway/api.railway.json` |
| Builder | DOCKERFILE | DOCKERFILE |
| Dockerfile path | `deploy/railway/web.Dockerfile` | `deploy/railway/api.Dockerfile` |
| Startup | image CMD, `node apps/web/server.js` | image CMD, `python scripts/start-api.py` |
| Health check | `/api/health/ready` | `/health/ready` |

A custom config path must be selected explicitly for each service; these files are not automatically applied just because they exist in Git. Preserve the existing running deployment until a replacement passes health checks. There is no root-level common Railway config that could silently turn the API into the web service.

Web production builds need the real **public** `NEXT_PUBLIC_SUPABASE_ANON_KEY` from Railway build configuration; local tests use an explicit public fixture. Never deploy a fixture build as production. Server/service-role credentials do not belong in that argument.

API production startup still requires the restricted original-project PostgreSQL runtime role, all three exact Supabase OIDC fields and an explicit GLAM_ALLOWED_ORIGINS list. Runtime/database/API schema readiness must actually pass; this patch does not remove those guards. See [the exact configuration and0014 review](../../branding/CONFIGURATION_AND_0014_REVIEW.md). Migration0014 remains separately gated and was not executed. Do not stamp or automatically migrate to make a readiness check green.

## Actual local evidence

- Both complete Docker image builds succeeded. [Image identities and Dockerfile hashes](evidence/build-manifest.json).
- Both non-root runtimes load system TLS roots; ephemeral build CA mounts are absent in runtime images.
- Web: PORT/liveness/ready with a public-key fixture; branded SSR and delivery of all three exact original PNG bytes pass.
- API: PORT/liveness pass. Unavailable test database/identity fail closed503; allowed CORS preflight passes and outsider origin is denied. This is not a production API readiness pass.
- 13 deployment/runtime tests pass against the dedicated local test fixture. No production database connection, migration or financial transaction was run.
- Actual iOS/Android JavaScript exports pass, but these are not installed native builds.
- The interactive review has separate iOS390×844 and Android412×915 selectors plus desktop. Both selections and original images are browser-tested. Screenshots and18 actual interaction recordings cover six patterns across three viewports. Every recording says nativeDevice=false and does not claim live AI or commerce.

[Docker smoke](evidence/docker-smoke.txt) · [Runtime tests](evidence/runtime-tests.txt) · [Preview tests](evidence/preview-test.txt).

## Previews restored

[Open iOS screenshot](previews/ios-home.png) · [Open Android screenshot](previews/android-home.png).

[iOS interactive hub](previews/ios-interactive-hub.png) · [Android interactive hub](previews/android-interactive-hub.png).

[iOS recording](previews/ios-browser-emulation-home.webm) · [Android recording](previews/android-browser-emulation-home.webm) · [All recording metadata](previews/manifest.json).

The recent handoffs omitted platform-specific preview links; they did not include installable native applications. Browser screenshots and JavaScript exports are distinct from native previews. No Apple runtime or Android device/emulator, registered EAS project, signed app build or signing credentials were available. Hardware camera, biometrics, safe areas, native lifecycle and installation remain unverified.

The downloadable interactive review package contains the actual static application, both layout selectors and all18 recordings. A separate native JavaScript archive is explicitly marked NOT AN INSTALLER. No loopback address is represented as a remotely accessible hosted preview.

## Deployment access and completion boundary

GitHub write access works in this environment; the external agent's reported403 does not prevent this checkout from pushing a reviewed repair. The current execution environment still lacks a loaded Railway credential and API allowlist. A single-token settings draft is saved but unactivated; a credential pasted in chat is not a secure runtime binding and must be replaced securely. Its value is not included in any command, log or repository file.

Source push/merge status and resulting SHA must be checked on GitHub. Actual Railway builder/config changes, deployment IDs, served SHA and production health/log verification remain unverified until secure Railway access is active. A green local image build is not proof that glamit-web updated. Preserve the healthy old deployment; never claim a failed build replaced it.
