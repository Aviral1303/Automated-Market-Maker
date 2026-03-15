import { useState, useEffect } from 'react';
import { WalletButton } from './WalletButton';
import { getMarketPrice } from '../api';

export function Header({ wsStatus }) {
  const [ethPrice, setEthPrice] = useState(null);
  const [gasGwei,  setGasGwei]  = useState(null);

  useEffect(() => {
    const fetch = async () => {
      try {
        const r = await getMarketPrice('ETH/USDT');
        if (r.data.success) setEthPrice(r.data.data.price);
      } catch {}
      // Simulated gas (real apps use eth_gasPrice RPC)
      setGasGwei((Math.random() * 8 + 12).toFixed(1));
    };
    fetch();
    const id = setInterval(fetch, 30_000);
    return () => clearInterval(id);
  }, []);

  const wsColors = {
    live:       'bg-success',
    connecting: 'bg-warning',
    offline:    'bg-danger',
  };
  const wsLabel = { live: 'Live', connecting: 'Connecting…', offline: 'Reconnecting' };

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-bg/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        {/* Logo */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-primary flex items-center justify-center">
            <span className="text-white font-bold text-sm">Q</span>
          </div>
          <div>
            <h1 className="font-display font-bold text-base text-text leading-none">QuantAMM</h1>
            <p className="text-[10px] text-textMuted leading-none mt-0.5">x·y = k · 0.3% fee</p>
          </div>
        </div>

        {/* Center: live data chips */}
        <div className="hidden md:flex items-center gap-2">
          {/* Network */}
          <Chip>
            <span className="w-2 h-2 rounded-full bg-yellow-400 live-dot" />
            <span className="text-yellow-400 font-medium">Sepolia</span>
          </Chip>

          {/* ETH price */}
          {ethPrice && (
            <Chip>
              <span className="text-textMuted">ETH</span>
              <span className="text-text font-mono font-medium">
                ${ethPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
            </Chip>
          )}

          {/* Gas */}
          {gasGwei && (
            <Chip>
              <svg className="w-3 h-3 text-warning" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 2a1 1 0 00-1 1v1.323l-3.954 1.582A1 1 0 004 6.82v8.18a2 2 0 002 2h8a2 2 0 002-2V6.82a1 1 0 00-1.046-.915L11 4.323V3a1 1 0 00-1-1z" />
              </svg>
              <span className="text-text font-mono text-xs">{gasGwei} gwei</span>
            </Chip>
          )}

          {/* WS status */}
          <Chip>
            <span className={`w-1.5 h-1.5 rounded-full ${wsColors[wsStatus] || 'bg-textMuted'} live-dot`} />
            <span className="text-xs text-textMuted">{wsLabel[wsStatus] || 'Unknown'}</span>
          </Chip>
        </div>

        <WalletButton />
      </div>
    </header>
  );
}

function Chip({ children }) {
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-surface border border-border text-xs">
      {children}
    </div>
  );
}
