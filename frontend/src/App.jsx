import { useState, useEffect, useCallback } from 'react';
import { Header }           from './components/Header';
import { SwapCard }         from './components/SwapCard';
import { LiquidityCard }    from './components/LiquidityCard';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { ResearchLab }      from './components/ResearchLab';
import { TestnetPanel }     from './components/TestnetPanel';
import { Toast }            from './components/Toast';
import { PoolSelector }     from './components/PoolSelector';
import { StatsBar }         from './components/StatsBar';
import { createWsConnection, getStats, getReserves, getPriceHistory, getTransactions } from './api';

const TABS = [
  { id: 'swap',      label: 'Swap',       icon: '⇄' },
  { id: 'pool',      label: 'Pool',       icon: '◎' },
  { id: 'analytics', label: 'Analytics',  icon: '▦' },
  { id: 'research',  label: 'Research',   icon: '⌬' },
  { id: 'testnet',   label: 'Testnet',    icon: '◈' },
];

export default function App() {
  const [activeTab,    setActiveTab]    = useState('swap');
  const [activePool,   setActivePool]   = useState('TKA/TKB');
  const [reserves,     setReserves]     = useState({ reserveA: '0', reserveB: '0' });
  const [stats,        setStats]        = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [priceHistory, setPriceHistory] = useState([]);
  const [wsStatus,     setWsStatus]     = useState('connecting'); // connecting | live | offline
  const [liveData,     setLiveData]     = useState({});
  const [toast,        setToast]        = useState({ message: '', type: 'success' });

  const showMessage = useCallback((msg, type = 'success') => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(t => ({ ...t, message: '' })), 5000);
  }, []);

  // HTTP refresh
  const refresh = useCallback(() => {
    getReserves(activePool).then(r => r.data.success && setReserves(r.data.data)).catch(() => {});
    getStats(activePool).then(r => r.data.success && setStats(r.data.data)).catch(() => {});
    getTransactions(30, activePool).then(r => r.data.success && setTransactions(r.data.data.transactions)).catch(() => {});
    getPriceHistory(activePool, 200).then(r => r.data.success && setPriceHistory(r.data.data)).catch(() => {});
  }, [activePool]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 8000);
    return () => clearInterval(interval);
  }, [refresh]);

  // WebSocket live ticks
  useEffect(() => {
    const ws = createWsConnection(
      (msg) => {
        if (msg.type === 'TICK' || msg.type === 'SNAPSHOT') {
          setLiveData(msg.payload);
          setWsStatus('live');
          // Sync reserves from live data
          if (msg.payload[activePool]) {
            const d = msg.payload[activePool];
            setReserves(prev => ({
              ...prev,
              reserveA: d.reserveA ?? prev.reserveA,
              reserveB: d.reserveB ?? prev.reserveB,
              spotPrice: d.price,
            }));
          }
        }
        if (msg.type === 'SWAP' || msg.type === 'ADD_LIQUIDITY' || msg.type === 'REMOVE_LIQUIDITY') {
          refresh();
        }
      },
      () => setWsStatus('live'),
      () => setWsStatus('offline'),
    );
    return () => ws.close();
  }, [activePool, refresh]);

  const poolTokens = {
    'TKA/TKB':  { A: { symbol: 'TKA', name: 'Token Alpha' }, B: { symbol: 'TKB', name: 'Token Beta' } },
    'TKA/USDC': { A: { symbol: 'TKA', name: 'Token Alpha' }, B: { symbol: 'USDC', name: 'USD Coin' } },
  };
  const tokens = poolTokens[activePool] || poolTokens['TKA/TKB'];

  return (
    <div className="min-h-screen bg-bg bg-grid text-text">
      {/* Background glow orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-64 -left-64 w-[600px] h-[600px] rounded-full bg-primary/5 blur-[128px]" />
        <div className="absolute -bottom-64 -right-64 w-[600px] h-[600px] rounded-full bg-accent/5 blur-[128px]" />
      </div>

      <Header wsStatus={wsStatus} />

      <main className="relative max-w-7xl mx-auto px-4 pb-12">
        {/* Stats bar */}
        <StatsBar reserves={reserves} stats={stats} liveData={liveData} activePool={activePool} />

        {/* Pool selector */}
        <div className="flex items-center justify-between mb-6">
          <PoolSelector activePool={activePool} onSelect={setActivePool} liveData={liveData} />

          {/* Tab nav */}
          <nav className="flex items-center gap-1 bg-surface border border-border rounded-xl p-1">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-primary/15 text-primary shadow-inner'
                    : 'text-textMuted hover:text-text hover:bg-surfaceHover'
                }`}
              >
                <span className="text-xs opacity-70">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab content */}
        <div className="animate-fade-in">
          {activeTab === 'swap' && (
            <SwapLayout
              reserves={reserves} stats={stats} priceHistory={priceHistory}
              transactions={transactions} tokens={tokens} activePool={activePool}
              onSuccess={refresh} showMessage={showMessage}
            />
          )}
          {activeTab === 'pool' && (
            <LiquidityCard
              reserves={reserves} stats={stats} tokens={tokens} activePool={activePool}
              onSuccess={refresh} showMessage={showMessage}
            />
          )}
          {activeTab === 'analytics' && (
            <AnalyticsDashboard
              priceHistory={priceHistory} transactions={transactions}
              stats={stats} reserves={reserves} activePool={activePool}
              tokens={tokens}
            />
          )}
          {activeTab === 'research' && (
            <ResearchLab reserves={reserves} activePool={activePool} tokens={tokens} />
          )}
          {activeTab === 'testnet' && (
            <TestnetPanel showMessage={showMessage} />
          )}
        </div>
      </main>

      <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(t => ({ ...t, message: '' }))} />
    </div>
  );
}

// ── Swap layout (card + sidebar) ───────────────────────────────────────────────
function SwapLayout({ reserves, stats, priceHistory, transactions, tokens, activePool, onSuccess, showMessage }) {
  return (
    <div className="grid lg:grid-cols-5 gap-6">
      {/* Swap card — centered narrow column */}
      <div className="lg:col-span-2 flex justify-center lg:justify-start">
        <div className="w-full max-w-md">
          <SwapCard
            reserves={reserves} tokens={tokens} activePool={activePool}
            onSuccess={onSuccess} showMessage={showMessage}
          />
        </div>
      </div>

      {/* Right side info */}
      <div className="lg:col-span-3 space-y-4">
        <PoolStatsPanel stats={stats} reserves={reserves} tokens={tokens} />
        <PricePanel priceHistory={priceHistory} tokens={tokens} />
        <RecentTradesPanel transactions={transactions} tokens={tokens} />
      </div>
    </div>
  );
}

// ── Pool stats mini panel ──────────────────────────────────────────────────────
function PoolStatsPanel({ stats, reserves, tokens }) {
  const data = stats?.stats || {};
  const items = [
    { label: 'TVL',        value: data.tvl       ? `${parseFloat(data.tvl).toLocaleString()} units` : '—' },
    { label: '24h Volume', value: data.totalVolume ? parseFloat(data.totalVolume).toLocaleString(undefined, { maximumFractionDigits: 0 }) : '—' },
    { label: 'Total Fees', value: data.totalFees  ? parseFloat(data.totalFees).toFixed(2) : '—' },
    { label: 'Fee APR',    value: data.feeAPR     ? `${data.feeAPR}%` : '—', highlight: true },
    { label: `${tokens.A.symbol} Reserve`, value: parseFloat(reserves.reserveA || 0).toLocaleString(undefined, { maximumFractionDigits: 0 }) },
    { label: `${tokens.B.symbol} Reserve`, value: parseFloat(reserves.reserveB || 0).toLocaleString(undefined, { maximumFractionDigits: 0 }) },
  ];

  return (
    <div className="glass rounded-2xl p-5 shadow-card">
      <h3 className="text-sm font-semibold text-text mb-4 flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-primary live-dot" />
        Pool Statistics
      </h3>
      <div className="grid grid-cols-3 gap-3">
        {items.map(({ label, value, highlight }) => (
          <div key={label} className="bg-surfaceHover rounded-xl p-3">
            <p className="text-xs text-textMuted mb-1">{label}</p>
            <p className={`text-sm font-semibold font-mono ${highlight ? 'text-success' : 'text-text'}`}>{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Price chart panel ─────────────────────────────────────────────────────────
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

function PricePanel({ priceHistory, tokens }) {
  const data = priceHistory.map(pt => ({ t: pt.t, price: parseFloat(pt.p.toFixed(6)) }));
  const min  = data.length ? Math.min(...data.map(d => d.price)) * 0.998 : 0;
  const max  = data.length ? Math.max(...data.map(d => d.price)) * 1.002 : 2;
  const last = data[data.length - 1]?.price;
  const first = data[0]?.price;
  const pct  = first ? ((last - first) / first * 100).toFixed(2) : '0.00';
  const isUp = parseFloat(pct) >= 0;

  return (
    <div className="glass rounded-2xl p-5 shadow-card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-text">{tokens.A.symbol}/{tokens.B.symbol} Price</h3>
          {last && (
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xl font-mono font-semibold text-text">{last.toFixed(4)}</span>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${isUp ? 'bg-success/15 text-success' : 'bg-danger/15 text-danger'}`}>
                {isUp ? '+' : ''}{pct}%
              </span>
            </div>
          )}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={120}>
        <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={isUp ? '#10b981' : '#ef4444'} stopOpacity={0.25} />
              <stop offset="95%" stopColor={isUp ? '#10b981' : '#ef4444'} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="t" hide />
          <YAxis domain={[min, max]} hide />
          <Tooltip
            contentStyle={{ background: '#0e1420', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', fontSize: '12px' }}
            formatter={v => [v.toFixed(6), 'Price']}
            labelFormatter={ts => new Date(ts).toLocaleTimeString()}
          />
          <Area type="monotone" dataKey="price" stroke={isUp ? '#10b981' : '#ef4444'} strokeWidth={1.5} fill="url(#priceGrad)" dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Recent trades panel ───────────────────────────────────────────────────────
function RecentTradesPanel({ transactions, tokens }) {
  const swaps = transactions.filter(t => t.type === 'swap').slice(0, 8);

  return (
    <div className="glass rounded-2xl p-5 shadow-card">
      <h3 className="text-sm font-semibold text-text mb-4">Recent Trades</h3>
      {swaps.length === 0 ? (
        <p className="text-xs text-textMuted text-center py-4">No trades yet</p>
      ) : (
        <div className="space-y-1.5">
          {swaps.map(tx => {
            const isAtoB = tx.tokenIn === 'A';
            const inSym  = isAtoB ? tokens.A.symbol : tokens.B.symbol;
            const outSym = isAtoB ? tokens.B.symbol : tokens.A.symbol;
            const impact = parseFloat(tx.priceImpact || 0);
            return (
              <div key={tx.id} className="flex items-center justify-between text-xs py-1.5 border-b border-border last:border-0">
                <div className="flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full ${isAtoB ? 'bg-primary' : 'bg-accent'}`} />
                  <span className="font-mono text-text">
                    {parseFloat(tx.amountIn).toLocaleString(undefined, { maximumFractionDigits: 2 })} {inSym}
                    <span className="text-textMuted mx-1">→</span>
                    {parseFloat(tx.amountOut).toLocaleString(undefined, { maximumFractionDigits: 2 })} {outSym}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`${impact > 100 ? 'text-danger' : impact > 50 ? 'text-warning' : 'text-textMuted'}`}>
                    {impact > 0 ? `${impact}bps` : ''}
                  </span>
                  <span className="text-textDim">{new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
