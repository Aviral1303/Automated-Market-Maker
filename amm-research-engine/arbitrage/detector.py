"""
Arbitrage opportunity detection: AMM vs CEX price comparison.
"""

from dataclasses import dataclass
from decimal import Decimal


@dataclass
class ArbitrageOpportunity:
    """Detected arbitrage opportunity."""

    direction: str  # "buy_on_amm" or "sell_on_amm"
    amm_price: Decimal
    cex_price: Decimal
    spread_bps: int
    estimated_profit_bps: int
    recommended_amount_in: Decimal


class ArbitrageDetector:
    """
    Detects when AMM price deviates from CEX (market) price
    enough to profit after fees.
    """

    def __init__(
        self,
        amm_fee_bps: int = 30,
        min_spread_bps: int = 35,
    ) -> None:
        self.amm_fee_bps = amm_fee_bps
        self.min_spread_bps = min_spread_bps

    def detect(
        self,
        amm_price: Decimal | float,
        cex_price: Decimal | float,
        reserve_a: Decimal | float,
        reserve_b: Decimal | float,
        max_trade_ratio: float = 0.05,
    ) -> ArbitrageOpportunity | None:
        """
        Compare AMM spot price to CEX price.
        amm_price: price of token A in B terms (reserve_b/reserve_a)
        cex_price: market price of A in B terms
        """
        amm_price = Decimal(str(amm_price))
        cex_price = Decimal(str(cex_price))
        reserve_a = Decimal(str(reserve_a))
        reserve_b = Decimal(str(reserve_b))

        if cex_price <= 0:
            return None

        spread_bps = int(abs(amm_price - cex_price) / cex_price * 10000)
        if spread_bps < self.min_spread_bps:
            return None

        # AMM price > CEX: sell A on AMM (swap A -> B), buy A on CEX
        if amm_price > cex_price:
            # Profit: sell A on AMM at higher price
            amount_a = reserve_a * Decimal(str(max_trade_ratio))
            fee_mult = 1 - self.amm_fee_bps / 10000
            amount_in_fee = amount_a * Decimal(str(fee_mult))
            amount_b_out = (amount_in_fee * reserve_b) / (reserve_a + amount_in_fee)
            value_b = amount_b_out
            value_a_cex = amount_a * cex_price
            profit_bps = int((value_b - value_a_cex) / value_a_cex * 10000)
            if profit_bps > 0:
                return ArbitrageOpportunity(
                    direction="sell_on_amm",
                    amm_price=amm_price,
                    cex_price=cex_price,
                    spread_bps=spread_bps,
                    estimated_profit_bps=profit_bps,
                    recommended_amount_in=amount_a,
                )

        # AMM price < CEX: buy A on AMM (swap B -> A)
        if amm_price < cex_price:
            amount_b = reserve_b * Decimal(str(max_trade_ratio))
            fee_mult = 1 - self.amm_fee_bps / 10000
            amount_in_fee = amount_b * Decimal(str(fee_mult))
            amount_a_out = (amount_in_fee * reserve_a) / (reserve_b + amount_in_fee)
            value_a = amount_a_out * cex_price
            value_b_spent = amount_b
            profit_bps = int((value_a - value_b_spent) / value_b_spent * 10000)
            if profit_bps > 0:
                return ArbitrageOpportunity(
                    direction="buy_on_amm",
                    amm_price=amm_price,
                    cex_price=cex_price,
                    spread_bps=spread_bps,
                    estimated_profit_bps=profit_bps,
                    recommended_amount_in=amount_b,
                )

        return None
