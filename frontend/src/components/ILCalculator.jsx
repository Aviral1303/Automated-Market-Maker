import { useState, useEffect } from 'react';
import { getIL } from '../api';

export function ILCalculator({ currentPrice }) {
  const [ratio, setRatio] = useState('1');
  const [il, setIl] = useState(null);

  useEffect(() => {
    const r = parseFloat(ratio);
    if (isNaN(r) || r <= 0) {
      setIl(null);
      return;
    }
    getIL(Math.min(10, Math.max(0.1, r))).then((res) => {
      if (res.data.success) setIl(res.data.data.impermanentLossPercent);
    });
  }, [ratio]);

  return (
    <div className="mt-3 pt-3 border-t border-border">
      <p className="text-xs text-textMuted mb-2">Calculate IL for price change</p>
      <div className="flex gap-2 items-center">
        <input
          type="number"
          value={ratio}
          onChange={(e) => setRatio(e.target.value)}
          placeholder="1.0"
          step="0.1"
          min="0.1"
          max="10"
          className="flex-1 px-3 py-2 rounded-lg bg-surface border border-border text-text font-mono text-sm focus:outline-none focus:border-primary/50"
        />
        <span className="text-textMuted text-sm">× current</span>
      </div>
      {il !== null && (
        <p className="mt-2 text-sm">
          <span className="text-textMuted">IL: </span>
          <span className={il < 0 ? 'text-danger font-medium' : 'text-text'}>
            {il.toFixed(2)}%
          </span>
        </p>
      )}
    </div>
  );
}
