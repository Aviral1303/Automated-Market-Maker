"""
CoinGecko API data provider.

Free API for price data. Rate limited (10-50 calls/min on free tier).
"""

from datetime import datetime
import time

import requests

from .base import DataProvider, OHLCV, Ticker


class CoinGeckoDataProvider(DataProvider):
    """CoinGecko price data (no API key required for basic usage)."""

    BASE = "https://api.coingecko.com/api/v3"

    def __init__(self, api_key: str | None = None) -> None:
        self.api_key = api_key
        self._session = requests.Session()
        self._last_request = 0.0
        self._min_interval = 1.5  # Rate limit: ~40/min free

    def _rate_limit(self) -> None:
        elapsed = time.time() - self._last_request
        if elapsed < self._min_interval:
            time.sleep(self._min_interval - elapsed)
        self._last_request = time.time()

    def _cg_id(self, symbol: str) -> str:
        """Map symbol to CoinGecko id. Common pairs."""
        mapping = {
            "BTC": "bitcoin",
            "ETH": "ethereum",
            "USDT": "tether",
            "USDC": "usd-coin",
            "BNB": "binancecoin",
            "SOL": "solana",
            "XRP": "ripple",
            "ADA": "cardano",
            "DOGE": "dogecoin",
        }
        return mapping.get(symbol.upper(), symbol.lower())

    def get_ticker(self, symbol: str) -> Ticker | None:
        self._rate_limit()
        cg_id = self._cg_id(symbol)
        try:
            r = self._session.get(
                f"{self.BASE}/simple/price",
                params={"ids": cg_id, "vs_currencies": "usd", "include_24hr_vol": "true"},
                timeout=10,
            )
            r.raise_for_status()
            data = r.json().get(cg_id, {})
            price = float(data.get("usd", 0))
            vol = float(data.get("usd_24h_vol", 0) or 0)
            return Ticker(
                symbol=symbol,
                bid=price,
                ask=price,
                last=price,
                volume=vol,
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
        self._rate_limit()
        cg_id = self._cg_id(symbol)
        days = min(limit // 24, 90)  # CoinGecko uses days
        try:
            r = self._session.get(
                f"{self.BASE}/coins/{cg_id}/market_chart",
                params={"vs_currency": "usd", "days": days},
                timeout=10,
            )
            r.raise_for_status()
            data = r.json()
            prices = data.get("prices", [])
            volumes = {int(p[0]): p[1] for p in data.get("total_volumes", [])}

            ohlcv_list: list[OHLCV] = []
            for i, (ts_ms, close) in enumerate(prices):
                ts = datetime.fromtimestamp(ts_ms / 1000)
                if since and ts < since:
                    continue
                if len(ohlcv_list) >= limit:
                    break
                vol = volumes.get(ts_ms, 0)
                ohlcv_list.append(
                    OHLCV(
                        timestamp=ts,
                        open=close,
                        high=close,
                        low=close,
                        close=close,
                        volume=vol,
                        symbol=symbol,
                    )
                )
            return ohlcv_list
        except Exception:
            return []

    def get_historical_prices(
        self,
        symbol: str,
        start: datetime,
        end: datetime,
        interval: str = "1h",
    ) -> list[OHLCV]:
        days = max(1, (end - start).days)
        self._rate_limit()
        cg_id = self._cg_id(symbol)
        try:
            r = self._session.get(
                f"{self.BASE}/coins/{cg_id}/market_chart/range",
                params={
                    "vs_currency": "usd",
                    "from": int(start.timestamp()),
                    "to": int(end.timestamp()),
                },
                timeout=15,
            )
            r.raise_for_status()
            data = r.json()
            prices = data.get("prices", [])
            volumes = {int(p[0]): p[1] for p in data.get("total_volumes", [])}

            return [
                OHLCV(
                    timestamp=datetime.fromtimestamp(ts / 1000),
                    open=float(c),
                    high=float(c),
                    low=float(c),
                    close=float(c),
                    volume=float(volumes.get(ts, 0)),
                    symbol=symbol,
                )
                for ts, c in prices
                if start <= datetime.fromtimestamp(ts / 1000) <= end
            ]
        except Exception:
            return []
