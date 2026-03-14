#!/usr/bin/env python3
"""
Replay historical market data through AMM simulation.
Usage: python scripts/replay_historical.py [--symbol BTC/USDT] [--days 7]
"""

import argparse
from datetime import datetime, timedelta
from pathlib import Path

import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from data import BinanceDataProvider, DataStorage
from replay import HistoricalReplayer


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--symbol", default="BTC/USDT")
    parser.add_argument("--days", type=int, default=7)
    parser.add_argument("--reserve", type=float, default=100)
    args = parser.parse_args()

    # Fetch or load data
    provider = BinanceDataProvider()
    end = datetime.utcnow()
    start = end - timedelta(days=args.days)
    candles = provider.get_historical_prices(args.symbol, start, end, "1h")

    if not candles:
        print("No data. Try --days 1 for recent data.")
        return

    import pandas as pd
    df = pd.DataFrame([
        {"timestamp": c.timestamp, "close": c.close}
        for c in candles
    ])

    # Initial reserves: use first price for ratio
    p0 = df["close"].iloc[0]
    reserve_a = args.reserve
    reserve_b = args.reserve * p0

    replayer = HistoricalReplayer(reserve_a, reserve_b)
    replayer.replay(df, price_col="close", timestamp_col="timestamp")

    out_df = replayer.to_dataframe()
    out_path = Path("data/replay_output.csv")
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_df.to_csv(out_path, index=False)
    print(f"Replay complete. Output: {out_path}")
    print(f"Final AMM price: {out_df['amm_price'].iloc[-1]:.4f}")
    print(f"Final market price: {out_df['market_price'].iloc[-1]:.4f}")
