# Regression results

7 November 2026, Africa/Johannesburg. Evidence timestamps are UTC. **Public launch: NO-GO.**

PostgreSQL: **233 tests**, 0 failures, 0 errors, 0 skipped. This includes 31 fixture-backed financial tests.

| Check | Status | Scope |
|---|---|---|
| client-contracts | PASSED | Shared product contracts; no live providers |
| web-journeys | PASSED | Existing local browser journeys; disconnected AI remains unavailable |
| golden-patterns | PASSED | Candidate visual invariants; not owner approval |
| connected-contracts | PASSED | Adapter/UI doubles only |
| auth-ui | PASSED | Mocked Auth transport; no SMS/OAuth delivery |
| auth-native-gate | PASSED | Contract/OS storage doubles; no physical device |
| public-key-guard | PASSED | Privileged key rejection |
| client-types | PASSED | Web and Expo TypeScript |
| cpanel-types | PASSED | Static host entry point |
| production-dependency-audit | PASSED | Registry advisory snapshot |
| edge-security | PASSED | Cryptographic/handler regression |
| native-compatibility | PASSED | Installed Expo SDK compatibility map |
| native-exports | PASSED | iOS/Android Metro exports; not installed binaries |

Additional targeted tests: real SSR hydration, axe contrast/ARIA, keyboard skip links, real hosted core/session checks and local API negative requests. Before/intermediate/final evidence is retained. The requested all-critical-tests target has not been reached: | Required journey status | Count |
|---|---|
| PASSED | 4 |
| BLOCKED | 26 |
| FAILED | 1 |

No real consumer purchase or provider-backed AI journey completed. [Raw checks](evidence/regression-checks.json).
