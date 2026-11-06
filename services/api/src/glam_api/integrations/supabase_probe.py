"""Explicit read-only development API probe. No DB, auth mutation, SDK or migrations."""

import base64
import json
import os
import re
from dataclasses import dataclass, field

from pydantic import SecretStr

from glam_api.integrations.runtime import HttpTransport, IntegrationError, State, Transport


@dataclass
class SupabaseReadOnlyProbe:
    url: str
    public_key: SecretStr = field(repr=False)
    environment: str = ""
    transport: Transport = field(default_factory=HttpTransport, repr=False)

    @classmethod
    def from_environment(cls):
        # Process environment only. Never read a .env or a service-role/DB credential.
        return cls(
            url=os.environ.get("SUPABASE_URL", ""),
            public_key=SecretStr(os.environ.get("SUPABASE_ANON_KEY", "")),
            environment=os.environ.get("GLAM_SUPABASE_ENVIRONMENT", ""),
        )

    def check(self):
        report = {
            "service": "supabase",
            "scope": "development_auth_settings_api_only",
            "state": State.NOT_CONFIGURED.value,
            "reason": "credentials_absent",
            "database_connected": False,
            "application_connected": False,
            "migrations_applied": False,
            "production_activation": False,
        }
        if self.environment != "development":
            return report | {"reason": "development_environment_required"}
        key = self.public_key.get_secret_value()
        if not self.url or not key:
            return report
        # Pin the actual network origin: no custom paths, credentials, IPs or redirects.
        if not re.fullmatch(r"https://[a-z0-9]{20}\.supabase\.co/?", self.url):
            return report | {"reason": "invalid_public_project_url"}
        if "\r" in key or "\n" in key or not self._public_key(key):
            return report | {"reason": "public_key_required"}
        try:
            response = self.transport.send(
                "GET", self.url.rstrip("/") + "/auth/v1/settings", {"apikey": key}
            )
            # Inspect the authenticated gateway response, not an HTML dashboard or liveness page.
            if not isinstance(response, dict) or not isinstance(response.get("external"), dict):
                raise IntegrationError("invalid_provider_response")
            return report | {
                "state": State.CONNECTED.value,
                "reason": "authenticated_development_api_check_passed",
            }
        except IntegrationError as error:
            return report | {"state": State.DEGRADED.value, "reason": error.code}
        except Exception:
            # Never expose exception text, provider bodies or secret values.
            return report | {"state": State.DEGRADED.value, "reason": "provider_unavailable"}

    @staticmethod
    def _public_key(key):
        if key.startswith("sb_publishable_") and len(key) > len("sb_publishable_"):
            return True
        # Inspect only to refuse privileged JWTs; the server still authenticates the key.
        parts = key.split(".")
        if len(parts) != 3:
            return False
        try:
            claims = json.loads(base64.urlsafe_b64decode(parts[1] + "=" * (-len(parts[1]) % 4)))
            return isinstance(claims, dict) and claims.get("role") == "anon"
        except (ValueError, UnicodeError):
            return False
