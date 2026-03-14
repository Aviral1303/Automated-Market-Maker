# Design Decisions

## 1. Constant Product (x×y=k)

**Choice:** Uniswap V2-style constant product AMM.

**Rationale:**
- Simple, battle-tested formula
- Predictable price impact
- No oracle dependency
- Capital efficient for volatile pairs

**Tradeoffs:** Impermanent loss for LPs; slippage increases with trade size.

---

## 2. Fee Structure (0.3%)

**Choice:** 0.3% per swap, applied to input amount.

**Rationale:** Industry standard (Uniswap V2, SushiSwap). Balances LP revenue vs. trader cost.

**Implementation:** `amountInWithFee = amountIn * 997/1000` before computing output.

---

## 3. Real Market Data

**Choice:** CoinGecko primary, Binance fallback.

**Rationale:**
- CoinGecko: No API key, no geo restrictions, stable
- Binance: Lower latency when available
- User-Agent required for CoinGecko compliance

---

## 4. Arbitrage Detection

**Choice:** Compare AMM spot price to CEX price; flag when spread > 30 bps (fee threshold).

**Rationale:** Arbitrageurs keep AMM prices aligned with market. Showing the gap demonstrates understanding of price discovery.

---

## 5. Wallet Integration

**Choice:** Direct `window.ethereum` (MetaMask) via custom hook.

**Rationale:** Lightweight; no wagmi/viem provider setup. Sufficient for connect/disconnect. For on-chain swaps, would integrate with deployed contract.

---

## 6. Backtest Engine

**Choice:** Replay historical OHLCV through simulated AMM; compute fees, IL, final value.

**Rationale:** Demonstrates quantitative thinking. Uses CoinGecko when Binance is restricted.

---

## 7. MEV Simulation

**Choice:** Three-step sandwich: front-run (50% of victim size), victim swap, back-run.

**Rationale:** MEV is a critical DeFi topic. Simulation shows extractable value without executing on-chain.

---

## 8. Concentrated Liquidity

**Choice:** Uniswap V3-style math for range [pa, pb]. Virtual reserves from √P.

**Rationale:** Advanced AMM design. Enables capital efficiency discussion.
