"""Safe OpenAI configuration/model-access evidence; never sends prompts or photos."""

import argparse
import json
from pathlib import Path

from glam_api.integrations.providers import OpenAI
from glam_api.integrations.runtime import ProviderConfig, Readiness, readiness


def check(probe=False):
    config = ProviderConfig.from_environment()
    status = next(row for row in readiness(config) if row.service == "openai")
    if probe:
        status = (
            OpenAI(config).model_health()
            if config.openai_model
            else Readiness("openai", False, reason="model configuration required before probe")
        )
    return {
        **status.public(),
        "scope": "authenticated_model_access" if probe else "configuration_only",
        "live_advice_verification": "NOT RUN",
        "photo_analysis_verification": "NOT RUN",
        "production_changes": False,
        "model_configured": bool(config.openai_model),
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--probe", action="store_true", help="Read-only authenticated model GET")
    parser.add_argument("--report", type=Path)
    args = parser.parse_args()
    output = json.dumps(check(args.probe), indent=2) + "\n"
    if args.report:
        args.report.write_text(output)
    print(output, end="")
