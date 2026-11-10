#!/usr/bin/env bash
# Real OS input and screenshots of the normal Flutter entry point; no test binding.
set -euo pipefail
test "${GLAM_FLUTTER_VISUAL_GATE:-}" = F1
platform=$1
task_repo_root=$PWD
export GLAM_FLUTTER_EVIDENCE="$task_repo_root/artifacts/flutter-f1/$platform"
mkdir -p "$GLAM_FLUTTER_EVIDENCE"
git rev-parse HEAD > "$GLAM_FLUTTER_EVIDENCE/source-sha.txt"
flutter --version --machine > "$GLAM_FLUTTER_EVIDENCE/flutter-version.json"
if [ "$platform" = android ]; then
  device=$(adb get-serialno)
  case "$device" in emulator-*) ;; *) echo 'F1 requires a disposable emulator'; exit 1 ;; esac
  adb logcat -c
  adb install -r apps/flutter_app/build/app/outputs/flutter-apk/app-debug.apk
  adb shell svc power stayon true
  adb shell settings put system screen_off_timeout 1800000
  adb shell screenrecord /sdcard/glam-flutter-f1.mp4 >/dev/null 2>&1 &
  recording_pid=$!
else
  device=$(cat "$GLAM_FLUTTER_EVIDENCE/device-id.txt")
  xcrun simctl install "$device" apps/flutter_app/build/ios/iphonesimulator/Runner.app
  xcrun simctl spawn "$device" log stream --style compact --predicate 'process == "Runner"' > "$GLAM_FLUTTER_EVIDENCE/runtime.txt" 2>&1 &
  system_log_pid=$!
  xcrun simctl io "$device" recordVideo "$GLAM_FLUTTER_EVIDENCE/interaction.mp4" > "$GLAM_FLUTTER_EVIDENCE/recording.txt" 2>&1 &
  recording_pid=$!
fi
cleanup() {
  if [ -n "${recording_pid:-}" ]; then
    if [ "$platform" = android ]; then
      adb shell pkill -INT screenrecord || true
      for attempt in $(seq 1 30); do
        if ! adb shell pidof screenrecord >/dev/null 2>&1; then break; fi
        sleep 0.1
      done
      kill "$recording_pid" 2>/dev/null || true
      wait "$recording_pid" 2>/dev/null || true
      adb pull /sdcard/glam-flutter-f1.mp4 "$GLAM_FLUTTER_EVIDENCE/interaction.mp4" || true
      adb logcat -d -t 600 Flutter:E flutter:I AndroidRuntime:E '*:S' > "$GLAM_FLUTTER_EVIDENCE/runtime.txt" || true
    else
      kill -INT "$recording_pid" 2>/dev/null || true
      wait "$recording_pid" 2>/dev/null || true
    fi
    recording_pid=''
  fi
  if [ -n "${system_log_pid:-}" ]; then
    kill "$system_log_pid" 2>/dev/null || true
    wait "$system_log_pid" 2>/dev/null || true
    system_log_pid=''
  fi
}
trap cleanup EXIT
export MAESTRO_CLI_NO_ANALYTICS=1
export MAESTRO_CLI_ANALYSIS_NOTIFICATION_DISABLED=true
echo "::notice title=Flutter F1 native runtime::Starting OS-driven $platform Flutter interactions"
set +e
maestro --device "$device" test -e EVIDENCE_DIR="$GLAM_FLUTTER_EVIDENCE" apps/flutter_app/maestro/visual_gate.yaml --test-output-dir "$GLAM_FLUTTER_EVIDENCE/maestro"
ui_status=$?
set -e
if [ "$ui_status" -ne 0 ]; then python3 scripts/flutter/failure-evidence.py "$platform" "$device" || true; fi
cleanup
if [ "$ui_status" -ne 0 ]; then tail -n 32 "$GLAM_FLUTTER_EVIDENCE/runtime.txt"; exit "$ui_status"; fi
if [ "$platform" = android ]; then
  adb shell pm path com.glambeauty.visualreview > "$GLAM_FLUTTER_EVIDENCE/installed-app-path.txt"
  grep -q '^package:' "$GLAM_FLUTTER_EVIDENCE/installed-app-path.txt"
  adb shell getprop ro.build.version.release > "$GLAM_FLUTTER_EVIDENCE/os-version.txt"
else
  xcrun simctl get_app_container "$device" com.glambeauty.visualreview app > "$GLAM_FLUTTER_EVIDENCE/installed-app-path.txt"
  plutil -extract CFBundleIdentifier raw -o - "$(cat "$GLAM_FLUTTER_EVIDENCE/installed-app-path.txt")/Info.plist" > "$GLAM_FLUTTER_EVIDENCE/installed-identifier.txt"
  test "$(cat "$GLAM_FLUTTER_EVIDENCE/installed-identifier.txt")" = com.glambeauty.visualreview
fi
cd apps/flutter_app
python3 - "$platform" <<'PY'
import hashlib,json,os,re,shutil,subprocess,sys
from pathlib import Path
root=Path(os.environ['GLAM_FLUTTER_EVIDENCE'])
runtime=root.joinpath('runtime.txt').read_text(errors='replace')
assert not re.search(r'RenderFlex overflowed|Unhandled Exception|EXCEPTION CAUGHT|FATAL EXCEPTION',runtime), 'Native Flutter runtime error; inspect retained logs'
names=['01-home','02-analyze','03-studio','04-discover','05-profile']
images={}
for name in names:
    target=root.joinpath(name+'.png')
    if not target.exists():
        candidates=list(root.rglob(name+'.png'))
        assert len(candidates)==1, name+' must have one actual OS screenshot'
        shutil.copyfile(candidates[0],target)
    data=target.read_bytes()
    assert data.startswith(b'\x89PNG\r\n\x1a\n') and len(data)>10000, name+' native screenshot missing'
    images[name]={'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest(),
        'capture':'OS screenshot during Maestro input on the installed main-entry Flutter app'}
receipt={'platform':sys.argv[1], 'source_commit':subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),
    'dependency_lock_sha256':hashlib.sha256(Path('pubspec.lock').read_bytes()).hexdigest(),
    'bundle_id':'com.glambeauty.visualreview', 'identifier_scope':'unregistered local review only',
    'native_runtime_interactions':'PASS', 'screenshots':images,
    'visual_approval':'PENDING USER REVIEW', 'backend_operations':'NOT CONNECTED IN F1',
    'physical_devices':'NOT TESTED', 'store_distribution':'NOT CONFIGURED', 'launch_readiness':'NOT ESTABLISHED'}
root.joinpath('receipt.json').write_text(json.dumps(receipt,indent=2)+'\n')
print(json.dumps(receipt))
PY
