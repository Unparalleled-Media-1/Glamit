"""Report configuration names/states only. No outbound calls or credential values."""

import json
from datetime import UTC, datetime

from glam_api.integrations.runtime import ProviderConfig, readiness

if __name__ == "__main__":
    print(
        json.dumps(
            {
                "mode": "configuration_only_no_provider_calls",
                "observed_at": datetime.now(UTC).isoformat(),
                "services": [r.public() for r in readiness(ProviderConfig.from_environment())],
                "gates": ["Supabase G0", "live commercial activation", "provider qualification"],
            },
            indent=2,
        )
    )
