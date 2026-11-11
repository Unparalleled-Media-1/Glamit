"""Export public subscription prices from the server authority; no secrets or provider calls."""

import argparse
import json
from pathlib import Path

from glam_api.subscriptions import SubscriptionCatalog

TARGET = Path("packages/product/subscription-pricing.json")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    content = json.dumps(SubscriptionCatalog().model_dump(mode="json"), indent=2) + "\n"
    if args.check:
        if not TARGET.exists() or TARGET.read_text() != content:
            raise SystemExit("Subscription pricing drift; regenerate the public catalog")
    else:
        TARGET.write_text(content)
