"""
Binance REST API data provider.

Fetches CEX prices, OHLCV, and supports streaming.
"""

from datetime import datetime
from typing import Any

from .base import DataProvider, OHLCV, Ticker


class BinanceDataProvider(DataProvider):
    """Binance spot market data via ccxt."""

    def __init__(self, api_key: str | None = None, secret: str | None = None) -> None:
        try:
            import ccxt
            self.exchange = ccxt.binance(
                {"apiKey": api_key or "", "secret": secret or ""}
            )
        except ImportError:
            raise ImportError("Install ccxt: pip install ccxt")

    def _to_ohlcv(self, row: list, symbol: str = "") -> OHLCV:
        ts, o, h, l, c, v = row[0], row[1], row[2], row[3], row[4], row[5]
        return OHLCV(
            timestamp=datetime.fromtimestamp(ts / 1000),
            open=float(o),
            high=float(h),
            low=float(l),
            close=float(c),
            volume=float(v),
            symbol=symbol,
        )

    def get_ticker(self, symbol: str) -> Ticker | None:
        try:
            t = self.exchange.fetch_ticker(symbol)
            return Ticker(
                symbol=symbol,
                bid=float(t.get("bid", 0) or 0),
                ask=float(t.get("ask", 0) or 0),
                last=float(t.get("last", 0) or 0),
                volume=float(t.get("baseVolume", 0) or 0),
                timestamp=datetime.utcnow(),
            )
        except Exception:
            return None

    def get_ohlcv(
        self,
        symbol: str,
        timeframe: str = "1h",
        limit: int = 100,
        since: datetime | None = None,
    ) -> list[OHLCV]:
        try:
            since_ms = int(since.timestamp() * 1000) if since else None
            raw = self.exchange.fetch_ohlcv(symbol, timeframe, since_ms, limit)
            return [self._to_ohlcv(r, symbol) for r in raw]
        except Exception:
            return []

    def get_historical_prices(
        self,
        symbol: str,
        start: datetime,
        end: datetime,
        interval: str = "1h",
    ) -> list[OHLCV]:
        all_candles: list[OHLCV] = []
        since = start
        while since < end:
            batch = self.get_ohlcv(
                symbol, interval, limit=1000, since=since
            )
            if not batch:
                break
            for c in batch:
                if start <= c.timestamp <= end:
                    all_candles.append(c)
            since = batch[-1].timestamp if batch else end
            if batch and batch[-1].timestamp >= end:
                break
        return all_candles
