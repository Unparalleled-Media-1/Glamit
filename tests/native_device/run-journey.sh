#!/usr/bin/env bash
# Installed OS UI only. Failures remain failures; fixture/production boundaries are explicit.
set -euo pipefail
test "${GLAM_NATIVE_DEVICE_JOURNEY:-}" = true
platform=$1
mkdir -p artifacts/native-device
export MAESTRO_CLI_NO_ANALYTICS=1
export MAESTRO_CLI_ANALYSIS_NOTIFICATION_DISABLED=true
if [ "$platform" = android ]; then
  adb reverse tcp:8765 tcp:8765
  adb shell screenrecord /sdcard/glam-native-passport.mp4 >/dev/null 2>&1 &
  recording_pid=$!
else
  xcrun simctl io booted recordVideo artifacts/native-device/journey.mp4 > artifacts/native-device/video.txt 2>&1 &
  recording_pid=$!
fi
cleanup() {
  if [ "$platform" = android ]; then
    adb shell pkill -INT screenrecord || true
    kill "$recording_pid" 2>/dev/null || true
    wait "$recording_pid" 2>/dev/null || true
    adb pull /sdcard/glam-native-passport.mp4 artifacts/native-device/journey.mp4 || true
    adb logcat -d -t 300 ReactNativeJS:E AndroidRuntime:E '*:S' > artifacts/native-device/runtime-after-ui.txt || true
  else
    kill -INT "$recording_pid" 2>/dev/null || true
    wait "$recording_pid" 2>/dev/null || true
  fi
}
trap cleanup EXIT
set +e
maestro test -e EVIDENCE_DIR="$PWD/artifacts/native-device" -e FIXTURE_PHOTO="$PWD/artifacts/native-device/test-photo.png" tests/native_device/core.yaml --test-output-dir artifacts/native-device/maestro-core
core_status=$?
relaunch_status=125
before_status=125
after_status=125
if [ "$core_status" -eq 0 ]; then
  curl --fail --silent http://127.0.0.1:8765/__fixture/assert-passport > artifacts/native-device/postgres-before-relaunch.json
  before_status=$?
  if [ "$before_status" -eq 0 ]; then
    maestro test -e EVIDENCE_DIR="$PWD/artifacts/native-device" tests/native_device/relaunch.yaml --test-output-dir artifacts/native-device/maestro-relaunch
    relaunch_status=$?
    if [ "$relaunch_status" -eq 0 ]; then
      curl --fail --silent http://127.0.0.1:8765/__fixture/assert-passport > artifacts/native-device/postgres-after-relaunch.json
      after_status=$?
    fi
  fi
fi
python3 - "$platform" "$core_status" "$before_status" "$relaunch_status" "$after_status" <<'PY'
import json,sys
from pathlib import Path
status=lambda n:'PASS' if n=='0' else 'NOT TESTED' if n=='125' else 'FAIL'
result={'platform':sys.argv[1],'evidence':'actual installed native UI + isolated services',
        'provider':'deterministic-device-fixture-v1, not OpenAI',
        'core_ui':status(sys.argv[2]),'postgres_before_relaunch':status(sys.argv[3]),
        'real_process_relaunch_ui':status(sys.argv[4]),'postgres_after_relaunch':status(sys.argv[5]),
        'required_failure_privacy_scenarios':'NOT TESTED', 'full_batch_acceptance':'OPEN',
        'physical_devices':'NOT TESTED','production':'NOT VERIFIED'}
Path('artifacts/native-device/acceptance.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result))
PY
if [ "$core_status" -ne 0 ] || [ "$before_status" -ne 0 ] || [ "$relaunch_status" -ne 0 ] || [ "$after_status" -ne 0 ]; then exit 1; fi
