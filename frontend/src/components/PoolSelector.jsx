const POOLS = [
  { id: 'TKA/TKB',  label: 'TKA/TKB',  desc: 'Token Alpha · Token Beta',      fee: '0.30%' },
  { id: 'TKA/USDC', label: 'TKA/USDC', desc: 'Token Alpha · USD Coin (Sim)',   fee: '0.30%' },
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
            className={`flex items-center gap-2.5 px-3.5 py-2 rounded-xl border text-sm font-medium transition-all duration-200 ${
              active
                ? 'border-borderActive bg-primaryGlow text-primary shadow-glow'
                : 'border-border bg-surface text-textMuted hover:text-text hover:border-white/15'
            }`}
          >
            {/* Token pair avatars */}
            <div className="flex -space-x-1.5">
              <TokenAvatar symbol={pool.id.split('/')[0]} size="sm" />
              <TokenAvatar symbol={pool.id.split('/')[1]} size="sm" />
            </div>
            <div className="text-left">
              <span className={`block text-xs font-semibold ${active ? 'text-primary' : 'text-text'}`}>{pool.label}</span>
              {live?.price && (
                <span className="block text-[10px] text-textMuted font-mono">
                  {parseFloat(live.price).toFixed(4)}
                </span>
              )}
            </div>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${active ? 'bg-primary/20 text-primary' : 'bg-surfaceHover text-textMuted'}`}>
              {pool.fee}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// Reusable token avatar
export function TokenAvatar({ symbol, size = 'md' }) {
  const colors = {
    TKA:  'from-primary to-accent',
    TKB:  'from-accent to-purple-500',
    USDC: 'from-blue-500 to-blue-400',
  };
  const sizeClass = size === 'sm' ? 'w-5 h-5 text-[8px]' : 'w-7 h-7 text-xs';
  const grad = colors[symbol] || 'from-textMuted to-textDim';

  return (
    <div className={`${sizeClass} rounded-full bg-gradient-to-br ${grad} flex items-center justify-center font-bold text-white ring-2 ring-bg`}>
      {symbol?.[0]}
    </div>
  );
}
