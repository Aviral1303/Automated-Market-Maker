import { useState } from 'react';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine
} from 'recharts';
import { runBacktest, simulateMEV, getConcentratedQuote, getILCurve } from '../api';

export function ResearchLab({ reserves, activePool, tokens }) {
  const [activeSection, setActiveSection] = useState('backtest');

  const sections = [
    { id: 'backtest',  label: 'Backtest',             icon: '⟳' },
    { id: 'mev',       label: 'MEV Simulator',        icon: '⚡' },
    { id: 'il',        label: 'Imperm. Loss',         icon: '∿' },
    { id: 'clmm',      label: 'Conc. Liquidity',      icon: '◈' },
  ];

  return (
    <div className="space-y-4">
      {/* Section tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {sections.map(s => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeSection === s.id
                ? 'bg-primaryGlow border border-borderActive text-primary'
                : 'glass border border-border text-textMuted hover:text-text'
            }`}
          >
            <span className="text-xs">{s.icon}</span>
            {s.label}
          </button>
        ))}
      </div>

      {activeSection === 'backtest'  && <BacktestSection tokens={tokens} />}
      {activeSection === 'mev'       && <MEVSection reserves={reserves} tokens={tokens} activePool={activePool} />}
      {activeSection === 'il'        && <ILSection />}
      {activeSection === 'clmm'      && <CLMMSection tokens={tokens} />}
    </div>
  );
}

// ── Backtest ──────────────────────────────────────────────────────────────────
function BacktestSection({ tokens }) {
  const [limit,   setLimit]   = useState(24);
  const [result,  setResult]  = useState(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    try {
      const { data } = await runBacktest(limit);
      if (data.success) setResult(data.data);
    } catch {}
    finally { setLoading(false); }
  };

  const snapData = result?.snapshots?.map(s => ({
    t: new Date(s.t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    price: parseFloat((s.price || 0).toFixed(4)),
    fees:  parseFloat((s.fees  || 0).toFixed(4)),
  })) || [];

  return (
    <div className="glass rounded-2xl shadow-card p-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="text-base font-semibold text-text">Historical LP Backtest</h3>
          <p className="text-xs text-textMuted mt-1">Replay real ETH price data through the AMM and measure LP returns vs HODLing.</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={limit}
            onChange={e => setLimit(parseInt(e.target.value))}
            className="bg-surfaceElevated border border-border rounded-lg px-2 py-1.5 text-xs text-text focus:outline-none focus:border-primary/50"
          >
            <option value={24}>24h</option>
            <option value={48}>48h</option>
            <option value={72}>72h</option>
            <option value={168}>7 days</option>
          </select>
          <button
            onClick={run}
            disabled={loading}
            className="px-4 py-1.5 rounded-lg text-xs font-medium bg-primary hover:bg-primaryHover text-bg transition-colors disabled:opacity-50"
          >
            {loading ? 'Running…' : 'Run Backtest'}
          </button>
        </div>
      </div>

      {result?.summary && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
          {[
            { label: 'Periods', value: result.summary.periods },
            { label: 'Total Fees', value: parseFloat(result.summary.totalFees).toFixed(4), green: true },
            { label: 'Imperm. Loss', value: `${result.summary.impermanentLossPercent}%`, red: parseFloat(result.summary.impermanentLossPercent) < 0 },
            { label: 'Fee Return', value: `${result.summary.feeReturnPercent}%`, green: true },
            { label: 'Net P&L', value: `${result.summary.netPnlPercent}%`, green: parseFloat(result.summary.netPnlPercent) >= 0, red: parseFloat(result.summary.netPnlPercent) < 0 },
            { label: 'HODL Value', value: parseFloat(result.summary.holdValue).toFixed(2) },
          ].map(({ label, value, green, red }) => (
            <div key={label} className="bg-surfaceElevated rounded-xl p-3">
              <p className="text-[10px] text-textMuted mb-1">{label}</p>
              <p className={`text-sm font-mono font-semibold ${green ? 'text-success' : red ? 'text-danger' : 'text-text'}`}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {snapData.length > 0 && (
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-textMuted mb-2">Pool Price vs Time</p>
            <ResponsiveContainer width="100%" height={140}>
              <AreaChart data={snapData}>
                <defs><linearGradient id="btGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
                </linearGradient></defs>
                <XAxis dataKey="t" hide />
                <YAxis domain={['auto', 'auto']} hide />
                <Tooltip contentStyle={{ background: '#0e1420', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', fontSize: '11px' }} />
                <Area type="monotone" dataKey="price" stroke="#14b8a6" strokeWidth={1.5} fill="url(#btGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div>
            <p className="text-xs text-textMuted mb-2">Cumulative Fees Earned</p>
            <ResponsiveContainer width="100%" height={140}>
              <AreaChart data={snapData}>
                <defs><linearGradient id="feeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient></defs>
                <XAxis dataKey="t" hide />
                <YAxis domain={['auto', 'auto']} hide />
                <Tooltip contentStyle={{ background: '#0e1420', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', fontSize: '11px' }} />
                <Area type="monotone" dataKey="fees" stroke="#10b981" strokeWidth={1.5} fill="url(#feeGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {!result && !loading && (
        <div className="h-32 flex items-center justify-center text-textMuted text-sm">
          Click "Run Backtest" to simulate LP returns over real ETH price data
        </div>
      )}
    </div>
  );
}

// ── MEV Simulator ─────────────────────────────────────────────────────────────
function MEVSection({ reserves, tokens, activePool }) {
  const [victim, setVictim] = useState('5000');
  const [frMult, setFrMult] = useState(0.5);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    try {
      const { data } = await simulateMEV({ victimAmountIn: parseFloat(victim), tokenIn: 'A', poolId: activePool, frontRunMultiplier: frMult });
      if (data.success) setResult(data.data);
    } catch {}
    finally { setLoading(false); }
  };

  const steps = result ? [
    { step: '1 Front-run',   color: 'text-warning', bg: 'bg-warning/10 border-warning/30', in: result.frontRun.amountIn, out: result.frontRun.amountOut },
    { step: '2 Victim tx',   color: 'text-text',    bg: 'bg-surfaceElevated border-border',  in: result.victim.amountIn,   out: result.victim.amountOut },
    { step: '3 Back-run',    color: 'text-accent',  bg: 'bg-accent/10 border-accent/30',   in: result.backRun.amountIn,  out: result.backRun.amountOut },
  ] : [];

  return (
    <div className="glass rounded-2xl shadow-card p-6">
      <div className="mb-5">
        <h3 className="text-base font-semibold text-text">MEV / Sandwich Attack Simulator</h3>
        <p className="text-xs text-textMuted mt-1">Simulate how a sandwich bot front-runs and back-runs a victim transaction, extracting value at the victim's expense.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-5">
        <div>
          <label className="text-xs text-textMuted block mb-1.5">Victim swap size ({tokens.A.symbol})</label>
          <input
            type="number"
            value={victim}
            onChange={e => setVictim(e.target.value)}
            className="w-full bg-surfaceElevated border border-border rounded-xl px-3 py-2.5 text-text font-mono text-sm focus:outline-none focus:border-primary/50"
          />
        </div>
        <div>
          <label className="text-xs text-textMuted block mb-1.5">Bot front-run size (× victim)</label>
          <div className="flex gap-2">
            {[0.25, 0.5, 1.0, 2.0].map(m => (
              <button key={m}
                onClick={() => setFrMult(m)}
                className={`flex-1 py-2.5 rounded-xl text-xs font-medium transition-colors ${frMult === m ? 'bg-warning/20 text-warning border border-warning/30' : 'bg-surfaceElevated border border-border text-textMuted hover:text-text'}`}
              >
                {m}×
              </button>
            ))}
          </div>
        </div>
      </div>

      <button
        onClick={run}
        disabled={loading}
        className="w-full py-3 rounded-xl font-semibold text-sm bg-warning/20 text-warning border border-warning/30 hover:bg-warning/30 transition-colors disabled:opacity-50 mb-5"
      >
        {loading ? 'Simulating…' : 'Simulate Sandwich Attack'}
      </button>

      {result && (
        <div className="space-y-3 animate-slide-up">
          <div className="space-y-2">
            {steps.map(({ step, color, bg, in: amtIn, out: amtOut }) => (
              <div key={step} className={`rounded-xl border p-3 ${bg}`}>
                <div className="flex items-center justify-between text-xs">
                  <span className={`font-semibold ${color}`}>{step}</span>
                  <span className="font-mono text-text">
                    {parseFloat(amtIn).toFixed(2)} {tokens.A.symbol} → {parseFloat(amtOut).toFixed(4)} {tokens.B.symbol}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className={`rounded-xl border p-4 ${parseFloat(result.mevProfit) > 0 ? 'bg-danger/10 border-danger/30' : 'bg-surfaceElevated border-border'}`}>
            <p className="text-xs text-textMuted mb-2">MEV Extracted</p>
            <div className="flex items-baseline gap-2">
              <span className={`text-2xl font-mono font-bold ${parseFloat(result.mevProfit) > 0 ? 'text-danger' : 'text-textMuted'}`}>
                {parseFloat(result.mevProfit).toFixed(4)} {tokens.A.symbol}
              </span>
              <span className="text-xs text-textMuted">({result.mevProfitBps} bps)</span>
            </div>
            <p className="text-xs text-textMuted mt-1.5">
              Victim received {result.victimSlippageExtra} extra slippage due to front-run.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Impermanent Loss ──────────────────────────────────────────────────────────
function ILSection() {
  const [ilData,    setIlData]    = useState([]);
  const [entryP,    setEntryP]    = useState('1.0');
  const [currentP,  setCurrentP]  = useState('');
  const [ilResult,  setIlResult]  = useState(null);
  const [feePct,    setFeePct]    = useState('');

  const loadCurve = async () => {
    try {
      const { data } = await getILCurve();
      if (data.success) setIlData(data.data.map(d => ({ ratio: parseFloat(d.ratio), il: parseFloat(d.impermanentLossPercent) })));
    } catch {}
  };

  useState(() => { loadCurve(); }, []);

  const calc = () => {
    const p0 = parseFloat(entryP) || 1;
    const p1 = parseFloat(currentP) || p0;
    const ratio = p1 / p0;
    const sqrtR = Math.sqrt(ratio);
    const il = (2 * sqrtR / (1 + ratio) - 1) * 100;
    const fp  = parseFloat(feePct) || 0;
    setIlResult({ ratio: ratio.toFixed(4), il: il.toFixed(4), net: (il + fp).toFixed(4), feePct: fp });
  };

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <div className="glass rounded-2xl shadow-card p-5">
        <h3 className="text-sm font-semibold text-text mb-1">Impermanent Loss Curve</h3>
        <p className="text-xs text-textMuted mb-4">IL as a function of price ratio relative to entry</p>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={ilData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="ilGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="ratio" tickFormatter={v => `${v.toFixed(1)}x`} tick={{ fill: '#64748b', fontSize: 9 }} />
            <YAxis tickFormatter={v => `${v.toFixed(1)}%`} tick={{ fill: '#64748b', fontSize: 9 }} width={40} />
            <Tooltip contentStyle={{ background: '#0e1420', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', fontSize: '11px' }}
              formatter={v => [`${v.toFixed(2)}%`, 'IL']} labelFormatter={v => `Price ratio: ${v}x`} />
            <ReferenceLine y={0} stroke="rgba(255,255,255,0.1)" />
            <Area type="monotone" dataKey="il" stroke="#ef4444" strokeWidth={2} fill="url(#ilGrad)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="glass rounded-2xl shadow-card p-5">
        <h3 className="text-sm font-semibold text-text mb-4">IL Calculator</h3>
        <div className="space-y-3">
          {[
            { label: 'Entry price (token ratio)', value: entryP, set: setEntryP, placeholder: '1.0' },
            { label: 'Current price',             value: currentP, set: setCurrentP, placeholder: 'e.g. 1.5' },
            { label: 'Fees earned (%)',            value: feePct, set: setFeePct, placeholder: '0.0' },
          ].map(({ label, value, set, placeholder }) => (
            <div key={label}>
              <label className="text-xs text-textMuted block mb-1">{label}</label>
              <input
                type="number"
                value={value}
                onChange={e => set(e.target.value)}
                placeholder={placeholder}
                className="w-full bg-surfaceElevated border border-border rounded-xl px-3 py-2.5 text-text font-mono text-sm focus:outline-none focus:border-primary/50"
              />
            </div>
          ))}
          <button
            onClick={calc}
            className="w-full py-2.5 rounded-xl font-semibold text-sm bg-accent/20 text-accent border border-accent/30 hover:bg-accent/30 transition-colors"
          >
            Calculate IL
          </button>

          {ilResult && (
            <div className="rounded-xl bg-surfaceElevated border border-border p-3 space-y-2 animate-slide-up">
              <Row label="Price ratio"><span className="font-mono text-text text-xs">{ilResult.ratio}×</span></Row>
              <Row label="Impermanent Loss"><span className={`font-mono text-xs font-semibold ${parseFloat(ilResult.il) < 0 ? 'text-danger' : 'text-success'}`}>{ilResult.il}%</span></Row>
              {ilResult.feePct > 0 && <Row label="Fees earned"><span className="font-mono text-success text-xs">+{ilResult.feePct}%</span></Row>}
              <div className="border-t border-border pt-2">
                <Row label="Net P&L">
                  <span className={`font-mono font-bold text-sm ${parseFloat(ilResult.net) >= 0 ? 'text-success' : 'text-danger'}`}>
                    {ilResult.net}%
                  </span>
                </Row>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Concentrated Liquidity ────────────────────────────────────────────────────
function CLMMSection({ tokens }) {
  const [pa,       setPa]       = useState('0.9');
  const [pb,       setPb]       = useState('1.1');
  const [pCurrent, setPCurrent] = useState('1.0');
  const [amountIn, setAmountIn] = useState('100');
  const [result,   setResult]   = useState(null);
  const [loading,  setLoading]  = useState(false);

  const run = async () => {
    setLoading(true);
    try {
      const { data } = await getConcentratedQuote({
        pa: parseFloat(pa), pb: parseFloat(pb),
        pCurrent: parseFloat(pCurrent), amountIn: parseFloat(amountIn),
      });
      if (data.success) setResult(data.data);
    } catch {}
    finally { setLoading(false); }
  };

  const range = parseFloat(pb) - parseFloat(pa);
  const rangePct = parseFloat(pCurrent) > 0 ? (range / parseFloat(pCurrent) * 100).toFixed(1) : '—';

  return (
    <div className="glass rounded-2xl shadow-card p-6">
      <div className="mb-5">
        <h3 className="text-base font-semibold text-text">Concentrated Liquidity (Uniswap V3 Style)</h3>
        <p className="text-xs text-textMuted mt-1">Set a price range to provide liquidity with higher capital efficiency than full-range V2.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-3">
          {[
            { label: 'Min price (Pa)', value: pa, set: setPa },
            { label: 'Max price (Pb)', value: pb, set: setPb },
            { label: 'Current price',  value: pCurrent, set: setPCurrent },
            { label: `Amount in (${tokens.A.symbol})`, value: amountIn, set: setAmountIn },
          ].map(({ label, value, set }) => (
            <div key={label}>
              <label className="text-xs text-textMuted block mb-1">{label}</label>
              <input
                type="number"
                value={value}
                onChange={e => set(e.target.value)}
                className="w-full bg-surfaceElevated border border-border rounded-xl px-3 py-2.5 text-text font-mono text-sm focus:outline-none focus:border-primary/50"
              />
            </div>
          ))}
          <button
            onClick={run}
            disabled={loading}
            className="w-full py-3 rounded-xl font-semibold text-sm bg-gradient-primary text-white shadow-glow hover:opacity-90 transition-all disabled:opacity-50"
          >
            {loading ? 'Calculating…' : 'Get CLMM Quote'}
          </button>
        </div>

        <div className="space-y-4">
          {/* Range visualizer */}
          <div className="bg-surfaceElevated rounded-xl p-4">
            <p className="text-xs text-textMuted mb-3">Price Range</p>
            <div className="relative h-8 bg-surface rounded-full overflow-hidden">
              <div
                className="absolute h-full bg-gradient-primary opacity-40 rounded-full"
                style={{
                  left: `${Math.max(0, ((parseFloat(pa) / (parseFloat(pb) * 1.2)) * 100))}%`,
                  right: `${Math.max(0, 100 - ((parseFloat(pb) / (parseFloat(pb) * 1.2)) * 100))}%`,
                }}
              />
              <div
                className="absolute w-1.5 h-full bg-primary rounded-full"
                style={{ left: `${Math.min(95, Math.max(2, ((parseFloat(pCurrent) / (parseFloat(pb) * 1.2)) * 100)))}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-textMuted mt-1.5">
              <span>Pa: {pa}</span>
              <span className="text-primary">Current: {pCurrent}</span>
              <span>Pb: {pb}</span>
            </div>
            <p className="text-xs text-textMuted mt-2">Range width: <span className="text-text font-mono">{rangePct}%</span></p>
          </div>

          {result && (
            <div className="bg-surfaceElevated rounded-xl p-4 space-y-2.5 animate-slide-up">
              <Row label="In range?">
                <span className={result.inRange ? 'text-success font-semibold text-xs' : 'text-danger text-xs'}>{result.inRange ? 'Yes' : 'No — out of range'}</span>
              </Row>
              {result.inRange && (
                <>
                  <Row label={`Amount out (${tokens.B.symbol})`}>
                    <span className="font-mono text-text text-xs font-semibold">{parseFloat(result.amountOut).toFixed(4)}</span>
                  </Row>
                  <Row label="Price after">
                    <span className="font-mono text-text text-xs">{parseFloat(result.priceAfter).toFixed(6)}</span>
                  </Row>
                  <Row label="Capital efficiency vs V2">
                    <span className="font-mono text-gold font-semibold text-xs">{result.capitalEfficiencyVsV2}</span>
                  </Row>
                </>
              )}
            </div>
          )}

          <div className="bg-surfaceElevated rounded-xl p-4">
            <p className="text-xs text-textMuted mb-2">Key insight</p>
            <p className="text-xs text-textDim leading-relaxed">
              Narrower ranges → higher fee APR but risk of going out-of-range.
              Wide ranges → lower capital efficiency but more robust.
              V3 LPs actively manage their positions for maximum yield.
            </p>
          </div>
        </div>
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
