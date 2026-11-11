"""Approved pricing and isolated hosted-payment contracts; no real card/provider calls."""

import json
from copy import deepcopy
from datetime import UTC, datetime, timedelta
from decimal import Decimal
from pathlib import Path
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from glam_api.main import app
from glam_api.payments.config import PaymentError
from glam_api.subscriptions import (
    PLANS,
    SubscriptionCatalog,
    SubscriptionTestCheckout,
    local_equivalent,
)

OWNER = uuid4()


class BillingDouble:
    """Explicit, isolated provider response fixture; never imported by runtime."""

    def __init__(self):
        self.calls = []
        self.customer = {
            "id": "cus_fixture",
            "livemode": False,
            "metadata": {"glam_owner": str(OWNER)},
        }
        self.price = {
            "id": "price_monthly",
            "active": True,
            "livemode": False,
            "unit_amount": 150,
            "currency": "usd",
            "billing_scheme": "per_unit",
            "recurring": {"interval": "month", "interval_count": 1, "usage_type": "licensed"},
        }
        self.session_change = {}

    def call(self, method, path, fields=None, key=None):
        self.calls.append((method, path, deepcopy(fields), key))
        if path.startswith("/v1/customers/"):
            return self.customer
        if path.startswith("/v1/prices/"):
            return self.price
        assert method == "POST" and path == "/v1/checkout/sessions" and key
        return {
            "id": "cs_test_fixture",
            "livemode": False,
            "mode": fields["mode"],
            "customer": fields["customer"],
            "url": "https://checkout.stripe.com/c/pay/fixture",
            **self.session_change,
        }


def adapter(gateway):
    return SubscriptionTestCheckout(
        gateway,
        {"glam_monthly": "price_monthly", "glam_yearly": "price_yearly"},
        "https://www.glam.beauty/profile",
    )


def test_approved_prices_public_export_and_api_agree_without_a_database_or_secret():
    expected = SubscriptionCatalog().model_dump(mode="json")
    assert [(p.amount_minor, p.interval) for p in PLANS] == [(150, "month"), (1500, "year")]
    assert expected["yearly_saving_usd_minor"] == 12 * 150 - 1500
    assert json.loads(Path("packages/product/subscription-pricing.json").read_text()) == expected
    with TestClient(app) as client:
        result = client.get("/v1/subscription-plans")
    assert result.status_code == 200 and result.json() == expected
    assert result.json()["purchase_enabled"] is False


@pytest.mark.parametrize(
    "currency,rate,exponent,expected",
    [
        ("ZAR", "18.1234", 2, 2719),
        ("JPY", "150.5", 0, 226),
        ("KWD", "0.3065", 3, 460),
        ("USD", "1", 2, 150),
    ],
)
def test_equivalent_uses_fresh_rates_and_actual_currency_exponents(
    currency, rate, exponent, expected
):
    now = datetime.now(UTC)
    quote = local_equivalent(
        "glam_monthly", currency, Decimal(rate), exponent, now, source="isolated test rate", now=now
    )
    assert quote["amount_minor"] == expected and quote["indicative_only"] is True


@pytest.mark.parametrize(
    "rate,age", [("0", 0), ("-1", 0), ("NaN", 0), ("Infinity", 0), ("1", 25), ("1", -1)]
)
def test_invalid_or_stale_rates_never_become_published_equivalents(rate, age):
    now = datetime.now(UTC)
    with pytest.raises(PaymentError, match="qualified_currency_quote_required"):
        local_equivalent(
            "glam_monthly",
            "EUR",
            Decimal(rate),
            2,
            now - timedelta(hours=age),
            source="test",
            now=now,
        )


def test_subscription_uses_verified_fixed_price_and_provider_card_vault_only():
    gateway = BillingDouble()
    result = adapter(gateway).subscribe(
        OWNER, "cus_fixture", "glam_monthly", uuid4(), recurring_consent=True
    )
    fields = gateway.calls[-1][2]
    assert fields["line_items"] == [{"price": "price_monthly", "quantity": 1}]
    assert fields["mode"] == "subscription" and fields["payment_method_collection"] == "always"
    assert "US$1.50 every month" in fields["custom_text"]["submit"]["message"]
    assert "application_fee_percent" not in json.dumps(fields)
    assert result["entitlement_granted"] is False


def test_yearly_checkout_validates_the_full_yearly_price_not_a_monthly_display_rate():
    gateway = BillingDouble()
    gateway.price.update(
        id="price_yearly",
        unit_amount=1500,
        recurring={"interval": "year", "interval_count": 1, "usage_type": "licensed"},
    )
    adapter(gateway).subscribe(OWNER, "cus_fixture", "glam_yearly", uuid4(), recurring_consent=True)
    assert "US$15.00 every year" in gateway.calls[-1][2]["custom_text"]["submit"]["message"]


@pytest.mark.parametrize(
    "changes",
    [
        {"livemode": True},
        {"unit_amount": 1500},
        {"currency": "eur"},
        {"active": False},
        {"unit_amount": 150.0},
        {"recurring": {"interval": "year", "interval_count": 1}},
        {"recurring": ["invalid"]},
    ],
)
def test_wrong_or_live_prices_cannot_start_checkout(changes):
    gateway = BillingDouble()
    gateway.price.update(changes)
    with pytest.raises(PaymentError, match="subscription_price_does_not_match"):
        adapter(gateway).subscribe(
            OWNER, "cus_fixture", "glam_monthly", uuid4(), recurring_consent=True
        )
    assert not any(call[0] == "POST" for call in gateway.calls)


def test_another_accounts_card_vault_cannot_be_used():
    gateway = BillingDouble()
    gateway.customer["metadata"]["glam_owner"] = str(uuid4())
    with pytest.raises(PaymentError, match="server_customer_binding_required"):
        adapter(gateway).save_card(OWNER, "cus_fixture", uuid4(), consent=True)
    assert not any(call[0] == "POST" for call in gateway.calls)


def test_missing_customer_binding_metadata_fails_closed_before_card_setup():
    gateway = BillingDouble()
    gateway.customer["metadata"] = None
    with pytest.raises(PaymentError, match="server_customer_binding_required"):
        adapter(gateway).save_card(OWNER, "cus_fixture", uuid4(), consent=True)
    assert not any(call[0] == "POST" for call in gateway.calls)


def test_recurring_and_optional_card_saving_each_require_explicit_consent():
    gateway = BillingDouble()
    with pytest.raises(PaymentError, match="explicit_recurring_consent"):
        adapter(gateway).subscribe(
            OWNER, "cus_fixture", "glam_monthly", uuid4(), recurring_consent=False
        )
    with pytest.raises(PaymentError, match="explicit_card_saving_consent"):
        adapter(gateway).save_card(OWNER, "cus_fixture", uuid4(), consent=False)
    assert gateway.calls == []


def test_optional_card_setup_does_not_create_a_charge_or_entitlement():
    gateway = BillingDouble()
    result = adapter(gateway).save_card(OWNER, "cus_fixture", uuid4(), consent=True)
    fields = gateway.calls[-1][2]
    assert fields["mode"] == "setup"
    assert fields["setup_intent_data"]["usage"] == "off_session"
    assert "line_items" not in fields and result["entitlement_granted"] is False


def test_untrusted_hosted_checkout_destinations_are_rejected():
    gateway = BillingDouble()
    gateway.session_change = {"url": "https://example.invalid/steal-card"}
    with pytest.raises(PaymentError, match="invalid_test_checkout_session"):
        adapter(gateway).save_card(OWNER, "cus_fixture", uuid4(), consent=True)
