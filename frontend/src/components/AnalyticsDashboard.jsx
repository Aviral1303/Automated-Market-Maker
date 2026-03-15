import { useState, useEffect } from 'react';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine
} from 'recharts';
import { getAnalytics, getArbitrage, getSlippageCurve } from '../api';

const CustomTooltip = ({ active, payload, label, prefix = '', suffix = '' }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface border border-border rounded-xl p-3 shadow-xl text-xs">
      <p className="text-textMuted mb-1">{typeof label === 'number' ? new Date(label).toLocaleTimeString() : label}</p>
      {payload.map((p, i) => (
        <p key={i} className="font-mono font-semibold" style={{ color: p.color }}>
          {prefix}{typeof p.value === 'number' ? p.value.toLocaleString(undefined, { maximumFractionDigits: 4 }) : p.value}{suffix}
        </p>
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
    count:  c.count,
  }));

  const s = stats?.stats || {};

  return (
    <div className="space-y-6">
      {/* Top stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <BigStat label="TVL" value={parseFloat(s.tvl || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })} sub="pool tokens" color="text-primary" />
        <BigStat label="Total Volume" value={parseFloat(s.totalVolume || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })} sub="all time" color="text-text" />
        <BigStat label="Total Fees" value={parseFloat(s.totalFees || 0).toFixed(2)} sub="earned by LPs" color="text-success" />
        <BigStat label="Fee APR" value={s.feeAPR ? `${s.feeAPR}%` : '—'} sub="annualised" color="text-gold" />
      </div>

      {/* Price chart */}
      <div className="glass rounded-2xl shadow-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-text">{tokens.A.symbol}/{tokens.B.symbol} Price History</h3>
            <div className="flex items-center gap-2 mt-1">
              {last > 0 && <span className="text-xl font-mono font-semibold text-text">{last.toFixed(6)}</span>}
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isUp ? 'bg-success/15 text-success' : 'bg-danger/15 text-danger'}`}>
                {isUp ? '+' : ''}{pct}%
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-textMuted">
            <span className="w-2 h-2 rounded-full bg-primary live-dot" />
            Live
          </div>
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={priceData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="priceGradAn" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={isUp ? '#10b981' : '#ef4444'} stopOpacity={0.3} />
                <stop offset="95%" stopColor={isUp ? '#10b981' : '#ef4444'} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="t" hide />
            <YAxis domain={['auto', 'auto']} hide width={0} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="price" stroke={isUp ? '#10b981' : '#ef4444'} strokeWidth={2} fill="url(#priceGradAn)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Volume candles */}
        <div className="glass rounded-2xl shadow-card p-5">
          <h3 className="text-sm font-semibold text-text mb-4">Volume (Hourly)</h3>
          {volCandles.length === 0 ? (
            <div className="h-36 flex items-center justify-center text-textMuted text-xs">Accumulating volume data…</div>
          ) : (
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={volCandles} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="ts" tick={{ fill: '#64748b', fontSize: 9 }} />
                <YAxis hide />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="volume" fill="#14b8a6" opacity={0.8} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Slippage curve */}
        <div className="glass rounded-2xl shadow-card p-5">
          <h3 className="text-sm font-semibold text-text mb-1">Slippage Curve</h3>
          <p className="text-xs text-textMuted mb-4">Price impact vs trade size (% of pool)</p>
          <ResponsiveContainer width="100%" height={150}>
            <AreaChart data={slipCurve} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="slipGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="amountIn" hide />
              <YAxis hide />
              <Tooltip content={<CustomTooltip suffix=" bps" />} formatter={v => [v, 'Slippage']} />
              <Area type="monotone" dataKey="slippageBps" stroke="#6366f1" strokeWidth={2} fill="url(#slipGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Arbitrage detector */}
        <div className="glass rounded-2xl shadow-card p-5">
          <h3 className="text-sm font-semibold text-text mb-4">Arbitrage Detector</h3>
          {arbitrage ? (
            <div className="space-y-2.5">
              <div className={`rounded-xl p-3 border ${arbitrage.opportunity ? 'bg-success/10 border-success/30' : 'bg-surfaceElevated border-border'}`}>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${arbitrage.opportunity ? 'bg-success' : 'bg-textMuted'}`} />
                  <span className={`text-sm font-semibold ${arbitrage.opportunity ? 'text-success' : 'text-textMuted'}`}>
                    {arbitrage.opportunity ? 'Arb Opportunity Detected' : 'No Opportunity'}
                  </span>
                </div>
                {arbitrage.opportunity && (
                  <p className="text-xs text-textMuted mt-1.5">
                    {arbitrage.direction === 'buy_on_amm' ? 'Buy on AMM, sell on CEX' : 'Sell on AMM, buy on CEX'} · Est. {arbitrage.estimatedProfitBps} bps profit
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <ArbRow label="AMM Price" value={parseFloat(arbitrage.ammPrice).toFixed(6)} />
                <ArbRow label="CEX Price" value={parseFloat(arbitrage.cexPrice).toFixed(2)} extra={`(${arbitrage.source})`} />
                <ArbRow label="Spread" value={`${arbitrage.spreadBps} bps`} />
                <ArbRow label="Fee Threshold" value={`${arbitrage.feeBps} bps`} />
                {arbitrage.opportunity && <ArbRow label="Optimal Trade Size" value={`${parseFloat(arbitrage.optimalTradeSize).toFixed(2)} units`} green />}
              </div>
            </div>
          ) : (
            <div className="h-32 shimmer rounded-xl" />
          )}
        </div>

        {/* Transaction breakdown */}
        <div className="glass rounded-2xl shadow-card p-5">
          <h3 className="text-sm font-semibold text-text mb-4">Transaction Breakdown</h3>
          <div className="space-y-3">
            {[
              { label: 'Swaps',            value: s.totalSwaps || 0,         color: 'bg-primary' },
              { label: 'Add Liquidity',    value: stats?.stats?.totalAddLiquidity    || 0, color: 'bg-accent' },
              { label: 'Remove Liquidity', value: stats?.stats?.totalRemoveLiquidity || 0, color: 'bg-danger' },
            ].map(({ label, value, color }) => {
              const total = (s.totalTransactions || 1);
              const pct = total > 0 ? (value / total * 100).toFixed(0) : 0;
              return (
                <div key={label}>
                  <div className="flex justify-between text-xs text-textMuted mb-1">
                    <span>{label}</span>
                    <span className="font-mono text-text">{value} ({pct}%)</span>
                  </div>
                  <div className="h-1.5 bg-surfaceElevated rounded-full overflow-hidden">
                    <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-xs text-textMuted mb-2">Recent Activity</p>
            <div className="space-y-1">
              {transactions.slice(0, 5).map(tx => (
                <div key={tx.id} className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${tx.type === 'swap' ? 'bg-primary' : tx.type === 'add_liquidity' ? 'bg-success' : 'bg-danger'}`} />
                    <span className="text-textMuted capitalize">{tx.type.replace('_', ' ')}</span>
                  </div>
                  <span className="text-textDim">{new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BigStat({ label, value, sub, color }) {
  return (
    <div className="glass rounded-2xl shadow-card p-5">
      <p className="text-xs text-textMuted uppercase tracking-wider mb-2">{label}</p>
      <p className={`text-2xl font-mono font-bold ${color}`}>{value}</p>
      <p className="text-[10px] text-textDim mt-1">{sub}</p>
    </div>
  );
}

function ArbRow({ label, value, extra, green }) {
  return (
    <div className="flex justify-between text-xs">
      <span className="text-textMuted">{label}</span>
      <span className={`font-mono ${green ? 'text-success font-semibold' : 'text-text'}`}>
        {value} {extra && <span className="text-textDim">{extra}</span>}
      </span>
    </div>
  );
}
