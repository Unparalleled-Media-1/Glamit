"""Export the implemented API contract without a database or external provider."""

import argparse
import json
from pathlib import Path

from glam_api.main import app

ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / "packages/contracts/openapi.json"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    output = json.dumps(app.openapi(), indent=2, sort_keys=True) + "\n"
    if args.check:
        if not TARGET.exists() or TARGET.read_text() != output:
            raise SystemExit("API contract drift: run uv run python scripts/export_contracts.py")
    else:
        TARGET.parent.mkdir(parents=True, exist_ok=True)
        TARGET.write_text(output)


if __name__ == "__main__":
    main()
