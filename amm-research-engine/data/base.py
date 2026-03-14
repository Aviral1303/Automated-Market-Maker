"""
Abstract base for market data providers.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime
from typing import AsyncIterator


@dataclass
class OHLCV:
    """OHLCV candle."""

    timestamp: datetime
    open: float
    high: float
    low: float
    close: float
    volume: float
    symbol: str = ""


@dataclass
class Ticker:
    """Real-time ticker."""

    symbol: str
    bid: float
    ask: float
    last: float
    volume: float
    timestamp: datetime


@dataclass
class PoolReserves:
    """On-chain pool reserves."""

    pool_id: str
    token_a: str
    token_b: str
    reserve_a: float
    reserve_b: float
    timestamp: datetime


class DataProvider(ABC):
    """Abstract base for data providers."""

    @abstractmethod
    def get_ticker(self, symbol: str) -> Ticker | None:
        """Fetch current ticker for symbol."""
        pass

    @abstractmethod
    def get_ohlcv(
        self,
        symbol: str,
        timeframe: str = "1h",
        limit: int = 100,
        since: datetime | None = None,
    ) -> list[OHLCV]:
        """Fetch OHLCV candles."""
        pass

    @abstractmethod
    def get_historical_prices(
        self,
        symbol: str,
        start: datetime,
        end: datetime,
        interval: str = "1h",
    ) -> list[OHLCV]:
        """Fetch historical OHLCV for date range."""
        pass
