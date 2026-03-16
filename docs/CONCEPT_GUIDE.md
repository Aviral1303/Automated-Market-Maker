# QuantAMM — Concept Guide for Engineering Presentations

This document maps **DeFi/AMM theory** to **your implementation**. Use it to prepare for high-level and low-level technical discussions.

---

## Part 1: DeFi & AMM Fundamentals

### 1.1 What is an Automated Market Maker (AMM)?

**Definition:** An AMM replaces the order book with a **liquidity pool** and a **pricing formula**. Traders swap against the pool; LPs deposit both tokens and earn fees.

**Order book vs AMM:**
- **Order book (CEX):** Buyers and sellers post limit orders; price = where bids meet asks.
- **AMM:** No orders. Price is derived from the ratio of reserves in the pool. Anyone can trade as long as there's liquidity.

**Why it matters for crypto:** On-chain order books are expensive (gas). AMMs are gas-efficient and permissionless—anyone can add liquidity.

**In your project:** `contracts/AMM.sol` (on-chain) and `src/backend/server.js` → `AMMCore` class (in-memory simulation).

---

### 1.2 Constant Product Formula (x × y = k)

**Formula:** For reserves `(x, y)`, the invariant is `x × y = k`. After a swap, `k` stays the same.

**Swap math (no fee):**
- Swap `Δx` of token A for token B.
- New reserves: `(x + Δx, y - Δy)`.
- Invariant: `(x + Δx)(y - Δy) = k = xy`.
- Solve for `Δy`:  
  `Δy = y - k/(x+Δx) = y - xy/(x+Δx) = (Δx × y) / (x + Δx)`.

**With 0.3% fee (997/1000 on input):**
```
amountInWithFee = amountIn × 997 / 1000
amountOut = (amountInWithFee × reserveOut) / (reserveIn + amountInWithFee)
```

**Why this formula?**
- **Predictable:** Output is deterministic given reserves.
- **Always liquid:** Price moves to infinity as you drain one side, but never hits zero.
- **Capital efficient:** Full range is used (unlike concentrated liquidity).

**In your code:**
- **Solidity:** `AMM.sol` lines 117–128, `getAmountOut()`.
- **Backend:** `server.js` lines 75–81, `AMMCore.getAmountOut()`.
- **Python:** `amm-research-engine/core/constant_product.py` → `get_amount_out()`.

---

### 1.3 Spot Price vs Execution Price

**Spot price:** `price = reserveB / reserveA` (instantaneous rate for an infinitesimal trade).

**Execution price:** `amountOut / amountIn` for a real trade. Always worse than spot for the trader because:
1. Fee (0.3%) reduces output.
2. Price impact: large trades move the price.

**Price impact (basis points):**
```
priceImpactBps = (spotOut - actualOut) / spotOut × 10_000
```
Where `spotOut = amountIn × reserveOut / reserveIn` (no-fee reference).

**In your code:** `AMM.sol` `getPriceImpactBps()`, `AMMCore.getPriceImpactBps()`.

---

### 1.4 Liquidity Provision & LP Tokens

**Add liquidity:** LPs deposit both tokens in the pool ratio. They receive **LP tokens** representing their share.

**First deposit (empty pool):**
- `liquidity = sqrt(amountA × amountB) - MINIMUM_LIQUIDITY`
- `MINIMUM_LIQUIDITY` (e.g. 1000) is locked forever to prevent division-by-zero and manipulation.

**Subsequent deposits:**
- Optimal ratio: `amountB_optimal = amountA × reserveB / reserveA`.
- LP tokens: `liquidity = amountA × totalSupply / reserveA` (or equivalent with B).

**Remove liquidity:** Burn LP tokens, receive proportional share of both reserves.

**In your code:**
- **Contract:** `AMM.sol` `addLiquidity()`, `removeLiquidity()`, `_mint()`, `_burn()`.
- **Backend:** `AMMCore.addLiquidity()` uses `min(amountA, amountB)` for first deposit—slightly different from contract’s `sqrt` (documented in ARCHITECTURE.md).

---

### 1.5 Impermanent Loss (IL)

