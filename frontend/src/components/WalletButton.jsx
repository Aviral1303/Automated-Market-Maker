import { useWallet } from '../hooks/useWallet';
import { useOnChainAMM } from '../hooks/useOnChainAMM';

export function WalletButton() {
  const { address, isConnected, isConnecting, connect, disconnect, error } = useWallet();
  const { isOnChain, wrongNetwork, networkName, switchToSepolia } = useOnChainAMM();

  const short = (addr) => addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : '';

  if (typeof window === 'undefined' || !window.ethereum) {
    return (
      <a
        href="https://metamask.io"
        target="_blank"
        rel="noopener noreferrer"
        className="px-3 py-1.5 rounded-lg text-xs border border-border text-textMuted hover:text-white transition-colors"
      >
        Install MetaMask
      </a>
    );
  }

  if (wrongNetwork && isConnected) {
    return (
      <button
        onClick={switchToSepolia}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border border-yellow-500/30 text-yellow-500 hover:bg-yellow-500/10 transition-colors"
      >
        Switch to Sepolia
      </button>
    );
  }

  if (isConnected) {
    return (
      <div className="flex items-center gap-2">
        {networkName && (
          <span className={`hidden sm:flex items-center gap-1.5 px-2 py-1 rounded text-[10px] border ${
            isOnChain ? 'border-success/20 text-success' : 'border-border text-textMuted'
          }`}>
            <span className={`w-1 h-1 rounded-full ${isOnChain ? 'bg-success' : 'bg-textMuted'}`} />
            {networkName}
          </span>
        )}
        <span className="px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white font-mono text-xs">
          {short(address)}
        </span>
        <button
          onClick={disconnect}
          className="px-2 py-1.5 rounded-lg text-[10px] text-textMuted hover:text-danger border border-border hover:border-danger/30 transition-colors"
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
        className="px-4 py-2 rounded-lg text-xs font-medium bg-white text-black hover:bg-white/90 disabled:opacity-50 transition-all"
      >
        {isConnecting ? 'Connecting...' : 'Connect Wallet'}
      </button>
      {error && <span className="text-[10px] text-danger">{error}</span>}
    </div>
  );
}
