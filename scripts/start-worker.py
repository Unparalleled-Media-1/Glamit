"""Railway entry point for the background services: same production guards as the API, no HTTP port.

Roles: privacy-worker (consent-withdrawal erasure, analysis and try-on job processing) and
media-cleanup (confirmed deletion of private Storage objects). No boot-time migrations.
"""

import importlib.util
import os
import sys
from pathlib import Path

ROLES = {"privacy-worker": "glam_api.worker", "media-cleanup": "glam_api.media_cleanup"}


def load_api_guards():
    spec = importlib.util.spec_from_file_location(
        "start_api", Path(__file__).with_name("start-api.py")
    )
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def command(role, environ):
    if role not in ROLES:
        raise RuntimeError("UNKNOWN_WORKER_ROLE")
    load_api_guards().runtime_options({**environ, "PORT": "8000"})  # database, OIDC and role guards
    return [sys.executable, "-m", ROLES[role]]


if __name__ == "__main__":
    argv = command(sys.argv[1] if len(sys.argv) > 1 else "", os.environ)
    os.execv(argv[0], argv)
