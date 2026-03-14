"""
Arbitrage trade simulation: execute arb and update pool.
"""

from decimal import Decimal
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from simulation.pool_state import SimulatedPool


class ArbitrageSimulator:
    """
    Simulates executing an arbitrage trade on the AMM
    and returns profit + updated pool state.
    """

    def execute_arb(
        self,
        pool: "SimulatedPool",
        direction: str,
        amount_in: Decimal | float,
    ) -> dict:
        """
        Execute arb trade on pool.
        direction: "sell_on_amm" (swap A->B) or "buy_on_amm" (swap B->A)
        Returns: {amount_in, amount_out, profit_estimate, success}
        """
        amount_in = Decimal(str(amount_in))
        token_in = "A" if direction == "sell_on_amm" else "B"

        try:
            result = pool.swap(token_in, amount_in)
            return {
                "amount_in": amount_in,
                "amount_out": result.amount_out,
                "token_in": token_in,
                "token_out": result.token_out,
                "fee_paid": result.fee_paid,
                "success": True,
            }
        except Exception as e:
            return {
                "amount_in": amount_in,
                "amount_out": Decimal("0"),
                "success": False,
                "error": str(e),
            }
