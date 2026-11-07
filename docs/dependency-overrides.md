# Expo dependency security overrides

## Shared client runtime and compiler

React and React DOM are pinned and overridden to 19.3.0 across the workspace, matching Expo 58.0.23's bundled compatibility map. React Native 0.88.1 accepts this React version. Keeping the app on 19.3.0 while npm hoists 19.3.1 for Expo/React Native creates separate React instances and can break hooks even when TypeScript and JavaScript exports pass. The root overrides keep the renderer and app on the same runtime; they must be reviewed with SDK upgrades. The web client also uses the same matching React/React DOM pair. The current production-only audit reports zero vulnerabilities for this tree; it does not establish native device compatibility or absence of future advisories.

`npm run check:client-runtime` compares the actual React instances resolved by each app, React Native, Expo and React DOM, and renders a hook-using web component with React DOM's server renderer. CI and `scripts/check.sh` run it. Expo's existing offline `install --check` additionally checks the SDK's local version map; it is not an online service or device test.

TypeScript is pinned to 5.9.3 because `openapi-typescript` 7.13.0 declares `^5.x` and calls `ts.factory`, which is unavailable in the installed TypeScript 7 package. The manifest and lockfile now agree on Node 24 types. `npm ci --ignore-scripts` and `npm run contracts:generate` pass without peer bypasses or an external generator. Dependabot holds TypeScript 6+ until a compatible generator is selected and groups runtime updates for review; CI must still verify the installed Expo map and runtime identity.

## Expo transitive tooling

The current Expo 58 toolchain requests glob 13 and minimatch 10, which npm audit flagged with GHSA-3g3m-2fjr-6pw4 and GHSA-g3hv-75wg-m249. Its automated force-fix proposed downgrading Expo to SDK 51; that was not applied.

The root package manifest instead explicitly overrides `@expo/cli` and `@expo/fingerprint` to glob 14.0.3 and fingerprint's minimatch to 11.0.4. These are outside the SDK's upstream ranges, so npm tree inspection can flag the intentional range differences. Keep the overrides visible and remove them when Expo ships compatible patched dependencies. Do not edit package contents or checksums to silence verification.

Validation after a clean lockfile install: both mobile JavaScript exports, Expo's installed direct-dependency compatibility check, fingerprint generation, and `npm audit --omit=dev` (zero reported vulnerabilities). These checks do not prove native build/EAS/device compatibility; those remain release gates. A local package-map check does not verify online Expo service availability.

The dev-only OpenAPI generator still uses an older Redocly/minimatch dependency. Do not override its major version blindly: its caller uses the older callable CommonJS API. Restrict contract generation to the trusted locally generated OpenAPI file; assess full developer-tool advisories before broader external-spec tooling use. A production-only npm audit is not a clean bill for all dependencies or for the application.
