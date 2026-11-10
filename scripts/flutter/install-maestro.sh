#!/usr/bin/env bash
set -euo pipefail
test "${GLAM_FLUTTER_VISUAL_GATE:-}" = F1
curl --fail --location --retry 2 --output "$RUNNER_TEMP/glam-flutter-maestro.zip" https://github.com/mobile-dev-inc/Maestro/releases/download/cli-2.12.1/maestro.zip
printf '%s  %s\n' 54dbb0716425626604973cbb374c585ca30272375d9ce15177a1152765ddd9d7 "$RUNNER_TEMP/glam-flutter-maestro.zip" | shasum -a 256 -c -
unzip -q "$RUNNER_TEMP/glam-flutter-maestro.zip" -d "$RUNNER_TEMP/glam-flutter-maestro"
task_maestro_binary=$(find "$RUNNER_TEMP/glam-flutter-maestro" -path '*/bin/maestro' -type f -print -quit)
test -n "$task_maestro_binary"
chmod +x "$task_maestro_binary"
dirname "$task_maestro_binary" >> "$GITHUB_PATH"
"$task_maestro_binary" check-syntax apps/flutter_app/maestro/visual_gate.yaml
