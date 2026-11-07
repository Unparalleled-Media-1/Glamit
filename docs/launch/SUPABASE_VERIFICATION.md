# Supabase verification

7 November 2026, Africa/Johannesburg. Evidence timestamps are UTC. **Public launch: NO-GO.**

Only `bkkmsbxrxkqaveymcrgi`, production main, was inspected. Project ACTIVE_HEALTHY, exact database host verified; no preview branch was recreated. Migration head `0013_passwordless_accounts`: 41 public tables, all RLS enabled, 77 indexes, 54 validated foreign keys, zero unvalidated foreign keys, 21 policies. No DDL or migration was applied in this audit.

| Real evidence | Result |
|---|---|
| Account/routine/tenant checks | 29 |
| Session/revocation checks | 20 |
| Storage bucket count | 0 |
| Public storage buckets | 0 |

Zero buckets is not proof that an image-storage workflow is secure; upload/access/retention/deletion remains unverified. A completed physical backup is visible; restore/PITR/rollback rehearsal is not claimed. The profile lookup plan uses the primary-key index. Single metadata round-trip timings are not load/performance certification.

[Remote evidence](evidence/remote-readiness.json), [core](evidence/live-core-regression.json), [sessions](evidence/live-session-regression.json), [cleanup](evidence/controlled-cleanup.json).
