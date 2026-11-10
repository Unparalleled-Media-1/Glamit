#!/usr/bin/env bash
set -euo pipefail
curl --fail --location --retry 2 --output "$RUNNER_TEMP/analyze-maestro.zip" https://github.com/mobile-dev-inc/Maestro/releases/download/cli-2.12.1/maestro.zip
printf '%s  %s\n' 54dbb0716425626604973cbb374c585ca30272375d9ce15177a1152765ddd9d7 "$RUNNER_TEMP/analyze-maestro.zip" | shasum -a 256 -c -
unzip -q "$RUNNER_TEMP/analyze-maestro.zip" -d "$RUNNER_TEMP/analyze-maestro"
task_maestro_binary=$(find "$RUNNER_TEMP/analyze-maestro" -path '*/bin/maestro' -type f -print -quit)
chmod +x "$task_maestro_binary"
dirname "$task_maestro_binary" >> "$GITHUB_PATH"
"$task_maestro_binary" check-syntax apps/glam_mobile/maestro/android.yaml
"$task_maestro_binary" check-syntax apps/glam_mobile/maestro/ios.yaml
