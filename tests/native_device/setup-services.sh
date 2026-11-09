#!/usr/bin/env bash
# CI only, disposable local services. No production connection or credential is used.
set -euo pipefail
printf 'CI fixture guards: CI=%s stage=%s device_journey=%s\n' "${CI:-unset}" "${GLAM_BUILD_ENV:-unset}" "${GLAM_NATIVE_DEVICE_JOURNEY:-unset}"
case "${CI:-}" in 1|true) ;; *) exit 1 ;; esac
test "${GLAM_NATIVE_DEVICE_JOURNEY:-}" = true
mkdir -p artifacts/native-device
if [ "$(uname -s)" = Darwin ]; then
  task_pg_bin="$(brew --prefix postgresql@17)/bin"
  if [ ! -x "$task_pg_bin/initdb" ]; then brew install postgresql@17; fi
  # Exact official0.9.12 source commit; no third-party tap trust changes.
  mkdir -p "$RUNNER_TEMP/glam-applesimutils-source"
  git -C "$RUNNER_TEMP/glam-applesimutils-source" init
  git -C "$RUNNER_TEMP/glam-applesimutils-source" remote add origin https://github.com/wix/AppleSimulatorUtils.git
  git -C "$RUNNER_TEMP/glam-applesimutils-source" fetch --depth=1 origin 73f9c36afd5208e2d71be1150e0c9bd26ac1ca71
  git -C "$RUNNER_TEMP/glam-applesimutils-source" checkout --detach FETCH_HEAD
  test "$(git -C "$RUNNER_TEMP/glam-applesimutils-source" rev-parse HEAD)" = 73f9c36afd5208e2d71be1150e0c9bd26ac1ca71
  git -C "$RUNNER_TEMP/glam-applesimutils-source" -c url.https://github.com/.insteadOf=git@github.com: submodule update --init --recursive --depth=1
  (cd "$RUNNER_TEMP/glam-applesimutils-source" && bash ./buildForBrew.sh "$RUNNER_TEMP/glam-applesimutils-install")
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
if ! curl --fail --silent http://127.0.0.1:8765/__fixture/ready > artifacts/native-device/ready.json; then
  tail -n 70 artifacts/native-device/server.txt
  exit 1
fi
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
