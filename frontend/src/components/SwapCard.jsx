import { useState, useEffect, useCallback } from 'react';
import { TokenAvatar } from './PoolSelector';
import { getSwapQuote, executeSwap, getGasEstimate } from '../api';
import { useOnChainAMM } from '../hooks/useOnChainAMM';

const SLIPPAGE_PRESETS = [0.1, 0.5, 1.0, 3.0];

export function SwapCard({ reserves, tokens, activePool, onSuccess, showMessage }) {
  const { isOnChain, executeSwapOnChain } = useOnChainAMM();
  const [tokenIn,   setTokenIn]   = useState('A');
  const [amountIn,  setAmountIn]  = useState('');
  const [amountOut, setAmountOut] = useState('');
  const [priceImpact, setPriceImpact] = useState('0');
  const [minOut,    setMinOut]    = useState('');
  const [loading,   setLoading]   = useState(false);
  const [quoting,   setQuoting]   = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [slippage,  setSlippage]  = useState(0.5);
  const [customSlippage, setCustomSlippage] = useState('');
  const [deadline,  setDeadline]  = useState(20); // minutes
  const [gasEst,    setGasEst]    = useState(null);

  const tokenOut  = tokenIn === 'A' ? 'B' : 'A';
  const symIn     = tokenIn === 'A' ? tokens.A.symbol : tokens.B.symbol;
  const symOut    = tokenOut === 'A' ? tokens.A.symbol : tokens.B.symbol;
  const reserveIn = tokenIn === 'A' ? parseFloat(reserves?.reserveA || 0) : parseFloat(reserves?.reserveB || 0);

  const fetchQuote = useCallback(async () => {
    if (!amountIn || parseFloat(amountIn) <= 0) {
      setAmountOut(''); setPriceImpact('0'); setMinOut('');
      return;
    }
    setQuoting(true);
    try {
      const { data } = await getSwapQuote(tokenIn, amountIn, activePool);
      if (data.success) {
        setAmountOut(data.data.amountOut);
        setPriceImpact(data.data.priceImpact ?? '0');
        const minOutVal = parseFloat(data.data.amountOut) * (1 - slippage / 100);
        setMinOut(minOutVal.toFixed(6));
      }
    } catch {
      setAmountOut(''); setPriceImpact('0'); setMinOut('');
    } finally {
      setQuoting(false);
    }
  }, [tokenIn, amountIn, activePool, slippage]);

  useEffect(() => {
    const t = setTimeout(fetchQuote, 300);
    return () => clearTimeout(t);
  }, [fetchQuote]);

  useEffect(() => {
    getGasEstimate('swap').then(r => {
      if (r.data.success) setGasEst(r.data.data);
    }).catch(() => {});
  }, []);

  const flip = () => {
    setTokenIn(p => p === 'A' ? 'B' : 'A');
    setAmountIn(''); setAmountOut(''); setPriceImpact('0'); setMinOut('');
  };

  const setPreset = (pct) => {
    const amt = reserveIn * pct * 0.01;
    setAmountIn(amt > 0 ? amt.toFixed(4) : '');
  };

  const handleSwap = async () => {
    if (!amountIn || !amountOut || parseFloat(amountIn) <= 0) {
      showMessage('Enter a valid amount', 'error'); return;
    }
    const impact = parseFloat(priceImpact);
    if (impact > 500) {
      showMessage('Price impact too high (>5%). Reduce trade size.', 'error'); return;
    }
    setLoading(true);
    try {
      // ── On-chain path (MetaMask + deployed contracts) ────────────────────
      if (isOnChain) {
        const result = await executeSwapOnChain({
          poolId: activePool, tokenIn, amountIn,
          slippageBps: Math.round(slippage * 100),
        });
        showMessage(`Swap confirmed on-chain ✓ Tx: ${result.txHash.slice(0, 10)}…  Received: ${parseFloat(result.amountOut).toFixed(4)} ${symOut}`);
        setAmountIn(''); setAmountOut(''); setPriceImpact('0'); setMinOut('');
        onSuccess?.();
        return;
      }
      // ── Simulation fallback ───────────────────────────────────────────────
      const { data } = await executeSwap(tokenIn, amountIn, activePool, Math.round(slippage * 100));
      if (data.success) {
        showMessage(`Swap simulated — ${amountIn} ${symIn} → ${parseFloat(data.data.amountOut).toFixed(4)} ${symOut}`);
        setAmountIn(''); setAmountOut(''); setPriceImpact('0'); setMinOut('');
        onSuccess?.();
      }
    } catch (err) {
      const msg = err?.reason || err?.message || err?.response?.data?.error || 'Swap failed';
      showMessage(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const impact = parseFloat(priceImpact);
  const impactClass = impact > 300 ? 'text-danger' : impact > 100 ? 'text-warning' : 'text-success';
  const impactLabel = impact > 300 ? 'High impact' : impact > 100 ? 'Medium impact' : 'Low impact';

  const spotPrice = parseFloat(reserves?.reserveA) > 0
    ? (parseFloat(reserves?.reserveB) / parseFloat(reserves?.reserveA)).toFixed(6)
    : '—';

  return (
    <div className="glass rounded-2xl shadow-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-display font-semibold text-text">Swap</h2>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
              isOnChain
                ? 'bg-success/15 text-success border border-success/20'
                : 'bg-surfaceHover text-textMuted border border-border'
            }`}>
              {isOnChain ? '⛓ On-chain' : '◎ Simulation'}
            </span>
          </div>
          <p className="text-xs text-textMuted mt-0.5">
            1 {symIn} = {tokenIn === 'A' ? spotPrice : (parseFloat(spotPrice) > 0 ? (1 / parseFloat(spotPrice)).toFixed(6) : '—')} {symOut}
          </p>
        </div>
        <button
          onClick={() => setShowSettings(v => !v)}
          className={`p-2 rounded-lg transition-colors ${showSettings ? 'bg-primaryGlow text-primary' : 'text-textMuted hover:text-text hover:bg-surfaceHover'}`}
          title="Settings"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>

      {/* Settings panel */}
      {showSettings && (
        <div className="px-5 py-4 border-b border-border bg-surfaceElevated/50 animate-slide-up">
          <div className="mb-4">
            <p className="text-xs text-textMuted mb-2 font-medium">Slippage Tolerance</p>
            <div className="flex items-center gap-2">
              {SLIPPAGE_PRESETS.map(p => (
                <button
                  key={p}
                  onClick={() => { setSlippage(p); setCustomSlippage(''); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    slippage === p && !customSlippage
                      ? 'bg-primary text-bg'
                      : 'bg-surfaceHover text-textMuted hover:text-text'
                  }`}
                >
                  {p}%
                </button>
              ))}
              <div className="flex items-center gap-1 flex-1">
                <input
                  type="number"
                  placeholder="Custom"
                  value={customSlippage}
                  onChange={e => { setCustomSlippage(e.target.value); if (e.target.value) setSlippage(parseFloat(e.target.value) || 0.5); }}
                  className="w-full bg-surface border border-border rounded-lg px-2 py-1.5 text-xs text-text font-mono focus:outline-none focus:border-primary/50"
                />
                <span className="text-xs text-textMuted">%</span>
              </div>
            </div>
            {slippage > 3 && (
              <p className="text-xs text-warning mt-1.5">⚠ High slippage tolerance. You may receive significantly less.</p>
            )}
          </div>
          <div>
            <p className="text-xs text-textMuted mb-2 font-medium">Transaction Deadline</p>
            <div className="flex items-center gap-2">
              {[10, 20, 60].map(m => (
                <button
                  key={m}
                  onClick={() => setDeadline(m)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    deadline === m ? 'bg-primary text-bg' : 'bg-surfaceHover text-textMuted hover:text-text'
                  }`}
                >
                  {m}m
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="p-5 space-y-2">
        {/* Token In */}
        <TokenInput
          label="You pay"
          amount={amountIn}
          onChange={setAmountIn}
          symbol={symIn}
          tokenKey={tokenIn}
          balance={reserveIn}
          tokens={tokens}
        />

        {/* Preset buttons */}
        <div className="flex gap-1.5 pb-1">
          {[25, 50, 75, 100].map(p => (
            <button
              key={p}
              onClick={() => setPreset(p)}
              className="flex-1 py-1 rounded-md text-[11px] font-medium bg-surfaceHover hover:bg-surfaceHover/80 text-textMuted hover:text-primary transition-colors"
            >
              {p}%
            </button>
          ))}
        </div>

        {/* Flip button */}
        <div className="flex justify-center -my-0.5">
          <button
            onClick={flip}
            className="group p-2 rounded-xl bg-surfaceElevated border border-border hover:border-primary/50 hover:bg-primaryGlow transition-all duration-200"
          >
            <svg className="w-4 h-4 text-textMuted group-hover:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" />
            </svg>
          </button>
        </div>

        {/* Token Out */}
        <TokenInput
          label="You receive"
          amount={quoting ? '' : amountOut}
          symbol={symOut}
          tokenKey={tokenOut}
          tokens={tokens}
          readOnly
          placeholder={quoting ? 'Calculating…' : '0.0'}
        />

        {/* Trade details */}
        {amountOut && !quoting && (
          <div className="rounded-xl bg-surfaceElevated border border-border p-3.5 space-y-2 mt-1 animate-slide-up">
            <DetailRow label="Price impact">
              <span className={`${impactClass} font-medium`}>
                {(impact / 100).toFixed(2)}% · {impactLabel}
              </span>
            </DetailRow>
            <DetailRow label="Min received (slippage)">
              <span className="font-mono text-text">{parseFloat(minOut || 0).toFixed(4)} {symOut}</span>
            </DetailRow>
            <DetailRow label="Swap fee">
              <span className="text-textMuted">{(parseFloat(amountIn) * 0.003).toFixed(4)} {symIn} (0.30%)</span>
            </DetailRow>
            {gasEst && (
              <DetailRow label="Est. gas">
                <span className="text-textMuted font-mono">{gasEst.estimatedCostEth} ETH</span>
              </DetailRow>
            )}
            <DetailRow label="Route">
              <span className="text-textMuted">{symIn} → {symOut} (direct)</span>
            </DetailRow>
          </div>
        )}

        {/* Swap button */}
        <button
          onClick={handleSwap}
          disabled={loading || quoting || !amountIn || !amountOut || parseFloat(amountIn) <= 0}
          className={`w-full py-4 rounded-xl font-semibold text-base transition-all duration-200 mt-2 ${
            loading || quoting || !amountIn || !amountOut
              ? 'bg-surface border border-border text-textMuted cursor-not-allowed'
              : impact > 300
              ? 'bg-danger hover:bg-danger/90 text-white shadow-[0_0_20px_rgba(239,68,68,0.3)]'
              : 'bg-gradient-primary text-white shadow-glow hover:opacity-90 active:scale-[0.99]'
          }`}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Swapping…
            </span>
          ) : quoting ? 'Fetching quote…'
            : !amountIn ? 'Enter an amount'
            : `Swap ${symIn} → ${symOut}`}
        </button>
      </div>
    </div>
  );
}

function TokenInput({ label, amount, onChange, symbol, tokenKey, tokens, balance, readOnly, placeholder }) {
  const grad = { TKA: 'from-primary to-accent', TKB: 'from-accent to-purple-500', USDC: 'from-blue-500 to-blue-400' };
  const g = grad[symbol] || 'from-textMuted to-textDim';

  return (
    <div className={`token-input rounded-xl border border-border bg-surfaceElevated p-3.5 transition-all`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-textMuted">{label}</span>
        {balance !== undefined && (
          <span className="text-xs text-textMuted font-mono">
            Pool reserve: {parseFloat(balance).toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </span>
        )}
      </div>
      <div className="flex items-center gap-3">
        <input
          type="number"
          value={amount}
          onChange={e => onChange?.(e.target.value)}
          readOnly={readOnly}
          placeholder={placeholder || '0.0'}
          className="flex-1 bg-transparent text-text font-mono text-2xl font-semibold placeholder:text-textDim focus:outline-none min-w-0"
        />
        <div className={`flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r ${g} bg-opacity-20`}>
          <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${g} flex items-center justify-center text-white text-[9px] font-bold`}>
            {symbol?.[0]}
          </div>
          <span className="font-semibold text-text text-sm">{symbol}</span>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, children }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-textMuted">{label}</span>
      {children}
    </div>
  );
}
