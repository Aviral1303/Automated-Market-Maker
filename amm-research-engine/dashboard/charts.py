"""
Visualization functions using Plotly.
"""

from decimal import Decimal
from typing import Any

import pandas as pd


def plot_amm_vs_market(
    df: pd.DataFrame,
    amm_col: str = "amm_price",
    market_col: str = "market_price",
    timestamp_col: str = "timestamp",
    title: str = "AMM Price vs Market Price",
) -> Any:
    """Plot AMM price vs market price over time."""
    try:
        import plotly.graph_objects as go

        fig = go.Figure()
        fig.add_trace(
            go.Scatter(
                x=df[timestamp_col],
                y=df[amm_col],
                name="AMM Price",
                line=dict(color="#6366f1"),
            )
        )
        fig.add_trace(
            go.Scatter(
                x=df[timestamp_col],
                y=df[market_col],
                name="Market Price",
                line=dict(color="#22c55e", dash="dash"),
            )
        )
        fig.update_layout(
            title=title,
            xaxis_title="Time",
            yaxis_title="Price",
            template="plotly_dark",
            hovermode="x unified",
        )
        return fig
    except ImportError:
        return None


def plot_slippage_curve(
    trade_sizes: list[float],
    slippage_bps: list[float],
    title: str = "Slippage Curve",
) -> Any:
    """Plot slippage (bps) vs trade size."""
    try:
        import plotly.graph_objects as go

        fig = go.Figure()
        fig.add_trace(
            go.Scatter(
                x=trade_sizes,
                y=slippage_bps,
                mode="lines+markers",
                name="Slippage (bps)",
                line=dict(color="#f59e0b"),
            )
        )
        fig.update_layout(
            title=title,
            xaxis_title="Trade Size (token units)",
            yaxis_title="Slippage (bps)",
            template="plotly_dark",
        )
        return fig
    except ImportError:
        return None


def plot_impermanent_loss(
    price_ratios: list[float],
    il_percent: list[float],
    title: str = "Impermanent Loss vs Price Change",
) -> Any:
    """Plot IL % vs price ratio (P/P0)."""
    try:
        import plotly.graph_objects as go

        fig = go.Figure()
        fig.add_trace(
            go.Scatter(
                x=price_ratios,
                y=il_percent,
                mode="lines",
                name="IL %",
                fill="tozeroy",
                line=dict(color="#ef4444"),
            )
        )
        fig.update_layout(
            title=title,
            xaxis_title="Price Ratio (P/P0)",
            yaxis_title="Impermanent Loss (%)",
            template="plotly_dark",
        )
        return fig
    except ImportError:
        return None


def plot_pool_reserves(
    df: pd.DataFrame,
    reserve_a_col: str = "reserve_a",
    reserve_b_col: str = "reserve_b",
    timestamp_col: str = "timestamp",
    title: str = "Pool Reserves Over Time",
) -> Any:
    """Plot pool reserves over time."""
    try:
        import plotly.graph_objects as go
        from plotly.subplots import make_subplots

        fig = make_subplots(specs=[[{"secondary_y": True}]])
        fig.add_trace(
            go.Scatter(
                x=df[timestamp_col],
                y=df[reserve_a_col],
                name="Reserve A",
                line=dict(color="#3b82f6"),
            ),
            secondary_y=False,
        )
        fig.add_trace(
            go.Scatter(
                x=df[timestamp_col],
                y=df[reserve_b_col],
                name="Reserve B",
                line=dict(color="#8b5cf6"),
            ),
            secondary_y=True,
        )
        fig.update_layout(
            title=title,
            template="plotly_dark",
            hovermode="x unified",
        )
        fig.update_xaxes(title_text="Time")
        fig.update_yaxes(title_text="Reserve A", secondary_y=False)
        fig.update_yaxes(title_text="Reserve B", secondary_y=True)
        return fig
    except ImportError:
        return None
