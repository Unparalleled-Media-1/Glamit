# External API activation checklist

Observed 2026-11-08T15:00:58.123916+00:00. Source base `d38cf1667a50d5ae240dc75da6c683a770363fd9` plus the uncommitted/committed audit patch. Exact tested file hashes are in evidence/final/source-hashes.json. This is a failed acceptance audit, not a certificate of completion.

| Service | Purpose | Status | Required action |
| --- | --- | --- | --- |
| Supabase Auth/Twilio | SMS OTP | BLOCKED/INCOMPLETE | Activate provider, callbacks and complete real login lifecycle |
| Google/Apple/Facebook | Social Auth | BLOCKED/INCOMPLETE | Official app IDs/scopes/secrets/callbacks; native deep links and linking acceptance |
| OpenAI | Analysis/advisor | BLOCKED/INCOMPLETE | Credentials plus missing orchestration, private media, persistence and evaluation code |
| Replicate/FASHN | Transformation/try-on | BLOCKED/INCOMPLETE | Credentials plus missing job dispatch, callbacks/polling, output retention and genuine image acceptance |
| Google Maps/Open-Meteo | Location/weather | BLOCKED/INCOMPLETE | No fabricated weather; complete production dispatch/refresh and forecast-change persistence |
| Stripe Connect | Physical products | BLOCKED/INCOMPLETE | Test-mode credentials/webhooks and eligibility; live key currently blocks test acceptance |
| Peach | Approved SA payments | BLOCKED/INCOMPLETE | Missing adapter and contractually verified marketplace capability |
| TikTok/Instagram/YouTube/Pinterest/Facebook Page | Creator social | BLOCKED/INCOMPLETE | Missing official OAuth/callback/token refresh/revoke/media sync implementations |
| Resend/Twilio/push/Sentry | Notifications/monitoring | BLOCKED/INCOMPLETE | Configuration, missing delivery/registration workers and live proof |
| Google Calendar | Optional calendar | BLOCKED/INCOMPLETE | Missing OAuth/sync/conflict handling implementation |

Credentials belong only in secure environment settings. Missing adapters, refresh, callback, persistence or orchestration remain code defects even without credentials. CONNECTED requires a successful authenticated provider health check; no fabricated production fallback is permitted.
