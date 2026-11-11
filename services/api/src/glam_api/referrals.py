"""Server-only referral month awards; unverified browser events never qualify.

No public award endpoint, invitation verification or billing redemption is enabled.
Qualification adapters must verify the referred person's first successful subscription payment.
"""

from dataclasses import dataclass
from datetime import datetime
from typing import Literal
from uuid import UUID, uuid4

from pydantic import BaseModel, ConfigDict
from sqlalchemy import text

from glam_api.payments.config import PaymentError

Qualification = Literal["first_subscription_payment"]


class ReferralPolicy(BaseModel):
    model_config = ConfigDict(frozen=True)
    version: str = "refer-one-month-v1"
    months_per_person: Literal[1] = 1
    stackable: Literal[True] = True
    qualifying_event: Qualification | None = "first_subscription_payment"
    program_state: Literal["NOT CONFIGURED"] = "NOT CONFIGURED"


POLICY = ReferralPolicy()


@dataclass(frozen=True)
class QualifiedReferral:
    """Internal verified-event contract, never constructed from a public request body.

    The future trusted adapter must authenticate the event, resolve the original
    attribution and first-payment/unique-person checks; this type is not that proof.
    """

    referrer_id: UUID
    referred_id: UUID
    source_event_id: str
    kind: Qualification
    attributed_at: datetime
    account_created_at: datetime
    qualified_at: datetime
    first_paid_subscription: bool = False
    paid_amount_minor: int = 0


def award_month(db, proof: QualifiedReferral, *, policy: ReferralPolicy = POLICY) -> dict:
    if policy.qualifying_event is None:
        raise PaymentError("referral_qualification_not_configured")
    if proof.kind != policy.qualifying_event:
        raise PaymentError("referral_event_not_qualified")
    if policy.qualifying_event == "first_subscription_payment" and (
        proof.first_paid_subscription is not True
        or type(proof.paid_amount_minor) is not int
        or proof.paid_amount_minor <= 0
    ):
        raise PaymentError("first_successful_subscription_payment_required")
    if (
        not isinstance(proof.referrer_id, UUID)
        or not isinstance(proof.referred_id, UUID)
        or proof.referrer_id == proof.referred_id
    ):
        raise PaymentError("self_or_invalid_referral_rejected")
    if (
        not proof.source_event_id.strip()
        or len(proof.source_event_id) > 240
        or any(
            v.tzinfo is None
            for v in [proof.attributed_at, proof.account_created_at, proof.qualified_at]
        )
        or proof.attributed_at > proof.qualified_at
        or proof.account_created_at > proof.qualified_at
    ):
        raise PaymentError("attribution_before_first_payment_required")
    values = {
        "id": uuid4(),
        "referrer": proof.referrer_id,
        "referred": proof.referred_id,
        "event": proof.source_event_id,
        "kind": proof.kind,
        "policy": policy.version,
    }
    inserted = db.execute(
        text("""
        INSERT INTO public.subscription_referral_award
          (id,referrer_id,referred_id,source_event_id,qualification_kind,policy_version,reward_months)
        VALUES(:id,:referrer,:referred,:event,:kind,:policy,1)
        ON CONFLICT DO NOTHING RETURNING id
    """),
        values,
    ).scalar_one_or_none()
    if inserted:
        return {"id": str(inserted), "months": 1, "new_award": True}
    existing = (
        db.execute(
            text("""
        SELECT id,referrer_id,referred_id,source_event_id,qualification_kind,policy_version
        FROM public.subscription_referral_award
        WHERE referred_id=:referred OR source_event_id=:event
    """),
            values,
        )
        .mappings()
        .all()
    )
    if (
        len(existing) != 1
        or existing[0]["referrer_id"] != proof.referrer_id
        or existing[0]["referred_id"] != proof.referred_id
        or existing[0]["source_event_id"] != proof.source_event_id
        or existing[0]["qualification_kind"] != proof.kind
        or existing[0]["policy_version"] != policy.version
    ):
        raise PaymentError("referral_already_attributed_or_event_reused")
    return {"id": str(existing[0]["id"]), "months": 1, "new_award": False}


def earned_months(db, referrer_id: UUID) -> int:
    """Earned total only; not an available balance, entitlement or billing extension."""
    return db.scalar(
        text("""SELECT coalesce(sum(reward_months),0)
        FROM public.subscription_referral_award WHERE referrer_id=:owner"""),
        {"owner": referrer_id},
    )
