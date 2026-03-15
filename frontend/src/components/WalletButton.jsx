import { useWallet } from '../hooks/useWallet';
import { useOnChainAMM } from '../hooks/useOnChainAMM';

export function WalletButton() {
  const { address, isConnected, isConnecting, connect, disconnect, error } = useWallet();
  const { isOnChain, wrongNetwork, networkName, switchToSepolia } = useOnChainAMM();

  const short = (addr) => addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : '';

  if (typeof window === 'undefined' || !window.ethereum) {
    return (
      <a
        href="https://metamask.io"
        target="_blank"
        rel="noopener noreferrer"
        className="px-4 py-2 rounded-xl text-sm font-medium glass border border-border text-textMuted hover:text-primary hover:border-primary/40 transition-all"
      >
        Install MetaMask
      </a>
    );
  }

  if (wrongNetwork && isConnected) {
    return (
      <button
        onClick={switchToSepolia}
        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-warning/15 text-warning border border-warning/30 hover:bg-warning/25 transition-all"
      >
        <span className="w-2 h-2 rounded-full bg-warning" />
        Wrong Network — Switch to Sepolia
      </button>
    );
  }

  if (isConnected) {
    return (
      <div className="flex items-center gap-2">
        {/* Network badge */}
        {networkName && (
          <div className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border ${
            isOnChain
              ? 'bg-success/10 border-success/20 text-success'
              : 'bg-surface border-border text-textMuted'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isOnChain ? 'bg-success' : 'bg-textMuted'} live-dot`} />
            <span className="font-medium">{networkName}</span>
            {isOnChain && <span className="text-[10px] opacity-70">On-chain</span>}
          </div>
        )}

        {/* Address badge */}
        <div className="flex items-center gap-1 px-3 py-2 rounded-xl bg-primaryGlow border border-borderActive">
          <span className="w-2 h-2 rounded-full bg-success" />
          <span className="text-primary font-mono text-sm font-semibold">{short(address)}</span>
        </div>

        <button
          onClick={disconnect}
          className="px-3 py-2 rounded-xl text-xs text-textMuted hover:text-danger hover:bg-danger/10 border border-border hover:border-danger/30 transition-all"
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
        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-gradient-primary text-white shadow-glow hover:opacity-90 disabled:opacity-60 transition-all active:scale-[0.98]"
      >
        {isConnecting ? (
          <>
            <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Connecting…
          </>
        ) : (
          <>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Connect Wallet
          </>
        )}
      </button>
      {error && <span className="text-[10px] text-danger">{error}</span>}
    </div>
  );
}
