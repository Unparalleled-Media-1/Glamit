# Railway root-cause investigation

07 November 2026 22:30 SAST. **NO-GO — no public launch or service mutation.** Machine evidence uses UTC timestamps.

## Latest deployed CI evidence

Observed 2026-11-07T20:26:00.185Z by the [read-only GitHub runner](https://github.com/Unparalleled-Media-1/Glamit/actions/runs/42410985870). Result: **ANONYMOUS_ROUTE_PROBE_ONLY**. 78 route/viewport responses collected; 78 returned HTTP success. Critical journeys remain **0 / 31 passed**. Deployed SHA: `d846b94c2fe6f0b4394be2b74c27734cde4533bf`.

Health observations: `/api/health/live` HTTP 200, `/api/health/ready` HTTP 503, `/health/live` HTTP 404, `/health/ready` HTTP 404.

The web readiness response is `not_configured`; this commit checks `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Configure the original project's public client key for the web build/runtime and rebuild only through the approved release workflow. Never substitute a service-role key. Actual Railway variable/build settings still require token-based inspection.

The CI home page observed no favicon link or logo image. Exact supplied artwork files remain unavailable in this workspace; PR28's photo repair is not included in the observed default-branch deployment.

This new evidence supersedes only the earlier workspace-only anonymous network-access result. The baseline sections below retain that earlier attempt for audit history. HTTP success is not a completed business journey. Railway runtime/build logs, source configuration, qualified authentication, financial acceptance and rollback remain unverified. No deployment or production mutation was performed. Full screenshots/trace are retained in the workflow artifact; this workspace's proxy also blocks its artifact/log download hosts. [Machine receipt](evidence/railway-rescue/railway-ci-receipt.json).

GitHub default **`feat/platform-foundations`**, SHA `d846b94c2fe6f0b4394be2b74c27734cde4533bf`. No `main` branch exists. PR21–26 are merged. 52 local/remote refs and 9 open PRs inventoried. The reported Railway source matches the actual default; a branch-name mismatch is not established. No force push, branch deletion, repository disconnect or source switch occurred.

Railway project `elegant-dedication` (`3f490939-cffd-4468-8c25-d90146f1b308`), production environment `93eeefda-99b8-462b-9041-421f9f5903ca`, existing service `glamit-web` (`d2a011b7-929e-4302-809a-27ca7345621a`), reported URL `https://glamit-web-production.up.railway.app`. These service details were supplied by the user, not independently verified through Railway API. Served health endpoint reports deployed commit `d846b94c2fe6f0b4394be2b74c27734cde4533bf`; Railway API source settings remain unverified.

This workspace has no Railway token and its managed proxy rejects the Railway CONNECT tunnel with HTTP403 before an application response. The authorized GitHub runner bypasses that workspace limitation: 78/78 anonymous desktop/mobile route responses succeeded, live200, readiness503 not_configured. No Railway deployment/build/runtime logs or source settings were accessed. Critical journeys remain 0/31; HTTP route success is not business acceptance.

**Root cause of the reported branch-loading/deployment failure remains UNDETERMINED.** GitHub branch availability is proven; the named source branch is valid. Missing agent access is the root cause of the blocked investigation, not proof of a Railway defect. A Python runtime is reported by the user but not inspected; do not assume it is erroneous without identifying what the service serves.

Required access: the existing project's environment-scoped `RAILWAY_TOKEN` in **this Codex environment's secure settings**, plus applied access for `backboard.railway.app`, `backboard.railway.com` and `glamit-web-production.up.railway.app`. Remove the unused unbound `RAILWAY_API_TOKEN` requirement; never configure both. The saved draft now includes the correct token entry but requires review/save/publication to load here. No token value belongs in chat or Git. Inspect deployment/source/build/runtime logs and Railway GitHub App permissions before changing settings; preserve the working service and previous release.
