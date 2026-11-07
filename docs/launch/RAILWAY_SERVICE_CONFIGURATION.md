# Existing service configuration and repair boundaries

07 November 2026 22:30 SAST. **NO-GO — no public launch or service mutation.** Machine evidence uses UTC timestamps.

## Latest deployed CI evidence

Observed 2026-11-07T20:26:00.185Z by the [read-only GitHub runner](https://github.com/Unparalleled-Media-1/Glamit/actions/runs/42410985870). Result: **ANONYMOUS_ROUTE_PROBE_ONLY**. 78 route/viewport responses collected; 78 returned HTTP success. Critical journeys remain **0 / 31 passed**. Deployed SHA: `d846b94c2fe6f0b4394be2b74c27734cde4533bf`.

Health observations: `/api/health/live` HTTP 200, `/api/health/ready` HTTP 503, `/health/live` HTTP 404, `/health/ready` HTTP 404.

The web readiness response is `not_configured`; this commit checks `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Configure the original project's public client key for the web build/runtime and rebuild only through the approved release workflow. Never substitute a service-role key. Actual Railway variable/build settings still require token-based inspection.

The CI home page observed no favicon link or logo image. Exact supplied artwork files remain unavailable in this workspace; PR28's photo repair is not included in the observed default-branch deployment.

This new evidence supersedes only the earlier workspace-only anonymous network-access result. The baseline sections below retain that earlier attempt for audit history. HTTP success is not a completed business journey. Railway runtime/build logs, source configuration, qualified authentication, financial acceptance and rollback remain unverified. No deployment or production mutation was performed. Full screenshots/trace are retained in the workflow artifact; this workspace's proxy also blocks its artifact/log download hosts. [Machine receipt](evidence/railway-rescue/railway-ci-receipt.json).

Railway project `elegant-dedication` (`3f490939-cffd-4468-8c25-d90146f1b308`), production environment `93eeefda-99b8-462b-9041-421f9f5903ca`, existing service `glamit-web` (`d2a011b7-929e-4302-809a-27ca7345621a`), reported URL `https://glamit-web-production.up.railway.app`. These service details were supplied by the user, not independently verified through Railway API. Served health endpoint reports deployed commit `d846b94c2fe6f0b4394be2b74c27734cde4533bf`; Railway API source settings remain unverified.

GitHub default **`feat/platform-foundations`**, SHA `d846b94c2fe6f0b4394be2b74c27734cde4533bf`. No `main` branch exists. PR21–26 are merged. 52 local/remote refs and 9 open PRs inventoried. The reported Railway source matches the actual default; a branch-name mismatch is not established. No force push, branch deletion, repository disconnect or source switch occurred.

Actual root directory, builder, commands, runtime, source, Wait for CI, auto-deploy and restart settings remain **unverified**. The prior tested candidates under `deploy/railway` are not applied configuration or proof a second service is needed. `apps/web` is Next.js/React; `apps/mobile` is React Native/Expo; `services/api` is FastAPI. Existing clients use Supabase Edge/RPC and cannot be blindly switched to the incomplete FastAPI route set. Canonical migrations remain `db/migrations`, one original Supabase project only.

Inspect first. Create no additional service/project, recreate no Supabase dev branch, and do not switch domains or deploy publicly before verified impact and final approval. Required access: the existing project's environment-scoped `RAILWAY_TOKEN` in **this Codex environment's secure settings**, plus applied access for `backboard.railway.app`, `backboard.railway.com` and `glamit-web-production.up.railway.app`. Remove the unused unbound `RAILWAY_API_TOKEN` requirement; never configure both. The saved draft now includes the correct token entry but requires review/save/publication to load here. No token value belongs in chat or Git. Inspect deployment/source/build/runtime logs and Railway GitHub App permissions before changing settings; preserve the working service and previous release.
