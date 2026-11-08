# Security and release authorization

07 November 2026 22:30 SAST. **NO-GO — no public launch or service mutation.** Machine evidence uses UTC timestamps.

## Latest deployed CI evidence

Observed 2026-11-07T20:26:00.185Z by the [read-only GitHub runner](https://github.com/Unparalleled-Media-1/Glamit/actions/runs/42410985870). Result: **ANONYMOUS_ROUTE_PROBE_ONLY**. 78 route/viewport responses collected; 78 returned HTTP success. Critical journeys remain **0 / 31 passed**. Deployed SHA: `d846b94c2fe6f0b4394be2b74c27734cde4533bf`.

Health observations: `/api/health/live` HTTP 200, `/api/health/ready` HTTP 503, `/health/live` HTTP 404, `/health/ready` HTTP 404.

The web readiness response is `not_configured`; this commit checks `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Configure the original project's public client key for the web build/runtime and rebuild only through the approved release workflow. Never substitute a service-role key. Actual Railway variable/build settings still require token-based inspection.

The CI home page observed no favicon link or logo image. Exact supplied artwork files remain unavailable in this workspace; PR28's photo repair is not included in the observed default-branch deployment.

This new evidence supersedes only the earlier workspace-only anonymous network-access result. The baseline sections below retain that earlier attempt for audit history. HTTP success is not a completed business journey. Railway runtime/build logs, source configuration, qualified authentication, financial acceptance and rollback remain unverified. No deployment or production mutation was performed. Full screenshots/trace are retained in the workflow artifact; this workspace's proxy also blocks its artifact/log download hosts. [Machine receipt](evidence/railway-rescue/railway-ci-receipt.json).

Current read-only catalog: `[{"revision": "0013_passwordless_accounts", "public_tables": 41, "tables_without_rls": 0, "indexes": 77, "policies": 21, "foreign_keys": 54, "unvalidated_foreign_keys": 0}]`. All 41 public tables have RLS; no invalid foreign key reported. This is metadata verification, not the complete tenant/role matrix. Local PostgreSQL security tests are included in 260 tests; prior controlled live core/session evidence remains historical and separately scoped. No new production users, transactions or private images were created.

| Control | Actual result |
|---|---|
| Railway access | Token placed in service, not agent; secrets never printed |
| Private runtime configuration | {'parseable': True, 'original_project_host': True, 'administrative_username': True} |
| New/old origin CORS | [{'origin': 'https://www.glam.beauty', 'status': 403, 'allow_origin': None}, {'origin': 'https://www.glamit.beauty', 'status': 204, 'allow_origin': 'https://www.glamit.beauty'}] |
| Phone/social Auth | Disabled; no fabricated OTP/OAuth success |
| Payments | GET mode check returned live mode; all financial mutations prohibited |
| Gate enforcement | Version2, exactly G1–G12, source/deployed SHA, real public HTTPS health/journeys/rollback, fresh evidence, finance, hardware and final approval required |
| Unverified security areas | Private image retention/deletion, complete role matrix, legal and physical-device checks remain blocked |

No RLS bypass, database reset, credential overwrite, public launch or destructive migration occurred. Secret scans and provider/hardware tests must be repeated against the final authorized deployed candidate.
