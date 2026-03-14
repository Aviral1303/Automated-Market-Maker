"""
StableSwap-style AMM (Curve Finance).

Uses a hybrid curve: combines constant product with constant sum
for low slippage on stablecoin pairs (e.g. USDC/USDT).
"""

from decimal import Decimal
from typing import Literal

from .base import AMMBase, AddLiquidityResult, RemoveLiquidityResult, SwapResult


class StableSwapAMM(AMMBase):
    """
    Curve-style StableSwap: x + y = D for small trades, x*y = k for large.
    Amplification parameter A controls the blend (higher A = more flat).
    """

    def __init__(
        self,
        reserve_a: Decimal | float | str,
        reserve_b: Decimal | float | str,
        amplification: float = 100,
        fee_bps: int = 4,  # Curve uses ~0.04%
        total_supply: Decimal | float | str | None = None,
    ) -> None:
        self.amplification = Decimal(str(amplification))
        super().__init__(reserve_a, reserve_b, fee_bps, total_supply)

    def _compute_initial_supply(self) -> Decimal:
        return self._reserve_a + self._reserve_b

    def _get_d(self, x: Decimal, y: Decimal) -> Decimal:
        """Compute D from reserves (StableSwap invariant)."""
        n_coins = Decimal("2")
        ann = self.amplification * n_coins
        d = x + y
        for _ in range(255):
            d_prev = d
            d = (
                ann * (x + y) + d * (n_coins - Decimal("1"))
            ) * d / (ann * d + (n_coins - Decimal("1")) * (x + y))
            if abs(d - d_prev) <= 1:
                break
        return d

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

        fee_mult = Decimal("1") - Decimal(self.fee_bps) / Decimal("10000")
        amount_in_after_fee = amount_in * fee_mult

        x = reserve_in + amount_in_after_fee
        y = reserve_out

        d = self._get_d(reserve_in, reserve_out)
        d_new = self._get_d(x, y)

        if d_new <= d:
            return Decimal("0")

        # y_new from invariant: y_new = d_new - x (approx for 2 coins)
        # More precise: solve for y_new
        n_coins = Decimal("2")
        ann = self.amplification * n_coins
        y_new = y
        for _ in range(255):
            y_prev = y_new
            y_new = (ann * (x + y) + d_new * (n_coins - Decimal("1"))) * d_new / (
                ann * d_new + (n_coins - Decimal("1")) * (x + y)
            ) - x
            if abs(y_new - y_prev) <= 1:
                break

        amount_out = y - y_new
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
        if amount_out <= 0 or amount_out > reserve_out:
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
            liquidity = amount_a + amount_b
            self._total_supply = liquidity
            self._reserve_a = amount_a
            self._reserve_b = amount_b
            return AddLiquidityResult(
                amount_a=amount_a,
                amount_b=amount_b,
                lp_tokens_minted=liquidity,
            )

        # Proportional to existing ratio
        ratio = self._reserve_a / self._reserve_b
        amount_b_optimal = amount_a / ratio
        if amount_b_optimal <= amount_b:
            amount_a_used = amount_a
            amount_b_used = amount_b_optimal
        else:
            amount_a_optimal = amount_b * ratio
            amount_a_used = amount_a_optimal
            amount_b_used = amount_b

        liquidity = (amount_a_used + amount_b_used) * self._total_supply / (
            self._reserve_a + self._reserve_b
        )
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