**Definition:** LPs can lose value vs simply holding both tokens when the price ratio changes.

**Math:** For price ratio `r = P_new / P_initial`:
```
IL = 2√r / (1 + r) - 1
```
Expressed as a percentage. IL is always ≤ 0 (you’re worse off than holding).

**Example:** Price doubles (r=2). IL ≈ -5.7%. You earn fees to compensate.

**When IL matters:** Volatile pairs. Stablecoin pairs have minimal IL.

**In your code:**
- **Backend:** `GET /api/impermanent-loss-curve`, `GET /api/impermanent-loss`.
- **Frontend:** ResearchLab → IL section (curve + calculator).
- **Python:** `amm-research-engine/analytics/` (IL calculations).

---

### 1.6 Slippage & Slippage Protection

**Slippage:** Difference between expected and actual execution price (e.g. due to front-running or other trades).

**Protection in swaps:** `minAmountOut` and `deadline`:
- `minAmountOut`: User says “I accept at least X tokens out.” Revert if less.
- `deadline`: Revert if block timestamp > deadline (prevents stale txs).

**In your code:** `AMM.sol` `swapWithProtection(tokenIn, amountIn, minAmountOut, deadline)`.

---

## Part 2: Smart Contract Concepts

### 2.1 ERC20 & Approval

**ERC20:** Standard for fungible tokens. `balanceOf`, `transfer`, `approve`, `transferFrom`.

**Approval flow:** Before AMM can pull tokens, user must:
1. `approve(ammAddress, amount)` (or `approve(ammAddress, type(uint256).max)` for unlimited).
2. AMM calls `transferFrom(user, pool, amount)`.

**In your code:** `useOnChainAMM.js` → `ensureAllowance()` does approve + transferFrom; `SwapCard` triggers swap after approval.

---

### 2.2 Reentrancy & ReentrancyGuard

**Reentrancy:** Attacker calls back into your contract before the first call finishes (e.g. via a malicious token’s `transfer` callback).

**Mitigation:** `ReentrancyGuard` — `nonReentrant` modifier sets a lock, prevents nested calls.

**In your code:** `AMM.sol` uses `nonReentrant` on `swap`, `addLiquidity`, `removeLiquidity`, `flashLoan`, `sync`.

---

### 2.3 Factory Pattern

**Purpose:** Deploy many pools from one factory. Canonical lookup: `getPair(tokenA, tokenB)`.

**Implementation:** Factory stores `createPair(tokenA, tokenB)`; deploys new AMM; registers pair.

**In your code:** `AMMFactory.sol` → `createPair()`, `getPair`, `allPairs`; `deploy.js` creates TKA/TKB and TKA/USDC via factory.

---

### 2.4 TWAP Oracle

**TWAP:** Time-Weighted Average Price. Used to avoid manipulation (e.g. flash-loan attacks).

**Mechanism:** Accumulate `price × time` over blocks:
```
price0Cumulative += (reserveB / reserveA) × elapsed
```

**Usage:** External contracts can read `(price0Cumulative_now - price0Cumulative_old) / elapsed` for a TWAP.

**In your code:** `AMM.sol` `_update()` maintains `price0CumulativeLast`, `price1CumulativeLast`, `blockTimestampLast`.

---

### 2.5 Flash Loans

**Concept:** Borrow tokens for one transaction; repay in the same tx. No collateral.

**Flow:**
1. Pool transfers tokens to borrower.
2. Borrower executes logic (e.g. arbitrage).
3. Borrower repays tokens + fee to pool.
4. Pool reverts if repayment fails.

**In your code:** `AMM.sol` `flashLoan()` — 0.09% fee. Borrower implements `IFlashLoanRecipient.receiveFlashLoan()`.

---

### 2.6 Protocol Fees

**Protocol fee:** Extra fee (e.g. 0.05%) on top of LP fee, sent to `feeTo` address.

**Implementation:** Deduct from `amountOut`; accrue in `protocolFeesA`/`protocolFeesB`; `collectProtocolFees()` sends to `feeTo`.

