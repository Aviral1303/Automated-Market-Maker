"""
Arbitrageur agent: exploits AMM vs CEX price discrepancies.
"""

from decimal import Decimal

from .base import ActionType, Agent, AgentAction


class ArbitrageurAgent(Agent):
    """
    Arbitrageur: swaps to bring AMM price in line with market.
    Only acts when profit after fees exceeds threshold.
    """

    def __init__(
        self,
        agent_id: str,
        min_profit_bps: int = 10,
        max_trade_ratio: float = 0.01,
    ) -> None:
        super().__init__(agent_id)
        self.min_profit_bps = min_profit_bps
        self.max_trade_ratio = max_trade_ratio

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

        amm_price = reserve_b / reserve_a  # A in B terms

        # AMM price > market: sell A on AMM (swap A -> B)
        if amm_price > market_price * (1 + Decimal(self.min_profit_bps) / 10000):
            # Optimal arb size: bisection or closed-form
            max_amount_a = reserve_a * Decimal(str(self.max_trade_ratio))
            return AgentAction(
                action_type=ActionType.SWAP,
                token_in="A",
                amount_in=max_amount_a,
            )

        # AMM price < market: buy A on AMM (swap B -> A)
        if amm_price < market_price * (1 - Decimal(self.min_profit_bps) / 10000):
            max_amount_b = reserve_b * Decimal(str(self.max_trade_ratio))
            return AgentAction(
                action_type=ActionType.SWAP,
                token_in="B",
                amount_in=max_amount_b,
            )

        return None
