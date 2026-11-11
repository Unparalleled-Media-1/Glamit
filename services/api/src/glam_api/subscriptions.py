"""Approved USD pricing and provider-hosted card-vault contracts.

No subscription/entitlement is granted by Checkout creation or a return URL.
The test adapter is not mounted as a purchasing endpoint before billing readiness.
"""

import re
from datetime import UTC, datetime, timedelta
from decimal import ROUND_HALF_UP, Decimal
from typing import Literal
from urllib.parse import urlsplit
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from glam_api.payments.config import PaymentError
from glam_api.payments.stripe import Gateway
from glam_api.referrals import POLICY, ReferralPolicy


class SubscriptionPlan(BaseModel):
    model_config = ConfigDict(frozen=True)
    id: str
    currency: Literal["USD"] = "USD"
    amount_minor: int
    interval: Literal["month", "year"]
    interval_count: Literal[1] = 1


PLANS = (
    SubscriptionPlan(id="glam_monthly", amount_minor=150, interval="month"),
    SubscriptionPlan(id="glam_yearly", amount_minor=1500, interval="year"),
)


class SubscriptionCatalog(BaseModel):
    referral_program: ReferralPolicy = POLICY
    plans: tuple[SubscriptionPlan, ...] = PLANS
    yearly_saving_usd_minor: int = 300
    local_currency_policy: str = "provider_quoted_equivalent"
    card_storage: str = "payment_provider_only"
    purchase_state: Literal["NOT CONFIGURED"] = "NOT CONFIGURED"
    purchase_enabled: Literal[False] = False
    native_billing: str = "store_billing_where_required"


def plan_for(identifier: str) -> SubscriptionPlan:
    for plan in PLANS:
        if plan.id == identifier:
            return plan
    raise PaymentError("unknown_subscription_plan")


def local_equivalent(
    plan_id: str,
    currency: str,
    rate: Decimal,
    exponent: int,
    observed_at: datetime,
    *,
    source: str,
    now: datetime | None = None,
) -> dict:
    """Indicative quote from a trusted server rate source, never a charge amount.

    Currency support/exponent must come from that provider, not user input.
    No invented rate or universal two-decimal assumption is used.
    """
    current = now or datetime.now(UTC)
    if (
        not re.fullmatch(r"[A-Z]{3}", currency)
        or type(exponent) is not int
        or exponent not in range(5)
        or not isinstance(rate, Decimal)
        or not rate.is_finite()
        or rate <= 0
        or rate > Decimal("1000000000")
        or not source.strip()
        or len(source) > 100
        or observed_at.tzinfo is None
        or current.tzinfo is None
        or observed_at > current + timedelta(minutes=5)
        or current - observed_at > timedelta(hours=24)
        or (currency == "USD" and (rate != 1 or exponent != 2))
    ):
        raise PaymentError("qualified_currency_quote_required")
    amount = Decimal(plan_for(plan_id).amount_minor) / 100 * rate * (10**exponent)
    return {
        "plan_id": plan_id,
        "currency": currency,
        "minor_unit_exponent": exponent,
        "amount_minor": int(amount.quantize(Decimal(1), rounding=ROUND_HALF_UP)),
        "source": source,
        "observed_at": observed_at.isoformat(),
        "indicative_only": True,
        "notice": "Provider or card-issuer conversion, applicable fees and taxes may differ.",
    }


