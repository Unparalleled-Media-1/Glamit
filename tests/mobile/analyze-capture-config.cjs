/** Validate SDK compatibility and actual config-plugin permission output, not a native build. */
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const installed = require('expo-camera/package.json').version;
const expected = require('expo/bundledNativeModules.json')['expo-camera'];
assert.equal(require('../../apps/mobile/package.json').dependencies['expo-camera'], installed);
assert(require('semver').satisfies(installed, expected), 'Camera must match the pinned Expo SDK');
const result = spawnSync('npm', ['exec', '--workspace=@glam/mobile', '--', 'expo', 'config', '--type', 'introspect', '--json'], {
  cwd: process.cwd(), encoding: 'utf8', env: { ...process.env, EXPO_OFFLINE: '1', EXPO_NO_TELEMETRY: '1', CI: '1', GLAM_BUILD_ENV: 'development' },
});
assert.equal(result.status, 0, 'Expo native configuration introspection must succeed');
const config = JSON.parse(result.stdout);
const ios = config._internal.modResults.ios.infoPlist;
assert.match(ios.NSCameraUsageDescription, /private/i);
assert(!ios.NSMicrophoneUsageDescription, 'Still-photo Capture must not request microphone permission');
const permissions = config._internal.modResults.android.manifest.manifest['uses-permission'];
assert(permissions.some(p => p.$['android:name'] === 'android.permission.CAMERA' && p.$['tools:node'] !== 'remove'));
assert(!permissions.some(p => p.$['android:name'] === 'android.permission.RECORD_AUDIO' && p.$['tools:node'] !== 'remove'));
console.log(`PASS expo-camera ${installed} matches SDK ${expected}; native permission plugins enable camera without microphone (configuration only, not devices)`);
