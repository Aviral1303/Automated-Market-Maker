export function PoolComposition({ reserves }) {
  const rA = parseFloat(reserves?.reserveA || 0);
  const rB = parseFloat(reserves?.reserveB || 0);
  const total = rA + rB;
  const pctA = total > 0 ? (rA / total) * 100 : 50;
  const pctB = total > 0 ? (rB / total) * 100 : 50;

  const format = (n) =>
    n >= 1e6 ? `${(n / 1e6).toFixed(2)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(2)}K` : n.toFixed(2);

  return (
    <div className="space-y-3">
      <div className="flex h-3 rounded-full overflow-hidden bg-surfaceElevated">
        <div
          className="bg-primary transition-all duration-500"
          style={{ width: `${pctA}%` }}
        />
        <div
          className="bg-accent transition-all duration-500"
          style={{ width: `${pctB}%` }}
        />
      </div>
      <div className="flex justify-between text-sm">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-primary" />
          <span className="text-textMuted">Token A</span>
          <span className="font-mono font-medium text-text">{format(rA)}</span>
          <span className="text-textMuted">({pctA.toFixed(1)}%)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-accent" />
          <span className="text-textMuted">Token B</span>
          <span className="font-mono font-medium text-text">{format(rB)}</span>
          <span className="text-textMuted">({pctB.toFixed(1)}%)</span>
        </div>
      </div>
    </div>
  );
}
