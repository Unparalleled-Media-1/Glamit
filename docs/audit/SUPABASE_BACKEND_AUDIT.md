# Supabase and backend verification

08 November 2026 08:04 SAST. **NO-GO. Audit plus one tested P0 candidate repair; no agent-initiated production deployment, schema write, login message or financial mutation.**

[Master feature matrix](GLAM_BEAUTY_MASTER_FEATURE_MATRIX.csv) · [Fresh remote metadata](evidence/remote-readiness.json) · [Production catalog](evidence/production-catalog.json) · [Deployed receipt](evidence/railway-ci-receipt.json).

Original project `bkkmsbxrxkqaveymcrgi`, status `ACTIVE_HEALTHY`, observed `2026-11-08T05:37:49.852074+00:00`. Actual revision `0013_passwordless_accounts`.

| Production metadata | Result |
| --- | --- |
| Public tables | 41 |
| Tables without RLS | 0 |
| Indexes | 77 |
| Policies | 21 |
| Foreign keys | 54 |
| Unvalidated constraints | 0 |
| Storage buckets | 0 |

| Actual public table | RLS flag |
| --- | --- |
| account_eligibility | True |
| alembic_version | True |
| api_request_counters | True |
| app_user | True |
| audit_event | True |
| catalog_ai_job | True |
| catalog_approval | True |
| catalog_listing | True |
| catalog_media | True |
| catalog_projection | True |
| catalog_revision | True |
| consent_event | True |
| credit_account | True |
| credit_journal | True |
| credit_posting | True |
| credit_reservation | True |
| device_auth_preferences | True |
| idempotency_record | True |
| look | True |
| look_revision | True |
| market_policy_version | True |
| merchant_profiles | True |
| notification_preferences | True |
| organization_members | True |
| organizations | True |
| outbox_event | True |
| personal_routine | True |
| policy_document | True |
| product_categories | True |
| product_variants | True |
| products | True |
| professional_profiles | True |
| profiles | True |
| saved_requirement | True |
| staff_grant | True |
| style_passports | True |
| user_preferences | True |
| workspace_capability | True |
| workspace_draft | True |
| workspace_invitation | True |
| workspace_role | True |

Full columns, constraints/index definitions, grants, function security metadata and policy expressions are retained in evidence/production-catalog.json. All41 RLS flags are enabled; some internal tables intentionally have no client policy/grant. Policy presence is not proof of complete feature-specific or production multi-user authorization. Local PostgreSQL tests cover RLS, staff/membership/grant revocation, migrations and cross-session data. No customer rows were read or written.

Production lacks actual wardrobe, trip, booking, commerce order/subscription/campaign/media lifecycle models. style_passports currently stores approved preferences, not complete analyzed report versions.0014 creator schema is source-only.0009 is a separate sandbox graph. Do not run application@head against production without reviewing0014 and the deployment gate; do not stamp revisions, create duplicate tables, reset production or recreate the deleted branch.

Anonymous hosted profile access returned401 and health200. These do not prove authenticated production read/write. Storage upload/access/retention/deletion is missing;0 buckets means no signed binary lifecycle was demonstrated. Completed physical backup metadata exists; restore and rollback rehearsals do not.

The value-safe evidence/configuration.json probe confirms this Codex database credential targets the original project but uses a privileged database role. It must not be used as the deployed application role. Actual Railway credentials are not inspected. No password or full URL is included in the evidence.
