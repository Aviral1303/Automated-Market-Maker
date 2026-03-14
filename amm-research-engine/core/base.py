"""
Abstract base class for AMM models.

All AMM implementations must support:
- swap (token_in, amount_in) -> amount_out
- add_liquidity (amount_a, amount_b) -> lp_tokens
- remove_liquidity (lp_tokens) -> (amount_a, amount_b)
- get_price (token) -> price in quote terms
- get_amount_out (amount_in, reserve_in, reserve_out) -> amount_out
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from decimal import Decimal
from typing import Literal


@dataclass
class PoolState:
    """Immutable snapshot of pool state."""

    reserve_a: Decimal
    reserve_b: Decimal
    total_supply: Decimal
    fee_bps: int  # basis points, e.g. 30 = 0.3%

    def __post_init__(self) -> None:
        self.reserve_a = Decimal(str(self.reserve_a))
        self.reserve_b = Decimal(str(self.reserve_b))
        self.total_supply = Decimal(str(self.total_supply))


@dataclass
class SwapResult:
    """Result of a swap operation."""

    amount_in: Decimal
    amount_out: Decimal
    token_in: Literal["A", "B"]
    token_out: Literal["A", "B"]
    fee_paid: Decimal
    price_impact_bps: int


@dataclass
class AddLiquidityResult:
    """Result of adding liquidity."""

    amount_a: Decimal
    amount_b: Decimal
    lp_tokens_minted: Decimal


@dataclass
class RemoveLiquidityResult:
    """Result of removing liquidity."""

    amount_a: Decimal
    amount_b: Decimal
    lp_tokens_burned: Decimal


class AMMBase(ABC):
    """Abstract base for all AMM models."""

    def __init__(
        self,
        reserve_a: Decimal | float | str,
        reserve_b: Decimal | float | str,
        fee_bps: int = 30,
        total_supply: Decimal | float | str | None = None,
    ) -> None:
        self._reserve_a = Decimal(str(reserve_a))
        self._reserve_b = Decimal(str(reserve_b))
        self.fee_bps = fee_bps
        self._total_supply = (
            Decimal(str(total_supply))
            if total_supply is not None
            else self._compute_initial_supply()
        )

    def _compute_initial_supply(self) -> Decimal:
        """Override in subclasses for first liquidity."""
        return Decimal("0")

    @abstractmethod
    def get_amount_out(
        self,
        amount_in: Decimal | float,
        reserve_in: Decimal | float,
        reserve_out: Decimal | float,
        token_in: Literal["A", "B"] | None = None,
    ) -> Decimal:
        """Compute output amount for a swap (before fee). token_in for weighted pools."""
        pass

    @abstractmethod
    def swap(
        self,
        token_in: Literal["A", "B"],
        amount_in: Decimal | float,
    ) -> SwapResult:
        """Execute swap and update reserves."""
        pass

    @abstractmethod
    def add_liquidity(
        self,
        amount_a: Decimal | float,
        amount_b: Decimal | float,
    ) -> AddLiquidityResult:
        """Add liquidity and mint LP tokens."""
        pass

    @abstractmethod
    def remove_liquidity(
        self,
        lp_tokens: Decimal | float,
    ) -> RemoveLiquidityResult:
        """Remove liquidity and burn LP tokens."""
        pass

    def get_price(self, token: Literal["A", "B"]) -> Decimal:
        """Spot price of token in terms of the other (e.g. price of A in B)."""
        if token == "A":
            return self._reserve_b / self._reserve_a
        return self._reserve_a / self._reserve_b

    def get_state(self) -> PoolState:
        """Return current pool state snapshot."""
        return PoolState(
            reserve_a=self._reserve_a,
            reserve_b=self._reserve_b,
            total_supply=self._total_supply,
            fee_bps=self.fee_bps,
        )

    @property
    def reserve_a(self) -> Decimal:
        return self._reserve_a

    @property
    def reserve_b(self) -> Decimal:
        return self._reserve_b

    @property
    def total_supply(self) -> Decimal:
        return self._total_supply
