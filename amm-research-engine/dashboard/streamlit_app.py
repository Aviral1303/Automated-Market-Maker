"""
Streamlit dashboard for AMM Research Engine.
Run: streamlit run amm_research_engine/dashboard/streamlit_app.py
"""

import sys
from pathlib import Path

# Add project root (amm-research-engine/)
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import streamlit as st
from decimal import Decimal

st.set_page_config(
    page_title="AMM Research Engine",
    page_icon="📊",
    layout="wide",
)

st.title("AMM Research Engine Dashboard")
st.markdown("Quantitative research platform for AMM analysis")

tab1, tab2, tab3, tab4 = st.tabs(
    ["AMM Models", "Slippage Analysis", "Impermanent Loss", "Arbitrage"]
)

with tab1:
    st.header("AMM Model Comparison")
    col1, col2 = st.columns(2)
    with col1:
        reserve_a = st.number_input("Reserve A", value=1000000.0, min_value=1.0)
        reserve_b = st.number_input("Reserve B", value=1000000.0, min_value=1.0)
    with col2:
        swap_amount = st.number_input("Swap Amount", value=1000.0, min_value=0.1)
        token_in = st.selectbox("Token In", ["A", "B"])

    if st.button("Compare Models"):
        from core import ConstantProductAMM, BalancerAMM, StableSwapAMM

        models = {
            "Constant Product": ConstantProductAMM(reserve_a, reserve_b),
            "Balancer 80/20": BalancerAMM(reserve_a, reserve_b, weight_a=0.8),
            "StableSwap (A=100)": StableSwapAMM(reserve_a, reserve_b, amplification=100),
        }
        for name, amm in models.items():
            if amm.total_supply == 0:
                amm.add_liquidity(reserve_a, reserve_b)
            try:
                result = amm.swap(token_in, swap_amount)
                st.write(f"**{name}**: Out={result.amount_out:.4f}, Impact={result.price_impact_bps} bps")
            except Exception as e:
                st.write(f"**{name}**: Error - {e}")

with tab2:
    st.header("Slippage Curve")
    r_a = st.number_input("Reserve In", value=1000000.0, key="r2")
    r_b = st.number_input("Reserve Out", value=1000000.0, key="r2b")
    if st.button("Compute Slippage"):
        from analytics.slippage import compute_slippage_curve

        curve = compute_slippage_curve(r_a, r_b)
        sizes, outs, slips = zip(*curve)
        import pandas as pd
        df = pd.DataFrame({"Trade Size": sizes, "Slippage (bps)": slips})
        st.dataframe(df)
        from dashboard.charts import plot_slippage_curve
        fig = plot_slippage_curve(list(sizes), list(slips))
        if fig:
            st.plotly_chart(fig, use_container_width=True)

with tab3:
    st.header("Impermanent Loss Calculator")
    p0 = st.number_input("Initial Price (P0)", value=1.0, min_value=0.001)
    p_range = st.slider("Price Ratio Range", 0.1, 3.0, (0.5, 2.0), 0.05)
    if st.button("Plot IL"):
        from analytics.impermanent_loss import impermanent_loss_percent
        import numpy as np

        ratios = list(np.linspace(p_range[0], p_range[1], 50))
        il = [impermanent_loss_percent(p0, p0 * r) for r in ratios]
        from dashboard.charts import plot_impermanent_loss
        fig = plot_impermanent_loss(ratios, il)
        if fig:
            st.plotly_chart(fig, use_container_width=True)

with tab4:
    st.header("Arbitrage Detection")
    amm_p = st.number_input("AMM Price", value=1.02, min_value=0.001)
    cex_p = st.number_input("CEX Price", value=1.0, min_value=0.001)
    if st.button("Detect"):
        from arbitrage import ArbitrageDetector

        det = ArbitrageDetector(min_spread_bps=30)
        opp = det.detect(amm_p, cex_p, 1_000_000, 1_000_000)
        if opp:
            st.success(
                f"Opportunity: {opp.direction}, Spread={opp.spread_bps} bps, "
                f"Est. Profit={opp.estimated_profit_bps} bps"
            )
        else:
            st.info("No arbitrage opportunity detected")
