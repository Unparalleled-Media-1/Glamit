"""No secret values, provider bodies, private media or exception strings enter public status.

These adapters are internal and unmounted: they do not bypass existing auth/consent,
change the database, initiate payments or make the client operational.
"""

import json
import os
import ssl
import time
from dataclasses import dataclass, field
from enum import StrEnum
from typing import Any, Protocol
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode, urlparse
from urllib.request import Request

from pydantic import SecretStr


class State(StrEnum):
    NOT_CONFIGURED = "NOT CONFIGURED"
    CONNECTED = "CONNECTED"
    DEGRADED = "DEGRADED"


class IntegrationError(Exception):
    """Stable safe code only. Never include remote bodies, URLs, keys or image contents."""

    def __init__(self, code: str, *, retryable: bool = False):
        super().__init__(code)
        self.code = code
        self.retryable = retryable


class Transport(Protocol):
    def send(
        self, method: str, url: str, headers: dict[str, str], body: dict | None = None
    ) -> dict: ...


@dataclass
class HttpTransport:
    """Trust inherited proxy/CA configuration. No redirects or automatic billable retries."""

    timeout: float = 20
    sleep: Any = time.sleep

    def send(self, method, url, headers, body=None):
        # Fixed provider origins are selected by adapters, never by public request data.
        if urlparse(url).scheme != "https":
            raise IntegrationError("insecure_provider_url")
        attempts = 3 if method == "GET" else 1
        for attempt in range(attempts):
            req = Request(
                url,
                method=method,
                headers={"Content-Type": "application/json", **headers},
                data=json.dumps(body).encode() if body is not None else None,
            )
            try:
                # Block redirects before a credential can be forwarded to another host.
                from urllib.request import (
                    HTTPRedirectHandler,
                    HTTPSHandler,
                    ProxyHandler,
                    build_opener,
                )

                class NoRedirect(HTTPRedirectHandler):
                    def redirect_request(self, req, fp, code, msg, headers, newurl):
                        raise IntegrationError("provider_redirect_rejected")

                opener = build_opener(
                    ProxyHandler(), HTTPSHandler(context=ssl.create_default_context()), NoRedirect()
                )
                with opener.open(req, timeout=self.timeout) as response:
                    raw = response.read(4 * 1024 * 1024 + 1)
                    if len(raw) > 4 * 1024 * 1024:
                        raise IntegrationError("provider_response_too_large")
                    result = json.loads(raw)
                    if not isinstance(result, dict):
                        raise IntegrationError("invalid_provider_response")
                    return result
            except HTTPError as exc:
                retryable = exc.code in {408, 429, 500, 502, 503, 504}
                failure = IntegrationError(
                    "provider_auth_rejected"
                    if exc.code in {401, 403}
                    else "provider_request_failed",
                    retryable=retryable,
                )
                exc.close()
            except (URLError, TimeoutError, OSError):
                failure = IntegrationError("provider_unavailable", retryable=True)
            except (ValueError, UnicodeError):
                raise IntegrationError("invalid_provider_response") from None
            if not failure.retryable or attempt + 1 >= attempts:
                raise failure from None
            self.sleep(min(0.25 * 2**attempt, 1))
        raise IntegrationError("provider_unavailable")


@dataclass(frozen=True)
class ServiceSpec:
    name: str
    secrets: tuple[str, ...]
    gate: str | None = None


SERVICES = (
    ServiceSpec("openai", ("OPENAI_API_KEY",)),
    ServiceSpec("replicate", ("REPLICATE_API_TOKEN",)),
    ServiceSpec("fashn", ("FASHN_API_KEY",)),
    ServiceSpec("supabase", ("SUPABASE_URL", "SUPABASE_ANON_KEY"), "G0 approval"),
    ServiceSpec("stripe", ("STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"), "commercial activation"),
    ServiceSpec("peach", ("PEACH_ENTITY_ID", "PEACH_ACCESS_TOKEN"), "commercial activation"),
    ServiceSpec("google_maps", ("GOOGLE_MAPS_API_KEY",)),
    ServiceSpec("open_meteo", (), "weather license and commercial entitlement"),
    ServiceSpec("resend", ("RESEND_API_KEY",)),
    ServiceSpec("twilio", ("TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN")),
    ServiceSpec("sentry", ("SENTRY_DSN",)),
    ServiceSpec("booking", (), "GLAM booking engine and canonical schema approval"),
    ServiceSpec("google_calendar", (), "optional professional OAuth consent"),
)


