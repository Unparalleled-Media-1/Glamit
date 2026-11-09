# Installed native Passport acceptance — OPEN

The user's native acceptance and dashboard specifications are preserved verbatim under docs/specification/sources. Dashboard expansion is deferred in the existing matrix/defects until installed acceptance and native navigation/service composition; no new audit system, roles, permission grants, production migrations or deployment.

## Implementation and local verification

Fixture services use real FastAPI/private-media/analysis/Passport code, canonical PostgreSQL tables and migrations, signed ES256 test identities, an explicit filesystem storage adapter and deterministic-device-fixture-v1. Production targets and non-_test databases are refused before connection. Test OTP never sends an SMS; no live OpenAI call occurs. Test policy/eligibility is labelled and exists only locally. The native bundle keeps the actual App, SDK/hooks, Expo picker/Crypto/File and secure storage; only the fixture transport maps its two logical origins to loopback and rejects all other destinations. Test-only native cleartext permission changes are generated after strict CI/development/local-verification identifier guards, never committed into production configuration. This does not qualify production Auth, TLS or providers.

395 backend tests pass, including five new fixture tests for signed authentication/refresh rotation, upload → corrected Passport persistence, withdrawal plus physical file cleanup, invalid challenges/JWTs, production-target refusal and path traversal. The real Supabase JS SDK also completed OTP/getUser/refresh against the standalone fixture server. Native photo port regressions, TypeScript, Ruff/format, YAML/shell parsing and fixture-transport/build guard checks pass locally. These remain service/SDK/source tests, not installed-app evidence.

A confirmed source navigation gap is repaired: after signing in from a selected-photo Results prompt, Profile now offers Continue selected photo analysis rather than forcing another picker round trip. Authentication and background-lock rules are preserved.

The optional device_journey dispatch on the existing read-only native workflow builds a clearly labelled isolated fixture binary and runs actual Maestro OS UI interactions, records screenshots/video, checks PostgreSQL before/after real process termination/relaunch, and retains failures. A relaunch that cannot restore/unlock the real native secure session fails; it is not silently replaced with a new login or a fixture auth hook. Required privacy/failure scenarios and real biometric enrollment/unlock remain explicit acceptance work; the batch cannot pass from the core flow alone.

## Acceptance gates

| Gate | Status |
| --- | --- |
| Full isolated service regression | PASS,395 tests; not native acceptance |
| Actual signed test-auth SDK protocol | PASS locally; not OS/session restoration |
| iOS installed core journey | FAIL in run42588059441: simulator media import timed out before analysis |
| Android installed core journey | BLOCKED in run42588059441 by virtual fingerprint setup; journey not exercised |
| Actual process death / secure-session restoration | NOT TESTED; requires real OS behavior/enrollment |
| All mandatory failure/privacy scenarios on both OSes | NOT TESTED |
| Physical iOS / Android | NOT TESTED |
| Live OpenAI / production backend | NOT VERIFIED |
| Production0014–0017 / deployment / public launch | NOT AUTHORIZED by this batch |

Baseline startup run42577021413 passed on31d8ac4. That source and its artifact links remain historical startup evidence, not evidence of the new device journey. New dispatch run IDs and failures will be recorded separately.

## Retained installed-run failures

Run42581848514 on8ee82d8 failed before device journeys: Android Gradle distribution download returned HTTP504; iOS fixture setup stopped before useful artifact output. No installed operation was counted as passed. Run42582624960 on4df28c1 retained the exact iOS cause: Homebrew refused the untrusted Wix tap. Annotations are saved in evidence/; complete log/artifact downloads remain403-blocked in this executor. A correction uses the reviewed official AppleSimulatorUtils0.9.12 source archive with its published SHA-256 and a local user-owned build; no Homebrew trust setting is weakened. The next dispatch repeats both platforms against one new source.

The test runner now provisions virtual-device biometric enrollment and drives actual OS challenges, leaving the application SDK, hook and secure-store implementations unchanged. A successful relaunch must preserve the PostgreSQL revision and produce an additional authenticated refresh event. This is planned/implemented test machinery until the installed jobs demonstrate it; no simulator success or full batch acceptance is inferred from source.

Run42583179440: the iOS official source archive download also returned HTTP504 before build/setup. Its annotations are retained. The next iOS-only dispatch fetches the exact official0.9.12 Git commit73f9c36afd5208e2d71be1150e0c9bd26ac1ca71 and verifies HEAD, with no third-party tap trust change. Android compilation from that run is tracked separately; no installed journey pass is inferred.

Run42583762024 reached the simulator utility source compile and failed with missing LNLog.h; the pinned Git source requires its recorded submodule. The next source initializes that exact submodule. Run42583179440 Android was cancelled when the previous iOS retry shared its concurrency group; platform/device-mode groups are now separate. No native journey pass was recorded. Invisible stable IDs were added to the existing OTP fields and goal switch so the native driver selects the input/control rather than a duplicate visible label; authentication logic is unchanged.

Run42584650885 successfully built the pinned simulator utility after HTTPS submodule initialization, then failed because brew --prefix returned a path for an uninstalled PostgreSQL17 package. The next setup checks the actual initdb executable before deciding whether to install PostgreSQL. Its exact diagnostic is retained; no installed app step passed in that run.

Actual installed-stage results: run42585264004 built/installed/launched iOS and then Maestro failed before the core UI flow because addMedia validated its variable path before interpolation. Run42585842996 built/launched Android and the emulator action's per-line shell parser rejected the multiline fixture if block (exit2). The pinned parsers confirm both causes; the next source uses a literal flow-relative photo path, one supported shell command line and Maestro check-syntax before native compilation. Native journey acceptance remains OPEN; neither case is reported as an application journey pass. Full local regression is now395 passing tests, including the launcher-overlay allow/deny safety checks.

Run42588059441 on1cd2260 compiled, installed and launched both native apps. iOS then failed in Maestro addMedia with a subprocess timeout, before authentication/analysis; Android stopped in actual Settings biometric setup. Focused probe42589490804 on3366b20 exposed the unhandled MORE button. Exact annotations are retained. The next source handles MORE and imports the synthetic iOS photo through Apple simctl with a bounded timeout; the actual application still uses the OS picker. UI phases are time bounded with safe service milestones and retained failure diagnostics. No installed journey pass is inferred.

A failing-before component→real API/PostgreSQL regression reproduced local consent acknowledgments remaining checked after withdrawal. The application now clears both checkboxes, and the two OS component configurations pass withdrawal/regrant assertions. This is a verified source/service repair, not installed-device privacy acceptance. Two diagnostic tests also pass for password-node exclusion and bounded UI labels.

Run42593017743 on605593d was a focused Android Settings probe, not app acceptance. It failed at the actual lock screen (Device locked); its annotation is retained. Disposable-emulator setup now enables stay-awake, uses a bounded test PIN and handles the actual lock-screen prompt before enrollment. No app authentication check is bypassed. iOS run42593022087 on605593d is tracked independently.

The isolated auth protocol also had a confirmed reauthentication defect: after logout it reused a revoked session. A failing-before regression returned401 after a fresh OTP. The fixture now creates a new signed session per verification and retains that session identity during refresh; revoked/expired sessions remain denied. This changes test services only. Full backend regression after this repair:398 passed. An additional targeted expiry/relogin regression is tracked separately. Production Auth and provider activation are unchanged.
