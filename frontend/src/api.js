import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

export const getReserves = () => api.get('/reserves');
export const getStats = () => api.get('/stats');
export const getTransactions = (limit = 20) => api.get(`/transactions?limit=${limit}`);
export const getPriceHistory = (limit = 200) => api.get(`/price-history?limit=${limit}`);
export const getSlippageCurve = (tokenIn = 'A') => api.get(`/slippage-curve?tokenIn=${tokenIn}`);
export const getILCurve = () => api.get('/impermanent-loss-curve');
export const getIL = (ratio) => api.get(`/impermanent-loss?ratio=${ratio}`);

export const getMarketPrice = (pair = 'ETH/USDT') => api.get(`/market-price?pair=${encodeURIComponent(pair)}`);
export const getArbitrage = (pair = 'ETH/USDT') => api.get(`/arbitrage?pair=${encodeURIComponent(pair)}`);
export const getOHLCV = (symbol = 'ETH/USDT', interval = '1h', limit = 100) =>
  api.get(`/ohlcv?symbol=${encodeURIComponent(symbol)}&interval=${interval}&limit=${limit}`);

export const getBacktest = (limit = 24) => api.get(`/backtest?limit=${limit}`);

export const simulateMEV = (victimAmountIn, tokenIn = 'A') =>
  api.post('/mev/simulate', { victimAmountIn, tokenIn });

export const getSwapQuote = (tokenIn, amountIn) =>
  api.post('/swap/quote', { tokenIn, amountIn });

export const executeSwap = (tokenIn, amountIn) =>
  api.post('/swap', { tokenIn, amountIn });

export const addLiquidity = (amountA, amountB) =>
  api.post('/liquidity/add', { amountA, amountB });

export const removeLiquidity = (liquidity) =>
  api.post('/liquidity/remove', { liquidity });

export const getTotalSupply = () => api.get('/liquidity/total-supply');
