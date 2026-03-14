import { useState, useEffect, useCallback } from 'react';
import { ArrowPathIcon } from '@heroicons/react/24/outline';
import { getSwapQuote, executeSwap } from '../api';

const PRESETS = [0.25, 0.5, 0.75, 1];

export function SwapCard({ onSuccess, loading, setLoading, showMessage, reserves }) {
  const [tokenIn, setTokenIn] = useState('A');
  const [amountIn, setAmountIn] = useState('');
  const [amountOut, setAmountOut] = useState('');
  const [priceImpact, setPriceImpact] = useState('0');

  const reserveIn = tokenIn === 'A' ? parseFloat(reserves?.reserveA || 0) : parseFloat(reserves?.reserveB || 0);

  const fetchQuote = useCallback(async () => {
    if (!amountIn || parseFloat(amountIn) <= 0) {
      setAmountOut('');
      setPriceImpact('0');
      return;
    }
    try {
      const { data } = await getSwapQuote(tokenIn, amountIn);
      if (data.success) {
        setAmountOut(data.data.amountOut);
        setPriceImpact(data.data.priceImpact ?? '0');
      }
    } catch {
      setAmountOut('');
      setPriceImpact('0');
    }
  }, [tokenIn, amountIn]);

  useEffect(() => {
    const t = setTimeout(fetchQuote, 250);
    return () => clearTimeout(t);
  }, [fetchQuote]);

  const flipTokens = () => {
    setTokenIn((p) => (p === 'A' ? 'B' : 'A'));
    setAmountIn('');
    setAmountOut('');
  };

  const setPreset = (pct) => {
    const amount = reserveIn * pct;
    setAmountIn(amount > 0 ? amount.toString() : '');
  };

  const handleSwap = async () => {
    if (!amountIn || !amountOut || parseFloat(amountIn) <= 0) {
      showMessage('Enter a valid amount', 'error');
      return;
    }
    setLoading(true);
    try {
      const { data } = await executeSwap(tokenIn, amountIn);
      if (data.success) {
        showMessage('Swap executed successfully', 'success');
        setAmountIn('');
        setAmountOut('');
        setPriceImpact('0');
        onSuccess?.();
      }
    } catch (err) {
      showMessage(err.response?.data?.error || err.message || 'Swap failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const tokenOut = tokenIn === 'A' ? 'B' : 'A';
  const impact = parseFloat(priceImpact);
  const impactHigh = impact > 1;

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-textMuted">From</span>
            <span className="text-xs text-textMuted">Balance: {reserveIn.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
          </div>
          <div className="relative rounded-xl bg-surface border border-border overflow-hidden focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20">
            <input
              type="number"
              value={amountIn}
              onChange={(e) => setAmountIn(e.target.value)}
              placeholder="0.0"
              className="w-full px-4 py-4 bg-transparent text-text font-mono text-lg placeholder:text-textMuted/50 focus:outline-none"
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg bg-primary/20 text-primary font-semibold text-sm">
                {tokenIn}
              </span>
            </div>
          </div>
        </div>

        <div className="flex justify-center -my-1">
          <button
            onClick={flipTokens}
            className="p-2 rounded-full bg-surface border border-border hover:border-primary/50 hover:bg-primary/10 transition-colors"
          >
            <ArrowPathIcon className="w-5 h-5 text-primary" />
          </button>
        </div>

        <div>
          <span className="text-sm text-textMuted block mb-2">To</span>
          <div className="relative rounded-xl bg-surface/80 border border-border overflow-hidden">
            <input
              type="number"
              value={amountOut}
              readOnly
              placeholder="0.0"
              className="w-full px-4 py-4 bg-transparent text-text font-mono text-lg placeholder:text-textMuted/50 cursor-default"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-textMuted/20 text-textMuted font-semibold text-sm">
              {tokenOut}
            </span>
          </div>
        </div>
      </div>

      {reserveIn > 0 && (
        <div className="flex gap-2">
          {PRESETS.map((p) => (
            <button
              key={p}
              onClick={() => setPreset(p)}
              className="flex-1 py-1.5 rounded-lg text-xs font-medium bg-surface border border-border hover:border-primary/50 hover:bg-primary/10 text-textMuted hover:text-primary transition-colors"
            >
              {p * 100}%
            </button>
          ))}
        </div>
      )}

      {amountOut && (
        <div className="flex justify-between text-sm">
          <span className="text-textMuted">Price impact</span>
          <span className={impactHigh ? 'text-danger font-medium' : 'text-textMuted'}>
            {priceImpact}%
          </span>
        </div>
      )}

      <button
        onClick={handleSwap}
        disabled={loading || !amountIn || !amountOut || parseFloat(amountIn) <= 0}
        className="w-full py-3.5 rounded-xl font-semibold bg-primary hover:bg-primaryHover disabled:opacity-40 disabled:cursor-not-allowed text-bg transition-colors"
      >
        {loading ? 'Swapping…' : 'Swap'}
      </button>
    </div>
  );
}
