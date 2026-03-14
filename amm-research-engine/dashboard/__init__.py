"""
AMM Research Engine - Visualization & Dashboard

Charts for price, reserves, arbitrage, slippage, LP returns.
Streamlit dashboard.
"""

from .charts import (
    plot_amm_vs_market,
    plot_slippage_curve,
    plot_impermanent_loss,
    plot_pool_reserves,
)

__all__ = [
    "plot_amm_vs_market",
    "plot_slippage_curve",
    "plot_impermanent_loss",
    "plot_pool_reserves",
]
