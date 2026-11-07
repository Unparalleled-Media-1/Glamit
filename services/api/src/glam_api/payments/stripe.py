import json
import re
import ssl
import time
from typing import Protocol
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import HTTPRedirectHandler, HTTPSHandler, ProxyHandler, Request, build_opener

from glam_api.payments.config import (
    PaymentDeclined,
    PaymentError,
    StripeTestConfig,
    eligible_account,
)


class Gateway(Protocol):
    def call(
        self, method: str, path: str, fields: dict | None = None, key: str | None = None
    ) -> dict: ...


def form_fields(values, prefix=""):
    pairs = []
    if isinstance(values, dict):
        for k, v in values.items():
            pairs.extend(form_fields(v, f"{prefix}[{k}]" if prefix else k))
    elif isinstance(values, list | tuple):
        for i, value in enumerate(values):
            pairs.extend(form_fields(value, f"{prefix}[{i}]"))
    elif values is not None:
        pairs.append((prefix, str(values).lower() if isinstance(values, bool) else str(values)))
    return pairs


class StripeTestGateway:
    """Pinned Stripe API, strict test key, verified TLS/proxy, no redirect/secret logging."""

    def __init__(self, config: StripeTestConfig, sleep=time.sleep):
        self.config, self.sleep = config, sleep

    def call(self, method, path, fields=None, key=None):
        if not re.fullmatch(r"/v1/[a-z_]+(?:/[A-Za-z0-9_]+){0,3}", path):
            raise PaymentError("invalid_stripe_path")
        if method not in {"GET", "POST"} or (method == "POST" and not key):
            raise PaymentError("mutation_requires_idempotency_key")
        headers = {
            "Authorization": "Bearer " + self.config.secret.get_secret_value(),
            "Stripe-Version": self.config.api_version,
            "Content-Type": "application/x-www-form-urlencoded",
        }
        if key:
            headers["Idempotency-Key"] = key
        encoded = urlencode(form_fields(fields or {})).encode()
        url = "https://api.stripe.com" + path
        if method == "GET" and encoded:
            url += "?" + encoded.decode()

        class NoRedirect(HTTPRedirectHandler):
            def redirect_request(self, req, fp, code, msg, headers, newurl):
                raise PaymentError("stripe_redirect_rejected")

        attempts = 3 if method == "GET" else 1
        for attempt in range(attempts):
            try:
                opener = build_opener(
                    ProxyHandler(), HTTPSHandler(context=ssl.create_default_context()), NoRedirect()
                )
                with opener.open(
                    Request(
                        url,
                        method=method,
                        headers=headers,
                        data=encoded if method == "POST" else None,
                    ),
                    timeout=20,
                ) as r:
                    body = r.read(2 * 1024 * 1024 + 1)
                if len(body) > 2 * 1024 * 1024:
                    raise PaymentError("stripe_response_too_large")
                value = json.loads(body)
                if not isinstance(value, dict):
                    raise PaymentError("invalid_stripe_response")
                if value.get("livemode") is True:
                    raise PaymentError("live_stripe_object_rejected")
                return value
            except HTTPError as exc:
                if exc.code == 402:
                    try:
                        error = json.loads(exc.read(2 * 1024 * 1024))
                        pi = error.get("error", {}).get("payment_intent", {})
                        identifier = pi.get("id", "")
                        if pi.get("livemode") is False and re.fullmatch(
                            r"pi_[A-Za-z0-9]+", identifier
                        ):
                            raise PaymentDeclined(identifier)
                    except (json.JSONDecodeError, TypeError, AttributeError):
                        pass
                    finally:
                        exc.close()
                    raise PaymentError("stripe_payment_failure_requires_reconciliation") from None
                retryable = exc.code in {429, 500, 502, 503, 504}
                exc.close()
                if method != "GET" or not retryable or attempt == attempts - 1:
                    raise PaymentError("stripe_api_request_failed") from None
            except (URLError, OSError, TimeoutError):
                if method != "GET" or attempt == attempts - 1:
                    raise PaymentError("stripe_transport_unknown_result") from None
            except PaymentError:
                raise
            except (ValueError, UnicodeError):
                raise PaymentError("invalid_stripe_response") from None
            self.sleep(0.25 * 2**attempt)
        raise PaymentError("stripe_api_request_failed")


def verify_platform(gateway: Gateway, config: StripeTestConfig):
    platform = gateway.call("GET", "/v1/account")
    if (
        platform.get("id") != config.platform
        or platform.get("country") != "US"
        or not platform.get("charges_enabled")
    ):
        raise PaymentError("platform_identity_or_charge_capability_mismatch")
    results = []
    for account_id in config.connected:
        account = gateway.call("GET", "/v1/accounts/" + account_id)
        eligible_account(account, config.platform, config.connected)
        results.append(
            {
                "id": account_id,
                "country": account["country"],
                "capabilities": account["capabilities"],
                "charges_enabled": account["charges_enabled"],
                "payouts_enabled": account["payouts_enabled"],
            }
        )
    return {
        "platform": config.platform,
        "connected_accounts": results,
        "scope": "test API connectivity/capabilities only; not live or global approval",
    }
