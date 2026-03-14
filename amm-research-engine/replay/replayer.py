"""
Historical market replay: simulate AMM over historical price path.
"""

from dataclasses import dataclass, field
from datetime import datetime
from decimal import Decimal
from typing import Any

import pandas as pd

from core import ConstantProductAMM
from simulation import SimulationEngine
from simulation.agents import ArbitrageurAgent, RetailTrader
from simulation.pool_state import SimulatedPool


@dataclass
class ReplaySnapshot:
    """Snapshot of pool state at a point in time."""

    timestamp: datetime
    reserve_a: Decimal
    reserve_b: Decimal
    price_a: Decimal
    market_price: Decimal
    volume_cumulative: Decimal
    fees_cumulative: Decimal


class HistoricalReplayer:
    """
    Replays historical OHLCV data, simulating AMM + agents at each step.
    """

    def __init__(
        self,
        initial_reserve_a: Decimal | float,
        initial_reserve_b: Decimal | float,
        fee_bps: int = 30,
        include_arbitrageurs: bool = True,
        include_retail: bool = True,
    ) -> None:
        pool = SimulatedPool.create_constant_product(
            initial_reserve_a,
            initial_reserve_b,
            fee_bps,
        )
        agents = []
        if include_arbitrageurs:
            agents.append(ArbitrageurAgent("arb_1", min_profit_bps=15))
        if include_retail:
            agents.append(RetailTrader("retail_1", min_trade_usd=500, max_trade_usd=5000))

        self.engine = SimulationEngine(pool, agents)
        self.snapshots: list[ReplaySnapshot] = []

    def replay(
        self,
        df: pd.DataFrame,
        price_col: str = "close",
        timestamp_col: str = "timestamp",
    ) -> list[ReplaySnapshot]:
        """
        Replay over a DataFrame with timestamp and price columns.
        """
        self.snapshots = []

        for _, row in df.iterrows():
            ts = row[timestamp_col]
            if isinstance(ts, (int, float)):
                ts = datetime.fromtimestamp(ts)
            price = Decimal(str(row[price_col]))
            if price <= 0:
                continue

            self.engine.step(ts, price)

            r_a, r_b = self.engine.pool.get_reserves()
            self.snapshots.append(
                ReplaySnapshot(
                    timestamp=ts,
                    reserve_a=r_a,
                    reserve_b=r_b,
                    price_a=r_b / r_a if r_a > 0 else Decimal("0"),
                    market_price=price,
                    volume_cumulative=self.engine.total_volume,
                    fees_cumulative=self.engine.total_fees,
                )
            )

        return self.snapshots

    def to_dataframe(self) -> pd.DataFrame:
        """Export snapshots to DataFrame."""
        return pd.DataFrame(
            [
                {
                    "timestamp": s.timestamp,
                    "reserve_a": float(s.reserve_a),
                    "reserve_b": float(s.reserve_b),
                    "amm_price": float(s.price_a),
                    "market_price": float(s.market_price),
                    "volume_cumulative": float(s.volume_cumulative),
                    "fees_cumulative": float(s.fees_cumulative),
                }
                for s in self.snapshots
            ]
        )
