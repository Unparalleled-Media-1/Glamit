# GLAM Beauty dashboard programme — architecture, matrix and phased plan

Evidence base: repository source at `feat/platform-foundations` plus the open Super Admin PR (#89), inspected 20 Nov 2026. **Nothing here is deployed or verified on production.** The per-module detail (design references, screens, tables and RLS, endpoints, missing operations, permissions, audit, integrations, tests) is in [`DASHBOARD_CAPABILITY_MATRIX.csv`](DASHBOARD_CAPABILITY_MATRIX.csv) (31 rows).

## 1. Canonical structure
Eight dashboards, one identity, one backend. **Access is only ever decided on the server** from `staff_grant` (platform staff) and `organization_members` + `workspace_role` (business workspaces). There is no role selector that grants anything; the navigation shows what `/v1/admin/context` or `/v1/me/workspaces` returns.

| # | Dashboard | Audience | Surface (target) | Today |
|---|---|---|---|---|
| 1 | Super Admin & Executive | `super_admin`, `analyst`, `regional_operations` | Web | Read-only views (PR #89) |
| 2 | Trust & Safety, moderation, verification | `content_moderation`, `trust_safety`, `compliance`, `support` | Web | Catalog review API; UI in the Super Admin PR; the rest design-only |
| 3 | AI Operations & GLAM credits | `ai_operations`, `finance` | Web | Read-only job, cost and price views |
| 4 | Merchant / Brand | org `catalog_manager` (+ new order role) | Web + mobile companion | Catalogue API exists; no UI; stock, orders missing |
| 5 | Beauty Professional / Salon | org `booking_manager` | Web + mobile companion | Shell only; services, bookings missing |
| 6 | Advertiser | org `campaign_manager` | Web + mobile companion | Preview screens only; campaign domain missing |
| 7 | Creator / Influencer | creator role | Web + mobile companion | Schema and RPC (migration 0014, unapplied); earnings need a commerce event source |
| 8 | Finance, payments, support | `finance`, `support` | Web | Test sandbox only; refunds, payouts, tickets missing |

## 2. Status summary (from the matrix)
31 modules: **2 implemented** (API-level: catalog review queue and its decision endpoint; audit-log reading), **18 partial** (read-only views, schema without operations, or API without UI), **2 design-only** (user-generated-content moderation, support inbox), **9 missing** (stock/price, orders, sales, availability/bookings, professional earnings, campaigns, ad delivery and billing, creator payouts, refunds/payouts). "Implemented" never means launched or deployed.

## 3. High-risk actions: no implementation without explicit written approval
Payouts, refunds, account suspension, GLAM credit adjustments, role grants/revocations, price-rule approval, policy changes. Each needs: a named permission, a requester/approver split (maker-checker, never the same person), reason and evidence capture, an immutable audit record of both approvers and the before/after state, and tests for role isolation, replay and concurrency. None is in the Super Admin PR.

## 4. Cross-cutting requirements for every dashboard module
Server-side authorization on every operation (never the UI); least privilege per module; fresh MFA for staff; every privileged read or write audited; admin endpoints never return private photos, analysis results, generated images, object keys, hashes, tokens, payment instruments or emails; explicit loading, empty, error and permission-denied states; no invented figures: unbuilt areas say "Not connected"; database-backed tests including unauthorized-role and cross-tenant cases; approved GLAM design tokens and components reused.

## 5. Phased plan (working journeys before shells)
Each phase ships as small PRs, each with its own tests, and is not "done" until its journey passes end-to-end against a real database.

**Phase 0 — Super Admin foundation (this programme's first PRs).** Read-only 15-module dashboard (#89); catalog moderation UI over the existing review API with separation of duties; users and roles visibility; queue and outbox health. *Exit:* a staff member with a real grant reviews a listing end to end; roles isolated.

**Phase 1 — Merchant: list a product and manage stock.** Web catalogue UI on the existing 18 endpoints (create, revise, factual review, publish, withdraw); inventory ledger and price history (new tables, append-only); stock and price endpoints. *Exit:* a merchant lists a product, it passes moderation, stock changes are audited. *Depends on:* the migrations and runtime role being in production.

**Phase 2 — Orders and fulfilment (merchant) — blocked on payments approval.** Order domain (order, lines, shipment, return), state machine with immutable transitions, fulfilment UI. Taking real payments needs the owner's separate payments approval (live Stripe is prohibited today); order records for non-payment test flows can precede it. *Exit:* order → fulfil → return in a test environment.

**Phase 3 — Professional: publish services and manage bookings.** Services (duration, price), availability rules, slot generation, booking request/accept/decline/cancel with a database constraint against double booking. Payments later. *Exit:* a consumer books, the professional accepts; concurrent requests cannot double-book.

**Phase 4 — Advertiser: campaigns.** Campaign, creative, targeting-by-screen, budget and frequency (rules already in `AD_PLACEMENTS.json`; sensitive screens excluded); creative review through Trust & Safety. Delivery and measurement only after privacy review (no private face data in ads or analytics). *Exit:* draft → review → approved campaign; billing and serving are a later, separately approved phase.

**Phase 5 — Creator: attributable earnings.** Requires verified commerce events (Phase 2). Then earnings view from the append-only ledger and server-side fixed commission; payouts stay blocked until finance approval and live-payments approval.

**Phase 6 — Finance and support.** Maker-checker refund and payout requests; support inbox with ticketing and strict data minimization; reconciliation views.

**Phase 7 — Mobile companions.** Flutter companions for merchant, professional, advertiser, creator and admin over the same APIs, only after the web journeys work and native acceptance (installed Android/iOS runs) is possible; the Flutter `GL-131..GL-196` screens remain labelled previews until then.

## 6. Dependencies outside this repository
Production migrations 0014 to 0018 and the runtime database role (decision D8 in the migration approval pack); the web build argument `NEXT_PUBLIC_GLAM_API_ORIGIN`; real `staff_grant` rows created through an approved process; payments, shipping, verification, moderation and analytics providers (none selected); GitHub CI billing.
