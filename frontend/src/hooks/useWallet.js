import { useState, useEffect, useCallback } from 'react';

export function useWallet() {
  const [address, setAddress] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const connect = useCallback(async () => {
    if (typeof window === 'undefined' || !window.ethereum) {
      setError('MetaMask not installed');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const chain = await window.ethereum.request({ method: 'eth_chainId' });
      setAddress(accounts[0] || null);
      setChainId(chain ? parseInt(chain, 16) : null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setAddress(null);
    setChainId(null);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.ethereum) return;
    const handleAccountsChanged = (accounts) => setAddress(accounts[0] || null);
    const handleChainChanged = (chain) => setChainId(chain ? parseInt(chain, 16) : null);
    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);
    window.ethereum.request({ method: 'eth_accounts' }).then((accounts) => {
      if (accounts[0]) setAddress(accounts[0]);
    });
    window.ethereum.request({ method: 'eth_chainId' }).then((chain) => {
      setChainId(chain ? parseInt(chain, 16) : null);
    });
    return () => {
      window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      window.ethereum.removeListener('chainChanged', handleChainChanged);
    };
  }, []);

  return {
    address,
    chainId,
    isConnected: !!address,
    isConnecting: loading,
    connect,
    disconnect,
    error,
  };
}
