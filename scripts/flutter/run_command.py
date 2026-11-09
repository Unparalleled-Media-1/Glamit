"""Retain credential-free F1 build/test output and expose bounded failure evidence."""

import subprocess
import sys
import time
from pathlib import Path


def main():
    target = Path(sys.argv[1])
    target.parent.mkdir(parents=True, exist_ok=True)
    with target.open("w") as output, target.open(errors="replace") as reader:
        process = subprocess.Popen(sys.argv[2:], stdout=output, stderr=subprocess.STDOUT)
        while process.poll() is None:
            print(reader.read(), end="", flush=True)
            time.sleep(0.2)
        print(reader.read(), end="", flush=True)
    if process.returncode:
        content = target.read_text(errors="replace")
        for label, part in [("first", content[:5000]), ("last", content[-5000:])]:
            escaped = part.replace("%", "%25").replace("\r", "%0D").replace("\n", "%0A")
            print(f"::error title=Flutter F1 {label} failure evidence::{escaped}")
    raise SystemExit(process.returncode)


if __name__ == "__main__":
    main()
