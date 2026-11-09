#!/usr/bin/env bash
# CI only, disposable local services. No production connection or credential is used.
set -euo pipefail
printf 'CI fixture guards: CI=%s stage=%s device_journey=%s\n' "${CI:-unset}" "${GLAM_BUILD_ENV:-unset}" "${GLAM_NATIVE_DEVICE_JOURNEY:-unset}"
case "${CI:-}" in 1|true) ;; *) exit 1 ;; esac
test "${GLAM_NATIVE_DEVICE_JOURNEY:-}" = true
mkdir -p artifacts/native-device
if [ "$(uname -s)" = Darwin ]; then
  if ! brew --prefix postgresql@17 >/dev/null 2>&1; then brew install postgresql@17; fi
  # Install the reviewed official source release without trusting a third-party tap.
  curl --fail --location --retry 2 --output "$RUNNER_TEMP/glam-applesimutils.tar.gz" https://github.com/wix/AppleSimulatorUtils/releases/download/0.9.12/AppleSimulatorUtils-0.9.12.tar.gz
  printf '%s  %s\n' 4d6d02311959388ff5c28e2f4781848dbe1ca07f34b1d81d273940e099020b09 "$RUNNER_TEMP/glam-applesimutils.tar.gz" | shasum -a 256 -c -
  mkdir -p "$RUNNER_TEMP/glam-applesimutils-source"
  tar -xzf "$RUNNER_TEMP/glam-applesimutils.tar.gz" -C "$RUNNER_TEMP/glam-applesimutils-source"
  task_apple_build=$(find "$RUNNER_TEMP/glam-applesimutils-source" -name buildForBrew.sh -type f -print -quit)
  test -n "$task_apple_build"
  (cd "$(dirname "$task_apple_build")" && bash ./buildForBrew.sh "$RUNNER_TEMP/glam-applesimutils-install")
  "$RUNNER_TEMP/glam-applesimutils-install/bin/applesimutils" --version
  echo "$RUNNER_TEMP/glam-applesimutils-install/bin" >> "$GITHUB_PATH"
  task_pg_bin="$(brew --prefix postgresql@17)/bin"
  "$task_pg_bin/initdb" -D "$RUNNER_TEMP/glam-native-pg" -U glam --auth=trust
  "$task_pg_bin/pg_ctl" -D "$RUNNER_TEMP/glam-native-pg" -l "$RUNNER_TEMP/glam-native-pg.log" -o '-h 127.0.0.1 -p 55439' start
  "$task_pg_bin/createdb" -h 127.0.0.1 -p 55439 -U glam glam_native_device_test
else
  docker run -d --name glam-native-fixture-db -e POSTGRES_USER=glam -e POSTGRES_PASSWORD=native_fixture_only -e POSTGRES_DB=glam_native_device_test -p 127.0.0.1:55439:5432 postgres:17-bookworm@sha256:839fbb5a4942a7758dd93e18b42ea5649807491a0545b5eeeb8f0b8bb11857a5
  for attempt in $(seq 1 30); do if docker exec glam-native-fixture-db pg_isready -U glam; then break; fi; sleep 1; done
fi
uv sync --frozen
export GLAM_NATIVE_TEST_DATABASE_URL='postgresql+psycopg://glam:native_fixture_only@127.0.0.1:55439/glam_native_device_test'
export GLAM_NATIVE_FIXTURE_ROOT="$PWD/artifacts/native-device/services"
.venv/bin/python tests/native_device/server.py > artifacts/native-device/server.txt 2>&1 &
echo "$!" > artifacts/native-device/server.pid
for attempt in $(seq 1 30); do
  if curl --fail --silent http://127.0.0.1:8765/__fixture/ready > artifacts/native-device/ready.json; then break; fi
  sleep 1
done
curl --fail --silent http://127.0.0.1:8765/__fixture/ready > artifacts/native-device/ready.json
.venv/bin/python - <<'PY'
from PIL import Image
Image.new('RGB',(600,800),'#f6c6d8').save('artifacts/native-device/test-photo.png')
PY
curl --fail --location --retry 2 --output "$RUNNER_TEMP/glam-maestro.zip" https://github.com/mobile-dev-inc/Maestro/releases/download/cli-2.12.1/maestro.zip
printf '%s  %s\n' 54dbb0716425626604973cbb374c585ca30272375d9ce15177a1152765ddd9d7 "$RUNNER_TEMP/glam-maestro.zip" | shasum -a 256 -c -
unzip -q "$RUNNER_TEMP/glam-maestro.zip" -d "$RUNNER_TEMP/glam-maestro"
task_maestro_binary=$(find "$RUNNER_TEMP/glam-maestro" -path '*/bin/maestro' -type f -print -quit)
test -n "$task_maestro_binary"
chmod +x "$task_maestro_binary"
dirname "$task_maestro_binary" >> "$GITHUB_PATH"
node tests/native_device/prepare-build.mjs
