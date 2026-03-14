import { useState } from 'react';
import { simulateMEV } from '../api';

export function MEVSimulator() {
  const [amount, setAmount] = useState('1000');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const runSimulation = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await simulateMEV(parseFloat(amount) || 1000, 'A');
      if (res.data.success) setResult(res.data.data);
    } catch (e) {
      setResult({ error: e.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl bg-surface border border-border p-5">
      <h3 className="text-sm font-semibold text-text mb-2">MEV / Sandwich simulation</h3>
      <p className="text-xs text-textMuted mb-3">
        Simulate front-run → victim → back-run
      </p>
      <div className="flex gap-2 mb-3">
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Victim swap size"
          className="flex-1 px-3 py-2 rounded-lg bg-surface border border-border text-text font-mono text-sm"
        />
        <button
          onClick={runSimulation}
          disabled={loading}
          className="px-4 py-2 rounded-lg bg-danger/20 text-danger hover:bg-danger/30 text-sm font-medium disabled:opacity-60"
        >
          {loading ? '…' : 'Simulate'}
        </button>
      </div>
      {result?.mevProfit != null && (
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-textMuted">MEV profit</span>
            <span className="font-mono text-danger">{result.mevProfit.toFixed(4)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-textMuted">Profit (bps)</span>
            <span className="font-mono">{result.mevProfitBps} bps</span>
          </div>
        </div>
      )}
      {result?.error && (
        <p className="text-sm text-danger">{result.error}</p>
      )}
    </div>
  );
}
