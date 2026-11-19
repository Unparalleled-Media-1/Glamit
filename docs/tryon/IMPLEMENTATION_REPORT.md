# Virtual try-on — isolated implementation report

Code commit: `b7b1c430d2e3232bb7f5a0da16cb5b64c24706fa` on `feat/tryon-pipeline` (stacked on PR #78 and PR #79; this PR is separate and draft).
Scope: isolated development only. Nothing applied to production, no real provider called, no money spent, no real photographs used.

## Completed (verified by executed tests)
- **Migration `0018_tryon`** (candidate, down_revision 0017, empty-only rollback): `tryon_job`, `tryon_result`, `generation_price_rule`, `generation_cost_event`, `generation_cost_summary` view, `credit_account.credit_kind` CHECK. Applied only to a throwaway PostgreSQL 16 test DB. No price is seeded.
- **API** `/v1/tryon/{policy,quote,jobs,jobs/{id},jobs/{id}/result}` (+DELETE): explicit consent (`ai_look_generation`), owner-only private source photo, garment references, idempotency keys, hourly limit, durable states, default-off flags.
- **Worker** `process_one`: attempt committed before provider call; ambiguous/interrupted attempts never re-dispatched; polling retried, submit never retried; provider timeout; result decode/re-encode, ≤10 MB, stored privately under `owner/result.png` with a pending marker written before the object; credits captured in the same transaction that marks the result stored; released on failure, cancel, ambiguity, expiry.
- **Retrieval**: authenticated owner-only `GET .../result`, retention-bounded, `no-store`, `X-GLAM-Label`, `?export=true` stamps "AI-generated preview" band; test outputs carry `X-GLAM-Synthetic-Test` and a visible "TEST OUTPUT" label.
- **Privacy**: consent withdrawal / photo withdrawal / owner deletion expire jobs, release holds and purge objects (with backoff); extended outbox worker.
- **Credits**: reuse `credits.reserve/finish`; GLAM AI credits only; boundary test finds no LifeSwap/Stay Credit identifier in API, migrations or Flutter code.
- **Test-only provider** `DeterministicTestProvider` (modes: success, fail, reject, ambiguous, never_ready, not_image, oversize); refuses construction when `GLAM_DEPLOYMENT_ENV=production` and needs `GLAM_TRYON_ALLOW_TEST_PROVIDER=true`. Real providers fail closed (`tryon_provider_not_qualified`).
- **Flutter**: `lib/tryon/*` + `TryOnSection` in the event Ideas and themed-event detail screens: availability check (otherwise the honest "Not available yet" card), consent, own-photo choice, submit, status polling, cancel, labelled result, delete. No avatar or stand-in; the test double lives under `test/`.

## Test results
- Backend: `uv run pytest` — 433 passed, 2 failed. The 2 failures are `tests/test_native_analysis_workflow.py` (node cannot find `react`; npm dependencies are not installed here; unrelated to try-on). `ruff check` clean. 33 new try-on tests; two existing migration rollback tests updated to step through 0018; `tests/conftest.py` truncates `generation_price_rule`.
- Flutter 3.47.9: `flutter test` — all 109 passed (12 new). `flutter analyze` — no errors (pre-existing info lints).
- Acceptance matrix (`ACCEPTANCE_MATRIX.csv`): 2 PASSED, 6 PASSED (double), 10 PARTIAL, 3 BLOCKED, 1 NOT IMPLEMENTED, 14 NOT RUN. Nothing is marked passed unless executed.

## Blocked / not done
- No native Android/iOS run: GitHub Actions is billing-locked (PRs #77–#79); no installed-device evidence.
- No real provider: credentials, spend authorisation (US$150 ceiling), authorised photographs, commercial terms and privacy approvals are absent. FASHN/Replicate adapters cannot fetch results and storage has no signed-URL method, so they are not wired.
- Not built: fallback provider (T-09), multiple-person/scope-mismatch rejection and per-photo attestation (T-12/T-30), explicit save/share action (T-29), bake-off harness (T-33/34), policy-version re-consent test (T-03).
- Candidate migrations 0014–0018 remain unapplied to production.

## Remaining risks
- Provider cost is recorded only as reported by the provider; invoice reconciliation is unproven.
- Result access is a server-mediated authenticated endpoint, not a storage signed URL.
- Concurrency tests use threads against one PostgreSQL instance, not multi-process production load.
- Price rules must be approved by the owner before any credit price exists; production price table is empty by design.