class SubscriptionTestCheckout:
    """Uses the existing strict Stripe TEST gateway; never handles raw card data.

    owner/customer bindings and price IDs are server-supplied, not checkout inputs.
    Customer persistence, signed billing webhooks, invoice reconciliation and store
    receipt verification remain prerequisites to mounting a purchasing API.
    """

    def __init__(self, gateway: Gateway, prices: dict[str, str], return_url: str):
        self.gateway, self.prices = gateway, dict(prices)
        u = urlsplit(return_url)
        if (
            u.scheme != "https"
            or not u.hostname
            or u.username
            or u.password
            or u.port
            or u.query
            or u.fragment
        ):
            raise PaymentError("fixed_billing_return_required")
        self.return_url = return_url

    def customer(self, owner: UUID, customer_id: str):
        if not isinstance(owner, UUID) or not re.fullmatch(r"cus_[A-Za-z0-9]+", customer_id):
            raise PaymentError("server_customer_binding_required")
        customer = self.gateway.call("GET", f"/v1/customers/{customer_id}")
        metadata = customer.get("metadata")
        if (
            customer.get("id") != customer_id
            or customer.get("livemode") is not False
            or customer.get("deleted")
            or not isinstance(metadata, dict)
            or metadata.get("glam_owner") != str(owner)
        ):
            raise PaymentError("server_customer_binding_required")

    def _session(self, fields: dict, request_key: UUID):
        if not isinstance(request_key, UUID):
            raise PaymentError("billing_idempotency_key_required")
        session = self.gateway.call("POST", "/v1/checkout/sessions", fields, str(request_key))
        url = urlsplit(session.get("url") or "")
        if (
            session.get("livemode") is not False
            or not re.fullmatch(r"cs_test_[A-Za-z0-9]+", session.get("id", ""))
            or session.get("customer") != fields["customer"]
            or session.get("mode") != fields["mode"]
            or url.scheme != "https"
            or url.hostname != "checkout.stripe.com"
            or url.username
            or url.password
            or url.port
        ):
            raise PaymentError("invalid_test_checkout_session")
        return {
            "session_id": session["id"],
            "url": session["url"],
            "entitlement_granted": False,
            "mode": "test",
        }

    def subscribe(
        self,
        owner: UUID,
        customer_id: str,
        plan_id: str,
        request_key: UUID,
        *,
        recurring_consent: bool,
    ):
        if recurring_consent is not True:
            raise PaymentError("explicit_recurring_consent_required")
        plan = plan_for(plan_id)
        price_id = self.prices.get(plan.id, "")
        if not re.fullmatch(r"price_[A-Za-z0-9]+", price_id):
            raise PaymentError("subscription_price_not_configured")
        self.customer(owner, customer_id)
        price = self.gateway.call("GET", f"/v1/prices/{price_id}")
        recurring = price.get("recurring") or {}
        if not isinstance(recurring, dict):
            raise PaymentError("subscription_price_does_not_match_approved_plan")
        if (
            price.get("id") != price_id
            or price.get("livemode") is not False
            or price.get("active") is not True
            or price.get("currency") != "usd"
            or type(price.get("unit_amount")) is not int
            or price["unit_amount"] != plan.amount_minor
            or price.get("billing_scheme") != "per_unit"
            or recurring.get("interval") != plan.interval
            or type(recurring.get("interval_count")) is not int
            or recurring.get("interval_count") != 1
            or recurring.get("usage_type") != "licensed"
        ):
            raise PaymentError("subscription_price_does_not_match_approved_plan")
        return self._session(
            {
                "mode": "subscription",
                "customer": customer_id,
                "payment_method_types": ["card"],
                "payment_method_collection": "always",
                "line_items": [{"price": price_id, "quantity": 1}],
                "success_url": self.return_url,
                "cancel_url": self.return_url,
                "client_reference_id": str(owner),
                "metadata": {"glam_owner": str(owner), "glam_plan": plan.id},
                "subscription_data": {"metadata": {"glam_owner": str(owner), "glam_plan": plan.id}},
                "custom_text": {
                    "submit": {
                        "message": (
                            f"US${plan.amount_minor / 100:.2f} every {plan.interval}. "
                            "Automatically renews until cancelled. "
                            "Stripe retains your card for renewal. "
                            "Applicable taxes and card-issuer conversion fees may apply."
                        )
                    }
                },
            },
            request_key,
        )

    def save_card(self, owner: UUID, customer_id: str, request_key: UUID, *, consent: bool):
        if consent is not True:
            raise PaymentError("explicit_card_saving_consent_required")
        self.customer(owner, customer_id)
        return self._session(
            {
                "mode": "setup",
                "customer": customer_id,
                "payment_method_types": ["card"],
                "success_url": self.return_url,
                "cancel_url": self.return_url,
                "setup_intent_data": {
                    "usage": "off_session",
                    "metadata": {"glam_owner": str(owner)},
                },
                "metadata": {"glam_owner": str(owner)},
                "custom_text": {
                    "submit": {
                        "message": (
                            "Save this card securely with Stripe for future authorized payments. "
                            "Saving a card does not start a subscription or charge you."
                        )
                    }
                },
            },
            request_key,
        )
