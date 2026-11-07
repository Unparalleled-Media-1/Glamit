import os
import re
from dataclasses import dataclass, field
from urllib.parse import urlparse

from pydantic import SecretStr
from sqlalchemy.engine import make_url


class PaymentError(ValueError):
    """Safe stable codes only; never provider bodies, credentials or card details."""


class PaymentDeclined(PaymentError):
    def __init__(self, payment_id):
        super().__init__("stripe_test_payment_declined")
        self.payment_id = payment_id


LEGAL_ENTITY = {
    "name": "Zanzu Technologies Inc.",
    "brand": "GLAM AI",
    "country": "US",
    "state": "DE",
    "bank": "Mercury (user reported; not independently verified)",
    "merchant_of_record": "contractual determination pending; no universal MoR assertion",
}


@dataclass(frozen=True)
class StripeTestConfig:
    secret: SecretStr = field(repr=False)
    webhook_secret: SecretStr = field(repr=False)
    platform: str
    connected: tuple[str, ...]
    database_url: str = field(repr=False)
    return_url: str = "https://example.invalid/stripe-test/return"
    refresh_url: str = "https://example.invalid/stripe-test/refresh"
    api_version: str = "2024-06-20"

    def __post_init__(self):
        if not self.secret.get_secret_value().startswith(("sk_test_", "rk_test_")):
            raise PaymentError("stripe_test_key_required")
        if not self.webhook_secret.get_secret_value().startswith("whsec_"):
            raise PaymentError("stripe_webhook_secret_required")
        if not re.fullmatch(r"acct_[A-Za-z0-9]+", self.platform):
            raise PaymentError("platform_account_required")
        if (
            not self.connected
            or any(
                not re.fullmatch(r"acct_[A-Za-z0-9]+", a) or a == self.platform
                for a in self.connected
            )
            or len(set(self.connected)) != len(self.connected)
        ):
            raise PaymentError("distinct_connected_test_accounts_required")
        target = make_url(self.database_url)
        if target.drivername != "postgresql+psycopg" or not (target.database or "").endswith(
            "_test"
        ):
            raise PaymentError("isolated_postgresql_test_database_required")
        if target.host not in {"localhost", "127.0.0.1", "postgres"}:
            raise PaymentError("sandbox_requires_local_test_database")
        for value in [self.return_url, self.refresh_url]:
            u = urlparse(value)
            if u.scheme != "https" or u.username or u.password or u.query or u.fragment:
                raise PaymentError("fixed_https_onboarding_return_required")
        for value in [self.secret.get_secret_value(), self.webhook_secret.get_secret_value()]:
            if "\r" in value or "\n" in value:
                raise PaymentError("invalid_secret_configuration")

    @classmethod
    def from_environment(cls):
        required = [
            "STRIPE_SECRET_KEY",
            "STRIPE_WEBHOOK_SECRET",
            "STRIPE_ACCOUNT_ID",
            "STRIPE_TEST_CONNECTED_ACCOUNT_ID",
            "STRIPE_TEST_DATABASE_URL",
            "STRIPE_TEST_RETURN_URL",
            "STRIPE_TEST_REFRESH_URL",
        ]
        if any(not os.environ.get(k) for k in required):
            raise PaymentError("stripe_test_configuration_incomplete")
        accounts = [os.environ["STRIPE_TEST_CONNECTED_ACCOUNT_ID"]]
        accounts.extend(
            a.strip()
            for a in os.environ.get("STRIPE_TEST_ADDITIONAL_CONNECTED_ACCOUNT_IDS", "").split(",")
            if a.strip()
        )
        return cls(
            SecretStr(os.environ[required[0]]),
            SecretStr(os.environ[required[1]]),
            os.environ[required[2]],
            tuple(accounts),
            os.environ[required[4]],
            os.environ[required[5]],
            os.environ[required[6]],
        )


def eligible_account(account: dict, platform: str, approved: tuple[str, ...]):
    # Country/currency policy is deliberately US->US/USD sandbox-only until real eligibility
    # evidence.
    if account.get("id") not in approved or account.get("id") == platform:
        raise PaymentError("unapproved_connected_account")
    capabilities = account.get("capabilities", {})
    if (
        account.get("country") != "US"
        or not account.get("charges_enabled")
        or not account.get("payouts_enabled")
        or capabilities.get("card_payments") != "active"
        or capabilities.get("transfers") != "active"
    ):
        raise PaymentError("merchant_capabilities_not_eligible")
