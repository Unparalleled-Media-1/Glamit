Glamit cloud onboarding, 11 November 2026

Checkout: /workspace/Glamit at d80f56950b94ea45db9a9ab8236ad7f84d92122b (requested feat/platform-foundations). No tracked or untracked repository changes remain.

Installed and validated Python 3.12.14, Node 24.22.1, npm 11.9.0, uv dependencies, npm workspace dependencies, Playwright package and existing system Chromium. PostgreSQL 17 runs from the pinned Compose image. glam_dev_test contains local Auth/Storage SQL test doubles plus application@head migrations; glam_test is reserved for disposable pytest fixtures. Neither is hosted or a live provider.

Passed: repeat execution of install.sh; Ruff lint and format check; API contract check; both workspace typechecks; shared React runtime check; 13 client tests; web production build; Android and iOS JavaScript exports; Chromium page rendering and photo consent/invalid-file handling; API liveness; local worker --once. API, worker and Next development startup exercised. API readiness/protected routes fail closed with 503 because real OIDC is absent.

Backend suite: 399 passed, 1 failed out of 400. Failure: tests/test_dependency_consistency.py::test_actual_workspace_and_python_lock_metadata_are_consistent. The web manifest differs from the lockfile (React DOM range), and React/DOM/native/renderer declarations conflict with root overrides. Normal npm ci fails ERESOLVE. Frozen npm ci --ignore-scripts --legacy-peer-deps succeeds as a local workaround. Expo dependency compatibility check also fails (React 19.3.1 versus SDK expected 19.3.0). Repair requires a separate coding task; manifests/locks were preserved. The generated Stripe fixture report was restored to its original contents after pytest.

Native binaries/devices and external OIDC, Storage, AI and payment journeys were not validated. Mobile exports do not certify native acceptance. Playwright's browser download was denied for cdn.playwright.dev; system /usr/bin/chromium works without a network policy change.

Reusable configuration: install.sh and START.md contain the prepared installation/start instructions. Draft reads repeatedly returned INVALID_ARGUMENT: current draft could not be verified. The draft write returned INVALID_ARGUMENT: saving could not be confirmed. No install_script/start_skill persistence or publication is claimed. This platform draft failure remains the onboarding blocker. Once repaired, register the contents of these files as install_script and start_skill, then review/save and publish through environment settings. No secrets are required for this local development workflow.
