# Supabase schema/security audit

Observed 2026-11-08T15:00:58.123916+00:00. Source base `d38cf1667a50d5ae240dc75da6c683a770363fd9` plus the uncommitted/committed audit patch. Exact tested file hashes are in evidence/final/source-hashes.json. This is a failed acceptance audit, not a certificate of completion.

Fresh production system-catalog evidence: 41 public tables, 77 indexes, 54 foreign keys (zero unvalidated), 21 policies, zero tables without RLS. Alembic revision `0013_passwordless_accounts`. Storage: zero buckets. This verifies metadata, not complete effective tenant-role access, retention or private-upload acceptance. Full named tables/indexes/FKs/policies: [production-catalog.json](evidence/final/production-catalog.json). Local regression applied existing heads only in the disposable `_test` database. Production migration0014 was not applied. A completed physical backup exists; no restore rehearsal was performed.
