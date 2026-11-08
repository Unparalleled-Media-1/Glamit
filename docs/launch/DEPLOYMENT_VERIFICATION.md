# Deployed release verification

07 November 2026 22:30 SAST. **NO-GO — no public launch or service mutation.** Machine evidence uses UTC timestamps.

## Latest deployed CI evidence

Observed 2026-11-07T20:26:00.185Z by the [read-only GitHub runner](https://github.com/Unparalleled-Media-1/Glamit/actions/runs/42410985870). Result: **ANONYMOUS_ROUTE_PROBE_ONLY**. 78 route/viewport responses collected; 78 returned HTTP success. Critical journeys remain **0 / 31 passed**. Deployed SHA: `d846b94c2fe6f0b4394be2b74c27734cde4533bf`.

Health observations: `/api/health/live` HTTP 200, `/api/health/ready` HTTP 503, `/health/live` HTTP 404, `/health/ready` HTTP 404.

The web readiness response is `not_configured`; this commit checks `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Configure the original project's public client key for the web build/runtime and rebuild only through the approved release workflow. Never substitute a service-role key. Actual Railway variable/build settings still require token-based inspection.

The CI home page observed no favicon link or logo image. Exact supplied artwork files remain unavailable in this workspace; PR28's photo repair is not included in the observed default-branch deployment.

This new evidence supersedes only the earlier workspace-only anonymous network-access result. The baseline sections below retain that earlier attempt for audit history. HTTP success is not a completed business journey. Railway runtime/build logs, source configuration, qualified authentication, financial acceptance and rollback remain unverified. No deployment or production mutation was performed. Full screenshots/trace are retained in the workflow artifact; this workspace's proxy also blocks its artifact/log download hosts. [Machine receipt](evidence/railway-rescue/railway-ci-receipt.json).

This workspace has no Railway token and its managed proxy rejects the Railway CONNECT tunnel with HTTP403 before an application response. The authorized GitHub runner bypasses that workspace limitation: 78/78 anonymous desktop/mobile route responses succeeded, live200, readiness503 not_configured. No Railway deployment/build/runtime logs or source settings were accessed. Critical journeys remain 0/31; HTTP route success is not business acceptance.

| Check | Status |
|---|---|
| Deployed SHA / branch | Served SHA d846b94c2fe6f0b4394be2b74c27734cde4533bf; source branch settings unverified |
| Build/startup/runtime logs | BLOCKED — Railway access |
| HTTP health / readiness / assets | CI live200, readiness503; no favicon/logo image observed |
| Frontend→backend / hosted Supabase | UNVERIFIED |
| OAuth / live click-through / role journeys | BLOCKED |
| Restart / recovery / previous-release rollback | NOT RUN |
| Production mutations / domain changes / service creation | NONE |

[Actual browser attempt](evidence/railway-rescue/deployed-clickthrough.json). Trace and screenshot: `/workspace/artifacts/glam-railway-rescue/deployed-access-trace.zip`, `deployed-access.png`. No local result is substituted for deployed proof.
