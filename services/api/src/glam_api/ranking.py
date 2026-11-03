"""Pure, versioned ranking primitives. No catalog/provider/auction-billing integration yet.

Hard evidence eligibility precedes scoring. These functions do not manufacture offers or
reserve spend. Organic inputs deliberately have no commercial bid or commission field.
"""

from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal


@dataclass(frozen=True)
class OrganicFactors:
    compatibility: Decimal
    style_similarity: Decimal
    freshness: Decimal
    landed_value: Decimal
    fulfillment_quality: Decimal
    regional_preference: Decimal


def organic_score(factors: OrganicFactors) -> Decimal:
    weights = (".35", ".20", ".15", ".10", ".10", ".10")
    values = tuple(vars(factors).values())
    if any(not x.is_finite() or not 0 <= x <= 1 for x in values):
        raise ValueError("Factors must be finite values in [0,1]")
    return sum((v * Decimal(w) for v, w in zip(values, weights, strict=True)), Decimal(0))


@dataclass(frozen=True)
class SponsoredCandidate:
    ad_id: str
    public_relevance: Decimal
    max_cpc_minor: int
    currency: str
    approved: bool
    compatible: bool
    inventory_confirmed: bool
    delivery_eligible: bool
    evidence_expires_at: datetime


def auction_order(
    candidates: list[SponsoredCandidate], *, now: datetime, currency: str, floor_minor: int
) -> list[SponsoredCandidate]:
    """First-price candidate order; transactional cap/frequency reservations must follow.

    The CPC on a winning validated click is candidate.max_cpc_minor. No outcome here
    authorizes serving or billing. IDs tie-break deterministically.
    """
    if now.tzinfo is None or floor_minor < 1:
        raise ValueError("Aware time and positive CPC floor required")
    if len({c.ad_id for c in candidates}) != len(candidates):
        raise ValueError("Duplicate ad IDs")
    eligible = []
    for c in candidates:
        if not c.public_relevance.is_finite() or not 0 <= c.public_relevance <= 1:
            raise ValueError("Invalid relevance")
        if not isinstance(c.max_cpc_minor, int) or isinstance(c.max_cpc_minor, bool):
            raise ValueError("CPC must be integer minor units")
        if c.evidence_expires_at.tzinfo is None:
            raise ValueError("Evidence expiry must be timezone aware")
        if (
            c.public_relevance >= Decimal(".75")
            and c.max_cpc_minor >= floor_minor
            and c.currency == currency
            and c.approved
            and c.compatible
            and c.inventory_confirmed
            and c.delivery_eligible
            and c.evidence_expires_at > now
        ):
            eligible.append(c)
    return sorted(
        eligible,
        key=lambda c: (-(c.public_relevance * c.max_cpc_minor), -c.public_relevance, c.ad_id),
    )
