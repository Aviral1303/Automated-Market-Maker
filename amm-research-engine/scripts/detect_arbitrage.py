#!/usr/bin/env python3
"""
Detect arbitrage opportunities: AMM vs CEX price.
Usage: python scripts/detect_arbitrage.py [--amm-price 1.02] [--cex-price 1.0]
"""

import argparse
from decimal import Decimal
from pathlib import Path

import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from arbitrage import ArbitrageDetector


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--amm-price", type=float, default=1.02)
    parser.add_argument("--cex-price", type=float, default=1.0)
    parser.add_argument("--reserve", type=float, default=1_000_000)
    args = parser.parse_args()

    det = ArbitrageDetector(min_spread_bps=30)
    opp = det.detect(
        Decimal(str(args.amm_price)),
        Decimal(str(args.cex_price)),
        args.reserve,
        args.reserve,
    )
    if opp:
        print(f"Arbitrage opportunity: {opp.direction}")
        print(f"  AMM price: {opp.amm_price}, CEX price: {opp.cex_price}")
        print(f"  Spread: {opp.spread_bps} bps")
        print(f"  Est. profit: {opp.estimated_profit_bps} bps")
        print(f"  Recommended amount: {opp.recommended_amount_in}")
    else:
        print("No arbitrage opportunity")


if __name__ == "__main__":
    main()
