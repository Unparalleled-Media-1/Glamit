# Integration status

07 November 2026 21:46 SAST. **NO-GO — no public launch or service mutation.** Machine evidence uses UTC timestamps.

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