**In your code:** `AMM.sol` `protocolFeeEnabled`, `feeTo`, `PROTOCOL_FEE_BPS`, `collectProtocolFees()`.

---

## Part 3: Full-Stack Architecture

### 3.1 Three-Tier Architecture

```
┌─────────────────────┐
│  Frontend (React)   │  ← User interaction, MetaMask, charts
│  Port 3000          │
└──────────┬──────────┘
           │ /api/* → proxy
           ▼
┌─────────────────────┐
│  Backend (Express)  │  ← REST API, WebSocket, in-memory AMM
│  Port 3001          │
└──────────┬──────────┘
           │ (no direct connection)
           ▼
┌─────────────────────┐
│  Blockchain         │  ← Sepolia, AMM contracts, tokens
│  (Ethereum L2)      │
└─────────────────────┘
```

**Frontend:** Swap UI, liquidity, analytics, research, testnet panel. Connects to backend (API) and blockchain (MetaMask).

**Backend:** In-memory simulation. Serves API, WebSocket, market data. Does **not** talk to the chain.

**Blockchain:** Real AMM contracts. Frontend reads (via `useOnChainReserves`) and writes (via `useOnChainAMM` + MetaMask) directly.

---

### 3.2 Dual Data Sources

| Data        | Source 1 (Backend)           | Source 2 (On-chain)                    |
|------------|------------------------------|----------------------------------------|
| Reserves   | In-memory pools              | `useOnChainReserves` → Sepolia RPC     |
| Swaps      | API `POST /swap`             | `useOnChainAMM.executeSwapOnChain()`   |
| Liquidity  | API only                     | Contract `addLiquidity` (not in UI)    |

**Swap tab:** Prefers on-chain reserves when available (`chainRes`). Uses backend for quotes when simulating.

---

### 3.3 WebSocket Live Updates

**Purpose:** Push reserve/price updates to the frontend without polling.

**Flow:** Backend broadcasts `TICK` every 3s with all pools’ reserves. On connect, sends `SNAPSHOT`. On swap/add/remove, broadcasts `SWAP`.

**In your code:** `server.js` `broadcast()`, `setInterval` tick; `frontend/api.js` `createWsConnection()`; `App.jsx` updates `reserves` from `liveData`.

---

### 3.4 Market Data Pipeline

**Flow:** Backend fetches CEX prices (CoinGecko → Binance) for ETH/USDT. Used for:
- Arbitrage detection (AMM vs CEX).
- Backtest (historical OHLCV).

**In your code:** `marketData.js` → `getMarketPrice()`, `fetchOHLCV()`; `server.js` `/api/market-price`, `/api/arbitrage`, `/api/backtest`.

---

## Part 4: Quantitative Concepts

### 4.1 Arbitrage Detection

**Idea:** AMM price can diverge from CEX. Arbitrageurs trade to align them.

**Implementation:** Compare `ammPrice = reserveB/reserveA` with `cexPrice`. If `|ammPrice - cexPrice| / cexPrice > feeBps` (e.g. 30 bps), show “opportunity.”

**Optimal trade size:** Simplified: `sqrt(reserveA × reserveB × (cex/amm)) - reserveA`.

**In your code:** `server.js` `/api/arbitrage`; `AnalyticsDashboard` displays it.

**Caveat:** Your AMM compares TKA/TKB vs ETH/USDT—different assets. It’s conceptual; real arbitrage would be same pair across venues.

---

### 4.2 MEV & Sandwich Attacks

**MEV:** Maximal Extractable Value. Profit from reordering transactions.

**Sandwich:** Bot wraps a victim’s swap:
1. **Front-run:** Bot buys before victim (moves price worse for victim).
2. **Victim:** Victim’s swap executes.
3. **Back-run:** Bot sells (reverts price, pockets profit).

**Simulation math:**
```
frontRunOut = f(amountIn, reserves)
victimOut  = f(victimAmountIn, reserves_after_frontRun)
backRunOut = f(frontRunOut, reserves_after_victim)
mevProfit  = backRunOut - frontRunAmountIn
```

**In your code:** `server.js` `POST /api/mev/simulate`; `ResearchLab` → MEV section.

---

