"""
AMM Research Engine - Arbitrage Detection

Compares AMM price vs CEX price, detects opportunities,
simulates arbitrage trades.
"""

from .detector import ArbitrageDetector
from .simulator import ArbitrageSimulator

__all__ = ["ArbitrageDetector", "ArbitrageSimulator"]
