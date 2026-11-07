"""Run only when explicitly invoked; never import into app startup or change database state."""

import json
import sys

from glam_api.integrations.supabase_probe import SupabaseReadOnlyProbe

if __name__ == "__main__":
    result = SupabaseReadOnlyProbe.from_environment().check()
    print(json.dumps(result, indent=2))
    sys.exit(0 if result["state"] == "CONNECTED" else 2)
