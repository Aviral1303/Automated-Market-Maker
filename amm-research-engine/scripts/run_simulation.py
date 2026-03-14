#!/usr/bin/env python3
"""
Run a trading simulation with retail + arbitrageur agents.
Usage: python scripts/run_simulation.py [--steps 100] [--reserve 1000000]
"""

import argparse
from datetime import datetime, timedelta
from decimal import Decimal
from pathlib import Path

import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from simulation import SimulationEngine
from simulation.pool_state import SimulatedPool
from simulation.agents import RetailTrader, ArbitrageurAgent


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--steps", type=int, default=100)
    parser.add_argument("--reserve", type=float, default=1_000_000)
    args = parser.parse_args()

    pool = SimulatedPool.create_constant_product(
        args.reserve, args.reserve,
        token_a_name="ETH", token_b_name="USDT",
    )
    agents = [
        RetailTrader("retail_1", min_trade_usd=100, max_trade_usd=5000),
        ArbitrageurAgent("arb_1", min_profit_bps=15),
    ]
    engine = SimulationEngine(pool, agents)

    # Synthetic price series: random walk around 1.0
    import random
    price = 1.0
    base = datetime.utcnow() - timedelta(hours=args.steps)
    series = []
    for i in range(args.steps):
        price *= 1 + random.gauss(0, 0.01)
        ts = base + timedelta(hours=i)
        series.append((ts, Decimal(str(price))))

    result = engine.run(series)
    print(f"Simulation complete: {args.steps} steps")
    print(f"Final reserves: A={result.final_reserves[0]:.2f}, B={result.final_reserves[1]:.2f}")
    print(f"Total volume: {result.total_volume:.2f}")
    print(f"Total fees: {result.total_fees:.2f}")
    print(f"Events: {len(result.events)}")


if __name__ == "__main__":
    main()
