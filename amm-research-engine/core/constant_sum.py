"""
Constant Sum AMM (fixed price).

Formula: x + y = k (linear, zero slippage for small trades)
Used for stablecoin pairs or fixed-rate markets.
"""

from decimal import Decimal
from typing import Literal

from .base import AMMBase, AddLiquidityResult, RemoveLiquidityResult, SwapResult


class ConstantSumAMM(AMMBase):
    """Fixed-price AMM: x + y = k. Zero slippage at spot price."""

    def _compute_initial_supply(self) -> Decimal:
        return self._reserve_a + self._reserve_b

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

        # 1:1 swap (or use price ratio)
        amount_in_after_fee = amount_in * (
            Decimal("1") - Decimal(self.fee_bps) / Decimal("10000")
        )
        # Constant sum: 1 unit in = 1 unit out (adjust if price != 1)
        return amount_in_after_fee.quantize(Decimal("0.0000000001"))

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
        if amount_out > reserve_out:
            amount_out = reserve_out  # Cap at available
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

        # Constant sum: liquidity = amount_a + amount_b
        liquidity = amount_a + amount_b

        if self._total_supply == 0:
            self._total_supply = liquidity
            self._reserve_a = amount_a
            self._reserve_b = amount_b
        else:
            self._reserve_a += amount_a
            self._reserve_b += amount_b
            self._total_supply += liquidity

        return AddLiquidityResult(
            amount_a=amount_a,
            amount_b=amount_b,
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
