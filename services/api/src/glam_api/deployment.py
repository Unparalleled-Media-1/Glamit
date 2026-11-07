"""Transport configuration only; identity, tenant authorization and finance stay unchanged."""

import os
import re
from urllib.parse import urlsplit


def cors_origins(value: str, production: bool = False) -> list[str]:
    origins = []
    for raw in value.split(","):
        raw = raw.strip()
        if not raw:
            continue
        parsed = urlsplit(raw)
        local = parsed.hostname in {"localhost", "127.0.0.1"}
        if (
            (
                parsed.scheme != "https"
                and not (parsed.scheme == "http" and local and not production)
            )
            or not parsed.hostname
            or parsed.username
            or parsed.password
            or parsed.path
            or (parsed.query or parsed.fragment)
        ):
            raise RuntimeError("EXPLICIT_WEB_ORIGIN_REQUIRED")
        if raw not in origins:
            origins.append(raw)
    return origins


def deployment_revision() -> str | None:
    value = os.environ.get("RAILWAY_GIT_COMMIT_SHA", "")
    return value if re.fullmatch(r"[a-fA-F0-9]{40}", value) else None
