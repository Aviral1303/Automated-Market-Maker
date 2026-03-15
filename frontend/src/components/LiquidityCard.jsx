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
        showMessage(`Added ${parseFloat(amountA).toFixed(2)} ${tokens.A.symbol} + ${parseFloat(amountB).toFixed(2)} ${tokens.B.symbol} | ${parseFloat(data.data.liquidity).toFixed(4)} LP minted`);
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
        showMessage(`Removed: ${parseFloat(data.data.amountA).toFixed(4)} ${tokens.A.symbol} + ${parseFloat(data.data.amountB).toFixed(4)} ${tokens.B.symbol}`);
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
      <div className="border border-border rounded-xl bg-surface overflow-hidden">
        <div className="flex border-b border-border">
          {['add', 'remove'].map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-3 text-xs font-medium uppercase tracking-wider transition-all ${
                tab === t ? 'bg-white/5 text-white border-b-2 border-white' : 'text-textMuted hover:text-white'
              }`}
            >
              {t === 'add' ? 'Add Liquidity' : 'Remove Liquidity'}
            </button>
          ))}
        </div>

        <div className="p-5">
          {tab === 'add' ? (
            <div className="space-y-3">
              <LiqInput label={tokens.A.symbol} value={amountA} onChange={setA} symbol={tokens.A.symbol} />
              <div className="flex justify-center">
                <div className="w-5 h-5 rounded bg-surfaceElevated border border-border flex items-center justify-center text-textDim text-[10px]">+</div>
              </div>
              <LiqInput label={tokens.B.symbol} value={amountB} onChange={setB} symbol={tokens.B.symbol} />

              {amountA && amountB && (
                <div className="rounded-lg bg-surfaceElevated border border-border p-3 space-y-1.5 animate-slide-up text-[11px]">
                  <Row label="Pool ratio">
                    <span className="font-mono text-white">1 {tokens.A.symbol} = {ratio.toFixed(4)} {tokens.B.symbol}</span>
                  </Row>
                  <Row label="Your share">
                    <span className="font-mono text-white">
                      {total > 0 ? ((parseFloat(amountA) / (rA + parseFloat(amountA))) * 100).toFixed(3) : '100.000'}%
                    </span>
                  </Row>
                </div>
              )}

              <button
                onClick={handleAdd}
                disabled={loading || !amountA || !amountB}
                className={`w-full py-3.5 rounded-lg font-medium text-sm transition-all mt-1 ${
                  loading || !amountA || !amountB
                    ? 'bg-white/5 text-textMuted cursor-not-allowed'
                    : 'bg-white text-black hover:bg-white/90'
                }`}
              >
                {loading ? 'Adding...' : 'Add Liquidity'}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-[10px] text-textMuted mb-2 uppercase tracking-wider">
                  <span>LP tokens to remove</span>
                  <span className="text-white font-mono">{removePct}%</span>
                </div>
                <input
                  type="range" min="0" max="100" value={removePct}
                  onChange={e => {
                    const p = parseInt(e.target.value);
                    setRemovePct(p);
                    setRemoveAmount(total > 0 ? (total * p / 100).toFixed(6) : '');
                  }}
                  className="w-full accent-white"
                />
                <div className="flex gap-1.5 mt-2">
                  {[25, 50, 75, 100].map(p => (
                    <button key={p}
                      onClick={() => { setRemovePct(p); setRemoveAmount(total > 0 ? (total * p / 100).toFixed(6) : ''); }}
                      className="flex-1 py-1 rounded text-[10px] font-mono bg-white/3 text-textMuted hover:text-white hover:bg-white/8 transition-colors"
                    >
                      {p}%
                    </button>
                  ))}
                </div>
              </div>

              <LiqInput label="LP amount" value={removeAmount} onChange={v => { setRemoveAmount(v); setRemovePct(total > 0 ? Math.round(parseFloat(v) / total * 100) : 0); }} symbol="LP" />

              {parseFloat(removeAmount) > 0 && (
                <div className="rounded-lg bg-surfaceElevated border border-border p-3 space-y-1.5 animate-slide-up text-[11px]">
                  <p className="text-[10px] text-textDim uppercase tracking-wider mb-1">You receive</p>
                  <Row label={tokens.A.symbol}><span className="font-mono text-success">{est.a}</span></Row>
                  <Row label={tokens.B.symbol}><span className="font-mono text-success">{est.b}</span></Row>
                </div>
              )}

              <button
                onClick={handleRemove}
                disabled={loading || !removeAmount || parseFloat(removeAmount) <= 0}
                className={`w-full py-3.5 rounded-lg font-medium text-sm transition-all ${
                  loading || !removeAmount
                    ? 'bg-white/5 text-textMuted cursor-not-allowed'
                    : 'bg-danger/10 text-danger border border-danger/20 hover:bg-danger/20'
                }`}
              >
                {loading ? 'Removing...' : 'Remove Liquidity'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Right: Pool info */}
      <div className="space-y-4">
        <div className="border border-border rounded-xl bg-surface p-5">
          <h3 className="text-xs font-medium text-textMuted uppercase tracking-wider mb-4">Pool Composition</h3>
          <div className="mb-4">
            <div className="flex justify-between text-[10px] text-textMuted mb-1.5 font-mono">
              <span>{tokens.A.symbol} {pctA}%</span>
              <span>{pctB}% {tokens.B.symbol}</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden bg-white/5 flex">
              <div className="h-full bg-white/40 transition-all duration-500" style={{ width: `${pctA}%` }} />
            </div>
          </div>
          <div className="space-y-3">
            {[
              { sym: tokens.A.symbol, reserve: rA },
              { sym: tokens.B.symbol, reserve: rB },
            ].map(({ sym, reserve }) => (
              <div key={sym} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TokenAvatar symbol={sym} size="sm" />
                  <span className="text-sm text-white">{sym}</span>
                </div>
                <span className="text-sm font-mono text-white">
                  {reserve.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="border border-border rounded-xl bg-surface p-5">
          <h3 className="text-xs font-medium text-textMuted uppercase tracking-wider mb-3">LP Info</h3>
          <div className="space-y-2 text-[11px]">
            <Row label="Total supply"><span className="font-mono text-white">{parseFloat(total).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span></Row>
            <Row label="Fees earned"><span className="font-mono text-success">{parseFloat(stats?.stats?.totalFees || 0).toFixed(4)}</span></Row>
            <Row label="Fee APR"><span className="font-mono text-success">{stats?.stats?.feeAPR ? `${stats.stats.feeAPR}%` : '—'}</span></Row>
          </div>
        </div>

        <div className="border border-border rounded-xl bg-surface p-5">
          <h3 className="text-xs font-medium text-textMuted uppercase tracking-wider mb-3">How it works</h3>
          <div className="space-y-2 text-[11px] text-textMuted leading-relaxed">
            <p>Deposit equal value of both tokens to mint LP tokens representing your pool share.</p>
            <p>Earn 0.30% of every swap, distributed proportionally to your share.</p>
            <p>Impermanent loss occurs when the price ratio diverges from your entry.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function LiqInput({ label, value, onChange, symbol }) {
  return (
    <div className="rounded-lg border border-border bg-surfaceElevated p-3 token-input">
      <p className="text-[10px] text-textDim uppercase tracking-wider mb-1.5">{label}</p>
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="0.0"
          className="flex-1 bg-transparent text-white font-mono text-lg font-medium placeholder:text-textDim focus:outline-none min-w-0"
        />
        <span className="px-2 py-1 rounded bg-white/5 text-textMuted text-xs font-mono">{symbol}</span>
      </div>
    </div>
  );
}

function Row({ label, children }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-textMuted">{label}</span>
      {children}
    </div>
  );
}