### 4.3 Backtest Engine

**Purpose:** Simulate LP returns over historical price data.

**Flow:**
1. Fetch OHLCV (e.g. ETH/USDT 1h from Binance/CoinGecko).
2. Simulate AMM: when price moves >0.1%, execute a 1% trade.
3. Track fees, IL, final value vs HODL.

**Outputs:** Periods, total fees, IL %, fee return %, net P&L %.

**In your code:** `server.js` `GET /api/backtest`; `ResearchLab` → Backtest section.

---

### 4.4 Concentrated Liquidity (V3-style)

**Concept:** LPs provide liquidity in a price range [Pa, Pb] instead of full range. Higher capital efficiency.

**Math:** Virtual reserves from `√P`; output depends on whether current price is in range.

**In your code:** `server.js` `GET /api/concentrated-quote`; `ResearchLab` → CLMM section.

---

## Part 5: File-by-File Mapping

| Concept                    | Where |
|---------------------------|-------|
| Constant product AMM       | `contracts/AMM.sol`, `server.js` AMMCore, `core/constant_product.py` |
| Swap with fee              | `AMM.getAmountOut()`, `AMMCore.getAmountOut()` |
| Slippage protection        | `AMM.swapWithProtection()` |
| LP tokens                  | `AMM.addLiquidity()`, `_mint`, `_burn` |
| TWAP                       | `AMM._update()` |
| Flash loans                | `AMM.flashLoan()` |
| Factory                    | `AMMFactory.sol`, `deploy.js` |
| Protocol fee               | `AMM` feeTo, protocolFeesA/B |
| Reentrancy                 | `ReentrancyGuard` in AMM |
| MetaMask                   | `useWallet.js`, `WalletButton.jsx` |
| On-chain swap              | `useOnChainAMM.js` → `executeSwapOnChain()` |
| On-chain reserves          | `useOnChainReserves.js` |
| Market data                | `marketData.js` |
| Arbitrage                  | `server.js` `/api/arbitrage` |
| MEV simulator              | `server.js` `/api/mev/simulate` |
| Backtest                   | `server.js` `/api/backtest` |
| IL curve                   | `server.js` `/api/impermanent-loss-curve` |
| WebSocket                  | `server.js` broadcast, `api.js` createWsConnection |

---

## Part 6: Interview Talking Points

### High-Level

1. **"I built a full-stack DeFi AMM"** — Smart contracts (Solidity), backend (Node), frontend (React), and a Python quant engine.
2. **"Uniswap V2-style constant product"** — x×y=k, 0.3% fee, LP tokens, slippage protection.
3. **"Dual mode"** — Simulation (backend) for demos; on-chain (Sepolia) when MetaMask is connected.
4. **"Quantitative features"** — Arbitrage detection, MEV simulation, LP backtest, impermanent loss, concentrated liquidity.

### Low-Level

1. **"Swap formula"** — `amountOut = (amountIn×997×reserveOut)/(reserveIn×1000 + amountIn×997)`.
2. **"Security"** — ReentrancyGuard, slippage/deadline protection, CEI pattern (checks-effects-interactions).
3. **"TWAP"** — Price accumulators in `_update()` for manipulation-resistant oracles.
4. **"Flash loans"** — Single-tx borrow, callback, repay; 0.09% fee. Borrower implements `receiveFlashLoan`.

### Architecture

1. **"Separation of concerns"** — Backend = simulation + API; frontend = UI + blockchain. No backend–chain coupling.
2. **"Real-time"** — WebSocket for live reserves; on-chain reads via public RPC.
3. **"Market data"** — CoinGecko/Binance for CEX prices; used for arbitrage and backtest.

---

## Next Steps

1. **Review this guide** before the presentation.
2. **Walk through the code** for each concept (use the file mapping).
3. **Practice explaining** the swap formula and IL on a whiteboard.
4. **Prepare a demo flow** — connect wallet, show on-chain swap, show arbitrage, run backtest.
5. **Anticipate questions** — e.g. "Why no Router?" (deployed AMM directly; Router exists but not in deploy), "What about MEV in production?" (discuss private mempools, Flashbots).
