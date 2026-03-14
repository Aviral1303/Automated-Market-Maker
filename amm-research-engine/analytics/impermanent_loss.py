"""
Impermanent loss calculation for liquidity providers.

IL = 2 * sqrt(price_ratio) / (1 + price_ratio) - 1
Where price_ratio = P_t / P_0 (current price / initial price)
"""

from decimal import Decimal


def calculate_impermanent_loss(
    initial_price: Decimal | float,
    current_price: Decimal | float,
) -> Decimal:
    """
    Compute impermanent loss as a decimal (e.g. -0.01 = 1% loss).

    IL = 2 * sqrt(P/P0) / (1 + P/P0) - 1
    """
    p0 = Decimal(str(initial_price))
    p = Decimal(str(current_price))
    if p0 <= 0:
        return Decimal("0")

    ratio = p / p0
    sqrt_r = ratio.sqrt()
    il = Decimal("2") * sqrt_r / (Decimal("1") + ratio) - Decimal("1")
    return il


def impermanent_loss_percent(
    initial_price: Decimal | float,
    current_price: Decimal | float,
) -> float:
    """Return IL as percentage (e.g. -1.0 for 1% loss)."""
    il = calculate_impermanent_loss(initial_price, current_price)
    return float(il * 100)


def lp_value_change(
    initial_price: Decimal | float,
    current_price: Decimal | float,
    fee_income_ratio: Decimal | float = 0,
) -> Decimal:
    """
    Net LP value change: IL + fee income.
    fee_income_ratio = fees_earned / initial_value
    """
    il = calculate_impermanent_loss(initial_price, current_price)
    return il + Decimal(str(fee_income_ratio))
