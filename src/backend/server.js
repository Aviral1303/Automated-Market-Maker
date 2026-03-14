const express = require('express');
const cors = require('cors');
const BigNumber = require('bignumber.js');
const { getMarketPrice, fetchOHLCV } = require('./marketData');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// AMM Contract ABI (simplified for demo)
const AMM_ABI = [
    "function getReserves() external view returns (uint256 _reserveA, uint256 _reserveB)",
    "function getAmountOut(uint256 amountIn, uint256 reserveIn, uint256 reserveOut) public pure returns (uint256 amountOut)",
    "function swap(address tokenIn, uint256 amountIn) external returns (uint256 amountOut)",
    "function addLiquidity(uint256 amountADesired, uint256 amountBDesired) external returns (uint256 liquidity)",
    "function removeLiquidity(uint256 liquidity) external returns (uint256 amountA, uint256 amountB)",
    "function balanceOf(address owner) external view returns (uint256)",
    "function totalSupply() external view returns (uint256)"
];

const TOKEN_ABI = [
    "function balanceOf(address owner) external view returns (uint256)",
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function transfer(address to, uint256 amount) external returns (bool)",
    "function transferFrom(address from, address to, uint256 amount) external returns (bool)"
];

// Initialize provider and contracts
let provider, ammContract, tokenAContract, tokenBContract;

// AMM Core Logic (JavaScript implementation)
class AMMCore {
    constructor() {
        this.reserveA = new BigNumber(0);
        this.reserveB = new BigNumber(0);
        this.totalSupply = new BigNumber(0);
        this.balances = new Map();
        this.fee = new BigNumber(0.003); // 0.3%
    }

    getAmountOut(amountIn, reserveIn, reserveOut) {
        const amountInBN = new BigNumber(amountIn);
        const reserveInBN = new BigNumber(reserveIn);
        const reserveOutBN = new BigNumber(reserveOut);

        if (amountInBN.lte(0) || reserveInBN.lte(0) || reserveOutBN.lte(0)) {
            return 0;
        }

        const amountInWithFee = amountInBN.times(new BigNumber(1).minus(this.fee));
        const numerator = amountInWithFee.times(reserveOutBN);
        const denominator = reserveInBN.times(new BigNumber(1)).plus(amountInWithFee);
        
        return numerator.div(denominator).integerValue(BigNumber.ROUND_DOWN).toString();
    }

    swap(tokenIn, amountIn) {
        const amountInBN = new BigNumber(amountIn);
        const reserveIn = tokenIn === 'A' ? this.reserveA : this.reserveB;
        const reserveOut = tokenIn === 'A' ? this.reserveB : this.reserveA;

        const amountOut = this.getAmountOut(amountIn, reserveIn.toString(), reserveOut.toString());
        
        if (new BigNumber(amountOut).lte(0)) {
            throw new Error('Insufficient output amount');
        }

        // Update reserves
        if (tokenIn === 'A') {
            this.reserveA = this.reserveA.plus(amountInBN);
            this.reserveB = this.reserveB.minus(amountOut);
        } else {
            this.reserveB = this.reserveB.plus(amountInBN);
            this.reserveA = this.reserveA.minus(amountOut);
        }

        return amountOut;
    }

    addLiquidity(amountADesired, amountBDesired) {
        const amountABN = new BigNumber(amountADesired);
        const amountBBN = new BigNumber(amountBDesired);

        if (this.reserveA.eq(0) && this.reserveB.eq(0)) {
            // First liquidity provision
            this.reserveA = amountABN;
            this.reserveB = amountBBN;
            const liquidity = BigNumber.min(amountABN, amountBBN);
            this.totalSupply = liquidity;
            return liquidity.toString();
        } else {
            // Subsequent liquidity provision
            const amountBOptimal = amountABN.times(this.reserveB).div(this.reserveA);
            let amountA, amountB;

            if (amountBOptimal.lte(amountBBN)) {
                amountA = amountABN;
                amountB = amountBOptimal;
            } else {
                const amountAOptimal = amountBBN.times(this.reserveA).div(this.reserveB);
                amountA = amountAOptimal;
                amountB = amountBBN;
            }

            const liquidity = amountA.times(this.totalSupply).div(this.reserveA);
            
            this.reserveA = this.reserveA.plus(amountA);
            this.reserveB = this.reserveB.plus(amountB);
            this.totalSupply = this.totalSupply.plus(liquidity);

            return liquidity.toString();
        }
    }

