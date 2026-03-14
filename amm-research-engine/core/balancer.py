"""
Balancer-style weighted pool AMM.

Formula: V = (x/w_x)^w_x * (y/w_y)^w_y
Weights w_x + w_y = 1 (e.g. 80/20 pool)
"""

from decimal import Decimal
from typing import Literal

from .base import AMMBase, AddLiquidityResult, RemoveLiquidityResult, SwapResult


class BalancerAMM(AMMBase):
    """Balancer weighted pool: variable weights for each token."""

    def __init__(
        self,
        reserve_a: Decimal | float | str,
        reserve_b: Decimal | float | str,
        weight_a: float = 0.5,
        weight_b: float | None = None,
        fee_bps: int = 30,
        total_supply: Decimal | float | str | None = None,
    ) -> None:
        self.weight_a = Decimal(str(weight_a))
        self.weight_b = (
            Decimal(str(weight_b))
            if weight_b is not None
            else Decimal("1") - self.weight_a
        )
        if abs(self.weight_a + self.weight_b - 1) > Decimal("0.0001"):
            raise ValueError("Weights must sum to 1")
        super().__init__(reserve_a, reserve_b, fee_bps, total_supply)

    def _compute_initial_supply(self) -> Decimal:
        if self._reserve_a <= 0 or self._reserve_b <= 0:
            return Decimal("0")
        v = (self._reserve_a / self.weight_a) ** self.weight_a * (
            self._reserve_b / self.weight_b
        ) ** self.weight_b
        return v.quantize(Decimal("0.0000000001"))

    def get_amount_out(
        self,
        amount_in: Decimal | float,
        reserve_in: Decimal | float,
        reserve_out: Decimal | float,
        token_in: Literal["A", "B"] | None = None,
    ) -> Decimal:
        amount_in = Decimal(str(amount_in))
        reserve_in = Decimal(str(reserve_in))
        reserve_out = Decimal(str(reserve_out))

        if amount_in <= 0 or reserve_in <= 0 or reserve_out <= 0:
            return Decimal("0")

        weight_in = self.weight_a if token_in != "B" else self.weight_b
        weight_out = self.weight_b if token_in != "B" else self.weight_a

        fee_mult = Decimal("1") - Decimal(self.fee_bps) / Decimal("10000")
        amount_in_after_fee = amount_in * fee_mult
        ratio = reserve_in / (reserve_in + amount_in_after_fee)
        exponent = weight_in / weight_out
        amount_out = reserve_out * (Decimal("1") - ratio**exponent)

        return max(Decimal("0"), amount_out).quantize(Decimal("0.0000000001"))

    def swap(
        self,
        token_in: Literal["A", "B"],
        amount_in: Decimal | float,
    ) -> SwapResult:
        amount_in = Decimal(str(amount_in))
        if amount_in <= 0:
            raise ValueError("amount_in must be positive")

        reserve_in = self._reserve_a if token_in == "A" else self._reserve_b
        reserve_out = self._reserve_b if token_in == "A" else self._reserve_a

        amount_out = self.get_amount_out(
            amount_in, reserve_in, reserve_out, token_in
        )
        if amount_out <= 0:
            raise ValueError("Insufficient output amount")

        fee_paid = amount_in * Decimal(self.fee_bps) / Decimal("10000")
        price_before = reserve_out / reserve_in
        price_after = (reserve_out - amount_out) / (reserve_in + amount_in)
        price_impact_bps = int(
            abs((price_before - price_after) / price_before * Decimal("10000"))
        )

        if token_in == "A":
            self._reserve_a += amount_in
            self._reserve_b -= amount_out
        else:
            self._reserve_b += amount_in
            self._reserve_a -= amount_out

        return SwapResult(
            amount_in=amount_in,
            amount_out=amount_out,
            token_in=token_in,
            token_out="B" if token_in == "A" else "A",
            fee_paid=fee_paid,
            price_impact_bps=price_impact_bps,
        )

    def add_liquidity(
        self,
        amount_a: Decimal | float,
        amount_b: Decimal | float,
    ) -> AddLiquidityResult:
        amount_a = Decimal(str(amount_a))
        amount_b = Decimal(str(amount_b))

        if amount_a <= 0 or amount_b <= 0:
            raise ValueError("Amounts must be positive")

        if self._total_supply == 0:
            v = (amount_a / self.weight_a) ** self.weight_a * (
                amount_b / self.weight_b
            ) ** self.weight_b
            self._total_supply = v
            self._reserve_a = amount_a
            self._reserve_b = amount_b
            return AddLiquidityResult(
                amount_a=amount_a,
                amount_b=amount_b,
                lp_tokens_minted=v,
            )

        # Proportional to weights: amount_a/weight_a should equal amount_b/weight_b
        ratio_a = amount_a / self.weight_a
        ratio_b = amount_b / self.weight_b
        if ratio_a <= ratio_b:
            amount_a_used = amount_a
            amount_b_used = amount_a * self.weight_b / self.weight_a
        else:
            amount_b_used = amount_b
            amount_a_used = amount_b * self.weight_a / self.weight_b

        share = amount_a_used / self._reserve_a
        liquidity = share * self._total_supply

        self._reserve_a += amount_a_used
        self._reserve_b += amount_b_used
        self._total_supply += liquidity

        return AddLiquidityResult(
            amount_a=amount_a_used,
            amount_b=amount_b_used,
            lp_tokens_minted=liquidity,
        )

    def remove_liquidity(
        self,
        lp_tokens: Decimal | float,
    ) -> RemoveLiquidityResult:
        lp_tokens = Decimal(str(lp_tokens))
        if lp_tokens <= 0 or self._total_supply <= 0:
            raise ValueError("Insufficient liquidity")

        share = lp_tokens / self._total_supply
        amount_a = share * self._reserve_a
        amount_b = share * self._reserve_b

        self._reserve_a -= amount_a
        self._reserve_b -= amount_b
        self._total_supply -= lp_tokens

        return RemoveLiquidityResult(
            amount_a=amount_a,
            amount_b=amount_b,
            lp_tokens_burned=lp_tokens,
        )
