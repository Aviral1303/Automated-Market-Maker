import { useWallet } from '../hooks/useWallet';

export function WalletButton() {
  const { address, isConnected, isConnecting, connect, disconnect, error } = useWallet();

  const shortAddress = (addr) =>
    addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : '';

  if (typeof window === 'undefined' || !window.ethereum) {
    return (
      <a
        href="https://metamask.io"
        target="_blank"
        rel="noopener noreferrer"
        className="px-4 py-2 rounded-xl text-sm font-medium bg-surface border border-border hover:border-primary/50 text-textMuted hover:text-primary transition-colors"
      >
        Install MetaMask
      </a>
    );
  }

  if (isConnected) {
    return (
      <div className="flex items-center gap-2">
        <span className="px-3 py-1.5 rounded-lg bg-primary/20 text-primary text-sm font-mono">
          {shortAddress(address)}
        </span>
        <button
          onClick={disconnect}
          className="px-3 py-1.5 rounded-lg text-sm text-textMuted hover:text-text hover:bg-white/5 transition-colors"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={connect}
        disabled={isConnecting}
        className="px-4 py-2 rounded-xl text-sm font-medium bg-primary hover:bg-primaryHover disabled:opacity-60 text-bg transition-colors"
      >
        {isConnecting ? 'Connecting…' : 'Connect Wallet'}
      </button>
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  );
}