    removeLiquidity(liquidity) {
        const liquidityBN = new BigNumber(liquidity);
        
        if (liquidityBN.lte(0) || this.totalSupply.eq(0)) {
            throw new Error('Insufficient liquidity');
        }

        const amountA = liquidityBN.times(this.reserveA).div(this.totalSupply);
        const amountB = liquidityBN.times(this.reserveB).div(this.totalSupply);

        if (amountA.lte(0) || amountB.lte(0)) {
            throw new Error('Insufficient liquidity to remove');
        }

        // Update reserves
        this.reserveA = this.reserveA.minus(amountA);
        this.reserveB = this.reserveB.minus(amountB);
        this.totalSupply = this.totalSupply.minus(liquidityBN);

        return {
            amountA: amountA.toString(),
            amountB: amountB.toString()
        };
    }

    getReserves() {
        return {
            reserveA: this.reserveA.toString(),
            reserveB: this.reserveB.toString()
        };
    }

    getTotalSupply() {
        return this.totalSupply.toString();
    }
}

// Initialize AMM core
const ammCore = new AMMCore();

// Transaction history
const transactionHistory = [];

// Price history for charts (timestamp, price A in B terms)
const priceHistory = [];

function recordPriceSnapshot() {
    const reserves = ammCore.getReserves();
    const rA = new BigNumber(reserves.reserveA);
    const rB = new BigNumber(reserves.reserveB);
    if (rA.gt(0)) {
        const price = rB.div(rA).toNumber();
        priceHistory.push({ t: Date.now(), p: price });
        if (priceHistory.length > 500) priceHistory.shift();
    }
}

// Helper function to add transaction to history
function addTransaction(type, data) {
    transactionHistory.push({
        id: transactionHistory.length + 1,
        type,
        timestamp: new Date().toISOString(),
        ...data
    });
    // Keep only last 100 transactions
    if (transactionHistory.length > 100) {
        transactionHistory.shift();
    }
}

// API Routes
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'AMM API is running' });
});

