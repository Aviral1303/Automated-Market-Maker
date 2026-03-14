"""
AMM Research Engine - Market Data Ingestion

Data providers:
- Binance (REST + WebSocket)
- Coinbase
- CoinGecko
- The Graph (on-chain pool data)
"""

from .base import DataProvider, OHLCV, Ticker
from .binance import BinanceDataProvider
from .coingecko import CoinGeckoDataProvider
from .storage import DataStorage

__all__ = [
    "DataProvider",
    "OHLCV",
    "Ticker",
    "BinanceDataProvider",
    "CoinGeckoDataProvider",
    "DataStorage",
]
