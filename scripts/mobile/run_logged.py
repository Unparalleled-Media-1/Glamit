"""Run credential-free native verification commands with retained failure evidence.

Use only for test builds, never commands supplied with production secrets.
"""

import subprocess
import sys
import time
from pathlib import Path


def main():
    target = Path(sys.argv[1])
    target.parent.mkdir(parents=True, exist_ok=True)
    with target.open("w") as output:
        process = subprocess.Popen(sys.argv[2:], stdout=output, stderr=subprocess.STDOUT)
        # Tail the retained file while the command runs. A pipe can remain open
        # in detached native driver processes after their parent has exited.
        with target.open(errors="replace") as reader:
            while process.poll() is None:
                print(reader.read(), end="", flush=True)
                time.sleep(0.2)
            print(reader.read(), end="", flush=True)
        status = process.wait()
    content = target.read_text(errors="replace")
    if status:
        tail = content[-4000:].replace("%", "%25").replace("\r", "%0D").replace("\n", "%0A")
        print(f"::error title=Native verification command failed::{tail}")
    raise SystemExit(status)


if __name__ == "__main__":
    main()
