import { useState } from 'react';
import { addLiquidity, removeLiquidity } from '../api';
import { TokenAvatar } from './PoolSelector';

export function LiquidityCard({ reserves, stats, tokens, activePool, onSuccess, showMessage }) {
  const [tab,          setTab]          = useState('add');
  const [amountA,      setAmountA]      = useState('');
  const [amountB,      setAmountB]      = useState('');
  const [removeAmount, setRemoveAmount] = useState('');
  const [removePct,    setRemovePct]    = useState(0);
  const [loading,      setLoading]      = useState(false);

  const rA    = parseFloat(reserves?.reserveA || 0);
  const rB    = parseFloat(reserves?.reserveB || 0);
  const ratio = rA > 0 ? rB / rA : 1;
  const total = parseFloat(stats?.totalSupply || 0);

  const setA = (v) => { setAmountA(v); setAmountB(v && ratio ? (parseFloat(v) * ratio).toFixed(6) : ''); };
  const setB = (v) => { setAmountB(v); setAmountA(v && ratio ? (parseFloat(v) / ratio).toFixed(6) : ''); };

  const estimateRemove = () => {
    const liq = parseFloat(removeAmount) || 0;
    if (!total || !liq) return { a: 0, b: 0 };
    return { a: (liq / total * rA).toFixed(4), b: (liq / total * rB).toFixed(4) };
  };

  const handleAdd = async () => {
    if (!amountA || !amountB || parseFloat(amountA) <= 0) {
      showMessage('Enter valid amounts', 'error'); return;
    }
    setLoading(true);
    try {
      const { data } = await addLiquidity(amountA, amountB, activePool);
      if (data.success) {
        showMessage(`Added ${parseFloat(amountA).toFixed(2)} ${tokens.A.symbol} + ${parseFloat(amountB).toFixed(2)} ${tokens.B.symbol} · ${parseFloat(data.data.liquidity).toFixed(4)} LP minted`);
        setAmountA(''); setAmountB('');
        onSuccess?.();
      }
    } catch (err) {
      showMessage(err.response?.data?.error || 'Failed to add liquidity', 'error');
    } finally { setLoading(false); }
  };

  const handleRemove = async () => {
    if (!removeAmount || parseFloat(removeAmount) <= 0) {
      showMessage('Enter LP amount', 'error'); return;
    }
    setLoading(true);
    try {
      const { data } = await removeLiquidity(removeAmount, activePool);
      if (data.success) {
        showMessage(`Removed — received ${parseFloat(data.data.amountA).toFixed(4)} ${tokens.A.symbol} + ${parseFloat(data.data.amountB).toFixed(4)} ${tokens.B.symbol}`);
        setRemoveAmount(''); setRemovePct(0);
        onSuccess?.();
      }
    } catch (err) {
      showMessage(err.response?.data?.error || 'Failed to remove liquidity', 'error');
    } finally { setLoading(false); }
  };

  const est = estimateRemove();
  const pctA = rA + rB > 0 ? (rA / (rA + rB) * 100).toFixed(1) : '50.0';
  const pctB = (100 - parseFloat(pctA)).toFixed(1);

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {/* Left: Add/Remove */}
      <div className="glass rounded-2xl shadow-card overflow-hidden">
        {/* Tab switch */}
        <div className="flex border-b border-border">
          {['add', 'remove'].map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-3.5 text-sm font-semibold capitalize transition-all ${
                tab === t ? 'tab-active' : 'text-textMuted hover:text-text hover:bg-surfaceHover'
              }`}
            >
              {t === 'add' ? '+ Add Liquidity' : '− Remove Liquidity'}
            </button>
          ))}
        </div>

        <div className="p-5">
          {tab === 'add' ? (
            <div className="space-y-3">
              <LiqInput label={tokens.A.symbol} value={amountA} onChange={setA} symbol={tokens.A.symbol} />
              <div className="flex justify-center">
                <div className="w-6 h-6 rounded-md bg-surfaceElevated border border-border flex items-center justify-center">
                  <span className="text-textMuted text-xs">+</span>
                </div>
              </div>
              <LiqInput label={tokens.B.symbol} value={amountB} onChange={setB} symbol={tokens.B.symbol} />

              {amountA && amountB && (
                <div className="rounded-xl bg-surfaceElevated border border-border p-3 space-y-1.5 animate-slide-up">
                  <Row label="Pool ratio (current)">
                    <span className="font-mono text-text text-xs">1 {tokens.A.symbol} = {ratio.toFixed(4)} {tokens.B.symbol}</span>
                  </Row>
                  <Row label="Your share (approx)">
                    <span className="font-mono text-primary text-xs">
                      {total > 0 ? ((parseFloat(amountA) / (rA + parseFloat(amountA))) * 100).toFixed(3) : '100.000'}%
                    </span>
                  </Row>
                </div>
              )}

              <button
                onClick={handleAdd}
                disabled={loading || !amountA || !amountB}
                className={`w-full py-4 rounded-xl font-semibold transition-all mt-2 ${
                  loading || !amountA || !amountB
                    ? 'bg-surface border border-border text-textMuted cursor-not-allowed'
                    : 'bg-gradient-primary text-white shadow-glow hover:opacity-90'
                }`}
              >
                {loading ? 'Adding…' : 'Add Liquidity'}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Percentage slider */}
              <div>
                <div className="flex justify-between text-xs text-textMuted mb-2">
                  <span>LP tokens to remove</span>
                  <span className="text-primary font-semibold">{removePct}%</span>
                </div>
                <input
                  type="range" min="0" max="100" value={removePct}
                  onChange={e => {
                    const p = parseInt(e.target.value);
                    setRemovePct(p);
                    setRemoveAmount(total > 0 ? (total * p / 100).toFixed(6) : '');
                  }}
                  className="w-full accent-primary"
                />
                <div className="flex gap-2 mt-2">
                  {[25, 50, 75, 100].map(p => (
                    <button key={p}
                      onClick={() => { setRemovePct(p); setRemoveAmount(total > 0 ? (total * p / 100).toFixed(6) : ''); }}
                      className="flex-1 py-1 rounded-lg text-xs bg-surfaceHover text-textMuted hover:text-primary hover:bg-primaryGlow transition-colors"
                    >
                      {p}%
                    </button>
                  ))}
                </div>
              </div>

              <LiqInput label="LP amount" value={removeAmount} onChange={v => { setRemoveAmount(v); setRemovePct(total > 0 ? Math.round(parseFloat(v) / total * 100) : 0); }} symbol="LP" />

              {parseFloat(removeAmount) > 0 && (
                <div className="rounded-xl bg-surfaceElevated border border-border p-3 space-y-1.5 animate-slide-up">
                  <p className="text-[10px] text-textMuted uppercase tracking-wider mb-2">You will receive</p>
                  <Row label={tokens.A.symbol}><span className="font-mono text-success text-xs">{est.a}</span></Row>
                  <Row label={tokens.B.symbol}><span className="font-mono text-success text-xs">{est.b}</span></Row>
                </div>
              )}

              <button
                onClick={handleRemove}
                disabled={loading || !removeAmount || parseFloat(removeAmount) <= 0}
                className={`w-full py-4 rounded-xl font-semibold transition-all ${
                  loading || !removeAmount
                    ? 'bg-surface border border-border text-textMuted cursor-not-allowed'
                    : 'bg-danger/20 text-danger border border-danger/40 hover:bg-danger/30'
                }`}
              >
                {loading ? 'Removing…' : 'Remove Liquidity'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Right: Pool info */}
      <div className="space-y-4">
        {/* Pool composition visual */}
        <div className="glass rounded-2xl shadow-card p-5">
          <h3 className="text-sm font-semibold text-text mb-4">Pool Composition</h3>
          <div className="mb-4">
            <div className="flex justify-between text-xs text-textMuted mb-1.5">
              <span>{tokens.A.symbol} {pctA}%</span>
              <span>{pctB}% {tokens.B.symbol}</span>
            </div>
            <div className="h-3 rounded-full overflow-hidden bg-surfaceElevated flex">
              <div
                className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-500"
                style={{ width: `${pctA}%` }}
              />
            </div>
          </div>
          <div className="space-y-2.5">
            {[
              { sym: tokens.A.symbol, reserve: rA },
              { sym: tokens.B.symbol, reserve: rB },
            ].map(({ sym, reserve }) => (
              <div key={sym} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TokenAvatar symbol={sym} size="sm" />
                  <span className="text-sm text-text font-medium">{sym}</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-mono font-semibold text-text">
                    {reserve.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* LP token info */}
        <div className="glass rounded-2xl shadow-card p-5">
          <h3 className="text-sm font-semibold text-text mb-3">LP Token Info</h3>
          <div className="space-y-2">
            <Row label="Total LP supply"><span className="font-mono text-text text-xs">{parseFloat(total).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span></Row>
            <Row label="Fee earned by LPs"><span className="font-mono text-success text-xs">{parseFloat(stats?.stats?.totalFees || 0).toFixed(4)}</span></Row>
            <Row label="Fee APR"><span className="font-mono text-success text-xs">{stats?.stats?.feeAPR ? `${stats.stats.feeAPR}%` : '—'}</span></Row>
          </div>
        </div>

        {/* How it works */}
        <div className="glass rounded-2xl shadow-card p-5">
          <h3 className="text-sm font-semibold text-text mb-3">How LP works</h3>
          <div className="space-y-2 text-xs text-textMuted">
            <p>• Provide equal value of both tokens to receive <span className="text-text">LP tokens</span>.</p>
            <p>• LP tokens represent your <span className="text-primary">proportional share</span> of the pool.</p>
            <p>• Earn <span className="text-success">0.30%</span> of every swap, distributed pro-rata.</p>
            <p>• Impermanent loss occurs when the price ratio moves from your entry point.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function LiqInput({ label, value, onChange, symbol }) {
  return (
    <div className="rounded-xl border border-border bg-surfaceElevated p-3.5 token-input">
      <p className="text-xs text-textMuted mb-1.5">{label}</p>
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="0.0"
          className="flex-1 bg-transparent text-text font-mono text-xl font-semibold placeholder:text-textDim focus:outline-none min-w-0"
        />
        <span className="px-2.5 py-1 rounded-lg bg-surfaceHover text-textMuted text-sm font-medium shrink-0">{symbol}</span>
      </div>
    </div>
  );
}

function Row({ label, children }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-textMuted">{label}</span>
      {children}
    </div>
  );
}