// Real market data: CEX price from Binance/CoinGecko
app.get('/api/market-price', async (req, res) => {
    try {
        const pair = req.query.pair || 'ETH/USDT';
        const result = await getMarketPrice(pair);
        if (!result) {
            return res.status(503).json({ success: false, error: 'Market data unavailable' });
        }
        res.json({ success: true, data: result });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// Arbitrage: compare AMM price vs CEX, detect opportunity
app.get('/api/arbitrage', async (req, res) => {
    try {
        const pair = req.query.pair || 'ETH/USDT';
        const reserves = ammCore.getReserves();
        const rA = parseFloat(reserves.reserveA);
        const rB = parseFloat(reserves.reserveB);
        if (rA <= 0) {
            return res.json({ success: true, data: { opportunity: false, reason: 'No liquidity' } });
        }
        const ammPrice = rB / rA; // price of A in B terms (e.g. ETH in USDT)
        const marketPriceResult = await getMarketPrice(pair);
        if (!marketPriceResult) {
            return res.json({ success: true, data: { opportunity: false, reason: 'Market data unavailable' } });
        }
        const cexPrice = marketPriceResult.price;
        const spreadBps = Math.abs(ammPrice - cexPrice) / cexPrice * 10000;
        const feeBps = 30;
        const opportunity = spreadBps > feeBps;
        let direction = null;
        let estimatedProfitBps = 0;
        if (opportunity) {
            if (ammPrice > cexPrice) {
                direction = 'sell_on_amm';
                estimatedProfitBps = spreadBps - feeBps;
            } else {
                direction = 'buy_on_amm';
                estimatedProfitBps = spreadBps - feeBps;
            }
        }
        res.json({
            success: true,
            data: {
                ammPrice,
                cexPrice,
                spreadBps: Math.round(spreadBps),
                feeBps,
                opportunity,
                direction,
                estimatedProfitBps: Math.round(estimatedProfitBps),
                source: marketPriceResult.source
            }
        });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// Historical OHLCV for backtesting
app.get('/api/ohlcv', async (req, res) => {
    try {
        const symbol = req.query.symbol || 'ETH/USDT';
        const interval = req.query.interval || '1h';
        const limit = Math.min(parseInt(req.query.limit) || 100, 500);
        const data = await fetchOHLCV(symbol, interval, limit);
        res.json({ success: true, data });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// Backtest: simulate AMM over historical price path
app.get('/api/backtest', async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 24, 168);
        const ohlcv = await fetchOHLCV('ETH/USDT', '1h', limit);
        if (!ohlcv.length) {
            return res.json({ success: true, data: { error: 'No OHLCV data (Binance may be restricted)' } });
        }
        const initialReserve = 1000;
        const prices = ohlcv.map((c) => c.close);
        const p0 = prices[0];
        let reserveA = initialReserve;
        let reserveB = initialReserve * p0;
        let totalFees = 0;
        let totalVolume = 0;
        const feeBps = 30;
        const snapshots = [{ t: ohlcv[0].timestamp, reserveA, reserveB, price: p0, fees: 0, volume: 0 }];
        for (let i = 1; i < prices.length; i++) {
            const p = prices[i];
            const priceChange = (p - prices[i - 1]) / prices[i - 1];
            if (Math.abs(priceChange) > 0.001) {
                const tradeSize = reserveA * 0.01;
                const amountIn = tradeSize;
                const amountInWithFee = amountIn * (1 - feeBps / 10000);
                const amountOut = (amountInWithFee * reserveB) / (reserveA + amountInWithFee);
                reserveA += amountIn;
                reserveB -= amountOut;
                totalFees += amountIn * (feeBps / 10000);
                totalVolume += amountIn;
            }
            snapshots.push({ t: ohlcv[i].timestamp, reserveA, reserveB, price: reserveB / reserveA, fees: totalFees, volume: totalVolume });
        }
        const finalValue = reserveA * prices[prices.length - 1] + reserveB;
        const holdValue = initialReserve * p0 * 2;
        const il = ((finalValue - holdValue) / holdValue) * 100;
        res.json({
            success: true,
            data: {
                snapshots,
                summary: {
                    periods: prices.length,
                    totalFees,
                    totalVolume,
                    impermanentLossPercent: il.toFixed(2),
                    finalValue: finalValue.toFixed(2),
                    holdValue: holdValue.toFixed(2),
                },
            },
        });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

app.get('/api/reserves', (req, res) => {
    try {
        const reserves = ammCore.getReserves();
        if (priceHistory.length === 0) recordPriceSnapshot();
        res.json({
            success: true,
            data: reserves
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.post('/api/swap/quote', (req, res) => {
    try {
        const { tokenIn, amountIn } = req.body;
        
        if (!tokenIn || !amountIn) {
            return res.status(400).json({
                success: false,
                error: 'Missing required parameters'
            });
        }

        const reserves = ammCore.getReserves();
        const reserveIn = tokenIn === 'A' ? reserves.reserveA : reserves.reserveB;
        const reserveOut = tokenIn === 'A' ? reserves.reserveB : reserves.reserveA;

        const amountOut = ammCore.getAmountOut(amountIn, reserveIn, reserveOut);
        
        res.json({
            success: true,
            data: {
                amountIn,
                amountOut,
                tokenIn,
                tokenOut: tokenIn === 'A' ? 'B' : 'A',
                priceImpact: calculatePriceImpact(amountIn, reserveIn, amountOut, reserveOut)
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.post('/api/swap', (req, res) => {
    try {
        const { tokenIn, amountIn } = req.body;
        
        if (!tokenIn || !amountIn) {
            return res.status(400).json({
                success: false,
                error: 'Missing required parameters'
            });
        }

        const amountOut = ammCore.swap(tokenIn, amountIn);
        
        const swapData = {
            amountIn,
            amountOut,
            tokenIn,
            tokenOut: tokenIn === 'A' ? 'B' : 'A',
            reserves: ammCore.getReserves()
        };

        addTransaction('swap', swapData);
        recordPriceSnapshot();
        
        res.json({
            success: true,
            data: swapData
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.post('/api/liquidity/add', (req, res) => {
    try {
        const { amountA, amountB } = req.body;
        
        if (!amountA || !amountB) {
            return res.status(400).json({
                success: false,
                error: 'Missing required parameters'
            });
        }

        const liquidity = ammCore.addLiquidity(amountA, amountB);
        
        const liquidityData = {
            amountA,
            amountB,
            liquidity,
            reserves: ammCore.getReserves()
        };

        addTransaction('add_liquidity', liquidityData);
        recordPriceSnapshot();
        
        res.json({
            success: true,
            data: liquidityData
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.post('/api/liquidity/remove', (req, res) => {
    try {
        const { liquidity } = req.body;
        
        if (!liquidity) {
            return res.status(400).json({
                success: false,
                error: 'Missing required parameter: liquidity'
            });
        }

        const result = ammCore.removeLiquidity(liquidity);
        
        const removeData = {
            liquidity,
            amountA: result.amountA,
            amountB: result.amountB,
            reserves: ammCore.getReserves()
        };

        addTransaction('remove_liquidity', removeData);
        recordPriceSnapshot();
        
        res.json({
            success: true,
            data: removeData
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.get('/api/liquidity/total-supply', (req, res) => {
    try {
        const totalSupply = ammCore.getTotalSupply();
        res.json({
            success: true,
            data: { totalSupply }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.get('/api/transactions', (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const transactions = transactionHistory.slice(-limit).reverse();
        res.json({
            success: true,
            data: { transactions, total: transactionHistory.length }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.get('/api/stats', (req, res) => {
    try {
        const reserves = ammCore.getReserves();
        const totalSupply = ammCore.getTotalSupply();
        const swaps = transactionHistory.filter(t => t.type === 'swap');
        const addLiquidity = transactionHistory.filter(t => t.type === 'add_liquidity');
        const removeLiquidity = transactionHistory.filter(t => t.type === 'remove_liquidity');

        let totalVolume = new BigNumber(0);
        swaps.forEach(swap => {
            totalVolume = totalVolume.plus(swap.amountIn);
        });

        res.json({
            success: true,
            data: {
                reserves,
                totalSupply,
                stats: {
                    totalTransactions: transactionHistory.length,
                    totalSwaps: swaps.length,
                    totalAddLiquidity: addLiquidity.length,
                    totalRemoveLiquidity: removeLiquidity.length,
                    totalVolume: totalVolume.toString()
                }
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Helper function to calculate price impact
function calculatePriceImpact(amountIn, reserveIn, amountOut, reserveOut) {
    const amountInBN = new BigNumber(amountIn);
    const reserveInBN = new BigNumber(reserveIn);
    const amountOutBN = new BigNumber(amountOut);
    const reserveOutBN = new BigNumber(reserveOut);

    const priceBefore = reserveOutBN.div(reserveInBN);
    const priceAfter = reserveOutBN.minus(amountOutBN).div(reserveInBN.plus(amountInBN));
    
    const priceImpact = priceBefore.minus(priceAfter).div(priceBefore).times(100);
    
    return priceImpact.toFixed(4);
}

// Initialize with some liquidity for demo
ammCore.addLiquidity('1000000', '1000000'); // 1M tokens each
recordPriceSnapshot();

// Slippage curve: returns [{ amountIn, amountOut, slippageBps }]
app.get('/api/slippage-curve', (req, res) => {
    try {
        const reserves = ammCore.getReserves();
        const tokenIn = req.query.tokenIn || 'A';
        const reserveIn = parseFloat(tokenIn === 'A' ? reserves.reserveA : reserves.reserveB);
        const reserveOut = parseFloat(tokenIn === 'A' ? reserves.reserveB : reserves.reserveA);
        const spotPrice = reserveOut / reserveIn;
        const ratios = [0.001, 0.005, 0.01, 0.02, 0.05, 0.1, 0.2, 0.5];
        const curve = ratios.map(r => {
            const amountIn = reserveIn * r;
            const amountOut = ammCore.getAmountOut(amountIn.toString(), reserveIn, reserveOut);
            const execPrice = amountOut / amountIn;
            const slippageBps = Math.abs(spotPrice - execPrice) / spotPrice * 10000;
            return { amountIn, amountOut: parseFloat(amountOut), slippageBps: Math.round(slippageBps) };
        });
        res.json({ success: true, data: curve });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// Impermanent loss: IL = 2*sqrt(P/P0)/(1+P/P0) - 1
app.get('/api/impermanent-loss', (req, res) => {
    try {
        const priceRatio = parseFloat(req.query.ratio) || 1;
        const ratio = Math.max(0.1, Math.min(10, priceRatio));
        const sqrtR = Math.sqrt(ratio);
        const il = (2 * sqrtR / (1 + ratio) - 1) * 100;
        res.json({ success: true, data: { priceRatio: ratio, impermanentLossPercent: il } });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// IL curve for chart (ratios from 0.1 to 10)
app.get('/api/impermanent-loss-curve', (req, res) => {
    try {
        const steps = 80;
        const curve = [];
        for (let i = 0; i <= steps; i++) {
            const ratio = 0.1 + (10 - 0.1) * (i / steps);
            const sqrtR = Math.sqrt(ratio);
            const il = (2 * sqrtR / (1 + ratio) - 1) * 100;
            curve.push({ ratio, impermanentLossPercent: il });
        }
        res.json({ success: true, data: curve });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// Price history for charts
app.get('/api/price-history', (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 200, 500);
        const data = priceHistory.slice(-limit);
        res.json({ success: true, data });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// MEV / Sandwich attack simulation
app.post('/api/mev/simulate', (req, res) => {
    try {
        const { victimAmountIn, tokenIn } = req.body;
        const amountIn = parseFloat(victimAmountIn) || 1000;
        const tin = tokenIn || 'A';
        const reserves = ammCore.getReserves();
        let rA = parseFloat(reserves.reserveA);
        let rB = parseFloat(reserves.reserveB);
        const feeMult = 0.997;
        const getOut = (amtIn, resIn, resOut) => {
            const inFee = amtIn * feeMult;
            return (inFee * resOut) / (resIn + inFee);
        };
        const frontRunSize = amountIn * 0.5;
        const frontRunOut = getOut(frontRunSize, tin === 'A' ? rA : rB, tin === 'A' ? rB : rA);
        if (tin === 'A') { rA += frontRunSize; rB -= frontRunOut; } else { rB += frontRunSize; rA -= frontRunOut; }
        const victimOut = getOut(amountIn, tin === 'A' ? rA : rB, tin === 'A' ? rB : rA);
        if (tin === 'A') { rA += amountIn; rB -= victimOut; } else { rB += amountIn; rA -= victimOut; }
        const backRunOut = getOut(frontRunOut, tin === 'A' ? rB : rA, tin === 'A' ? rA : rB);
        const mevProfit = backRunOut - frontRunSize;
        res.json({
            success: true,
            data: {
                frontRun: { amountIn: frontRunSize, amountOut: frontRunOut },
                victim: { amountIn, amountOut: victimOut },
                backRun: { amountIn: frontRunOut, amountOut: backRunOut },
                mevProfit,
                mevProfitBps: (mevProfit / frontRunSize * 10000).toFixed(0),
            },
        });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// Concentrated liquidity: Uniswap V3 style - swap output for range [pa, pb]
app.get('/api/concentrated-quote', (req, res) => {
    try {
        const amountIn = parseFloat(req.query.amountIn) || 100;
        const pa = parseFloat(req.query.pa) || 0.9;
        const pb = parseFloat(req.query.pb) || 1.1;
        const pCurrent = parseFloat(req.query.pCurrent) || 1;
        if (pCurrent <= pa || pCurrent >= pb) {
            return res.json({ success: true, data: { amountOut: 0, inRange: false } });
        }
        const L = 10000;
        const sqrtPa = Math.sqrt(pa);
        const sqrtPb = Math.sqrt(pb);
        const sqrtP = Math.sqrt(pCurrent);
        const x = L * (1 / sqrtP - 1 / sqrtPb);
        const y = L * (sqrtP - sqrtPa);
        const amountInNum = amountIn;
        const xNew = x + amountInNum;
        const pNew = Math.pow(L / (L / sqrtPb + amountInNum), 2);
        const yOut = L * (sqrtP - Math.sqrt(Math.min(pNew, pb)));
        res.json({
            success: true,
            data: {
                amountOut: Math.max(0, yOut),
                inRange: true,
                priceAfter: pNew,
            },
        });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

app.listen(PORT, () => {
    console.log(`AMM API server running on port ${PORT}`);
    console.log('Demo liquidity added: 1,000,000 tokens each');
}); 