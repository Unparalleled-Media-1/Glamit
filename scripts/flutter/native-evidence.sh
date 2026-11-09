#!/usr/bin/env bash
set -euo pipefail
test "${GLAM_FLUTTER_VISUAL_GATE:-}" = F1
platform=$1
task_repo_root=$PWD
export GLAM_FLUTTER_EVIDENCE="$task_repo_root/artifacts/flutter-f1/$platform"
mkdir -p "$GLAM_FLUTTER_EVIDENCE"
git rev-parse HEAD > "$GLAM_FLUTTER_EVIDENCE/source-sha.txt"
flutter --version --machine > "$GLAM_FLUTTER_EVIDENCE/flutter-version.json"
# Compile before recording so the video captures interactions, not build idle time.
cd apps/flutter_app
if [ "$platform" = android ]; then
  flutter build apk --debug --target integration_test/visual_gate_test.dart --no-pub
else
  flutter build ios --simulator --debug --no-codesign --target integration_test/visual_gate_test.dart --no-pub
fi
cd "$task_repo_root"
application_args=()
if [ "$platform" = android ]; then
  application_args=(--use-application-binary=build/app/outputs/flutter-apk/app-debug.apk)
  device=$(adb get-serialno)
  case "$device" in emulator-*) ;; *) echo 'F1 requires a disposable emulator'; exit 1 ;; esac
  adb shell svc power stayon true
  adb shell settings put system screen_off_timeout 1800000
  adb shell screenrecord /sdcard/glam-flutter-f1.mp4 >/dev/null 2>&1 &
  recording_pid=$!
else
  device=$(cat "$GLAM_FLUTTER_EVIDENCE/device-id.txt")
  xcrun simctl io "$device" recordVideo "$GLAM_FLUTTER_EVIDENCE/interaction.mp4" > "$GLAM_FLUTTER_EVIDENCE/recording.txt" 2>&1 &
  recording_pid=$!
fi
cleanup() {
  if [ "$platform" = android ]; then
    adb shell pkill -INT screenrecord || true
    kill "$recording_pid" 2>/dev/null || true
    wait "$recording_pid" 2>/dev/null || true
    adb pull /sdcard/glam-flutter-f1.mp4 "$GLAM_FLUTTER_EVIDENCE/interaction.mp4" || true
    adb logcat -d -t 400 Flutter:E flutter:I AndroidRuntime:E '*:S' > "$GLAM_FLUTTER_EVIDENCE/runtime.txt" || true
  else
    kill -INT "$recording_pid" 2>/dev/null || true
    wait "$recording_pid" 2>/dev/null || true
  fi
}
trap cleanup EXIT
cd apps/flutter_app
export GLAM_FLUTTER_PLATFORM="$platform"
export GLAM_FLUTTER_DEVICE_ID="$device"
echo "::notice title=Flutter F1 native runtime::Starting actual installed $platform Flutter interaction test"
flutter drive "${application_args[@]}" --no-pub --driver=test_driver/visual_driver.dart --target=integration_test/visual_gate_test.dart -d "$device"
if [ "$platform" = android ]; then
  adb shell pm path com.glambeauty.visualreview > "$GLAM_FLUTTER_EVIDENCE/installed-app-path.txt"
  grep -q '^package:' "$GLAM_FLUTTER_EVIDENCE/installed-app-path.txt"
  adb shell getprop ro.build.version.release > "$GLAM_FLUTTER_EVIDENCE/os-version.txt"
else
  xcrun simctl get_app_container "$device" com.glambeauty.visualreview app > "$GLAM_FLUTTER_EVIDENCE/installed-app-path.txt"
  plutil -extract CFBundleIdentifier raw -o - "$(cat "$GLAM_FLUTTER_EVIDENCE/installed-app-path.txt")/Info.plist" > "$GLAM_FLUTTER_EVIDENCE/installed-identifier.txt"
  test "$(cat "$GLAM_FLUTTER_EVIDENCE/installed-identifier.txt")" = com.glambeauty.visualreview
fi
python3 - "$platform" <<'PY'
import hashlib,json,os,subprocess,sys
from pathlib import Path
root=Path(os.environ['GLAM_FLUTTER_EVIDENCE'])
names=['01-home','02-analyze','03-studio','04-discover','05-profile']
images={}
for name in names:
    image=root.joinpath(name+'.png')
    data=image.read_bytes()
    assert data.startswith(b'\x89PNG\r\n\x1a\n') and len(data)>10000, name+' native screenshot missing'
    composite=root.joinpath(name+'-os.png').read_bytes()
    assert composite.startswith(b'\x89PNG\r\n\x1a\n') and len(composite)>10000, name+' OS capture missing'
    images[name]={'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest(),
        'os_composite_sha256':hashlib.sha256(composite).hexdigest()}
receipt={'platform':sys.argv[1], 'source_commit':subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),
    'dependency_lock_sha256':hashlib.sha256(Path('pubspec.lock').read_bytes()).hexdigest(),
    'bundle_id':'com.glambeauty.visualreview', 'identifier_scope':'unregistered local review only',
    'native_runtime_interactions':'PASS', 'screenshots':images,
    'visual_approval':'PENDING USER REVIEW', 'backend_operations':'NOT CONNECTED IN F1',
    'physical_devices':'NOT TESTED', 'store_distribution':'NOT CONFIGURED', 'launch_readiness':'NOT ESTABLISHED'}
root.joinpath('receipt.json').write_text(json.dumps(receipt,indent=2)+'\n')
print(json.dumps(receipt))
PY
