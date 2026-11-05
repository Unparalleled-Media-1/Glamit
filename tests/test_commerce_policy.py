import pytest
from glam_api.commerce_policy import calculate_item_commission


def test_fixed_commission_is_item_only_and_cancelled_sales_earn_nothing():
    sale = calculate_item_commission(final_item_minor=100_000, completed=True)
    assert sale.earned_commission_minor == 10_000
    assert sale.merchant_item_proceeds_minor == 90_000
    assert sale.commission_reversal_minor == 0
    cancelled = calculate_item_commission(final_item_minor=100_000, completed=False)
    assert cancelled.earned_commission_minor == cancelled.merchant_item_proceeds_minor == 0
    # No service, advertising, shipping, tax or journey-based percentage input.
    with pytest.raises(TypeError):
        calculate_item_commission(final_item_minor=100, completed=True, service_minor=50)


def test_refunds_are_cumulative_rounding_conserves_value_and_full_refund_reverses_all():
    for item in range(101):
        first = calculate_item_commission(final_item_minor=item, completed=True)
        prior_earned = first.earned_commission_minor
        reversed_so_far = 0
        for refunded in range(item + 1):
            target = calculate_item_commission(
                final_item_minor=item, completed=True, refunded_item_minor=refunded
            )
            assert target.earned_commission_minor <= prior_earned
            reversed_so_far += prior_earned - target.earned_commission_minor
            assert reversed_so_far == target.commission_reversal_minor
            assert target.earned_commission_minor + target.merchant_item_proceeds_minor == (
                item - refunded
            )
            prior_earned = target.earned_commission_minor
        assert reversed_so_far == first.earned_commission_minor
    # 15 cents rounds 1.5 cents half-up to 2; final full reversal leaves no residue.
    assert (
        calculate_item_commission(final_item_minor=15, completed=True).earned_commission_minor == 2
    )


@pytest.mark.parametrize("amount", [-1, True, 2**53, 1.1, "100"])
def test_rejects_untrusted_financial_amounts(amount):
    with pytest.raises(ValueError):
        calculate_item_commission(final_item_minor=amount, completed=True)


def test_rejects_over_refunds_and_false_completion_claim_types():
    for args in [
        dict(final_item_minor=100, completed=True, refunded_item_minor=101),
        dict(final_item_minor=100, completed=False, refunded_item_minor=1),
        dict(final_item_minor=100, completed="true"),
    ]:
        with pytest.raises(ValueError):
            calculate_item_commission(**args)
