import { useState, useEffect } from 'react';
import { claimFaucet } from '../api';
import { useWallet } from '../hooks/useWallet';

const LABEL_MAP = {
  AMM_TKA_TKB:  'AMM Pool (TKA/TKB)',
  AMM_TKA_USDC: 'AMM Pool (TKA/USDC)',
  AMMFactory:   'AMMFactory',
  TokenAlpha:   'Token Alpha (TKA)',
  TokenBeta:    'Token Beta (TKB)',
  USDC:         'USDC (test)',
};

const FALLBACK = {
  network: 'Sepolia Testnet',
  chainId: '11155111',
  contracts: {},
};

const STEPS = [
  { n: 1, title: 'Configure .env', desc: 'Add PRIVATE_KEY and RPC URL' },
  { n: 2, title: 'Fund wallet', desc: 'Get Sepolia ETH from a faucet' },
  { n: 3, title: 'Deploy', desc: 'Run: npm run deploy:sepolia' },
  { n: 4, title: 'Seed liquidity', desc: 'npx hardhat run scripts/seed.js --network sepolia' },
  { n: 5, title: 'Interact', desc: 'Connect MetaMask, swap on-chain' },
];

export function TestnetPanel({ showMessage }) {
  const { address, isConnected, connect } = useWallet();
  const [faucetLoading, setFaucetLoading] = useState(false);
  const [faucetResult,  setFaucetResult]  = useState(null);
  const [copied, setCopied] = useState('');
  const [deployed, setDeployed] = useState(FALLBACK);

  useEffect(() => {
    fetch('/contracts.json')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data?.contracts) return;
        const contracts = {};
        Object.entries(data.contracts).forEach(([key, addr]) => {
          contracts[LABEL_MAP[key] || key] = { address: addr, verified: false };
        });
        setDeployed({
          network: 'Sepolia Testnet',
          chainId: data.chainId || '11155111',
          contracts,
          deployedAt: data.deployedAt,
        });
      })
      .catch(() => {});
  }, []);

  const copyAddress = (addr) => {
    navigator.clipboard.writeText(addr).catch(() => {});
    setCopied(addr);
    setTimeout(() => setCopied(''), 2000);
  };

  const handleFaucet = async () => {
    if (!isConnected) { showMessage('Connect your wallet first', 'error'); return; }
    setFaucetLoading(true);
    try {
      const { data } = await claimFaucet(address);
      if (data.success) {
        setFaucetResult(data.data);
        showMessage('Faucet claimed! 1,000 TKA + 1,000 TKB + 3M USDC');
      }
    } catch (err) {
      showMessage(err.response?.data?.error || 'Faucet error', 'error');
    } finally { setFaucetLoading(false); }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="border border-border rounded-xl bg-surface p-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 live-dot" />
              <span className="text-[10px] font-mono text-yellow-500">{deployed.network}</span>
              <span className="text-[10px] text-textDim font-mono">Chain {deployed.chainId}</span>
            </div>
            <h2 className="font-medium text-sm text-white">Testnet Deployment</h2>
            <p className="text-[10px] text-textDim mt-0.5">
              {deployed.deployedAt
                ? `Deployed ${new Date(deployed.deployedAt).toLocaleDateString()} — live on Sepolia`
                : 'Deploy the AMM to Sepolia for on-chain interactions.'}
            </p>
          </div>
          {!isConnected && (
            <button onClick={connect} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white text-black hover:bg-white/90">
              Connect
            </button>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Contracts */}
        <div className="border border-border rounded-xl bg-surface p-5">
          <h3 className="text-[10px] text-textDim uppercase tracking-widest mb-3">Contracts</h3>
          <div className="space-y-2">
            {Object.keys(deployed.contracts).length === 0 ? (
              <p className="text-[10px] text-textDim">Not deployed yet</p>
            ) : Object.entries(deployed.contracts).map(([name, { address: addr }]) => (
              <div key={name} className="bg-surfaceElevated rounded-lg p-2.5">
                <p className="text-[10px] text-textMuted mb-1">{name}</p>
                <div className="flex items-center gap-1.5">
                  <code className="text-[9px] text-textDim font-mono flex-1 truncate">{addr}</code>
                  {addr.startsWith('0x') && (
                    <>
                      <button
                        onClick={() => copyAddress(addr)}
                        className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-textMuted hover:text-white transition-colors shrink-0"
                      >
                        {copied === addr ? 'Copied' : 'Copy'}
                      </button>
                      <a
                        href={`https://sepolia.etherscan.io/address/${addr}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-textMuted hover:text-white transition-colors shrink-0"
                      >
                        View
                      </a>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Faucet */}
        <div className="border border-border rounded-xl bg-surface p-5">
          <h3 className="text-[10px] text-textDim uppercase tracking-widest mb-2">Token Faucet</h3>
          <p className="text-[10px] text-textDim mb-3">Claim test tokens. 24h cooldown.</p>

          {!isConnected ? (
            <button onClick={connect} className="w-full py-2.5 rounded-lg font-medium text-xs bg-white text-black hover:bg-white/90">
              Connect to Claim
            </button>
          ) : (
            <button
              onClick={handleFaucet}
              disabled={faucetLoading}
              className="w-full py-2.5 rounded-lg text-xs font-medium bg-white/5 text-white border border-border hover:bg-white/10 transition-colors disabled:opacity-50"
            >
              {faucetLoading ? 'Claiming...' : 'Claim Tokens'}
            </button>
          )}

          {faucetResult && (
            <div className="mt-3 rounded-lg bg-success/5 border border-success/15 p-3 space-y-1 animate-slide-up">
              <p className="text-[10px] text-success mb-1">Received</p>
              {Object.entries(faucetResult.tokens || {}).map(([sym, amt]) => (
                <div key={sym} className="flex justify-between text-[10px]">
                  <span className="text-textMuted">{sym}</span>
                  <span className="font-mono text-white">{parseFloat(amt).toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}

          <div className="mt-3 pt-3 border-t border-border">
            <p className="text-[10px] text-textDim mb-1.5">Sepolia ETH faucets:</p>
            <ul className="space-y-0.5 text-[10px] text-textDim">
              <li>sepoliafaucet.com</li>
              <li>cloud.google.com/web3/faucet/ethereum/sepolia</li>
            </ul>
          </div>
        </div>

        {/* Deploy guide */}
        <div className="border border-border rounded-xl bg-surface p-5 lg:col-span-2">
          <h3 className="text-[10px] text-textDim uppercase tracking-widest mb-4">Deploy Guide</h3>
          <div className="grid md:grid-cols-5 gap-3">
            {STEPS.map(({ n, title, desc }) => (
              <div key={n} className="text-center">
                <div className="w-6 h-6 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white font-mono text-[10px] mx-auto mb-2">
                  {n}
                </div>
                <p className="text-[10px] font-medium text-white">{title}</p>
                <p className="text-[9px] text-textDim mt-0.5 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
