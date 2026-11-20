# Platform admin dashboard (web) — what exists, per module

**Status: read-only operational views for all 15 staff modules. No write operations.** Source-level and local-database evidence only: nothing is deployed, nothing was verified on production or on a device. The dashboard serves web staff; the Flutter app has no admin screens (GL-187 to GL-196 remain labelled sample previews).

## Access model (unchanged, enforced server-side)
`GET /v1/admin/modules/{module}` requires, in order: a valid Supabase session; **fresh MFA (`aal2`, authenticated within 5 minutes)**; an adult-eligible account; an **active, unexpired `staff_grant`** whose role owns the module (`STAFF_MODULES` in `workspaces.py`, shared by the context endpoint and the data endpoints). Every read is written to the append-only `audit_event` log (`admin.read.<module>`). Responses are `Cache-Control: no-store, private`. The browser UI shows only the modules the server lists in `/v1/admin/context`; hiding a sidebar item never grants anything.

## Coverage
| Module (role that owns it) | Shows (real data) | Not connected (stated in the UI, no invented figures) |
|---|---|---|
| Executive Overview (super_admin) | users, 7-day signups, organizations/suspended, 24 h audit volume, undelivered outbox, media / analysis / try-on job states | — |
| User Management (super_admin, support) | eligibility bands, latest 25 users (8-char pseudonymous id prefix, age band, consent counts) | contact details are not held by this schema; no user actions |
| AI Operations (super_admin, ai_operations) | analysis and try-on job states, failure codes, provider cost events (test rows flagged), credit price rules | no provider spend invoice reconciliation |
| Beauty Content (super_admin, content_moderation) | listing states, latest 25 listings (review itself stays at the existing catalog review endpoints) | — |
| Merchant Management (super_admin) | verification status counts, latest 25 merchants with suspension and workspace capability | approval actions |
| Professional Management (super_admin) | same, for professionals | approval actions, bookings |
| Creators & Partners (super_admin, content_moderation) | creator profiles by status, connected accounts, applications (when migration 0014 is applied) | shows "migration not applied" until then |
| Regional Operations (super_admin, regional_operations) | latest market policy per country and capability | — |
| Trust & Safety (super_admin, trust_safety, support, compliance) | 7-day audit actions, latest 25 audit events, consent withdrawals | **content moderation queue: not connected** |
| Privacy (super_admin, support, compliance) | consent events by purpose/action, private media and try-on result lifecycle states, undelivered privacy events | erasure actions |
| Analytics (super_admin, analyst) | 14-day daily counts: new users, analysis jobs, try-on jobs | no product analytics |
| System Configuration (super_admin) | deployment environment, feature flags on/off (booleans only), whether a try-on provider is selected, served commit, applied database revisions | no editing of configuration |
| **Advertising** (super_admin) | — | **No advertiser, campaign or placement service exists.** Placement screens are previews. |
| **Commerce** (super_admin, finance) | — | **No orders, payments or payouts are deployed.** Stripe is an isolated test sandbox; live payments disabled. |
| **Subscriptions** (super_admin, finance) | — | **No subscription or billing tables exist.** |

Private photos, analysis results, generated images, object keys, hashes, emails, tokens and secrets never leave through these endpoints (tested).

## What changed to make it reachable
The web admin gate previously called the Supabase Edge function `glam-api`, whose RPC has no `/v1/admin/context`: the dashboard could never verify staff and stayed restricted for everyone. The web build now calls the FastAPI service directly with the user's Supabase token, using a new build argument **`NEXT_PUBLIC_GLAM_API_ORIGIN`** (plain `https` origin; otherwise the dashboard says it is not configured and stays restricted). The API's `GLAM_ALLOWED_ORIGINS` must include the web origin (CORS already allows the `Authorization` header).

## Deployment prerequisites (not done)
The API must be deployed with migrations applied and the runtime database role (decision D8 in the migration approval pack) in place; set `NEXT_PUBLIC_GLAM_API_ORIGIN` as a web build argument; create the first `staff_grant` rows through an approved, evidence-backed process (there is no self-service path, by design); staff accounts need MFA enrolled.

## Not built (needs product decisions and per-action approval)
Any write: verification/approval decisions, user suspension, moderation actions, refunds, configuration edits. Each needs its own permission, reason/evidence capture, audit and rollback design. Also not built: the Flutter admin companion, advertiser/commerce/subscription backends, content moderation queue.

## Tests
`tests/test_admin_dashboard.py` (12, real PostgreSQL): all 15 modules and response shape; roles reach only their modules (finance, support); no grant, weak or stale MFA refused; unknown module 404; reads audited; no write routes; no secrets or private fields in any response; unbuilt areas say so. `tests/client/admin-dashboard.test.mjs` (3): strict API-origin and response validation, label-to-key mapping. `tests/workspace/access.cjs` (browser, UI doubles): admin modules render server data and no placeholder figures.
