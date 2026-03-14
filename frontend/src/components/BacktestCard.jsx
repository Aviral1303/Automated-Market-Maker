import { useState, useEffect } from 'react';
import { getBacktest } from '../api';

export function BacktestCard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hours, setHours] = useState(24);

  const runBacktest = async () => {
    setLoading(true);
    try {
      const res = await getBacktest(hours);
      if (res.data.success) setData(res.data.data);
    } catch (e) {
      setData({ error: e.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl bg-surface border border-border p-5">
      <h3 className="text-sm font-semibold text-text mb-4">Historical backtest</h3>
      <p className="text-xs text-textMuted mb-3">
        Simulate LP returns over ETH price history
      </p>
      <div className="flex gap-2 mb-4">
        <select
          value={hours}
          onChange={(e) => setHours(Number(e.target.value))}
          className="px-3 py-2 rounded-lg bg-surface border border-border text-text text-sm focus:outline-none focus:border-primary/50"
        >
          <option value={24}>24 hours</option>
          <option value={48}>48 hours</option>
          <option value={168}>7 days</option>
        </select>
        <button
          onClick={runBacktest}
          disabled={loading}
          className="px-4 py-2 rounded-lg bg-primary hover:bg-primaryHover disabled:opacity-60 text-bg text-sm font-medium"
        >
          {loading ? 'Running…' : 'Run'}
        </button>
      </div>
      {data?.error && (
        <p className="text-sm text-textMuted">{data.error}</p>
      )}
      {data?.summary && (
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-textMuted">Periods</span>
            <span className="font-mono">{data.summary.periods}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-textMuted">Total fees</span>
            <span className="font-mono text-primary">{parseFloat(data.summary.totalFees).toFixed(4)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-textMuted">IL</span>
            <span className="font-mono text-danger">{data.summary.impermanentLossPercent}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-textMuted">Final value</span>
            <span className="font-mono">{data.summary.finalValue}</span>
          </div>
        </div>
      )}
    </div>
  );
}
