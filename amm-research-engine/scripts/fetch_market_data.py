#!/usr/bin/env python3
"""
Fetch and store market data from Binance/CoinGecko.
Usage: python scripts/fetch_market_data.py [--symbol BTC/USDT] [--days 7]
"""

import argparse
import sys
from datetime import datetime, timedelta
from pathlib import Path
from pathlib import Path
# Add project root
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from data import BinanceDataProvider, CoinGeckoDataProvider, DataStorage


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--symbol", default="BTC/USDT")
    parser.add_argument("--days", type=int, default=7)
    parser.add_argument("--provider", choices=["binance", "coingecko"], default="binance")
    parser.add_argument("--output", default="data/store")
    args = parser.parse_args()

    storage = DataStorage(args.output)

    if args.provider == "binance":
        provider = BinanceDataProvider()
    else:
        provider = CoinGeckoDataProvider()

    end = datetime.utcnow()
    start = end - timedelta(days=args.days)

    print(f"Fetching {args.symbol} from {args.provider} ({start.date()} to {end.date()})")
    candles = provider.get_historical_prices(args.symbol, start, end, "1h")

    if not candles:
        print("No data fetched")
        return

    storage.save_ohlcv(candles, args.symbol, "1h")
    print(f"Saved {len(candles)} candles to {storage._ohlcv_path(args.symbol, '1h')}")


if __name__ == "__main__":
    main()
