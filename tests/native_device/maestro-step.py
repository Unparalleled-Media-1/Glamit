"""Bound a real native UI phase so failures retain evidence before job timeout."""

import os
import subprocess
import sys


def main():
    if os.environ.get("GLAM_NATIVE_DEVICE_JOURNEY") != "true":
        raise SystemExit("Only isolated native device acceptance may use this runner")
    seconds = int(sys.argv[1])
    if not 60 <= seconds <= 900:
        raise SystemExit("Invalid native UI phase timeout")
    try:
        result = subprocess.run(["maestro", *sys.argv[2:]], timeout=seconds)
    except subprocess.TimeoutExpired:
        print(
            "::error title=Native UI phase timeout::Actual native UI phase timed out; "
            "no acceptance pass is inferred",
            flush=True,
        )
        raise SystemExit(124) from None
    raise SystemExit(result.returncode)


if __name__ == "__main__":
    main()
