const POOLS = [
  { id: 'TKA/TKB',  label: 'TKA / TKB',  fee: '0.30%' },
  { id: 'TKA/USDC', label: 'TKA / USDC', fee: '0.30%' },
];

export function PoolSelector({ activePool, onSelect, liveData }) {
  return (
    <div className="flex items-center gap-2">
      {POOLS.map(pool => {
        const live = liveData?.[pool.id];
        const active = activePool === pool.id;
        return (
          <button
            key={pool.id}
            onClick={() => onSelect(pool.id)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
              active
                ? 'bg-white text-black font-semibold'
                : 'border border-border text-textMuted hover:text-white hover:border-white/15'
            }`}
          >
            <div className="flex -space-x-1">
              <TokenAvatar symbol={pool.id.split('/')[0]} size="sm" />
              <TokenAvatar symbol={pool.id.split('/')[1]} size="sm" />
            </div>
            <span>{pool.label}</span>
            {live?.price && (
              <span className={`text-[10px] font-mono ${active ? 'text-black/60' : 'text-textDim'}`}>
                {parseFloat(live.price).toFixed(4)}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function TokenAvatar({ symbol, size = 'md' }) {
  const sizeClass = size === 'sm' ? 'w-5 h-5 text-[8px]' : 'w-7 h-7 text-xs';
  return (
    <div className={`${sizeClass} rounded-full bg-white/10 border border-white/20 flex items-center justify-center font-semibold text-white`}>
      {symbol?.[0]}
    </div>
  );
}
