"""Fixed item-sale policy, pure server calculation only; no settlement activation.

A future verified order/ledger adapter must supply captured/discounted line facts,
unique order-line and event keys, refund totals under lock, seller terms and market
qualification. Neither browser amounts nor an external referral prove a completed
sale. Service-booking fees and advertising are deliberately outside this policy.
"""

from dataclasses import dataclass

ITEM_COMMISSION_BASIS_POINTS = 1000
POLICY_VERSION = "item-sale-10pct-v1"


def _minor(value: int) -> int:
    if isinstance(value, bool) or not isinstance(value, int) or not 0 <= value < 2**53:
        raise ValueError("Amounts must be bounded nonnegative integer minor units")
    return value


@dataclass(frozen=True)
class ItemCommission:
    eligible_item_minor: int
    earned_commission_minor: int
    commission_reversal_minor: int
    merchant_item_proceeds_minor: int
    policy_version: str = POLICY_VERSION


def calculate_item_commission(
    *,
    final_item_minor: int,
    completed: bool,
    refunded_item_minor: int = 0,
) -> ItemCommission:
    """Cumulative target, not a posting command. Round half-up per order line.

    final_item_minor is AFTER item discounts and EXCLUDES separately stated
    delivery/tax/processing/advertising/service fees. Reconcile to this target,
    never post the target again per journey. Remaining-value rounding ensures
    split refunds have the same final result and full refunds reverse every cent.
    """
    eligible = _minor(final_item_minor)
    refunded = _minor(refunded_item_minor)
    if type(completed) is not bool:
        raise ValueError("Verified completion must be boolean")
    if refunded > eligible or (not completed and refunded):
        raise ValueError("Refund cannot exceed a completed eligible item sale")
    if not completed:
        return ItemCommission(eligible, 0, 0, 0)
    original_fee = (eligible + 5) // 10
    remaining = eligible - refunded
    earned_fee = (remaining + 5) // 10
    return ItemCommission(eligible, earned_fee, original_fee - earned_fee, remaining - earned_fee)
