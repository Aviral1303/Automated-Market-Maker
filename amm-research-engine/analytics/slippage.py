"""
Slippage and price impact analysis.
"""

from decimal import Decimal
from typing import Callable


def price_impact_bps(
    amount_in: Decimal | float,
    reserve_in: Decimal | float,
    reserve_out: Decimal | float,
    get_amount_out: Callable[[Decimal, Decimal, Decimal], Decimal],
    token_in: str | None = None,
) -> int:
    """
    Compute price impact in basis points for a swap.
    """
    amount_in = Decimal(str(amount_in))
    reserve_in = Decimal(str(reserve_in))
    reserve_out = Decimal(str(reserve_out))

    if reserve_in <= 0 or reserve_out <= 0:
        return 0

    spot_price = reserve_out / reserve_in
    amount_out = get_amount_out(amount_in, reserve_in, reserve_out)
    if amount_out <= 0:
        return 99999  # Max impact

    execution_price = amount_out / amount_in
    impact = (spot_price - execution_price) / spot_price
    return int(abs(impact) * 10000)


def compute_slippage_curve(
    reserve_in: float,
    reserve_out: float,
    fee_bps: int = 30,
    trade_sizes: list[float] | None = None,
) -> list[tuple[float, float, float]]:
    """
    Compute (amount_in, amount_out, slippage_bps) for a range of trade sizes.
    Uses constant product formula.
    """
    if trade_sizes is None:
        trade_sizes = [
            reserve_in * r
            for r in [0.001, 0.005, 0.01, 0.02, 0.05, 0.1, 0.2, 0.5]
        ]

    fee_mult = 1 - fee_bps / 10000
    spot = reserve_out / reserve_in

    results = []
    for amt_in in trade_sizes:
        amt_in_fee = amt_in * fee_mult
        amt_out = (amt_in_fee * reserve_out) / (reserve_in + amt_in_fee)
        exec_price = amt_out / amt_in
        slippage_bps = abs(spot - exec_price) / spot * 10000
        results.append((amt_in, amt_out, slippage_bps))

    return results


def optimal_split(
    total_amount: float,
    reserve_in: float,
    reserve_out: float,
    n_splits: int = 5,
) -> list[float]:
    """
    Optimal split for large trade across multiple pools/splits.
    Simplified: equal splits.
    """
    return [total_amount / n_splits] * n_splits
