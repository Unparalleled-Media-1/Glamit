#!/usr/bin/env bash
# Genuine native source/permission/capture UI checks; never a provider substitute.
set -euo pipefail
platform=$1
export GLAM_FLUTTER_EVIDENCE="$PWD/artifacts/analyze-restart/$platform"
mkdir -p "$GLAM_FLUTTER_EVIDENCE"
git rev-parse HEAD > "$GLAM_FLUTTER_EVIDENCE/source-sha.txt"
flutter --version --machine > "$GLAM_FLUTTER_EVIDENCE/flutter-version.json"
if [ "$platform" = android ]; then
  device=$(adb get-serialno)
  case "$device" in emulator-*) ;; *) exit 1 ;; esac
  adb install -r apps/glam_mobile/build/app/outputs/flutter-apk/app-debug.apk
  adb logcat -c
  adb shell screenrecord /sdcard/glam-analyze.mp4 >/dev/null 2>&1 &
  recording_pid=$!
else
  device=$(cat artifacts/analyze-restart/ios/device-id.txt)
  xcrun simctl install "$device" apps/glam_mobile/build/ios/iphonesimulator/Runner.app
  xcrun simctl addmedia "$device" apps/glam_mobile/test/fixtures/picker-fixture.png
  xcrun simctl spawn "$device" log stream --style compact --predicate 'process == "Runner"' > "$GLAM_FLUTTER_EVIDENCE/runtime.txt" 2>&1 &
  system_log_pid=$!
  xcrun simctl io "$device" recordVideo "$GLAM_FLUTTER_EVIDENCE/interaction.mp4" > "$GLAM_FLUTTER_EVIDENCE/recording.txt" 2>&1 &
  recording_pid=$!
fi
cleanup() {
  if [ -n "${recording_pid:-}" ]; then
    if [ "$platform" = android ]; then
      adb shell pkill -INT screenrecord || true
      for attempt in $(seq 1 30); do if ! adb shell pidof screenrecord >/dev/null 2>&1; then break; fi; sleep 0.1; done
      kill "$recording_pid" 2>/dev/null || true
      wait "$recording_pid" 2>/dev/null || true
      adb pull /sdcard/glam-analyze.mp4 "$GLAM_FLUTTER_EVIDENCE/interaction.mp4" || true
      adb logcat -d -t 1000 Flutter:E flutter:I AndroidRuntime:E '*:S' > "$GLAM_FLUTTER_EVIDENCE/runtime.txt" || true
    else
      kill -INT "$recording_pid" 2>/dev/null || true
      wait "$recording_pid" 2>/dev/null || true
    fi
    recording_pid=''
  fi
  if [ -n "${system_log_pid:-}" ]; then kill "$system_log_pid" 2>/dev/null || true; wait "$system_log_pid" 2>/dev/null || true; system_log_pid=''; fi
}
trap cleanup EXIT
export MAESTRO_CLI_NO_ANALYTICS=1 MAESTRO_CLI_ANALYSIS_NOTIFICATION_DISABLED=true
set +e
maestro --device "$device" test apps/glam_mobile/maestro/"$platform".yaml --test-output-dir "$GLAM_FLUTTER_EVIDENCE/maestro"
status=$?
set -e
if [ "$status" -ne 0 ]; then python3 scripts/analyze-restart/failure-evidence.py "$platform" "$device" || true; fi
cleanup
if [ "$status" -ne 0 ]; then exit "$status"; fi
if [ "$platform" = android ]; then
  adb shell pm path com.glambeauty.analyzereview > "$GLAM_FLUTTER_EVIDENCE/installed-package.txt"
  grep -q '^package:' "$GLAM_FLUTTER_EVIDENCE/installed-package.txt"
else
  xcrun simctl get_app_container "$device" com.glambeauty.analyzereview app > "$GLAM_FLUTTER_EVIDENCE/installed-package.txt"
fi
python3 - "$platform" <<'PY'
import hashlib,json,os,re,sys
from pathlib import Path
root=Path(os.environ['GLAM_FLUTTER_EVIDENCE'])
text=(root/'runtime.txt').read_text(errors='replace')
assert not re.search('RenderFlex overflowed|Unhandled Exception|EXCEPTION CAUGHT|FATAL EXCEPTION',text), 'Native runtime error'
images={}
for prefix in ['01-','02-','03-','04-','05-']:
 files=list(root.rglob(prefix+'*.png'))
 assert len(files)==1, f'Exactly one actual OS screenshot required for {prefix}'
 data=files[0].read_bytes();assert data.startswith(b'\x89PNG\r\n\x1a\n') and len(data)>10000
 images[files[0].name]={'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()}
receipt={'platform':sys.argv[1], 'source_commit':(root/'source-sha.txt').read_text().strip(),
 'dependency_lock_sha256':hashlib.sha256(Path('apps/glam_mobile/pubspec.lock').read_bytes()).hexdigest(),
 'native_source_ui_interactions':'PASS', 'screenshots':images,
 'camera_hardware': 'Android emulator capture only' if sys.argv[1]=='android' else 'Simulator capability/fallback only; physical camera NOT VERIFIED',
 'photo_fixture':'Synthetic colour gradient for actual OS picker only; never sent for analysis' if sys.argv[1]=='ios' else 'Actual emulator camera frame; never sent for analysis',
 'live_auth_upload_analysis_save_journey':'BLOCKED: qualified API origin, public Auth configuration and authorized test account not supplied',
 'provider_results':'NONE FABRICATED', 'physical_devices':'NOT TESTED', 'design_approval':'PENDING', 'production':'UNCHANGED'}
(root/'receipt.json').write_text(json.dumps(receipt,indent=2)+'\n')
print(json.dumps(receipt))
PY
