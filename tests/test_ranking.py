from dataclasses import replace
from datetime import UTC, datetime, timedelta
from decimal import Decimal

import pytest
from glam_api.ranking import OrganicFactors, SponsoredCandidate, auction_order, organic_score
from hypothesis import given
from hypothesis import strategies as st

NOW = datetime.now(UTC)


def candidate(name, q, bid):
    return SponsoredCandidate(
        name, Decimal(q), bid, "ZAR", True, True, True, True, NOW + timedelta(minutes=1)
    )


def test_first_price_relevance_threshold_and_evidence():
    a, b = candidate("a", ".90", 200), candidate("b", ".80", 250)
    irrelevant = candidate("c", ".70", 1_000_000)
    stale = replace(candidate("d", "1", 999), evidence_expires_at=NOW)
    unknown_stock = replace(candidate("e", "1", 999), inventory_confirmed=False)
    foreign = replace(candidate("f", "1", 999), currency="USD")
    result = auction_order(
        [a, b, irrelevant, stale, unknown_stock, foreign], now=NOW, currency="ZAR", floor_minor=100
    )
    assert [c.ad_id for c in result] == ["b", "a"]
    assert result[0].max_cpc_minor == 250


@given(st.decimals(min_value=0, max_value=1, allow_nan=False, places=4))
def test_organic_score_bounded_and_no_bid_dependency(value):
    factors = OrganicFactors(*([value] * 6))
    assert organic_score(factors) == value
    assert "bid" not in vars(factors) and "commission" not in vars(factors)


def test_deterministic_ties_invalid_scores_and_empty_inventory():
    a, b = candidate("a", ".9", 100), candidate("b", ".9", 100)
    assert auction_order([b, a], now=NOW, currency="ZAR", floor_minor=100) == [a, b]
    assert auction_order([], now=NOW, currency="ZAR", floor_minor=100) == []
    with pytest.raises(ValueError):
        auction_order(
            [replace(a, public_relevance=Decimal("NaN"))], now=NOW, currency="ZAR", floor_minor=1
        )
    with pytest.raises(ValueError):
        organic_score(OrganicFactors(*([Decimal("2")] * 6)))
