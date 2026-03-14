import { useState, useEffect } from 'react';
import { ArrowTrendingUpIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { getMarketPrice, getArbitrage } from '../api';

const PAIR = 'ETH/USDT';

export function MarketArbitrageCard({ reserves }) {
  const [marketPrice, setMarketPrice] = useState(null);
  const [arbitrage, setArbitrage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      try {
        setError(null);
        const [priceRes, arbRes] = await Promise.all([
          getMarketPrice(PAIR),
          getArbitrage(PAIR),
        ]);
        if (cancelled) return;
        if (priceRes.data.success) setMarketPrice(priceRes.data.data);
        if (arbRes.data.success) setArbitrage(arbRes.data.data);
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  if (loading && !arbitrage) {
    return (
      <div className="rounded-2xl bg-surface border border-border p-5 animate-pulse">
        <div className="h-4 bg-border rounded w-1/3 mb-4" />
        <div className="h-20 bg-border rounded" />
      </div>
    );
  }

  if (error && !arbitrage) {
    return (
      <div className="rounded-2xl bg-surface border border-border p-5">
        <h3 className="text-sm font-semibold text-text mb-2">Market data</h3>
        <p className="text-sm text-textMuted">Unable to fetch CEX prices. Check network.</p>
      </div>
    );
  }

  const rA = parseFloat(reserves?.reserveA || 0);
  const rB = parseFloat(reserves?.reserveB || 0);
  const ammPrice = rA > 0 ? rB / rA : null;

  return (
    <div className="rounded-2xl bg-surface border border-border p-5">
      <h3 className="text-sm font-semibold text-text mb-4 flex items-center gap-2">
        <ArrowTrendingUpIcon className="w-4 h-4 text-primary" />
        AMM vs CEX ({PAIR})
      </h3>

      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-textMuted text-sm">AMM price</span>
          <span className="font-mono font-medium text-text">
            {ammPrice != null ? ammPrice.toFixed(4) : '—'}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-textMuted text-sm">CEX price</span>
          <span className="font-mono font-medium text-text">
            {marketPrice?.price != null ? marketPrice.price.toFixed(4) : '—'}
          </span>
        </div>
        <div className="flex justify-between items-center text-xs text-textMuted">
          <span>Source</span>
          <span className="capitalize">{marketPrice?.source || '—'}</span>
        </div>

        {arbitrage && (
          <>
            <div className="border-t border-border my-3" />
            <div className="flex justify-between items-center">
              <span className="text-textMuted text-sm">Spread</span>
              <span className="font-mono font-medium">
                {arbitrage.spreadBps} bps
              </span>
            </div>

            {arbitrage.opportunity ? (
              <div className="mt-3 p-3 rounded-xl bg-success/15 border border-success/30">
                <div className="flex items-center gap-2 text-success font-medium text-sm">
                  <ExclamationTriangleIcon className="w-4 h-4" />
                  Arbitrage opportunity
                </div>
                <p className="text-xs text-textMuted mt-1">
                  {arbitrage.direction === 'sell_on_amm'
                    ? 'Sell Token A on AMM (price higher than CEX)'
                    : 'Buy Token A on AMM (price lower than CEX)'}
                </p>
                <p className="text-xs text-success mt-0.5 font-mono">
                  Est. profit: ~{arbitrage.estimatedProfitBps} bps after fees
                </p>
              </div>
            ) : (
              <p className="text-xs text-textMuted mt-2">
                No arbitrage (spread &lt; 30 bps fee)
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
