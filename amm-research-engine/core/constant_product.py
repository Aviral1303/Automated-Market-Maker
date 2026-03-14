"""
Constant Product AMM (Uniswap V2 style).

Formula: x * y = k
With fee: amountOut = (amountIn * (1 - fee) * reserveOut) / (reserveIn + amountIn * (1 - fee))
"""

from decimal import Decimal
from typing import Literal

from .base import AMMBase, AddLiquidityResult, RemoveLiquidityResult, SwapResult


class ConstantProductAMM(AMMBase):
    """Uniswap V2-style constant product market maker."""

    MINIMUM_LIQUIDITY = Decimal("1000")

    def _compute_initial_supply(self) -> Decimal:
        if self._reserve_a <= 0 or self._reserve_b <= 0:
            return Decimal("0")
        return (self._reserve_a * self._reserve_b).sqrt() - self.MINIMUM_LIQUIDITY

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

        fee_multiplier = Decimal("1") - (Decimal(self.fee_bps) / Decimal("10000"))
        amount_in_with_fee = amount_in * fee_multiplier
        numerator = amount_in_with_fee * reserve_out
        denominator = reserve_in + amount_in_with_fee

        return (numerator / denominator).quantize(Decimal("0.0000000001"))

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

        amount_out = self.get_amount_out(amount_in, reserve_in, reserve_out)
        if amount_out <= 0:
            raise ValueError("Insufficient output amount")

        # Fee: amount_in * fee_bps / 10000
        fee_paid = amount_in * Decimal(self.fee_bps) / Decimal("10000")

        # Price impact (bps)
        price_before = reserve_out / reserve_in
        price_after = (reserve_out - amount_out) / (reserve_in + amount_in)
        price_impact_bps = int(
            abs((price_before - price_after) / price_before * Decimal("10000"))
        )

        # Update reserves
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
            # First liquidity
            liquidity = (amount_a * amount_b).sqrt() - self.MINIMUM_LIQUIDITY
            if liquidity <= 0:
                raise ValueError("Insufficient liquidity minted")
            self._total_supply = liquidity + self.MINIMUM_LIQUIDITY
            self._reserve_a = amount_a
            self._reserve_b = amount_b
            return AddLiquidityResult(
                amount_a=amount_a,
                amount_b=amount_b,
                lp_tokens_minted=liquidity,
            )

        # Subsequent liquidity: optimal ratio
        amount_b_optimal = amount_a * self._reserve_b / self._reserve_a
        if amount_b_optimal <= amount_b:
            amount_a_used = amount_a
            amount_b_used = amount_b_optimal
        else:
            amount_a_optimal = amount_b * self._reserve_a / self._reserve_b
            amount_a_used = amount_a_optimal
            amount_b_used = amount_b

        liquidity = amount_a_used * self._total_supply / self._reserve_a
        if liquidity <= 0:
            raise ValueError("Insufficient liquidity minted")

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

        amount_a = lp_tokens * self._reserve_a / self._total_supply
        amount_b = lp_tokens * self._reserve_b / self._total_supply

        self._reserve_a -= amount_a
        self._reserve_b -= amount_b
        self._total_supply -= lp_tokens

        return RemoveLiquidityResult(
            amount_a=amount_a,
            amount_b=amount_b,
            lp_tokens_burned=lp_tokens,
        )
