# Recovered cloud environment — 11 November 2026

Branch: `chore/recovery-dependencies-native-plan`. Base: `d80f56950b94ea45db9a9ab8236ad7f84d92122b`. This change preserves the recovered development environment and prepares native redesign inspection. No deployment, production operation, Auth setting, financial rule or canonical migration was changed.

## Preservation and configuration status

The three files under [original](original/) are byte-for-byte copies of `/workspace/glam-environment/install.sh`, `START.md` and `RESULT.md`, captured before this task. [original-checksums.json](original-checksums.json) records SHA-256 checksums. Those external files and the original environment configuration were left unchanged. The original documents intentionally retain the former failure/workaround as historical recovery evidence.

The platform reports the attached machine running, connected, with current observations and an enforced restricted network policy. No runtime secret or application-variable bindings are configured. Draft reads again returned `INVALID_ARGUMENT`: “The current environment draft could not be verified.” No further write was attempted against an unreadable original configuration. No publication action is exposed by the available tools. Draft registration and publication remain incomplete; this directory is the user-authorized repository fallback, not proof of platform publication or fresh-task restoration.

When draft access is repaired, first read and preserve its existing contents. Register this directory's tested [install.sh](install.sh) and [START.md](START.md) using the supported configuration flow, retaining original unrelated requirements. Review/save and publish through environment settings when the product enables those actions. Do not overwrite unknown scripts/settings or replace repository/network membership blindly. The agent has not published anything.

## Dependency repair

Exact reproduced failure: `tests/test_dependency_consistency.py::test_actual_workspace_and_python_lock_metadata_are_consistent`.

Before correction, the apps and renderer requested React 19.3.1, root overrides specified 19.3.0, and the web lock entry used a React DOM range that differed from its exact manifest pin. Expo 58.0.23's installed compatibility map specifies React 19.3.0. The smallest compatible correction pins React, React DOM and react-test-renderer to 19.3.0 across both app manifests and root development dependencies, retaining the existing overrides. npm regenerated only the affected React package records and workspace metadata, with registry-provided integrity hashes; unrelated locked package versions were preserved. The stale React records were removed before resolution because npm could not reconcile them in place.

`npm ci --ignore-scripts` now succeeds with the committed lockfile and without `--legacy-peer-deps` or `--force`. The new installer removes the old bypass. Existing dependency-consistency regression tests were retained unchanged.

## Current-instance evidence

| Check | Result |
| --- | --- |
| Failing test reproduced before correction | Failed with manifest/lock and shared-version errors |
| `pytest tests/test_dependency_consistency.py -q` after correction | 3 passed |
| Full `pytest` with dedicated local `glam_test` | 400 passed; one existing FastAPI/Starlette deprecation warning |
| `python3 scripts/ci/check_lockfiles.py` | Passed |
| Plain frozen npm installation | Passed, 541 packages installed |
| Repository recovery installer repeated after repair | Passed; no peer bypass, existing local databases preserved |
| Shared React identity/hook rendering | Passed |
| Both workspace typechecks | Passed |
| Client product tests | 13 passed |
| Auth contracts and native gate | Passed with explicit OS/HTTP doubles |
| Expo photo, stylist and private-library component suites | Passed for iOS/Android branches with explicit OS/HTTP doubles |
| Expo offline SDK dependency check | Passed; offline validation warning retained |
| Web production build | Passed, 58 static pages |
| Chromium smoke check after repair | Five routes rendered; photo consent and invalid-file rejection passed; no uncaught page errors |
| Expo Android/iOS JS exports | Passed; neither is an installed native binary |
| Ruff and generated API contract check | Passed |
| API liveness | HTTP 200, alive |
| API readiness | HTTP 503, identity provider not configured, expected fail-closed local behavior |
| Original icon/favicon/wordmark hashes | Match recorded original-assets manifest; new Flutter icon matches too |

The full backend run used only the disposable local database, and its generated Stripe fixture report was restored from a pre-run copy. It did not exercise Stripe or alter production. Raw current-run logs remain under `/tmp/glam-recovery-evidence`; they are transient, not published artifacts.

## Boundaries

The local API/web/test workflow is usable. Real OIDC, private storage, AI providers, authorized native test identity, and live journeys remain unverified. Flutter/Dart, Android SDK/emulator and Xcode tooling are absent here; no new Flutter compilation, native installation, physical-device testing or visual approval is claimed. iOS native builds require macOS/Xcode or the existing independent CI runner. See [native preparation](../../mobile/native-redesign-preparation/README.md).
