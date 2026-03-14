"""
Liquidity provider agent: adds/removes liquidity based on conditions.
"""

from decimal import Decimal

from .base import ActionType, Agent, AgentAction


class LiquidityProviderAgent(Agent):
    """
    LP agent: adds liquidity at start, optionally rebalances.
    Simplified: add once, remove at end (or on signal).
    """

    def __init__(
        self,
        agent_id: str,
        amount_a: Decimal | float,
        amount_b: Decimal | float,
        add_at_start: bool = True,
    ) -> None:
        super().__init__(agent_id)
        self.amount_a = Decimal(str(amount_a))
        self.amount_b = Decimal(str(amount_b))
        self.add_at_start = add_at_start
        self._has_added = False
        self._lp_tokens = Decimal("0")

    def decide(
        self,
        pool_state: dict,
        market_price: Decimal | None,
        timestamp: object,
    ) -> AgentAction | None:
        if self.add_at_start and not self._has_added:
            self._has_added = True
            return AgentAction(
                action_type=ActionType.ADD_LIQUIDITY,
                amount_a=self.amount_a,
                amount_b=self.amount_b,
            )
        return None

    def set_lp_tokens(self, lp_tokens: Decimal) -> None:
        self._lp_tokens = lp_tokens
