"""
AMM Research Engine - Analytics

LP analytics: impermanent loss, fee income, profitability
Slippage: price impact, execution curves
"""

from .impermanent_loss import calculate_impermanent_loss
from .slippage import compute_slippage_curve, price_impact_bps

__all__ = [
    "calculate_impermanent_loss",
    "compute_slippage_curve",
    "price_impact_bps",
]
