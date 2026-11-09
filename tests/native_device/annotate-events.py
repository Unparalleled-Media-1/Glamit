"""Only safe milestone names from isolated service events, never bodies/headers/IDs."""

import json
import os
import time
from pathlib import Path


def main():
    if os.environ.get("GLAM_NATIVE_DEVICE_JOURNEY") != "true":
        raise SystemExit("Isolated device runner only")
    source = Path("artifacts/native-device/services/events.jsonl")
    names = {
        "test_otp_requested": "Isolated OTP request received (no SMS sent)",
        "test_identity_authenticated": "Signed isolated test identity issued",
        "test_session_refreshed": "Isolated authenticated session refreshed",
        "deterministic_provider_running": "Deterministic test provider running (not OpenAI)",
        "deterministic_provider_returned": "Deterministic test provider returned (not OpenAI)",
        "postgres_passport_assertion": "Canonical PostgreSQL Passport assertion passed",
    }
    requests = {
        ("PUT", "/v1/media/{id}/content", 200): "Private test photo stored by API",
        ("POST", "/v1/analysis/jobs", 202): "Durable analysis job accepted by API",
        (
            "POST",
            "/v1/analysis/jobs/{id}/corrections",
            200,
        ): "User correction revision stored by API",
        ("PUT", "/v1/me/analysis-passport", 200): "Selected Style Passport saved by API",
    }
    while not source.exists():
        time.sleep(0.2)
    with source.open() as stream:
        while True:
            line = stream.readline()
            if not line:
                time.sleep(0.2)
                continue
            value = json.loads(line)
            label = names.get(value.get("event")) or requests.get(
                (value.get("method"), value.get("path"), value.get("status"))
            )
            if label:
                print("::notice title=Isolated native service milestone::" + label, flush=True)


if __name__ == "__main__":
    main()
