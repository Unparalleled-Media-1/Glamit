# Integration status

07 November 2026 22:30 SAST. **NO-GO — no public launch or service mutation.** Machine evidence uses UTC timestamps.

## Latest deployed CI evidence

Observed 2026-11-07T20:26:00.185Z by the [read-only GitHub runner](https://github.com/Unparalleled-Media-1/Glamit/actions/runs/42410985870). Result: **ANONYMOUS_ROUTE_PROBE_ONLY**. 78 route/viewport responses collected; 78 returned HTTP success. Critical journeys remain **0 / 31 passed**. Deployed SHA: `d846b94c2fe6f0b4394be2b74c27734cde4533bf`.

Health observations: `/api/health/live` HTTP 200, `/api/health/ready` HTTP 503, `/health/live` HTTP 404, `/health/ready` HTTP 404.

The web readiness response is `not_configured`; this commit checks `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Configure the original project's public client key for the web build/runtime and rebuild only through the approved release workflow. Never substitute a service-role key. Actual Railway variable/build settings still require token-based inspection.

The CI home page observed no favicon link or logo image. Exact supplied artwork files remain unavailable in this workspace; PR28's photo repair is not included in the observed default-branch deployment.

This new evidence supersedes only the earlier workspace-only anonymous network-access result. The baseline sections below retain that earlier attempt for audit history. HTTP success is not a completed business journey. Railway runtime/build logs, source configuration, qualified authentication, financial acceptance and rollback remain unverified. No deployment or production mutation was performed. Full screenshots/trace are retained in the workflow artifact; this workspace's proxy also blocks its artifact/log download hosts. [Machine receipt](evidence/railway-rescue/railway-ci-receipt.json).

| Integration | Actual verification |
|---|---|
| Railway | Not configured in agent; no build/runtime logs or served SHA |
| Supabase | [{'revision': '0013_passwordless_accounts', 'public_tables': 41, 'tables_without_rls': 0, 'indexes': 77, 'policies': 21, 'foreign_keys': 54, 'unvalidated_foreign_keys': 0}]; management/read-only SQL, not Railway connectivity |
| SMS / Google / Apple / Facebook | All disabled in actual Supabase settings; no delivery/linking tests |
| OpenAI / Replicate / FASHN | Credentials absent; inference/try-on implementations also incomplete |
| Maps / weather | No current real location/forecast integration proof |
| Creator social providers | No real OAuth/refresh/sync; local manual-draft tests only |
| Stripe Connect | {'http_status': 200, 'livemode': True, 'status': 'BLOCKED_LIVE_MODE', 'financial_mutations': 0, 'actual_payment_ids': [], 'actual_transfer_ids': [], 'commission_reconciliation': 'NOT EXECUTED'} |
| Notifications / monitoring | No real delivery/monitoring verification |

Credential-presence booleans only: {"OPENAI_API_KEY": false, "GLAM_OPENAI_API_KEY": false, "RAILWAY_TOKEN": false, "RAILWAY_API_TOKEN": false, "REPLICATE_API_TOKEN": false, "FASHN_API_KEY": false, "GOOGLE_MAPS_API_KEY": false, "RESEND_API_KEY": false, "TWILIO_ACCOUNT_SID": false, "TWILIO_AUTH_TOKEN": false, "SENTRY_DSN": false, "STRIPE_SECRET_KEY": true, "STRIPE_WEBHOOK_SECRET": false, "GLAM_CPANEL_USER": false, "GLAM_CPANEL_API_TOKEN": false}. Presence never means CONNECTED. [Read-only remote evidence](evidence/railway-rescue/remote-readiness.json). No live payment, transfer, refund, payout, social publication, SMS or email was executed.
