# AMM Research Engine — Architecture Document

## Executive Summary

The AMM Research Engine transforms the basic Uniswap-style AMM demo into a **production-grade quantitative research platform** for DeFi protocol design, arbitrage analysis, and liquidity provider profitability studies. The system ingests real market data, simulates multiple AMM models, and provides analytics comparable to tools used by quantitative crypto funds.

---

## 1. Current Repository Analysis

### 1.1 What the Code Currently Does

| Component | Implementation | Purpose |
|-----------|----------------|---------|
| **Smart Contract** (`contracts/AMM.sol`) | Uniswap V2-style constant product | On-chain AMM with 0.3% fee, LP tokens |
| **Backend** (`src/backend/server.js`) | In-memory `AMMCore` class | REST API for swap, liquidity, stats |
| **Frontend** (`frontend/`) | React + Tailwind | Swap UI, liquidity management, analytics |
| **Tests** | Hardhat (contracts), Jest (backend) | Unit tests for core logic |

**AMM Logic:**
- Constant product: `x × y = k` with fee: `amountOut = (amountIn × 997 × reserveOut) / (reserveIn × 1000 + amountIn × 997)`
- LP tokens: `sqrt(amountA × amountB) - MINIMUM_LIQUIDITY` for first deposit
- Single pool: Token A / Token B only

### 1.2 Weaknesses & Missing Components

| Issue | Severity | Description |
|-------|----------|-------------|
| **No real market data** | Critical | Synthetic/demo data only; no CEX prices, no on-chain pool data |
| **Single AMM model** | High | Only constant product; no Balancer, StableSwap, constant sum |
| **No simulation framework** | High | No agent-based trading, no historical replay |
| **LP logic mismatch** | Medium | Contract uses `sqrt` for first liquidity; backend uses `min` |
| **No arbitrage detection** | High | Cannot compare AMM vs CEX prices |
| **No LP analytics** | High | No impermanent loss, fee income, or profitability metrics |
| **No persistence** | Medium | In-memory state; restarts lose everything |
| **Unused blockchain code** | Low | ethers/ABI in server.js never connect to chain |
| **Port inconsistency** | Low | Frontend proxy 3002 vs backend 3001 |
| **No slippage analysis** | Medium | Basic price impact only; no execution curves |

### 1.3 Suggested Improvements

- **Modularity:** Separate AMM models, data sources, and analytics into pluggable modules
- **Extensibility:** Abstract base classes for AMM models and data providers
- **Type safety:** Type hints, dataclasses, Pydantic for data validation
- **Configuration:** YAML/TOML config for API keys, symbols, fee tiers
- **Testing:** pytest with fixtures; integration tests for data ingestion

---

## 2. Redesigned Architecture

### 2.1 Folder Structure

