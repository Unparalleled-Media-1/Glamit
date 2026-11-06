# Database regression results

The existing completed Supabase API phase ran 174 backend/core tests successfully and a production web build. The new inventory helper adds 6 transport-double cases: read-only GET/HEAD boundaries, no RPC/row fetch, existing-row warning, empty-schema uncertainty, safe failures and wrong-project refusal. These tests cannot certify hosted RLS or SQL privileges.

Current full regression logs are added under evidence after completion: core checks (Ruff/format, all backend tests, OpenAPI/runtime and client typechecks), 13 product tests, 13 browser groups, explicit-double browser contracts and20 approved visual comparisons. No current frontend/style/auth/financial application source was modified by this Phase 0 audit.

| Requested gate                                      | Scope / result                                                                |
| --------------------------------------------------- | ----------------------------------------------------------------------------- |
| Clean migration replay/integrity/constraints        | Existing local disposable PostgreSQL regressions; not a new remote batch      |
| RLS/org isolation                                   | Existing source/local tests; remote policy catalogs/tenant tokens unavailable |
| Checkout/commission/webhook/refund/multi-merchant   | Current isolated local suite; not live Stripe                                 |
| Booking conflicts/location/currency proposed schema | NOT RUN: future tables/commands not implemented                               |
| Remote migration replay/drift                       | BLOCKED: SQL catalog/migration credentials unavailable                        |
| Storage authorization                               | BLOCKED: no reviewed bucket/policy deployment or user test matrix             |
| Real application reads/writes                       | BLOCKED: application DB integration not activated                             |
| Existing UI/visuals                                 | Browser regressions below; no native-device claim                             |

No test was removed, disabled or substituted with a trivial assertion. No remote rows were inserted for testing. Current sanitized evidence includes actual metadata GET status codes and local suite logs; passing an administrative metadata read is not an authorization-policy PASS.

## Current run environment issue

The first full-suite rerun encountered local PostgreSQL connection refused after the environment settings update: 70 non-database tests passed and110 database setup errors occurred. This is not180 passing tests. The local service is being restored and the required suite must be rerun before reporting success. Browser/product/contracts/approved-visual runs passed separately.

## Verified rerun after restoring the local service

The existing local Docker PostgreSQL container was stopped after environment restoration. It was restarted with its original volume and settings. No database was dropped and no remote connection was made. The required full suite was rerun: **180 passed**, one existing deprecation warning; Ruff/format, OpenAPI/runtime and both client typechecks pass. The initial 70 passed/110 setup errors are retained as resolved environment history, not described as a product PASS. [Current full log](evidence/core-tests.txt).

Shared product tests: 13 passed; browser application: 13 groups passed; explicit-double connected contract journey passed; 20 approved visual comparisons show zero changed pixels. Logs: [product](evidence/client-tests.txt), [browser](evidence/browser-tests.txt), [contracts](evidence/browser-contract-tests.txt), [visuals](evidence/visual-tests.txt), [six metadata-boundary tests](evidence/metadata-helper-tests.txt). Hosted RLS, storage, migration and application read/write acceptance remains BLOCKED.
