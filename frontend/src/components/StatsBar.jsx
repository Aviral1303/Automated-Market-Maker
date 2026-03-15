export function StatsBar({ reserves, stats, liveData, activePool }) {
  const s  = stats?.stats || {};
  const rA = parseFloat(reserves?.reserveA || 0);
  const rB = parseFloat(reserves?.reserveB || 0);
  const livePool = liveData?.[activePool] || {};

  const fmt = (n) => {
    const v = parseFloat(n) || 0;
    if (v >= 1e9) return `${(v / 1e9).toFixed(2)}B`;
    if (v >= 1e6) return `${(v / 1e6).toFixed(2)}M`;
    if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
    return v.toFixed(2);
  };

  const price = livePool.price
    ? parseFloat(livePool.price).toFixed(6)
    : (rA > 0 ? (rB / rA).toFixed(6) : '—');

  const items = [
    { label: 'Price',   value: price },
    { label: 'Volume',  value: fmt(s.totalVolume) },
    { label: 'Fees',    value: fmt(s.totalFees) },
    { label: 'APR',     value: s.feeAPR ? `${s.feeAPR}%` : '—', green: true },
    { label: 'LP',      value: fmt(stats?.totalSupply) },
    { label: 'Swaps',   value: s.totalSwaps ?? '—' },
  ];

  return (
    <div className="grid grid-cols-3 md:grid-cols-6 gap-px bg-border rounded-lg overflow-hidden mb-5 mt-4">
      {items.map(({ label, value, green }) => (
        <div key={label} className="bg-surface px-3 py-2.5">
          <p className="text-[10px] text-textDim uppercase tracking-widest mb-1">{label}</p>
          <p className={`text-sm font-mono font-medium ${green ? 'text-success' : 'text-white'}`}>
            {value ?? '—'}
          </p>
        </div>
      ))}
    </div>
  );
}
