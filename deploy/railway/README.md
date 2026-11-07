# Existing Railway service investigation

Read [the actual investigation/report](../../docs/deployment/independent/REPORT.md) first. The existing project/environment/service IDs are recorded in `existing-service.json`. Do not create a replacement project/service, change source branches or redeploy until existing logs/runtime are inspected and the user approves the release candidate.

The two candidate configs are independent build options from **repository root**, not instructions to create two live services immediately:

| Candidate | Config-file path | Builder/start | Readiness |
| --- | --- | --- | --- |
| Next web | `/deploy/railway/web.railway.json` | Docker; `node apps/web/server.js` | `/api/health/ready` |
| Existing FastAPI application, if separately needed | `/deploy/railway/api.railway.json` | Docker; `python scripts/start-api.py` | `/health/ready` |

Both bind `0.0.0.0:$PORT`. No boot-time migrations. Per-service watch patterns exclude unrelated application directories. Build secrets only come from the host secret manager; the web's explicitly public key is the only Auth build argument. Local managed-environment Docker tests pass the combined CA bundle as an ephemeral `proxy_ca` BuildKit secret; no CA or credentials are copied into image layers.

Use production default branch `feat/platform-foundations` unless a separately reviewed branch-renaming/consolidation plan changes it: GitHub currently has no `main`. Keep current working deployment/configuration recoverable. Current clients use the original Supabase Edge API; a new FastAPI domain cannot replace it until endpoint/identity/session parity is verified.
