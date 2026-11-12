#!/usr/bin/env bash
# Actual-OS captures + interaction run for Batch 1. Never a browser or Dart-test substitute.
#   capture.sh android|ios
set -euo pipefail
platform=$1
out="$PWD/artifacts/parity/$platform"
mkdir -p "$out"
git rev-parse HEAD > "$out/source-sha.txt"
flutter --version --machine > "$out/flutter-version.json"
export MAESTRO_CLI_NO_ANALYTICS=1 MAESTRO_CLI_ANALYSIS_NOTIFICATION_DISABLED=true
if [ "$platform" = android ]; then
  device=$(adb get-serialno); case "$device" in emulator-*) ;; *) exit 1 ;; esac
  adb install -r apps/glam_mobile/build/app/outputs/flutter-apk/app-debug.apk
  # 1080x2337 = the design's 390x844 aspect (19.5:9); recorded, and reset afterwards.
  adb shell wm size 1080x2337
  adb shell wm size > "$out/display.txt"; adb shell wm density >> "$out/display.txt"
  adb shell settings put global hide_error_dialogs 1 || true
  settle() { adb shell am broadcast -a android.intent.action.CLOSE_SYSTEM_DIALOGS > /dev/null 2>&1 || true; sleep 2; }
  set_theme() { adb shell cmd uimode night "$([ "$1" = dark ] && echo yes || echo no)"; sleep 4; }
  trap 'adb shell wm size reset || true' EXIT
else
  settle() { :; }
  device=$(cat artifacts/analyze-restart/ios/device-id.txt 2>/dev/null || cat artifacts/parity/ios/device-id.txt)
  xcrun simctl install "$device" apps/glam_mobile/build/ios/iphonesimulator/Runner.app
  xcrun simctl list devices available | grep "$device" > "$out/device.txt" || true
  xcrun simctl status_bar "$device" override --time 9:41 --batteryState charged --batteryLevel 100 --cellularBars 4 --wifiBars 3 || true
  set_theme() { xcrun simctl ui "$device" appearance "$1"; sleep 4; }
fi
status=0
for theme in dark light; do
  set_theme "$theme"; settle
  maestro --device "$device" test apps/glam_mobile/maestro/parity/capture.yaml -e "PREFIX=$platform-$theme-" --test-output-dir "$out/maestro-$theme" || status=$?
done
set_theme dark; settle
maestro --device "$device" test apps/glam_mobile/maestro/parity/interactions.yaml --test-output-dir "$out/maestro-interactions" || status=$?
if [ "$platform" = android ]; then
  settle
  maestro --device "$device" test apps/glam_mobile/maestro/parity/android-back.yaml --test-output-dir "$out/maestro-android-back" || status=$?
fi
echo "$status" > "$out/maestro-exit-status.txt"
mkdir -p "$out/screenshots"
find "$out" -name "$platform-*.png" -not -path "$out/screenshots/*" -exec cp {} "$out/screenshots/" \;
ls "$out/screenshots" | wc -l > "$out/screenshot-count.txt"
exit "$status"
