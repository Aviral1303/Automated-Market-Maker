"""
Historical data storage (Parquet, SQLite).
"""

from datetime import datetime
from pathlib import Path
from typing import Any

import pandas as pd

from .base import OHLCV, PoolReserves


class DataStorage:
    """Store and retrieve OHLCV and pool data."""

    def __init__(self, base_path: str | Path = "data/store") -> None:
        self.base = Path(base_path)
        self.base.mkdir(parents=True, exist_ok=True)
        self.ohlcv_dir = self.base / "ohlcv"
        self.pools_dir = self.base / "pools"
        self.ohlcv_dir.mkdir(exist_ok=True)
        self.pools_dir.mkdir(exist_ok=True)

    def _ohlcv_path(self, symbol: str, interval: str = "1h") -> Path:
        safe = symbol.replace("/", "_").replace(" ", "_")
        return self.ohlcv_dir / f"{safe}_{interval}.parquet"

    def save_ohlcv(
        self,
        candles: list[OHLCV],
        symbol: str,
        interval: str = "1h",
    ) -> None:
        """Append OHLCV to Parquet file."""
        if not candles:
            return
        df = pd.DataFrame(
            [
                {
                    "timestamp": c.timestamp,
                    "open": c.open,
                    "high": c.high,
                    "low": c.low,
                    "close": c.close,
                    "volume": c.volume,
                }
                for c in candles
            ]
        )
        path = self._ohlcv_path(symbol, interval)
        if path.exists():
            existing = pd.read_parquet(path)
            df = pd.concat([existing, df]).drop_duplicates(
                subset=["timestamp"], keep="last"
            ).sort_values("timestamp")
        df.to_parquet(path, index=False)

    def load_ohlcv(
        self,
        symbol: str,
        start: datetime | None = None,
        end: datetime | None = None,
        interval: str = "1h",
    ) -> pd.DataFrame:
        """Load OHLCV from storage."""
        path = self._ohlcv_path(symbol, interval)
        if not path.exists():
            return pd.DataFrame()

        df = pd.read_parquet(path)
        df["timestamp"] = pd.to_datetime(df["timestamp"])

        if start is not None:
            df = df[df["timestamp"] >= start]
        if end is not None:
            df = df[df["timestamp"] <= end]

        return df.sort_values("timestamp")

    def save_pool_snapshot(self, reserves: PoolReserves, pool_id: str) -> None:
        """Append pool snapshot."""
        path = self.pools_dir / f"{pool_id}.parquet"
        row = {
            "timestamp": reserves.timestamp,
            "token_a": reserves.token_a,
            "token_b": reserves.token_b,
            "reserve_a": reserves.reserve_a,
            "reserve_b": reserves.reserve_b,
        }
        df = pd.DataFrame([row])
        if path.exists():
            existing = pd.read_parquet(path)
            df = pd.concat([existing, df]).drop_duplicates(
                subset=["timestamp"], keep="last"
            ).sort_values("timestamp")
        df.to_parquet(path, index=False)

    def load_pool_history(
        self,
        pool_id: str,
        start: datetime | None = None,
        end: datetime | None = None,
    ) -> pd.DataFrame:
        """Load pool reserve history."""
        path = self.pools_dir / f"{pool_id}.parquet"
        if not path.exists():
            return pd.DataFrame()

        df = pd.read_parquet(path)
        df["timestamp"] = pd.to_datetime(df["timestamp"])

        if start is not None:
            df = df[df["timestamp"] >= start]
        if end is not None:
            df = df[df["timestamp"] <= end]

        return df.sort_values("timestamp")
