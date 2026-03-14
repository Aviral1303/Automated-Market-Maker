import { ChartBarIcon } from '@heroicons/react/24/outline';

export function AnalyticsCard({ transactions, stats }) {
  const format = (n) =>
    new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(parseFloat(n) || 0);

  return (
    <div className="space-y-6">
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatBox label="Total swaps" value={stats.stats?.totalSwaps ?? 0} />
          <StatBox label="Total volume" value={format(stats.stats?.totalVolume)} />
          <StatBox label="Liquidity events" value={(stats.stats?.totalAddLiquidity ?? 0) + (stats.stats?.totalRemoveLiquidity ?? 0)} />
          <StatBox label="LP supply" value={format(stats.totalSupply)} />
        </div>
      )}

      <div>
        <h3 className="text-sm font-semibold text-text mb-3 flex items-center gap-2">
          <ChartBarIcon className="w-4 h-4 text-primary" />
          Recent activity
        </h3>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {!transactions?.length ? (
            <p className="text-textMuted text-sm py-6 text-center">No transactions yet</p>
          ) : (
            transactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between py-3 px-4 rounded-xl bg-surface border border-border hover:border-border/80"
              >
                <div>
                  <p className={`font-medium text-sm capitalize ${getTypeColor(tx.type)}`}>
                    {tx.type.replace('_', ' ')}
                  </p>
                  <p className="text-xs text-textMuted">
                    {new Date(tx.timestamp).toLocaleString()}
                  </p>
                </div>
                <div className="text-right font-mono text-sm">
                  {tx.type === 'swap' && (
                    <span>
                      {format(tx.amountIn)} {tx.tokenIn} → {format(tx.amountOut)} {tx.tokenOut}
                    </span>
                  )}
                  {tx.type === 'add_liquidity' && (
                    <span className="text-success">
                      +{format(tx.amountA)} A, +{format(tx.amountB)} B
                    </span>
                  )}
                  {tx.type === 'remove_liquidity' && (
                    <span className="text-danger">
                      −{format(tx.amountA)} A, −{format(tx.amountB)} B
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function StatBox({ label, value }) {
  return (
    <div className="rounded-xl bg-surface border border-border px-4 py-3">
      <p className="text-xs text-textMuted mb-0.5">{label}</p>
      <p className="font-semibold text-text">{value}</p>
    </div>
  );
}

function getTypeColor(type) {
  if (type === 'swap') return 'text-primary';
  if (type === 'add_liquidity') return 'text-success';
  return 'text-danger';
}
