"""Run credential-free native verification commands with retained failure evidence.

Use only for test builds, never commands supplied with production secrets.
"""

import subprocess
import sys
from pathlib import Path


def main():
    target = Path(sys.argv[1])
    target.parent.mkdir(parents=True, exist_ok=True)
    with target.open("w") as output:
        result = subprocess.run(sys.argv[2:], stdout=output, stderr=subprocess.STDOUT)
    content = target.read_text(errors="replace")
    print(content, end="")
    if result.returncode:
        tail = content[-4000:].replace("%", "%25").replace("\r", "%0D").replace("\n", "%0A")
        print(f"::error title=Native verification command failed::{tail}")
    raise SystemExit(result.returncode)


if __name__ == "__main__":
    main()
