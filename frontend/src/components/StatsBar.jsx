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
    { label: 'Spot Price',   value: price,                         mono: true, highlight: true },
    { label: 'Total Volume', value: fmt(s.totalVolume),            mono: true },
    { label: 'Total Fees',   value: fmt(s.totalFees),              mono: true },
    { label: 'Fee APR',      value: s.feeAPR ? `${s.feeAPR}%` : '—', mono: true, green: true },
    { label: 'LP Supply',    value: fmt(stats?.totalSupply),        mono: true },
    { label: 'Swap Count',   value: s.totalSwaps ?? '—',            mono: true },
  ];

  return (
    <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-5 pt-4">
      {items.map(({ label, value, mono, highlight, green }) => (
        <div key={label} className="glass rounded-xl px-3 py-2.5 shadow-card">
          <p className="text-[10px] text-textMuted uppercase tracking-wider mb-1 truncate">{label}</p>
          <p className={`text-sm leading-none ${mono ? 'font-mono' : ''} ${highlight ? 'text-primary font-bold' : green ? 'text-success font-semibold' : 'text-text font-semibold'}`}>
            {value ?? '—'}
          </p>
        </div>
      ))}
    </div>
  );
}