```
amm-research-engine/
├── core/                    # AMM model implementations
│   ├── __init__.py
│   ├── base.py              # Abstract AMM interface
│   ├── constant_product.py  # Uniswap V2 style
│   ├── constant_sum.py      # Fixed-price pools
│   ├── balancer.py          # Weighted pools
│   └── stableswap.py        # Curve-style stable pools
│
├── data/                    # Market data ingestion
│   ├── __init__.py
│   ├── base.py              # Abstract data provider
│   ├── binance.py           # Binance REST + WebSocket
│   ├── coinbase.py          # Coinbase Pro API
│   ├── coingecko.py         # CoinGecko prices
│   ├── thegraph.py          # On-chain pool reserves (Uniswap, etc.)
│   └── storage.py           # Historical data storage (Parquet, SQLite)
│
├── simulation/              # Trading simulation
│   ├── __init__.py
│   ├── engine.py            # Simulation orchestrator
│   ├── pool_state.py        # Pool state management
│   └── agents/
│       ├── __init__.py
│       ├── base.py          # Abstract agent
│       ├── retail.py        # Retail traders
│       ├── arbitrageur.py   # Arbitrage bots
│       └── lp.py            # Liquidity providers
│
├── analytics/               # LP & market analytics
│   ├── __init__.py
│   ├── impermanent_loss.py  # IL calculation
│   ├── fee_income.py        # Fee accrual
│   ├── lp_profitability.py  # Net LP returns
│   └── slippage.py          # Price impact, execution curves
│
├── arbitrage/               # Arbitrage detection
│   ├── __init__.py
│   ├── detector.py          # Price discrepancy detection
│   ├── simulator.py         # Arbitrage trade simulation
│   └── profit_calculator.py # Profit after fees
│
├── replay/                  # Historical market replay
│   ├── __init__.py
│   └── replayer.py          # Minute-by-minute replay
│
├── rl/                      # Reinforcement learning (optional)
│   ├── __init__.py
│   ├── env.py               # Gym environment for AMM
│   └── market_maker.py      # RL-based market maker
│
├── dashboard/               # Visualization
│   ├── __init__.py
│   ├── charts.py            # Plotly/Matplotlib charts
│   └── streamlit_app.py     # Streamlit dashboard
│
├── notebooks/               # Jupyter experiments
│   ├── 01_data_ingestion.ipynb
│   ├── 02_amm_comparison.ipynb
│   ├── 03_arbitrage_analysis.ipynb
│   ├── 04_lp_profitability.ipynb
│   └── 05_historical_replay.ipynb
│
├── config/                  # Configuration
│   ├── default.yaml
│   └── symbols.yaml
│
├── scripts/                 # CLI & example scripts
│   ├── fetch_market_data.py
│   ├── run_simulation.py
│   ├── detect_arbitrage.py
│   └── replay_historical.py
│
├── tests/                   # Test suite
│   ├── test_amm_models.py
│   ├── test_data_ingestion.py
│   └── test_simulation.py
│
├── pyproject.toml           # Project config (Poetry/PDM)
├── requirements.txt         # Dependencies
└── README.md
```

### 2.2 Module Responsibilities

| Module | Responsibility |
|--------|----------------|
| **core** | AMM math: swap, add/remove liquidity, price, fees. Pluggable models. |
| **data** | Fetch CEX prices, AMM reserves, store OHLCV and tick data. |
| **simulation** | Run time-step simulations with agents; update pool state. |
| **analytics** | Impermanent loss, fee income, LP profitability, slippage curves. |
| **arbitrage** | Compare AMM vs CEX; detect opportunities; simulate arb trades. |
| **replay** | Replay historical price paths; simulate AMM behavior over time. |
| **rl** | Gym env for RL market maker; optional research extension. |
| **dashboard** | Charts for price, reserves, arb, slippage, LP returns. |

---

## 3. Data Flow

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  CEX APIs       │────▶│  data/storage    │────▶│  simulation/    │
│  (Binance, etc) │     │  (Parquet, DB)   │     │  replay         │
└─────────────────┘     └──────────────────┘     └────────┬────────┘
                                                          │
┌─────────────────┐     ┌──────────────────┐             │
│  The Graph      │────▶│  On-chain pool   │─────────────┤
│  (Uniswap etc)  │     │  reserves        │             │
└─────────────────┘     └──────────────────┘             ▼
                                                 ┌─────────────────┐
                                                 │  analytics/     │
                                                 │  arbitrage/     │
                                                 └────────┬────────┘
                                                          │
                                                          ▼
                                                 ┌─────────────────┐
                                                 │  dashboard/      │
                                                 │  notebooks      │
                                                 └─────────────────┘
```

---

## 4. Key Design Decisions

1. **Python-first:** Quant research standard; rich ecosystem (pandas, numpy, ccxt, plotly).
2. **Modular AMM core:** Each model implements `swap`, `add_liquidity`, `remove_liquidity`, `get_price`.
3. **Agent-based simulation:** Discrete time steps; agents submit orders; engine applies and updates state.
4. **Config-driven:** Symbols, API endpoints, fee tiers in YAML; no hardcoding.
5. **Preserve existing:** Keep `contracts/` and `frontend/` for reference; new engine is additive.

---

## 5. Implementation Priority

1. **core/** — AMM models (constant product, sum, Balancer, StableSwap)
2. **data/** — Binance, CoinGecko, storage
3. **simulation/** — Engine, pool state, retail/arb/LP agents
4. **analytics/** — IL, fees, slippage
5. **arbitrage/** — Detector, simulator
6. **replay/** — Historical replayer
7. **dashboard/** — Charts, Streamlit
8. **notebooks/** — Example experiments
9. **rl/** — Optional RL extension
