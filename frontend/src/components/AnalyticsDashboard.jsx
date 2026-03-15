import { useState, useEffect } from 'react';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';
import { getAnalytics, getArbitrage, getSlippageCurve } from '../api';

const Tip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-black border border-white/10 rounded-lg p-2.5 text-[10px]">
      <p className="text-textMuted mb-0.5">{typeof label === 'number' ? new Date(label).toLocaleTimeString() : label}</p>
      {payload.map((p, i) => (
        <p key={i} className="font-mono text-white">{typeof p.value === 'number' ? p.value.toLocaleString(undefined, { maximumFractionDigits: 4 }) : p.value}</p>
      ))}
    </div>
  );
};

export function AnalyticsDashboard({ priceHistory, transactions, stats, reserves, activePool, tokens }) {
  const [analytics,  setAnalytics]  = useState(null);
  const [arbitrage,  setArbitrage]  = useState(null);
  const [slipCurve,  setSlipCurve]  = useState([]);

  useEffect(() => {
    getAnalytics(activePool).then(r => r.data.success && setAnalytics(r.data.data)).catch(() => {});
    getArbitrage('ETH/USDT', activePool).then(r => r.data.success && setArbitrage(r.data.data)).catch(() => {});
    getSlippageCurve('A', activePool).then(r => r.data.success && setSlipCurve(r.data.data)).catch(() => {});
  }, [activePool]);

  const priceData = priceHistory.map(pt => ({ t: pt.t, price: parseFloat((pt.p || 0).toFixed(6)) }));
  const last = priceData[priceData.length - 1]?.price ?? 0;
  const first = priceData[0]?.price ?? 0;
  const pct  = first ? ((last - first) / first * 100).toFixed(2) : '0.00';
  const isUp = parseFloat(pct) >= 0;

  const volCandles = (analytics?.volumeCandles || []).map(c => ({
    ts:     new Date(c.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    volume: parseFloat(c.volume),
  }));

  const s = stats?.stats || {};

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border rounded-lg overflow-hidden">
        {[
          { label: 'TVL', value: parseFloat(s.tvl || 0).toLocaleString(undefined, { maximumFractionDigits: 0 }), sub: 'pool tokens' },
          { label: 'Volume', value: parseFloat(s.totalVolume || 0).toLocaleString(undefined, { maximumFractionDigits: 0 }), sub: 'all time' },
          { label: 'Fees', value: parseFloat(s.totalFees || 0).toFixed(2), sub: 'earned by LPs', green: true },
          { label: 'APR', value: s.feeAPR ? `${s.feeAPR}%` : '—', sub: 'annualised', green: true },
        ].map(({ label, value, sub, green }) => (
          <div key={label} className="bg-surface p-4">
            <p className="text-[10px] text-textDim uppercase tracking-widest mb-1">{label}</p>
            <p className={`text-xl font-mono font-semibold ${green ? 'text-success' : 'text-white'}`}>{value}</p>
            <p className="text-[10px] text-textDim mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* Price chart */}
      <div className="border border-border rounded-xl bg-surface p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xs font-medium text-textMuted uppercase tracking-wider">{tokens.A.symbol}/{tokens.B.symbol} Price</h3>
            <div className="flex items-center gap-2 mt-1">
              {last > 0 && <span className="text-lg font-mono font-semibold text-white">{last.toFixed(6)}</span>}
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${isUp ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
                {isUp ? '+' : ''}{pct}%
              </span>
            </div>
          </div>
          <span className="flex items-center gap-1 text-[10px] text-textDim">
            <span className="w-1.5 h-1.5 rounded-full bg-white/60 live-dot" />
            Live
          </span>
        </div>
        <ResponsiveContainer width="100%" height={160}>
          <AreaChart data={priceData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="priceGradAn" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={isUp ? '#4ade80' : '#f87171'} stopOpacity={0.2} />
                <stop offset="95%" stopColor={isUp ? '#4ade80' : '#f87171'} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="t" hide />
            <YAxis domain={['auto', 'auto']} hide width={0} />
            <Tooltip content={<Tip />} />
            <Area type="monotone" dataKey="price" stroke={isUp ? '#4ade80' : '#f87171'} strokeWidth={1.5} fill="url(#priceGradAn)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Volume */}
        <div className="border border-border rounded-xl bg-surface p-5">
          <h3 className="text-xs font-medium text-textMuted uppercase tracking-wider mb-4">Volume (Hourly)</h3>
          {volCandles.length === 0 ? (
            <div className="h-32 flex items-center justify-center text-textDim text-[11px]">Accumulating volume data...</div>
          ) : (
            <ResponsiveContainer width="100%" height={130}>
              <BarChart data={volCandles} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="ts" tick={{ fill: '#555', fontSize: 9 }} />
                <YAxis hide />
                <Tooltip content={<Tip />} />
                <Bar dataKey="volume" fill="rgba(255,255,255,0.3)" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Slippage */}
        <div className="border border-border rounded-xl bg-surface p-5">
          <h3 className="text-xs font-medium text-textMuted uppercase tracking-wider mb-1">Slippage Curve</h3>
          <p className="text-[10px] text-textDim mb-4">Price impact vs trade size</p>
          <ResponsiveContainer width="100%" height={130}>
            <AreaChart data={slipCurve} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="slipGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#ffffff" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#ffffff" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="amountIn" hide />
              <YAxis hide />
              <Tooltip content={<Tip />} />
              <Area type="monotone" dataKey="slippageBps" stroke="rgba(255,255,255,0.6)" strokeWidth={1.5} fill="url(#slipGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Arbitrage */}
        <div className="border border-border rounded-xl bg-surface p-5">
          <h3 className="text-xs font-medium text-textMuted uppercase tracking-wider mb-4">Arbitrage Detector</h3>
          {arbitrage ? (
            <div className="space-y-2.5">
              <div className={`rounded-lg p-3 border ${arbitrage.opportunity ? 'bg-success/5 border-success/20' : 'bg-surfaceElevated border-border'}`}>
                <div className="flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full ${arbitrage.opportunity ? 'bg-success' : 'bg-textDim'}`} />
                  <span className={`text-xs font-medium ${arbitrage.opportunity ? 'text-success' : 'text-textMuted'}`}>
                    {arbitrage.opportunity ? 'Opportunity detected' : 'No opportunity'}
                  </span>
                </div>
                {arbitrage.opportunity && (
                  <p className="text-[10px] text-textMuted mt-1">
                    {arbitrage.direction === 'buy_on_amm' ? 'Buy AMM, sell CEX' : 'Sell AMM, buy CEX'} | ~{arbitrage.estimatedProfitBps} bps
                  </p>
                )}
              </div>
              <div className="space-y-1 text-[11px]">
                <ARow label="AMM Price" value={parseFloat(arbitrage.ammPrice).toFixed(6)} />
                <ARow label="CEX Price" value={`${parseFloat(arbitrage.cexPrice).toFixed(2)} (${arbitrage.source})`} />
                <ARow label="Spread" value={`${arbitrage.spreadBps} bps`} />
                <ARow label="Fee Threshold" value={`${arbitrage.feeBps} bps`} />
                {arbitrage.opportunity && <ARow label="Optimal Size" value={`${parseFloat(arbitrage.optimalTradeSize).toFixed(2)}`} green />}
              </div>
            </div>
          ) : (
            <div className="h-28 shimmer rounded-lg" />
          )}
        </div>

        {/* Tx breakdown */}
        <div className="border border-border rounded-xl bg-surface p-5">
          <h3 className="text-xs font-medium text-textMuted uppercase tracking-wider mb-4">Transactions</h3>
          <div className="space-y-3">
            {[
              { label: 'Swaps',     value: s.totalSwaps || 0 },
              { label: 'Add Liq.',  value: stats?.stats?.totalAddLiquidity || 0 },
              { label: 'Remove',    value: stats?.stats?.totalRemoveLiquidity || 0 },
            ].map(({ label, value }) => {
              const t = (s.totalTransactions || 1);
              const pct = t > 0 ? (value / t * 100).toFixed(0) : 0;
              return (
                <div key={label}>
                  <div className="flex justify-between text-[10px] text-textMuted mb-1">
                    <span>{label}</span>
                    <span className="font-mono text-white">{value} ({pct}%)</span>
                  </div>
                  <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-white/30 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 pt-3 border-t border-border">
            <p className="text-[10px] text-textDim uppercase tracking-wider mb-2">Recent</p>
            <div className="space-y-1">
              {transactions.slice(0, 5).map(tx => (
                <div key={tx.id} className="flex items-center justify-between text-[10px]">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-1 h-1 rounded-full ${tx.type === 'swap' ? 'bg-white/50' : tx.type === 'add_liquidity' ? 'bg-success/50' : 'bg-danger/50'}`} />
                    <span className="text-textMuted capitalize">{tx.type.replace('_', ' ')}</span>
                  </div>
                  <span className="text-textDim font-mono">{new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ARow({ label, value, green }) {
  return (
    <div className="flex justify-between">
      <span className="text-textMuted">{label}</span>
      <span className={`font-mono ${green ? 'text-success' : 'text-white'}`}>{value}</span>
    </div>
  );
}
