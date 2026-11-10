# Production analysis schema — created and independently verified

User instruction: “Create the backend tables.” The original Supabase project `bkkmsbxrxkqaveymcrgi` was the only target. Production application SQL was applied on 10 November 2026, with verification recorded at 18:28 SAST. No other project or deleted development branch was created or accessed.

## Outcome

- Original project: ACTIVE_HEALTHY; exact database host matched db.bkkmsbxrxkqaveymcrgi.supabase.co. Target is the original production main database. Branch inventory is empty because preview branching is disabled, consistent with existing project records; no synthetic branch was introduced.
- Four canonical migrations executed: 0014_creator_studio → 0015_private_media → 0016_analysis_jobs → 0017_analysis_passport. Prior revision was 0013_passwordless_accounts. No revision was stamped or skipped; the test-only Stripe sibling was excluded.
- Public table count increased from **41 to 59**. **18 public tables plus one private credential table** were created.
- All 19 new tables have RLS enabled. Anonymous read/write and authenticated direct writes are denied. The four media/analysis tables and creator credential table also deny authenticated direct SELECT; authorized operations remain server-mediated. The 14 creator SELECT policies retain their owner/organization checks.
- Production metadata matches the exact PostgreSQL replay: 172 columns, 166 validated constraints, 50 indexes, 14 table policies, four user triggers and six function definitions. The private bucket and its restrictive Storage policy match too.
- Independent read-only SELECTs against all four requested analysis/media tables succeeded and returned zero rows. Actual production schema is queryable; this is not a generated-file-only result.
- Private bucket `glam-private-media`: public=false, maximum 10 MiB, PNG only. Restrictive Storage policy blocks client access even alongside unrelated permissive policies.

## Complete created-table inventory

| Schema | Table |
| --- | --- |
| public | private_media |
| public | analysis_job |
| public | analysis_correction |
| public | style_passport_analysis |
| public | creator_profiles |
| public | connected_social_accounts |
| public | social_media_items |
| public | creator_collections |
| public | creator_collection_items |
| public | creator_campaign_briefs |
| public | creator_campaign_applications |
| public | creator_campaign_deliverables |
| public | creator_referrals |
| public | creator_attribution_events |
| public | creator_commission_agreements |
| public | creator_earnings |
| public | creator_payout_eligibility |
| public | creator_social_sync_logs |
| creator_private | social_credentials |

The creator tables are the canonical0014 predecessor of the analysis migrations. Existing account routing is preserved by that migration's delegate function; its wrapper adds creator routing with eligibility/permission gates. No social provider, payout, commercial rate or live payment was activated.

## Validation and recovery

Completed physical backup **2218686776**, 10 November 2026 at **04:07:39 SAST**, was confirmed through Supabase immediately before the write. PITR is disabled; a restore rehearsal was not performed.

Canonical source was exported from a disposable local PostgreSQL17 database. Exact release SHA256: `4009f93e7fa8a9eaba3750623b0b3190ad77cdf8aceae86ed940b09c7ba96af0`. The generated transaction was independently replayed over a fresh local0013 baseline. Full backend regression: **388 passed**; additional production deployment guard tests: **9 passed**. Targeted storage/analysis/Passport/creator tests: **86 passed** (included in the full suite). Ruff and diff checks passed. The existing Starlette TestClient deprecation warning remains.

The deployment runner validates exact source hashes, original project/host, expected starting revision, absent target tables/bucket/policy, and a recent completed recovery point. It uses one transactional write with lock/statement timeouts and an in-transaction Alembic guard. Unknown outcomes are persisted and never automatically retried. A separate invocation independently verified production without applying SQL again.

No existing user or financial records were deleted or reset, and no test users, photographs, reports, financial transactions or legal-policy approvals were seeded. The existing canonical migration files were not edited. The only existing data mutation in the release is the canonical Alembic revision progression; new bucket metadata is inserted. New schema/function definitions and grants are the reviewed canonical migration effects.

## Evidence and remaining scope

- [Exact release SQL](../../../db/migrations/releases/0017_application.sql) and [manifest](../../../db/migrations/releases/0017_application.manifest.json).
- [Local replay and expected catalog](evidence/local-validation.json).
- [Production execution, backup and complete before/after catalog](evidence/production-apply.json).
- [Independent production catalog verification](evidence/production-verification.json).
- [Independent table-query results](evidence/queryable-tables.json).
- [Backend regression](evidence/backend-regression.txt) and [deployment guards](evidence/deployment-guards.txt).

Source/execution candidate commit: b9380d3. The work is on feat/analyze-schema-deployment, with the production evidence in a subsequent documentation commit. It remains reviewable, unmerged work; source control status does not negate the actual production schema execution recorded here.

**Database table creation is complete. The live mobile Analyze journey is not.** A qualified canonical FastAPI deployment and restricted runtime-role access, current approved media/analysis policies and retention, eligible test identity, worker/provider/storage health checks and mobile public build configuration still require verification. The active Supabase Edge function does not implement the canonical analysis/media endpoints. This task did not deploy the API, enable analysis/provider spend, configure credentials, register apps, change Auth providers or enable live payments. Physical Android/iPhone and first-feature design approval remain outstanding. No actual upload/analysis/Passport-save IDs exist yet.
