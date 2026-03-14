"""
Simulated pool state wrapper for AMM models.
"""

from decimal import Decimal
from typing import Literal, Type

from core import AMMBase, ConstantProductAMM
from core.base import AddLiquidityResult, RemoveLiquidityResult, SwapResult


class SimulatedPool:
    """Wraps an AMM with metadata for simulation."""

    def __init__(
        self,
        amm: AMMBase,
        token_a_name: str = "A",
        token_b_name: str = "B",
    ) -> None:
        self.amm = amm
        self.token_a_name = token_a_name
        self.token_b_name = token_b_name
        self.fee_accumulated_a = Decimal("0")
        self.fee_accumulated_b = Decimal("0")

    def swap(
        self,
        token_in: Literal["A", "B"],
        amount_in: Decimal | float,
    ) -> SwapResult:
        result = self.amm.swap(token_in, amount_in)
        self.fee_accumulated_a += (
            result.fee_paid if result.token_in == "A" else Decimal("0")
        )
        self.fee_accumulated_b += (
            result.fee_paid if result.token_in == "B" else Decimal("0")
        )
        return result

    def add_liquidity(
        self,
        amount_a: Decimal | float,
        amount_b: Decimal | float,
    ) -> AddLiquidityResult:
        return self.amm.add_liquidity(amount_a, amount_b)

    def remove_liquidity(self, lp_tokens: Decimal | float) -> RemoveLiquidityResult:
        return self.amm.remove_liquidity(lp_tokens)

    def get_price(self, token: Literal["A", "B"]) -> Decimal:
        return self.amm.get_price(token)

    def get_reserves(self) -> tuple[Decimal, Decimal]:
        return self.amm.reserve_a, self.amm.reserve_b

    @classmethod
    def create_constant_product(
        cls,
        reserve_a: Decimal | float,
        reserve_b: Decimal | float,
        fee_bps: int = 30,
        token_a_name: str = "A",
        token_b_name: str = "B",
    ) -> "SimulatedPool":
        amm = ConstantProductAMM(reserve_a, reserve_b, fee_bps)
        if amm.total_supply == 0:
            amm.add_liquidity(reserve_a, reserve_b)
        return cls(amm, token_a_name, token_b_name)
