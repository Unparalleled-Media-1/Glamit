# Installed native Passport acceptance — OPEN

The user's native acceptance and dashboard specifications are preserved verbatim under docs/specification/sources. Dashboard expansion is deferred in the existing matrix/defects until installed acceptance and native navigation/service composition; no new audit system, roles, permission grants, production migrations or deployment.

## Implementation and local verification

Fixture services use real FastAPI/private-media/analysis/Passport code, canonical PostgreSQL tables and migrations, signed ES256 test identities, an explicit filesystem storage adapter and deterministic-device-fixture-v1. Production targets and non-_test databases are refused before connection. Test OTP never sends an SMS; no live OpenAI call occurs. Test policy/eligibility is labelled and exists only locally. The native bundle keeps the actual App, SDK/hooks, Expo picker/Crypto/File and secure storage; only the fixture transport maps its two logical origins to loopback and rejects all other destinations. Test-only native cleartext permission changes are generated after strict CI/development/local-verification identifier guards, never committed into production configuration. This does not qualify production Auth, TLS or providers.

393 backend tests pass, including five new fixture tests for signed authentication/refresh rotation, upload → corrected Passport persistence, withdrawal plus physical file cleanup, invalid challenges/JWTs, production-target refusal and path traversal. The real Supabase JS SDK also completed OTP/getUser/refresh against the standalone fixture server. Native photo port regressions, TypeScript, Ruff/format, YAML/shell parsing and fixture-transport/build guard checks pass locally. These remain service/SDK/source tests, not installed-app evidence.

A confirmed source navigation gap is repaired: after signing in from a selected-photo Results prompt, Profile now offers Continue selected photo analysis rather than forcing another picker round trip. Authentication and background-lock rules are preserved.

The optional device_journey dispatch on the existing read-only native workflow builds a clearly labelled isolated fixture binary and runs actual Maestro OS UI interactions, records screenshots/video, checks PostgreSQL before/after real process termination/relaunch, and retains failures. A relaunch that cannot restore/unlock the real native secure session fails; it is not silently replaced with a new login or a fixture auth hook. Required privacy/failure scenarios and real biometric enrollment/unlock remain explicit acceptance work; the batch cannot pass from the core flow alone.

## Acceptance gates

| Gate | Status |
| --- | --- |
| Full isolated service regression | PASS,393 tests; not native acceptance |
| Actual signed test-auth SDK protocol | PASS locally; not OS/session restoration |
| iOS installed core journey | NOT TESTED pending CI execution |
| Android installed core journey | NOT TESTED pending CI execution |
| Actual process death / secure-session restoration | NOT TESTED; requires real OS behavior/enrollment |
| All mandatory failure/privacy scenarios on both OSes | NOT TESTED |
| Physical iOS / Android | NOT TESTED |
| Live OpenAI / production backend | NOT VERIFIED |
| Production0014–0017 / deployment / public launch | NOT AUTHORIZED by this batch |

Baseline startup run42577021413 passed on31d8ac4. That source and its artifact links remain historical startup evidence, not evidence of the new device journey. New dispatch run IDs and failures will be recorded separately.

## Retained installed-run failures

Run42581848514 on8ee82d8 failed before device journeys: Android Gradle distribution download returned HTTP504; iOS fixture setup stopped before useful artifact output. No installed operation was counted as passed. Run42582624960 on4df28c1 retained the exact iOS cause: Homebrew refused the untrusted Wix tap. Annotations are saved in evidence/; complete log/artifact downloads remain403-blocked in this executor. A correction uses the reviewed official AppleSimulatorUtils0.9.12 source archive with its published SHA-256 and a local user-owned build; no Homebrew trust setting is weakened. The next dispatch repeats both platforms against one new source.

The test runner now provisions virtual-device biometric enrollment and drives actual OS challenges, leaving the application SDK, hook and secure-store implementations unchanged. A successful relaunch must preserve the PostgreSQL revision and produce an additional authenticated refresh event. This is planned/implemented test machinery until the installed jobs demonstrate it; no simulator success or full batch acceptance is inferred from source.
