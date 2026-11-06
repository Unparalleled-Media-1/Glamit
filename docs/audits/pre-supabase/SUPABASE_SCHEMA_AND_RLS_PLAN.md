# Proposed Supabase schema, RLS and storage plan

**PROPOSAL ONLY — NOT APPROVED. Supabase remains disconnected.** No migration was added/applied and no direct client database policy was enabled. The pasted URL is not a secret configuration or approval. Require a fresh isolated development project and rotated credentials through secret settings after G0 approval; never production credentials.

## Current state and migration blocker

Review `db/migrations/versions/0001*` through0008 plus `tests/test_migrations.py`, `tests/test_rls.py`, `workspaces.py` and `catalog.py`. Existing foundations cover identity/organizations/memberships/invitations, look/credit records and catalog revisions/publication/verification/matching controls. Existing foundation client-role policies deny direct access; application APIs enforce principal/org scope.0009 is a sandbox ledger accepting only_test databases and must be isolated through a separately reviewed design before standard Supabase `postgres` migration. Do not remove its guard or rewrite applied history. Audit database role privileges and existing migration names against the real files before rollout.

## Proposed entities and ownership

| Domain             | Proposed entities                                                                    | Ownership / consistency                                                                                                       |
| ------------------ | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| Identity           | profiles, organizations, memberships, invitations                                    | Auth user ID mapping; unique org/user membership; role changes only authorized staff/owner transaction                        |
| Consent / media    | consent_versions, consent_receipts, media_assets, deletion_jobs                      | Owner user; private object reference, purpose, expiry and vendor job links; no raw photo in public tables                     |
| Personalization    | analysis_jobs, reports, finding_revisions, preferences, routines                     | Owner user; append report revisions; consent version; provenance, uncertainty and explicit corrections                        |
| Styling            | looks, look_components, wardrobe_items, conversations, messages                      | Owner user or explicitly shared org; independent component update/version; consented chat retention                           |
| Catalog            | merchants, listings, variants, stock_movements, verification_events, prices          | Org ownership; reviewer-only verification; published and region/stock/freshness eligibility before discovery                  |
| Commerce           | carts, cart_lines, orders, order_lines, stock_reservations, fulfillments, returns    | Buyer owner + narrowly projected merchant lines; immutable price/variant/tax/shipping snapshot; reservation/order transaction |
| Finance            | payment_operations, webhook_events, journals, postings, transfers, refunds, disputes | Service-only, append-only balanced journal, unique business/event/idempotency key; no client write                            |
| Professionals      | services, availability, holds, appointments, calendar_links                          | Org-owned; atomic slot exclusion/uniqueness; buyer sees own booking only; provider sync server-only                           |
| Tailoring          | quote_requests, quotes, fittings, milestones                                         | Buyer and explicitly assigned professional org; versioned accepted scope/prices                                               |
| Discovery / ads    | locations, delivery_zones, campaigns, placements, impressions                        | Merchant/advertiser org; approved public subset; organic score independent of paid eligibility                                |
| Partners / support | creator_looks, attribution_events, settlements, cases, moderation_events             | Explicit org access; finance-approved settlement journal; scoped staff case access                                            |

Reuse/audit existing entities before adding any table; proposed names are logical and are not claimed to be implemented. No new commission rates are proposed. Checkout must re-fetch authoritative eligible offers and reserve stock; browser totals are informational.

## Proposed access matrix

| Actor               | Personal data                                | Catalog                                      | Orders/bookings                                   | Financial ledger                         |
| ------------------- | -------------------------------------------- | -------------------------------------------- | ------------------------------------------------- | ---------------------------------------- |
| Anonymous           | None                                         | Server-projected approved public fields only | None                                              | None                                     |
| Authenticated buyer | Own consented records via API                | Approved public projection                   | Own; server commands, no arbitrary status changes | No direct access; own projected receipts |
| Org member          | No unrelated personal records                | Own org draft fields by role                 | Own org lines/assigned bookings only              | No direct access                         |
| Org admin/owner     | Membership management with escalation checks | Own org publish request, cannot self-verify  | Scoped org fulfillment commands                   | Server-projected reports only            |
| Reviewer/support    | Explicit scoped claims and audit record      | Review capability only                       | Assigned/redacted case projection                 | Separate finance role required           |
| Server service role | Required purpose-limited operations          | Authoritative verification/jobs              | Atomic commands                                   | Append commands with invariant checks    |

Start with deny-by-default client roles on all new tables; continue current server-enforced API boundary. If direct authenticated access is later proposed, require separate reviewed policies using `auth.uid()` and server-managed membership claims, `USING` plus `WITH CHECK`, forced RLS/least-privileged DB roles where appropriate and tenant-safe security-definer functions with fixed search_path. Never let browser org IDs or user-editable metadata grant roles. Service-role keys stay server-only. Index policy predicates; avoid recursive membership policies and overbroad staff access.

## Storage and retention

Private owner-scoped buckets for original photos, generated renders and invitations; separate sanitized public catalog bucket. Validate bytes/MIME/size, malware scanning, EXIF removal and explicit consent before provider dispatch. Issue short-lived server-authorized signed URLs (proposed<=5 minutes; review provider requirements), not permanent image links. RLS on storage.objects must bind bucket and owner/org path; changing a filename cannot cross owners. Invitations may contain personal details and require separate purpose/expiry. Define approved original/render/report/vendor/backup retention schedules before launch. Deletion jobs revoke links, delete objects and provider artifacts, invalidate caches and tombstone records; backups expire under an approved policy. Do not promise immediate erasure from immutable backups.

## Indexes, migrations and operations

Unique(org_id,user_id), unique(provider,event_id), unique(owner_id,idempotency_key), unique(journal,business_key), unique(listing,variant,revision); composite(org_id,status,updated_at), (owner_id,created_at), offer region/stock/freshness indexes and geospatial index where approved. Use integer minor-unit money plus currency; snapshot prices and tax basis. Appointment overlap exclusion and transactional stock reservations need concurrency tests.

Future migrations must be additive/versioned with reviewed grants/RLS, lock-duration estimates, foreign-key validation, staging data-volume test, backup and restore rehearsal. Use expand/contract deployment; rollback application safely and prefer compensating migration over destructive down migration. Never delete immutable financial history as rollback. Separate sandbox-only schema/runtime from production migration head through approval. Record migration checksum, app SHA, role grants and RLS coverage. Test empty-state bootstrap, repeated deploy, cross-tenant reads/writes/joins/storage paths, stale memberships, privilege revocation and service-role boundaries.

## Approval prerequisites

Architecture/security/finance approval of schema and ownership matrix; credential rotation proof; main baseline/CI; isolated sandbox migration design; complete tenant/storage negative tests; backup restore and deletion rehearsal; explicit approval to connect **development** Supabase. No approval has been recorded by this audit.
