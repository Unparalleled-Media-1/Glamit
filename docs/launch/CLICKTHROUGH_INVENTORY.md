# Click-through inventory

07 November 2026 22:30 SAST. **NO-GO — no public launch or service mutation.** Machine evidence uses UTC timestamps.

## Latest deployed CI evidence

Observed 2026-11-07T20:26:00.185Z by the [read-only GitHub runner](https://github.com/Unparalleled-Media-1/Glamit/actions/runs/42410985870). Result: **ANONYMOUS_ROUTE_PROBE_ONLY**. 78 route/viewport responses collected; 78 returned HTTP success. Critical journeys remain **0 / 31 passed**. Deployed SHA: `d846b94c2fe6f0b4394be2b74c27734cde4533bf`.

Health observations: `/api/health/live` HTTP 200, `/api/health/ready` HTTP 503, `/health/live` HTTP 404, `/health/ready` HTTP 404.

The web readiness response is `not_configured`; this commit checks `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Configure the original project's public client key for the web build/runtime and rebuild only through the approved release workflow. Never substitute a service-role key. Actual Railway variable/build settings still require token-based inspection.

The CI home page observed no favicon link or logo image. Exact supplied artwork files remain unavailable in this workspace; PR28's photo repair is not included in the observed default-branch deployment.

This new evidence supersedes only the earlier workspace-only anonymous network-access result. The baseline sections below retain that earlier attempt for audit history. HTTP success is not a completed business journey. Railway runtime/build logs, source configuration, qualified authentication, financial acceptance and rollback remain unverified. No deployment or production mutation was performed. Full screenshots/trace are retained in the workflow artifact; this workspace's proxy also blocks its artifact/log download hosts. [Machine receipt](evidence/railway-rescue/railway-ci-receipt.json).

| Inventory | Count / scope |
|---|---|
| Web routes | 39 |
| Source controls | 454 |
| Python endpoints | 46 |
| Local runtime control occurrences | 3048 |
| Role/module layout visits | 99 |

| Route | Actual deployed status |
|---|---|
| / | BLOCKED — no network access |
| /offer | BLOCKED — no network access |
| /results | BLOCKED — no network access |
| /destination | BLOCKED — no network access |
| /cart | BLOCKED — no network access |
| /checkout | BLOCKED — no network access |
| /orders | BLOCKED — no network access |
| /shop | BLOCKED — no network access |
| /product | BLOCKED — no network access |
| /event | BLOCKED — no network access |
| /builder | BLOCKED — no network access |
| /analyze | BLOCKED — no network access |
| /hair | BLOCKED — no network access |
| /skin | BLOCKED — no network access |
| /body-fit | BLOCKED — no network access |
| /consent | BLOCKED — no network access |
| /quality | BLOCKED — no network access |
| /goals | BLOCKED — no network access |
| /report | BLOCKED — no network access |
| /color | BLOCKED — no network access |
| /guide | BLOCKED — no network access |
| /studio | BLOCKED — no network access |
| /advisor | BLOCKED — no network access |
| /profile | BLOCKED — no network access |
| /history | BLOCKED — no network access |
| /privacy | BLOCKED — no network access |
| /explore | BLOCKED — no network access |
| /complete | BLOCKED — no network access |
| /screenshot | BLOCKED — no network access |
| /budget | BLOCKED — no network access |
| /booking | BLOCKED — no network access |
| /wardrobe | BLOCKED — no network access |
| /calendar | BLOCKED — no network access |
| /groups | BLOCKED — no network access |
| /agent | BLOCKED — no network access |
| /business | BLOCKED — no network access |
| /admin | BLOCKED — no network access |
| /login | BLOCKED — no network access |
| /auth/callback | BLOCKED — no network access |

Full per-control source positions/names and runtime route/viewport/state fields: [source](evidence/railway-rescue/source-inventory.json), [runtime](evidence/railway-rescue/clickthrough.json), [action outcomes/reasons](evidence/railway-rescue/interactions.json), [role controls](evidence/railway-rescue/workspace-layouts.json). Repeated navigation controls are not unique features. Disabled, authenticated-only and unallowlisted actions are explicitly blocked/skipped.

[Per-control expected/actual/dependency/status/defect columns](evidence/railway-rescue/control-inventory.csv). Unknown backend semantics are explicitly unverified; no business success is inferred.
