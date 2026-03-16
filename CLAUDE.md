# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development (full stack)
```bash
npm run dev          # starts backend (port 3001) + frontend (port 3000) concurrently
npm run dev:backend  # backend only — nodemon src/backend/server.js
npm run dev:frontend # frontend only — cd frontend && vite (port 3000)
```

### Frontend
```bash
cd frontend && npm run dev     # Vite dev server on :3000
cd frontend && npm run build   # production build → frontend/dist/
cd frontend && npm run lint    # ESLint
cd frontend && npm run preview # preview production build
```

### Smart Contracts (Hardhat)
```bash
npm run compile          # compile Solidity → artifacts/
npm run test:contracts   # run Hardhat tests in test/
npm run deploy           # deploy to local Hardhat node (port 8545)
npm run deploy:sepolia   # deploy to Sepolia (needs PRIVATE_KEY + INFURA_URL in .env)
npx hardhat node         # start local Hardhat node
npx hardhat test test/AMM.test.js  # run a single test file
```

### Python Research Engine
```bash
cd amm-research-engine
pip install -r requirements.txt
uvicorn api.server:app --reload --port 8000  # start FastAPI server directly
python -m pytest tests/                       # run engine tests
```

### Docker
```bash
docker-compose up --build   # full stack in Docker (ports 3000 + 3001)
docker-compose down
```

## Architecture

### Request Flow
```
Browser (localhost:3000)
  └─ Vite dev proxy (/api → :3001)
       └─ Express backend (src/backend/server.js, port 3001)
            ├─ AMM logic (in-memory AMMCore class, BigNumber arithmetic)
            ├─ WebSocket server (real-time pool state push)
            ├─ marketData.js (CoinGecko + Binance price feeds)
            └─ /api/research/* → pythonBridge.js → FastAPI (port 8000)
                   └─ amm-research-engine/api/server.py
```

### Frontend Structure
- **`/` → `Landing.jsx`** — marketing/demo landing page (scroll-reveal, canvas animations)
- **`/app` → `App.jsx`** — 5-tab research interface: Swap, Pool, Analytics, Research, Testnet

The 4 custom hooks drive data flow:
- `useWallet.js` — MetaMask connection via `window.ethereum`
- `useOnChainReserves.js` — reads pool reserves from Sepolia with fallback RPC array
- `useOnChainAMM.js` — on-chain swap/liquidity transactions via ethers.js
- `useOnChainTransactions.js` — transaction history from Sepolia

### Backend (`src/backend/server.js`)
Single-file Express server (~800 LOC). The `AMMCore` class holds pool state in-memory using `BigNumber.js` for precision. Two pools are initialised at startup: `TKA/TKB` and `TKA/USDC`. State resets on server restart (no persistence). WebSocket broadcasts pool updates to all connected clients after each swap/liquidity event.

Key API surface:
- `POST /api/swap` / `POST /api/swap/quote` — constant product swap with 0.3% fee
- `POST /api/liquidity/add` / `/remove` — LP management
- `GET /api/analytics` — OHLCV, slippage curve, IL
- `GET /api/backtest` — historical simulation using fetched OHLCV
- `POST /api/mev/simulate` — sandwich attack modelling
- `GET /api/market-price` — live CEX price via CoinGecko/Binance
- `GET /api/arbitrage` — spread detection between pool price and CEX
- `GET /api/research/*` — proxied to Python FastAPI engine

### Python Research Engine (`amm-research-engine/`)
FastAPI app at `api/server.py`. Wraps the quantitative engine:
- `core/` — `ConstantProductAMM`, `StableSwapAMM`, `BalancerAMM` (all extend `AMMBase`)
- `simulation/` — `SimulationEngine` running `RetailTrader`, `ArbitrageurAgent`, `LiquidityProviderAgent`
- `analytics/` — `impermanent_loss.py`, `slippage.py`
- `arbitrage/detector.py` — spread detection

The Node.js `pythonBridge.js` spawns this server as a child process via `uvicorn` and health-polls before proxying.

### Smart Contracts (`contracts/`)
- `AMM.sol` — V2 constant-product pool with TWAP oracle, flash loans, `swapWithProtection()`, protocol fees
- `AMMFactory.sol` — deploys and tracks pool pairs
- `TestToken.sol` — ERC-20 with public `mint()`

Six contracts are already deployed on Sepolia (addresses hardcoded in `TestnetPanel.jsx`). The frontend reads reserves directly from Sepolia via `useOnChainReserves.js` (public RPC, read-only). Write operations (swap, addLiquidity) go through MetaMask via `useOnChainAMM.js`.

### Styling
Tailwind CSS with a custom design system in `tailwind.config.js`. Core palette tokens: `surface`, `surfaceElevated`, `border`, `textDim`, `textMuted`, `success`, `danger`. Dark-only (black background). Custom animations in `index.css`: `live-dot` pulse, `shimmer`, scroll-reveal `.reveal`/`.reveal.visible` via IntersectionObserver.

## Key Conventions

- **AMM formula**: `amountOut = (reserveOut * amountIn * 997) / (reserveIn * 1000 + amountIn * 997)` — same formula used in both backend JS and Solidity contracts.
- **On-chain vs simulated**: Swap/Pool tabs call the Node.js backend (in-memory simulation) unless MetaMask is connected and the user is on Sepolia, in which case `useOnChainAMM.js` sends real transactions.
- **Sepolia RPC fallback**: `useOnChainReserves.js` tries `ethereum-sepolia-rpc.publicnode.com` → `sepolia.drpc.org` → `1rpc.io/sepolia` → `rpc.sepolia.org` in order with a 4s timeout each.
- **BigNumber**: All backend arithmetic uses `BigNumber.js` to avoid floating-point errors. Do not use native JS `number` for AMM calculations.
