export function StatsBar({ reserves, stats }) {
  const rA = parseFloat(reserves?.reserveA || 0);
  const rB = parseFloat(reserves?.reserveB || 0);
  const price = rA > 0 ? (rB / rA).toFixed(6) : '—';
  const volume = parseFloat(stats?.stats?.totalVolume || 0);
  const totalSupply = parseFloat(stats?.totalSupply || 0);

  const format = (n) => {
    if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
    if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
    if (n >= 1e3) return `${(n / 1e3).toFixed(2)}K`;
    return n.toFixed(2);
  };

  const items = [
    { label: 'Price (A/B)', value: price, mono: true },
    { label: 'Reserve A', value: format(rA) },
    { label: 'Reserve B', value: format(rB) },
    { label: '24h Volume', value: format(volume) },
    { label: 'LP Supply', value: format(totalSupply) },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
      {items.map(({ label, value, mono }) => (
        <div
          key={label}
          className="rounded-xl bg-surface border border-border px-4 py-3"
        >
          <p className="text-xs text-textMuted mb-0.5">{label}</p>
          <p className={`font-semibold text-text ${mono ? 'font-mono' : ''}`}>{value}</p>
        </div>
      ))}
    </div>
  );
}
