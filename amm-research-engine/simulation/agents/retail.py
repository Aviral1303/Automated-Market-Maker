"""
Retail trader agent: random-sized swaps based on market price deviation.
"""

import random
from decimal import Decimal
from typing import Literal

from .base import ActionType, Agent, AgentAction


class RetailTrader(Agent):
    """
    Retail trader: swaps when AMM price deviates from market.
    Trade size randomized within bounds.
    """

    def __init__(
        self,
        agent_id: str,
        min_trade_usd: float = 100,
        max_trade_usd: float = 10000,
        threshold_bps: int = 50,
    ) -> None:
        super().__init__(agent_id)
        self.min_trade = Decimal(str(min_trade_usd))
        self.max_trade = Decimal(str(max_trade_usd))
        self.threshold_bps = threshold_bps

    def decide(
        self,
        pool_state: dict,
        market_price: Decimal | None,
        timestamp: object,
    ) -> AgentAction | None:
        if market_price is None or market_price <= 0:
            return None

        reserve_a = Decimal(str(pool_state.get("reserve_a", 0)))
        reserve_b = Decimal(str(pool_state.get("reserve_b", 0)))
        if reserve_a <= 0 or reserve_b <= 0:
            return None

        amm_price_a_in_b = reserve_b / reserve_a  # price of A in B terms

        # Deviation from market (market gives A in USD, we compare AMM A/B to market)
        # Simplified: assume market_price is A in quote (B) terms
        deviation_bps = int(
            abs(amm_price_a_in_b - market_price) / market_price * Decimal("10000")
        )
        if deviation_bps < self.threshold_bps:
            return None

        # Random trade size
        trade_usd = Decimal(
            str(
                random.uniform(
                    float(self.min_trade),
                    float(self.max_trade),
                )
            )
        )
        # Convert to token amount (simplified: trade_usd / market_price = amount A)
        amount_a = trade_usd / market_price

        # Swap A -> B if AMM price > market (sell A on AMM)
        if amm_price_a_in_b > market_price:
            return AgentAction(
                action_type=ActionType.SWAP,
                token_in="A",
                amount_in=amount_a,
            )
        else:
            # Swap B -> A
            amount_b = trade_usd
            return AgentAction(
                action_type=ActionType.SWAP,
                token_in="B",
                amount_in=amount_b,
            )
