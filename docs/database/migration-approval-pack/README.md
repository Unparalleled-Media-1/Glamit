# Migration approval pack — 0014 to 0018 (REVIEW ONLY)

**Nothing in this pack has been applied to production or to any shared database.** Everything below was produced from the repository at commit `494e800` (`feat/platform-foundations` after PR #85) and executed only on throwaway local PostgreSQL 16 databases. The owner has not approved any SQL here.

**Verdict: NO-GO for production.** The owner has accepted D1-D7; open items are in §13 and §13a (notably D8, the runtime role, and the owner's approval of the exact SQL). The SQL itself replays cleanly and matches the application; the blockers are production state that cannot be verified from here, a missing worker deployment, and missing approvals.

Evidence labels used throughout: **VERIFIED-LOCAL** (I ran it in this session, output reproducible with the commands in §14) · **DOCUMENTED** (stated in repo reports, with date, not re-checked) · **UNVERIFIED** (no direct evidence available; needs a read-only query against production).

## 1. What is being approved

Five linear Alembic revisions on the application branch `0013 → 0014 → 0015 → 0016 → 0017 → 0018`. The Stripe sandbox revision `0009_stripe_test_ledger` is a separate head that **must never run in production** (it refuses non-`_test` databases and is excluded from `application@head`). **Never run `alembic upgrade heads` against production**; apply only the exact SQL artifacts below, one at a time.

| Rev | Python (SHA-256) | Source SQL (SHA-256) | Exact release SQL artifact (SHA-256) | SQL lines |
|---|---|---|---|---|
| 0014 | `0014_creator_studio.py` `004791c47ce511dafc53f7d181758c9c5453f80ca56454dadf0f927f96558c73` | `0014_creator_studio.sql` `d7444ac2929df2d97455a26777fa5915d414fcba1904f5de6054fa08c2daf657` | `db/migrations/releases/0014_application.sql` `0f5fde1f8915739e1bb3bf2a667025bf0de17f7022e592077551666a13f730eb` | 286 |
| 0015 | `0015_private_media.py` `1890886ef5769c70e26836fd1c0362fa4877cbbcf190ee92ac4dc010dccc7f1c` | `0015_private_media.sql` `f4d2c559c2ce7663d87e36e86ee54d0f6ee2b7eb84d653b54154bb07e229e19c` | `db/migrations/releases/0015_application.sql` `67f172d7ea775b7fa65895ab5f77250e61debf53969f4ed2801a8995cffdcf12` | 59 |
| 0016 | `0016_analysis_jobs.py` `7fcd17072ae6b89b00987c47c2d36d82426930bc5883d604c6066278dad06ec5` | `0016_analysis_jobs.sql` `fab2a6e0cce0a8877319f570a0a9cb06072555470a8e5922826cc2ee371ae4cd` | `docs/database/migration-approval-pack/exact-sql/0016_application.sql` `fd499cccf8ef4757a89298ae1cb180e3cc90e515e22ac2cbc9c0a252dbd5a6f4` | 36 |
| 0017 | `0017_analysis_passport.py` `64785802d66b11a4aa9c67ee67b03fbb03fe7b41cda4a17a27c798e03f37e0b1` | `0017_analysis_passport.sql` `09f3d986c951e27043df8287ea042a1bb3ffddb737417778e55d4772668df0c2` | `docs/database/migration-approval-pack/exact-sql/0017_application.sql` `f061df1c686b90b78eb236de038790a8459ad2d7f41788a8aed43276b2ccc7fc` | 59 |
| 0018 | `0018_tryon.py` `3e40211a0b8cc7db3f83c54f0a31d4e6e0bfcfa83f57b1e4ba523536ebe4d5fd` | `0018_tryon.sql` `921a491b944657841801d604e3a2c1a739c8b130be2fa37f8be61796ad0b9df4` | `docs/database/migration-approval-pack/exact-sql/0018_application.sql` `a6ec89e2ea706a2f0b676a4a16f831a22e0fa65bc378ceda8f01fd8e6c32a0f4` | 110 |

* 0014 and 0015 release artifacts already exist in `db/migrations/releases/` with manifests; I re-verified their checksums and that no canonical source has drifted since export (**VERIFIED-LOCAL**).
* 0016, 0017 and 0018 had no release artifact. I generated them with the repository's own `scripts/export_application_migration.py` (empty local build database, starting revision = previous one). They are in `exact-sql/` with manifests. If approved, copy them to `db/migrations/releases/` unchanged.
* Each artifact is one transaction (`BEGIN; SET LOCAL lock_timeout='5s'; SET LOCAL statement_timeout='60s'; … UPDATE alembic_version … COMMIT;`).

## 2. Per-migration review

### 0014 `creator_studio` — highest risk, no current consumer
* **Purpose:** Creator Studio schema: 14 `public.creator_*`/social tables, `creator_private.social_credentials` (new schema, no grants), helper functions, and **replacement of the public RPC `public.glam_api_v1`**.
* **Depends on (must already exist in production):** tables `profiles, organizations, organization_members, products, workspace_capability, workspace_role, account_eligibility, audit_event`; functions `glam_private.active_profile_id()`, `glam_private.current_app_user_id()`, `glam_private.is_org_member()`, `glam_private.bootstrap_identity()`, `public.glam_api_gate()`, `public.glam_api_v1(text,text,jsonb,text)`; roles `anon, authenticated, service_role`. DOCUMENTED present as of 7 Nov (41 tables, 0013); **UNVERIFIED now.** `CREATE FUNCTION … LANGUAGE sql` validates referenced tables at creation, so a missing table aborts the whole transaction (safe).
* **Constraints/keys/indexes:** many CHECKs, composite FKs (`(id, creator_id)`), unique constraints, 2 indexes. Referenced existing tables: `profiles, organizations, products` (FK creation takes a short lock on each; small tables).
* **RLS/grants:** RLS enabled on all 14 public tables and `creator_private.social_credentials`; all client privileges revoked then `SELECT` granted to `authenticated` under 14 row policies; no client write access (writes only through the RPC). `creator_private` grants fully revoked, including `service_role`.
* **Triggers:** append-only triggers on `creator_earnings` and `creator_attribution_events`.
* **The structural change:** `ALTER FUNCTION public.glam_api_v1 RENAME TO glam_account_api_v1`, moved to schema `glam_private`, and a **new `public.glam_api_v1` wrapper with the same signature** that handles `/v1/me/creator*` and delegates every other path to the original. Grants on the wrapper: `authenticated` only. Existing callers (Supabase Edge function `glam-api`) keep working (**VERIFIED-LOCAL**: `tests/test_hosted_api.py` passes at head).
* **Consumer status:** no client or Edge handler references `/v1/me/creator`. The tables and RPC branch would be live but unused. **Owner decision D3 below.**
* **Reversibility:** `downgrade()` raises `RuntimeError("Reviewed data-preserving rollback required")`. **No automatic rollback exists and none is invented here.**

### 0015 `private_media`
* **Purpose:** private photo registry `public.private_media` + Supabase Storage bucket `glam-private-media` (private, 10 MB, PNG only) + a RESTRICTIVE policy on `storage.objects`.
* **Depends on:** `storage.buckets` and `storage.objects` exist (aborts otherwise); bucket id `glam-private-media` must **not** already exist (aborts by design); `app_user, policy_document, consent_event`. The migration INSERTs into `storage.buckets` and CREATEs a policy on `storage.objects` — **UNVERIFIED that the production migration role is permitted to do both** (in Supabase, `storage.objects` is owned by a Storage admin role). Pre-flight query P8 checks this.
* **Effect on other buckets:** the policy is `AS RESTRICTIVE FOR ALL TO PUBLIC USING (bucket_id <> 'glam-private-media')`: it can only deny access to this one bucket, so other buckets are unaffected (reviewed; not behaviorally tested against production's existing storage policies).
* **Tables:** `private_media` (CHECKs incl. key = `owner/id.png`, state machine, size/hash constraints), 2 indexes, RLS enabled, all client privileges revoked.
* **Reversibility:** `downgrade()` is guarded: refuses unless registry **and** bucket are empty; the bucket itself must be removed through the Storage API first (SQL deletion of a non-empty bucket is deliberately not done).

### 0016 `analysis_jobs`
* **Purpose:** durable cosmetic-analysis jobs `public.analysis_job`; adds unique index `private_media(id, owner_id)` for the composite FK.
* **Depends on:** 0015 (`private_media`), `app_user, policy_document, consent_event`.
* **Constraints:** state-machine CHECKs, unique `(owner_id, request_key)`, 3 indexes; RLS on, client privileges revoked.
* **Reversibility:** empty-only downgrade (refuses if any job exists); drops the index that 0018 also uses, so **0018 must be rolled back first**.

### 0017 `analysis_passport`
* **Purpose:** `analysis_correction` (immutable revisions, privacy redaction only) and `style_passport_analysis` (association to the canonical `style_passports`); two trigger functions.
* **Depends on:** 0016, `style_passports` (DOCUMENTED present), `app_user`. The owner-check trigger hard-codes the Supabase issuer `https://bkkmsbxrxkqaveymcrgi.supabase.co/auth/v1` (correct for the only authorized project).
* **Reversibility:** empty-only downgrade.

### 0018 `tryon` (new in this batch; try-on stays disabled)
* **Purpose:** `generation_price_rule`, `tryon_job`, `tryon_result`, `generation_cost_event`, view `generation_cost_summary`; **`ALTER TABLE credit_account ADD COLUMN credit_kind text NOT NULL DEFAULT 'glam_ai_credit' CHECK (credit_kind='glam_ai_credit')`**.
* **Depends on:** 0016 (index), `credit_reservation (id, user_id)` unique key, `policy_document, consent_event, app_user, private_media`.
* **Data:** no price is seeded (no unapproved price can exist); no existing rows change except the new column default on `credit_account`.
* **Credit separation:** the CHECK permits only `glam_ai_credit`; no other credit kind can be inserted into the GLAM ledger (**VERIFIED-LOCAL**, `tests/test_tryon_jobs.py::test_credit_kinds_are_separate_by_construction`; also no LifeSwap/Stay identifier exists in API, migrations or Flutter code).
* **Reversibility:** empty-only downgrade (refuses if any job, cost event or price rule exists); also drops `credit_kind`.

## 3. Production status

| Item | Status |
|---|---|
| Production project / default branch | DOCUMENTED: only `bkkmsbxrxkqaveymcrgi`, branch `main` (production) is authorized (AGENTS.md, `PRODUCTION_DEPLOYMENT_RESULTS.md`). |
| Application revision in production | DOCUMENTED (7 Nov 2026): `0013_passwordless_accounts`, 41 public tables, RLS on all, Edge function version 4. **UNVERIFIED today** (no production access from this session). |
| 0014–0018 applied? | DOCUMENTED not applied (candidates). **UNVERIFIED.** |
| `glam-private-media` bucket | DOCUMENTED not provisioned. **UNVERIFIED.** |
| Latest recovery point | DOCUMENTED backup `2189281988` of 7 Nov (taken for the 0010 stage). **Stale**: the existing deploy tooling requires a completed physical backup ≤ 48 h old. A new one is required. |
| Deployed API commit on Railway | **UNVERIFIED** (no Railway access; GitHub Actions billing-locked). |

## 4. Application-contract compatibility (the extra priority)

A migration can succeed and still leave the app unable to use the new objects. The checks below are now automated in `tests/test_application_contracts.py` (PR #86, 14 tests) against a database migrated to head. **VERIFIED-LOCAL: 449 backend tests pass.**

| Contract | Result |
|---|---|
| Every table the FastAPI SQL touches exists after migration | Pass. |
| FastAPI never depends on the Stripe sandbox (0009) tables | Pass. The `payments/` package is an isolated sandbox app and is excluded; no `stripe_test_*` reference exists in the production API. |
| Every endpoint the Flutter app calls (21 method+path pairs) exists in the API's OpenAPI (76 operations) | Pass, none unmatched. |
| New private tables: RLS on, no `anon`/`authenticated` privileges | Pass for all 8 (`private_media, analysis_job, analysis_correction, style_passport_analysis, tryon_job, tryon_result, generation_cost_event, generation_price_rule`). |
| The API's `INSERT INTO credit_account(user_id)` still works with the new column | Pass; the default fills `credit_kind`. |
| Credit reserve/capture/release | Unchanged logic; try-on jobs reserve through the same `credits.reserve/finish`; 35 try-on tests incl. refunds and credit capture/release pass. |
| Exact release SQL = Alembic head | **Pass.** Database built to 0013, then the five artifacts applied in order with `psql -v ON_ERROR_STOP=1`; final `alembic_version` = `0018_tryon`; 9-way catalog fingerprint (`schema_fingerprint.sql`: tables, columns, constraints, indexes, policies, RLS flags, functions, triggers, grants) **identical** to the database built by Alembic. |
| Runtime DB role | **UNVERIFIED in production.** Every new API module checks at request time that its role can SELECT/INSERT/UPDATE the new tables and that RLS does not apply to it (`row_security_active` false), failing closed with `*_runtime_permissions_required`. The production runtime DSN/role (owner or BYPASSRLS) must be confirmed (P9). |
| Edge function `glam-api` | Calls `public.glam_api_v1`; signature and grants preserved by 0014's wrapper. Local hosted-API tests pass. Not exercised against the deployed Edge function. |

### Contract findings (action needed)
1. **Readiness gate vs. order of deployment.** `/health/ready` requires `alembic_version` to contain one of `0014…0018`. Production is documented at 0013, so **an API image built from this repo reports not-ready (503) until 0014 is applied.** Deploy order is therefore database first. (Found; no change needed, but it constrains sequencing.)
2. **Try-on readiness gap — fixed in PR #86.** There was no readiness check for 0018 (the first try-on request would return 503 instead). `/health/ready` now returns 503 when `GLAM_TRYON_ENABLED=true` and 0018 is not applied.
3. **No deployed worker.** `deploy/railway/` defines only `api` and `web`. The background processes — `python -m glam_api.worker` (analysis/try-on dispatch, consent-withdrawal erasure) and `python -m glam_api.media_cleanup` (confirmed private-object deletion) — have **no deployment definition**. With private media or analysis enabled and no worker, withdrawn consent would never erase stored photos and jobs would never run. **A worker service must exist before `GLAM_PRIVATE_MEDIA_ENABLED=true`.**
4. **No production-grade executor for incremental releases.** `scripts/deploy_application_foundation.py` is hard-wired to the 0010 first-foundation release (requires an empty database). 0011–0013 were applied by another documented procedure. For 0014–0018 the executor, who runs it, and with what credential must be decided (D2).
5. **Wrong-start guard is weak.** Each artifact ends with `UPDATE alembic_version … WHERE version_num = '<previous>'`. If the starting revision is wrong, this updates 0 rows silently (**VERIFIED-LOCAL**); the DDL usually fails first, but that is not guaranteed. Run pre-flight P1 before every artifact.
6. **0014 has no consumer** (see §2).

## 5. Risks

**Data loss:** none of the five revisions deletes, rewrites or updates existing application data. Writes to existing objects: `UPDATE alembic_version` (each), `ALTER TABLE credit_account` (new column), rename/move of one function (0014). New tables start empty. A failed artifact rolls back completely (**VERIFIED-LOCAL**: re-running 0018 on a database already at 0018 failed on the first statement and changed nothing). Whether the Supabase Management API / SQL editor honors the explicit `BEGIN … COMMIT` as one atomic unit is **UNVERIFIED** (rehearse in staging, §8).

**Lock duration:**
| Statement | Lock | Expected duration |
|---|---|---|
| New tables/indexes/functions/policies | none on existing tables except brief catalog locks | milliseconds |
| FKs to `profiles, organizations, products, app_user, policy_document, consent_event, style_passports, credit_reservation` | `SHARE ROW EXCLUSIVE` on the referenced table | milliseconds; bounded by `lock_timeout=5s` |
| `ALTER TABLE credit_account ADD COLUMN … DEFAULT … CHECK` | `ACCESS EXCLUSIVE` on `credit_account` | **59 ms measured on a 1,000,000-row proxy table** (constant default: no table rewrite); production row count UNVERIFIED (P6). Every authenticated API request upserts `credit_account`, so it blocks briefly. Run in a low-traffic window. |
| 0014 function rename/move/replace | catalog only | milliseconds |

If a lock cannot be taken in 5 s the transaction aborts and nothing changes; retry after checking for long transactions (P5).

**Backward compatibility:** all changes are additive; `credit_account` gains a defaulted column; `public.glam_api_v1` keeps its signature. An older API image keeps working against the new schema. The reverse is not true: **the new API image needs ≥ 0014 for readiness** (finding 1).

## 6. Pre-flight checks and backup (all read-only; run on production before anything else)

* **Backup:** a completed physical backup ≤ 48 h old, confirmed through the provider, recorded with id/time; a restore rehearsal has never been performed — decide whether to require one (D4).
* **P1** revision: `SELECT version_num FROM public.alembic_version;` → exactly one row, equal to the artifact's previous revision (0013 before 0014, and so on).
* **P2** identity: project ref `bkkmsbxrxkqaveymcrgi`, branch `main` default; database host matches.
* **P3** no name collisions (all must be `NULL`/0): `SELECT to_regclass('public.creator_profiles'), to_regclass('public.private_media'), to_regclass('public.analysis_job'), to_regclass('public.tryon_job'), to_regnamespace('creator_private');` and `SELECT count(*) FROM storage.buckets WHERE id='glam-private-media';`
* **P4** prerequisites for 0014 exist: `SELECT to_regclass(x) FROM unnest(ARRAY['public.profiles','public.organizations','public.organization_members','public.products','public.workspace_capability','public.workspace_role','public.account_eligibility','public.audit_event','public.style_passports','public.credit_reservation','public.policy_document','public.consent_event','public.app_user']) x;` and `SELECT to_regprocedure('public.glam_api_v1(text,text,jsonb,text)'), to_regprocedure('public.glam_api_gate()'), to_regprocedure('glam_private.bootstrap_identity()'), to_regprocedure('glam_private.active_profile_id()'), to_regprocedure('glam_private.current_app_user_id()');` — none may be NULL.
* **P5** no long-running transactions: `SELECT pid, now()-xact_start AS age, left(query,80) FROM pg_stat_activity WHERE xact_start IS NOT NULL AND now()-xact_start > interval '30 seconds';` → empty.
* **P6** size: `SELECT count(*) FROM public.credit_account;`
* **P7** drift: run `schema_fingerprint.sql` on production and on a local replica built to 0013; digests for all 9 kinds must match (known acceptable differences, such as Supabase's own `rls_auto_enable`, must be listed and approved).
* **P8** Storage permission for 0015: `SELECT current_user, has_schema_privilege('storage','USAGE'), has_table_privilege('storage.buckets','INSERT'), pg_has_role(current_user,(SELECT relowner FROM pg_class WHERE oid='storage.objects'::regclass),'USAGE');` — the last must be true or the policy creation will fail.
* **P9** runtime role: identify the DB role the API/worker will connect with; confirm `SELECT rolbypassrls FROM pg_roles WHERE rolname=…` or that it owns the tables; record that it is not `anon`/`authenticated`.
* **P8b** BYPASSRLS creation right: `SELECT rolcreaterole, rolbypassrls, rolsuper FROM pg_roles WHERE rolname=current_user;` (needed before the D8 role can be created; UNVERIFIED).
* **P10** record current counts for a later regression comparison (`profiles, app_user, credit_account, credit_reservation, credit_posting, private_media(if any)`).

## 7. Backup requirements
Fresh physical backup completed ≤ 48 h before the window and re-confirmed immediately before step 1; backup id recorded in the execution log; logical `pg_dump --schema-only` of `public`, `glam_private` and the `storage.objects` policy list stored with the log; owner named as the person who can authorize a restore.

## 8. Staging procedure
**There is no staging environment**: preview branches are disabled and AGENTS.md forbids creating another project or recreating a development branch. The only available rehearsal is local:
1. Build a local database to 0013 with the repository fixtures (`tests/fixtures/supabase_*.sql`) and Alembic (`uv run python <build script>`; see §14).
2. Apply `0014`…`0018` artifacts in order with `psql -v ON_ERROR_STOP=1 -q -d <db> -f <artifact>`; between artifacts run P1.
3. Run `schema_fingerprint.sql` on the result and on an Alembic-built head; require identical digests (**done, §4**).
4. Run `uv run pytest` against a database at head (449 pass) and the Flutter suite.
5. Rehearse failure: re-run an artifact (must fail atomically) and a lock-timeout case.
**Limitation:** this does not exercise Supabase-owned roles/permissions, the Management API's transaction semantics, or the Storage service. Decision D5: accept this, or authorize a separate staging project (currently prohibited).

## 9. Production execution order (only after owner GO)
1. Freeze other schema work; announce a low-traffic window.
2. Fresh backup → record id (§7). Run P1–P10; stop on any unexpected result.
3. For each artifact in order 0014, 0015, 0016, 0017, 0018:
   a. P1 (version equals previous); b. execute the artifact **once**, as one request, with no automatic retry (after an unknown result, verify state with V1 before any new attempt); c. run its verification queries (§10); d. record output in the execution log.
   Pausing after 0014 and after 0015 is recommended: 0014 changes the public RPC (verify the Edge function), 0015 touches Storage.
4. Deploy the **worker** service (finding 3), then the API image with every feature flag at its default (off).
5. Verify `/health/ready` is 200 and served commit equals the intended SHA.
6. Only then, separately approved, enable features one at a time (§12).

## 10. Post-migration verification queries (run after each artifact; expected values shown)
* **V1** `SELECT version_num FROM public.alembic_version;` → the artifact's new revision, single row.
* **V2 (any)** all FKs validated: `SELECT count(*) FROM pg_constraint WHERE contype='f' AND connamespace='public'::regnamespace AND NOT convalidated;` → 0.
* **V3 (0014)** `SELECT to_regprocedure('public.glam_api_v1(text,text,jsonb,text)'), to_regprocedure('glam_private.glam_account_api_v1(text,text,jsonb,text)');` both non-null; `SELECT has_function_privilege('anon','public.glam_api_v1(text,text,jsonb,text)','EXECUTE'), has_function_privilege('authenticated','public.glam_api_v1(text,text,jsonb,text)','EXECUTE');` → false, true; `SELECT count(*) FROM pg_policies WHERE tablename LIKE 'creator\_%' OR tablename IN ('connected_social_accounts','social_media_items');` → 14; RLS on all creator tables; `SELECT has_schema_privilege('authenticated','creator_private','USAGE');` → false. Then a **read-only** call of an existing non-creator RPC path through the Edge function to prove delegation works.
* **V4 (0015)** `SELECT id, public, file_size_limit, allowed_mime_types FROM storage.buckets WHERE id='glam-private-media';` → one row, `public=false`, 10485760, `{image/png}`; `SELECT polname, polpermissive FROM pg_policy WHERE polname='glam_private_media_server_only';` → one row, `polpermissive=false`; `SELECT count(*) FROM public.private_media;` → 0; an unauthenticated and an `authenticated` Storage read of an object in that bucket must be denied (use a synthetic test object removed afterwards, only with approval).
* **V5 (0016–0018)** for each new table: `SELECT c.relname, c.relrowsecurity, has_table_privilege('anon',c.oid,'SELECT'), has_table_privilege('authenticated',c.oid,'SELECT') FROM pg_class c WHERE c.relname IN ('analysis_job','analysis_correction','style_passport_analysis','tryon_job','tryon_result','generation_cost_event','generation_price_rule');` → `t,f,f` for all; all new tables empty; `SELECT count(*) FROM generation_price_rule;` → **0** (no price exists).
* **V6 (0018)** `SELECT DISTINCT credit_kind FROM public.credit_account;` → only `glam_ai_credit`; `SELECT count(*) FROM public.credit_account;` equals the P6 count.
* **V7 regression** counts from P10 unchanged; one real sign-in/profile read through the existing path succeeds; no new rows in `audit_event` other than expected.
* **V8** run `schema_fingerprint.sql` and compare with the local replica.

## 11. Rollback and forward recovery
| Revision | Automatic rollback in repo | What actually works |
|---|---|---|
| 0014 | **None** (raises). Not invented here. | If the artifact failed: nothing changed (single transaction). If it committed and a problem appears: **forward-fix migration** (a reviewed SQL that renames `glam_account_api_v1` back, restores the original function body, and drops creator objects once empty) or **restore from the pre-migration backup** (which discards any production writes made after the backup). Neither script exists yet. |
| 0015 | Guarded empty-only downgrade; refuses if any media/bucket object exists. | While empty: remove the bucket through the Storage API, then downgrade. After photos exist: **never** auto-drop; stored private images are valuable user data — erasure goes through the consent/deletion worker, schema change through a forward migration. |
| 0016–0018 | Empty-only downgrades (refuse when any row exists). Reverse order **0018 → 0017 → 0016** (0016's downgrade drops an index 0018 depends on; tested). | Once rows exist: forward migration or backup restore; do not drop populated tables. |
**Irreversible/hard to reverse:** 0014's function move/replacement (no scripted undo); any production data written after the migrations (jobs, photos, credit ledger entries) cannot be rolled back by schema downgrade. **Restore from backup is the only full recovery** and loses writes after the backup point.

## 12. Application deployment dependencies and feature flags
Sequence: **database (artifact by artifact) → worker service → API image → web/mobile builds → enable flags one by one.**
All flags must be unset/`false` at first deploy:
* Private media: `GLAM_PRIVATE_MEDIA_ENABLED`, `GLAM_PRIVATE_MEDIA_RETENTION_SECONDS`; storage credential variables (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — secret-store only, never in git).
* Analysis (needs 0016–0017 and a provider approval): `GLAM_ANALYSIS_ENABLED`, `GLAM_ANALYSIS_PROVIDER_DATA_APPROVED`, `GLAM_ANALYSIS_RETENTION_SECONDS`, `GLAM_ANALYSIS_MAX_REQUESTS_PER_HOUR`, `GLAM_OPENAI_API_KEY`, `GLAM_OPENAI_MODEL`.
* **Try-on — keep off:** `GLAM_TRYON_ENABLED` unset; `GLAM_TRYON_PROVIDER` unset (real providers fail closed); `GLAM_TRYON_ALLOW_TEST_PROVIDER` unset; set `GLAM_DEPLOYMENT_ENV=production` (the deterministic test provider then refuses to construct). Paid generation additionally requires an approved `generation_price_rule` row, provider authorization, legal sign-off and the bake-off (see `docs/tryon/`).
* Required background services (finding 3): worker and media cleanup.
* Mobile/web builds: Flutter calls only endpoints that exist (§4). Mobile release builds contain no fixture or simulated try-on path (tests).

## 13. GO / NO-GO checklist (every box requires the owner)
| # | Item | State |
|---|---|---|
| 1 | Owner approves the exact SQL: the five artifacts and checksums in §1 | **NOT GIVEN** |
| 2 | Fresh physical backup ≤ 48 h, id recorded | NOT DONE |
| 3 | Pre-flight P1–P10 output reviewed (production state is UNVERIFIED today) | NOT RUN |
| 4 | Production fingerprint matches local 0013 replica (P7) | NOT RUN |
| 5 | Execution method decided (D2) and credentials available through a secure channel | OPEN |
| 6 | Maintenance/low-traffic window agreed | OPEN |
| 7 | Worker services deployed before media/analysis flags (finding 3) | Definitions committed (D6); services NOT created or deployed |
| 8 | PR #86 merged (readiness gate + contract tests) | Merged (`b998e05`) |
| 9 | CI green on the deployment commit (currently billing-locked) | BLOCKED |
| 10 | 0014 forward-fix script written and tested; owner review of its exact SQL | Written and tested; review NOT GIVEN |
| 13 | D8: production runtime role created and granted (BYPASSRLS question settled), proposal reviewed | OPEN, blocks API features |
| 11 | All feature flags confirmed off, `GLAM_DEPLOYMENT_ENV=production` set | NOT DONE |
| 12 | Post-migration verification owner named, execution log template ready | OPEN |

### Decisions the owner must make
* **D8 — Production runtime role (new, open):** see §13a. D1-D7 were accepted by the owner as recommended.
* **D1 — Go ahead at all, and in what order?** Recommended: apply 0014→0018 in order (the Alembic chain is linear), pausing after 0014 and 0015.
* **D2 — Who executes, and how?** The existing script is 0010-only. Options: (a) generalize the deploy script for incremental releases with the same safeguards (project check, backup ≤ 48 h, checksum, single attempt), then run it; (b) run the artifacts manually through the Supabase SQL editor under two-person review. Recommended: (a).
* **D3 — Apply 0014 now or defer?** It has no consumer and is the only revision that replaces a public RPC. Deferral is not possible without altering the linear chain (0015+ are stamped after it) — the real choice is accept the risk, or require the 0014 forward-fix script first. Recommended: require the forward-fix script (item 10) before applying.
* **D4 — Require a backup restore rehearsal?** None has ever been performed.
* **D5 — Staging:** accept local replay as the only rehearsal, or authorize a separate staging project (currently prohibited by repository rules).
* **D6 — Worker service:** approve defining and deploying `worker` and `media_cleanup` on Railway before any flag is enabled.
* **D7 — Which features may be enabled after the schema is in place** (private media, analysis, try-on). Try-on remains off regardless: no provider, price, legal approval or bake-off exists.

## 13a. Owner decisions D1-D7 accepted as recommended — what now exists (added after PR #87)
The owner accepted D1-D7 as recommended. **That is not approval to run anything on production**: checklist item 1 (approval of the exact SQL and checksums), the backup, pre-flight output and credentials remain open. Supporting work done offline:
| Decision | Result in the repo | Evidence |
|---|---|---|
| D2 executor | `scripts/deploy_incremental_release.py`: dry run by default; apply needs `--production-approved`, `--approved-sha256` equal to the artifact checksum, untouched manifest and canonical sources, backup under 48 h, exact starting revision; one attempt, never retried; verifies the new revision and FK validity. | `tests/test_deploy_incremental_release.py` (10 tests, in-memory Management API double; the five candidate artifacts pass structural validation). **Never run against production.** |
| D3 forward-fix for 0014 | `db/migrations/recovery/0014_creator_studio_rollback.sql`: valid only while the head is exactly 0014 and every creator table is empty; restores the original `public.glam_api_v1` (same signature and grants) and drops the creator objects. | `tests/test_recovery_0014.py`: after the script a database at 0014 has a catalog fingerprint **identical to 0013**; it refuses a wrong head and existing creator data and changes nothing. **Needs owner review of this exact SQL.** If 0015+ is applied it refuses (use backup restore). |
| D4 restore rehearsal | Required before GO; none performed. | open |
| D5 staging | Local replay only (done, §4); no staging project. | — |
| D6 worker services | `deploy/railway/worker.railway.json` (privacy worker: consent erasure, analysis and try-on jobs), `media-cleanup.railway.json`, shared `worker.Dockerfile`, `scripts/start-worker.py` (same production guards as the API; no HTTP port, no healthcheck). **Definitions only: no Railway service was created.** | `tests/test_start_worker.py`, `npm run check:railway` (10 tests). |
| D7 features | Try-on stays off. Private media and analysis only after schema, worker and runtime role are in place, enabled one flag at a time. | — |

### New finding 7 and decision D8 — the production API runtime role does not exist in the repo
`scripts/start-api.py` refuses to start in production under `postgres`, `supabase_admin` or `service_role` and demands a restricted role, but **no migration or document creates that role or grants it anything**. Findings from `scripts/db/runtime_privileges.py` and a full local run:
* The role needs table grants on **every** table the API/worker touches (generated, 48 lines: `runtime_role_proposal.sql`), plus `USAGE` on schema `auth` and `SELECT` on `auth.sessions` (session-revocation checks) and `USAGE` on schema `storage` (catalog lookups). The new tables are not granted to any role by migrations 0014-0018, so without these grants the API fails closed (`*_runtime_permissions_required`) on media, analysis and try-on.
* The role must also **bypass row-level security (BYPASSRLS) or own the tables**: every table has RLS enabled with policies only for `authenticated`. **VERIFIED-LOCAL:** running all 449 API tests as a role with exactly the generated grants and BYPASSRLS passes; the same role without BYPASSRLS fails immediately on the first insert (`new row violates row-level security policy for table "app_user"`).
* Whether the Supabase `postgres` user may create a BYPASSRLS role in production is **UNVERIFIED** (pre-flight P8b).
* **D8 (owner):** approve creating the restricted role (name, BYPASSRLS or an alternative design such as explicit policies for that role, credential storage) and the grant list in `runtime_role_proposal.sql`; or choose another runtime-identity design. **This blocks every API feature that reads the database in production, not only the new ones, until the role is confirmed.** (Whether the already-deployed API uses such a role is UNVERIFIED.)

## 14. Reproduce this evidence
```
# checksums
sha256sum db/migrations/versions/00{14,15,16,17,18}_*.{py,sql} db/migrations/releases/00{14,15}_application.sql docs/database/migration-approval-pack/exact-sql/*.sql
# artifacts (empty local DB named glam_foundation_export_<x>_test, one per revision)
GLAM_MIGRATION_BUILD_DATABASE_URL=postgresql+psycopg://…/glam_foundation_export_0018_test \
  uv run python scripts/export_application_migration.py --start 0017_analysis_passport --revision 0018_tryon --output <path>
# replay: build local DB to 0013 (tests/fixtures + alembic upgrade 0013_passwordless_accounts), then
psql -v ON_ERROR_STOP=1 -q -d <db> -f <artifact>      # each artifact in order
psql -tA -F'|' -d <db> -f docs/database/migration-approval-pack/schema_fingerprint.sql   # compare with an Alembic-built head
uv run pytest tests/test_application_contracts.py     # contract checks (PR #86)
```
Local fingerprint of both databases (identical): `column 486 · constraint 400 · function 21 · grant 32 · index 142 · policy 36 · rls 64 · table 64 · trigger 34`.

This pack authorizes nothing. No migration, deployment, credential use, provider call or data change has been or will be performed on the basis of it without the owner's explicit approval.
