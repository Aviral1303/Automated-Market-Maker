# AMM Research Engine

A **production-grade quantitative research platform** for Automated Market Makers (AMMs). Built for crypto hedge funds, DeFi protocol teams, and quantitative trading firms.

## Features

- **Real Market Data**: Binance, CoinGecko, The Graph (on-chain pool data)
- **Multiple AMM Models**: Constant Product (Uniswap), Constant Sum, Balancer, StableSwap (Curve)
- **Trading Simulation**: Retail traders, arbitrageurs, LPs with configurable agents
- **Arbitrage Detection**: AMM vs CEX price comparison, profit estimation
- **LP Analytics**: Impermanent loss, fee income, net profitability
- **Slippage Analysis**: Price impact curves, execution prices
- **Historical Replay**: Minute-by-minute simulation over real price paths
- **Visualization**: Plotly charts, Streamlit dashboard

## Quick Start

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows

# Install dependencies
pip install -r requirements.txt

# Run simulation
python scripts/run_simulation.py --steps 100

# Detect arbitrage
python scripts/detect_arbitrage.py --amm-price 1.02 --cex-price 1.0

# Fetch market data
python scripts/fetch_market_data.py --symbol BTC/USDT --days 7

# Replay historical
python scripts/replay_historical.py --symbol BTC/USDT --days 1

# Launch dashboard
streamlit run dashboard/streamlit_app.py
```

## Project Structure

```
amm-research-engine/
├── core/           # AMM models (Constant Product, Balancer, StableSwap)
├── data/            # Market data (Binance, CoinGecko, storage)
├── simulation/      # Engine + agents (retail, arb, LP)
├── analytics/       # IL, slippage, LP profitability
├── arbitrage/       # Detection + simulation
├── replay/          # Historical market replay
├── dashboard/       # Charts + Streamlit UI
├── config/          # YAML configuration
├── scripts/         # CLI tools
└── notebooks/       # Jupyter experiments
```

## AMM Models

| Model | Use Case | Formula |
|-------|----------|---------|
| Constant Product | General pairs (ETH/USDT) | x × y = k |
| Constant Sum | Fixed price | x + y = k |
| Balancer | Weighted pools (80/20) | V = (x/w_x)^w_x × (y/w_y)^w_y |
| StableSwap | Stablecoins (USDC/USDT) | Curve-style amplification |

## Configuration

Copy and edit `config/default.yaml`:

```yaml
data:
  storage_path: "data/store"
  binance:
    enabled: true
  coingecko:
    enabled: true

simulation:
  default_fee_bps: 30
  initial_reserve_a: 1000000
  initial_reserve_b: 1000000
```

## Jupyter Notebooks

See `notebooks/` for example experiments:

- `01_data_ingestion.ipynb` - Fetch and store market data
- `02_amm_comparison.ipynb` - Compare AMM models
- `03_arbitrage_analysis.ipynb` - Detect and simulate arb
- `04_lp_profitability.ipynb` - Impermanent loss + fees
- `05_historical_replay.ipynb` - Replay historical prices

## API Reference

### Core AMM

```python
from core import ConstantProductAMM

amm = ConstantProductAMM(1_000_000, 1_000_000, fee_bps=30)
amm.add_liquidity(1_000_000, 1_000_000)
result = amm.swap("A", 1000)
print(result.amount_out, result.price_impact_bps)
```

### Data Ingestion

```python
from data import BinanceDataProvider, DataStorage

provider = BinanceDataProvider()
ticker = provider.get_ticker("BTC/USDT")
candles = provider.get_ohlcv("BTC/USDT", "1h", limit=100)

storage = DataStorage("data/store")
storage.save_ohlcv(candles, "BTC/USDT", "1h")
```

### Arbitrage Detection

```python
from arbitrage import ArbitrageDetector

det = ArbitrageDetector(min_spread_bps=35)
opp = det.detect(amm_price=1.02, cex_price=1.0, reserve_a=1e6, reserve_b=1e6)
if opp:
    print(opp.direction, opp.estimated_profit_bps)
```

## License

MIT
