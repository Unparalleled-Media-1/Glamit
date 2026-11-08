# Supabase security results

**NO-GO.** Current local candidate evidence is distinct from actual deployed/service/device evidence. No production deployment, migration, account creation, messages or financial mutation was performed by this audit.

[Control inventory](COMPLETE_CONTROL_INVENTORY.csv) · [Results](CONTROL_CLICKTHROUGH_RESULTS.csv) · [Feature matrix](../audit/GLAM_BEAUTY_MASTER_FEATURE_MATRIX.csv) · [Evidence summary](evidence/qa-summary.json).

Read-only production observation `2026-11-08T05:37:49.852074+00:00`: original project only, schema0013,41 tables with RLS enabled,77 indexes,54 validated foreign keys,21 policies,0 Storage buckets.

Current real local PostgreSQL regression268 passed, including five registration-authority cases: creation grants neither verified capability nor staff status; client workspace/role/verification/owner overrides are rejected. These are local fixture users; no production tenant write qualification. The client gate is a UX boundary; existing server JWT/RLS/capability checks remain the data-security boundary. No new cookies, role store or authentication backend was introduced.

Codex still has an administrative database credential and no Railway token; actual hosted application credentials uninspected. Storage/retention/deletion and production role/service authorization remain incomplete. [Raw metadata](../audit/evidence/production-catalog.json), [configuration](../audit/evidence/configuration.json).
