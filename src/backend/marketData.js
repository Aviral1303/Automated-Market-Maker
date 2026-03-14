/**
 * Real market data from CEX APIs.
 * Fetches live prices from Binance (primary) and CoinGecko (fallback).
 */

const https = require('https');

const BINANCE_BASE = 'https://api.binance.com';
const COINGECKO_BASE = 'https://api.coingecko.com/api/v3';

// Symbol mapping: our Token A/B convention to market symbols
// Token A = base (e.g. ETH), Token B = quote (e.g. USDT)
const SYMBOL_MAP = {
  'ETH/USDT': { binance: 'ETHUSDT', coingecko: 'ethereum' },
  'BTC/USDT': { binance: 'BTCUSDT', coingecko: 'bitcoin' },
  'ETH/USDC': { binance: 'ETHUSDC', coingecko: 'ethereum' },
  'SOL/USDT': { binance: 'SOLUSDT', coingecko: 'solana' },
};

function fetchJSON(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const req = https.request(
      {
        hostname: urlObj.hostname,
        path: urlObj.pathname + urlObj.search,
        method: 'GET',
        headers: {
          'User-Agent': 'CryptoAMM/1.0 (DeFi Research)',
          ...options.headers,
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(e);
          }
        });
      }
    );
    req.on('error', reject);
    req.end();
  });
}

/**
 * Fetch current price from Binance.
 * @param {string} pair - e.g. 'ETH/USDT'
 * @returns {{ price: number, source: string } | null}
 */
async function fetchBinancePrice(pair) {
  const mapping = SYMBOL_MAP[pair];
  if (!mapping) return null;
  try {
    const data = await fetchJSON(`${BINANCE_BASE}/api/v3/ticker/price?symbol=${mapping.binance}`);
    return { price: parseFloat(data.price), source: 'binance' };
  } catch (e) {
    return null;
  }
}

/**
 * Fetch current price from CoinGecko.
 * @param {string} pair - e.g. 'ETH/USDT'
 * @returns {{ price: number, source: string } | null}
 */
async function fetchCoinGeckoPrice(pair) {
  const mapping = SYMBOL_MAP[pair];
  if (!mapping) return null;
  try {
    const data = await fetchJSON(
      `${COINGECKO_BASE}/simple/price?ids=${mapping.coingecko}&vs_currencies=usd`
    );
    const price = data?.[mapping.coingecko]?.usd;
    return price != null && !isNaN(price) ? { price: Number(price), source: 'coingecko' } : null;
  } catch (e) {
    return null;
  }
}

/**
 * Fetch market price - CoinGecko first (no geo restrictions), Binance fallback.
 * @param {string} pair - e.g. 'ETH/USDT'
 */
async function getMarketPrice(pair = 'ETH/USDT') {
  const coingecko = await fetchCoinGeckoPrice(pair);
  if (coingecko && !isNaN(coingecko.price)) return coingecko;
  const binance = await fetchBinancePrice(pair);
  if (binance && !isNaN(binance.price)) return binance;
  return coingecko || binance;
}

/**
 * Fetch OHLCV from Binance for backtesting.
 */
async function fetchBinanceOHLCV(symbol, interval = '1h', limit = 100) {
  const mapping = SYMBOL_MAP[symbol] || SYMBOL_MAP['ETH/USDT'];
  try {
    const data = await fetchJSON(
      `${BINANCE_BASE}/api/v3/klines?symbol=${mapping.binance}&interval=${interval}&limit=${limit}`
    );
    if (data.code) return [];
    return data.map(([t, o, h, l, c, v]) => ({
      timestamp: t,
      open: parseFloat(o),
      high: parseFloat(h),
      low: parseFloat(l),
      close: parseFloat(c),
      volume: parseFloat(v),
    }));
  } catch (e) {
    return [];
  }
}

/**
 * Fetch historical prices from CoinGecko (fallback when Binance is restricted).
 */
async function fetchCoinGeckoOHLCV(symbol, days = 7) {
  const mapping = SYMBOL_MAP[symbol] || SYMBOL_MAP['ETH/USDT'];
  try {
    const data = await fetchJSON(
      `${COINGECKO_BASE}/coins/${mapping.coingecko}/market_chart?vs_currency=usd&days=${days}`
    );
    const prices = data?.prices || [];
    return prices.map(([t, c]) => ({
      timestamp: t,
      open: c,
      high: c,
      low: c,
      close: c,
      volume: 0,
    }));
  } catch (e) {
    return [];
  }
}

/**
 * Fetch OHLCV - Binance first, CoinGecko fallback.
 */
async function fetchOHLCV(symbol, interval = '1h', limit = 100) {
  let data = await fetchBinanceOHLCV(symbol, interval, limit);
  if (!data.length) {
    const days = Math.max(1, Math.ceil(limit / 24));
    data = await fetchCoinGeckoOHLCV(symbol, days);
    if (data.length > limit) data = data.slice(-limit);
  }
  return data;
}

module.exports = {
  getMarketPrice,
  fetchBinancePrice,
  fetchCoinGeckoPrice,
  fetchBinanceOHLCV,
  fetchCoinGeckoOHLCV,
  fetchOHLCV,
  SYMBOL_MAP,
};