@dataclass
class ProviderConfig:
    values: dict[str, SecretStr] = field(default_factory=dict, repr=False)
    openai_model: str = ""
    fashn_model: str = ""
    private_image_origins: tuple[str, ...] = ()
    weather_license_approved: bool = False

    @classmethod
    def from_environment(cls):
        # Do not read .env, invent credentials, change auth or initialize Supabase.
        names = {name for spec in SERVICES for name in spec.secrets}
        values = {k: SecretStr(os.environ[k]) for k in names if os.environ.get(k, "").strip()}
        # Managed environments reserve OPENAI_* binding names. Keep the normal
        # deployment convention while accepting a server-only secret alias.
        if "OPENAI_API_KEY" not in values and os.environ.get("GLAM_OPENAI_API_KEY", "").strip():
            values["OPENAI_API_KEY"] = SecretStr(os.environ["GLAM_OPENAI_API_KEY"])
        return cls(
            values=values,
            openai_model=os.environ.get("GLAM_OPENAI_MODEL", ""),
            fashn_model=os.environ.get("GLAM_FASHN_MODEL", ""),
            private_image_origins=tuple(
                x.strip()
                for x in os.environ.get("GLAM_PRIVATE_IMAGE_ORIGINS", "").split(",")
                if x.strip()
            ),
            weather_license_approved=os.environ.get("GLAM_WEATHER_LICENSE_APPROVED") == "true",
        )

    def secret(self, name: str) -> str:
        if name not in self.values:
            raise IntegrationError("not_configured")
        value = self.values[name].get_secret_value()
        if not value.strip() or "\r" in value or "\n" in value:
            raise IntegrationError("invalid_configuration")
        return value


@dataclass
class Readiness:
    service: str
    configured: bool
    state: State = State.NOT_CONFIGURED
    reason: str = "authenticated health check not run"

    def public(self):
        return {
            "service": self.service,
            "configured": self.configured,
            "state": self.state.value,
            "reason": self.reason,
        }


def readiness(config: ProviderConfig) -> list[Readiness]:
    result = []
    for spec in SERVICES:
        configured = bool(spec.secrets) and all(k in config.values for k in spec.secrets)
        gate = spec.gate
        if spec.name == "openai" and not config.openai_model:
            gate = "qualified analysis model configuration"
        if spec.name == "fashn" and not config.fashn_model:
            gate = "qualified try-on model configuration"
        if spec.name == "open_meteo":
            configured = config.weather_license_approved
        reason = (
            ("credentials absent; " if spec.secrets and not configured else "") + f"blocked: {gate}"
            if gate
            else ("authenticated health check not run" if configured else "credentials absent")
        )
        result.append(Readiness(spec.name, configured, reason=reason))
    return result


class Adapter:
    key_name = ""
    origin = ""

    def __init__(self, config: ProviderConfig, transport: Transport | None = None):
        self.config = config
        self.transport = transport or HttpTransport()

    def auth(self):
        return {"Authorization": "Bearer " + self.config.secret(self.key_name)}

    def call(self, method: str, path: str, body: dict | None = None):
        try:
            return self.transport.send(method, self.origin + path, self.auth(), body)
        except IntegrationError:
            raise
        except Exception:
            raise IntegrationError("provider_unavailable") from None

    def health(self) -> Readiness:
        raise NotImplementedError

    def probe(self, service: str, path: str, validate) -> Readiness:
        try:
            self.config.secret(self.key_name)
        except IntegrationError:
            return Readiness(service, False, reason="credentials absent or invalid")
        try:
            result = self.call("GET", path)
            if not validate(result):
                raise IntegrationError("invalid_health_response")
            return Readiness(service, True, State.CONNECTED, "authenticated API check passed")
        except IntegrationError:
            return Readiness(service, True, State.DEGRADED, "authenticated API check failed")

    def private_image(self, value: str):
        p = urlparse(value)
        if (
            p.scheme != "https"
            or p.username
            or p.password
            or p.fragment
            or f"https://{p.netloc}" not in self.config.private_image_origins
        ):
            raise IntegrationError("private_image_origin_rejected")
        return value


def query(values: dict) -> str:
    return "?" + urlencode(values)
