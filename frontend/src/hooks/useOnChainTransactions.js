/**
 * useOnChainTransactions
 *
 * Fetches Swap events from the AMM contract on Sepolia.
 * This shows REAL on-chain swaps — unlike the backend which only has simulated swaps.
 */
import { useState, useEffect, useCallback } from 'react';

const AMM_ABI = [
  'function tokenA() view returns (address)',
  'function tokenB() view returns (address)',
  'event Swap(address indexed sender, address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 amountOut, uint256 priceImpactBps, address to)',
];

const POOL_ADDRESSES = {
  'TKA/TKB':  '0xB138d15Dd1f372C9736af9Df885D40450f8F072d',
  'TKA/USDC': '0xcE1D80bf144ff848F05B25C753C981aBFC8c4B9b',
};

const SEPOLIA_RPCS = [
  'https://ethereum-sepolia-rpc.publicnode.com',
  'https://sepolia.drpc.org',
  'https://1rpc.io/sepolia',
  'https://rpc.sepolia.org',
];

let ethersLib = null;
async function getEthers() {
  if (!ethersLib) ethersLib = await import('ethers');
  return ethersLib;
}

export function useOnChainTransactions(poolId, limit = 30) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isLive, setIsLive] = useState(false);

  const fetchTransactions = useCallback(async () => {
    const addr = POOL_ADDRESSES[poolId];
    if (!addr) return;

    try {
      const { JsonRpcProvider, Contract, formatEther } = await getEthers();

      let provider = null;
      for (const rpc of SEPOLIA_RPCS) {
        try {
          const p = new JsonRpcProvider(rpc);
          await Promise.race([p.getBlockNumber(), new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 5000))]);
          provider = p;
          break;
        } catch {}
      }
      if (!provider) throw new Error('Sepolia RPC unavailable');

      const amm = new Contract(addr, AMM_ABI, provider);
      const tokenAAddr = await amm.tokenA();
      const tokenBAddr = await amm.tokenB();

      // Fetch last ~10000 blocks (~28 hours on Sepolia) of Swap events
      const currentBlock = await provider.getBlockNumber();
      const fromBlock = Math.max(0, currentBlock - 10000);

      const filter = amm.filters.Swap();
      const events = await amm.queryFilter(filter, fromBlock, currentBlock);

      // Sort by block (newest first), take limit
      const sorted = events
        .sort((a, b) => (b.blockNumber - a.blockNumber))
        .slice(0, limit);

      const txs = await Promise.all(
        sorted.map(async (e) => {
          const args = e.args;
          const block = await provider.getBlock(e.blockNumber);
          const tokenInAddr = args.tokenIn;
          const isAtoB = tokenInAddr.toLowerCase() === tokenAAddr.toLowerCase();

          return {
            id: `chain-${e.transactionHash}-${e.logIndex}`,
            type: 'swap',
            poolId,
            tokenIn: isAtoB ? 'A' : 'B',
            amountIn: formatEther(args.amountIn),
            tokenOut: isAtoB ? 'B' : 'A',
            amountOut: formatEther(args.amountOut),
            timestamp: block?.timestamp ? new Date(block.timestamp * 1000).toISOString() : new Date().toISOString(),
            txHash: e.transactionHash,
            blockNumber: e.blockNumber,
          };
        })
      );

      setTransactions(txs);
      setIsLive(true);
      setError(null);
    } catch (e) {
      setError(e.message);
      setIsLive(false);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, [poolId, limit]);

  useEffect(() => {
    setLoading(true);
    setIsLive(false);
    fetchTransactions();
    const id = setInterval(fetchTransactions, 15_000); // refresh every 15s
    return () => clearInterval(id);
  }, [fetchTransactions]);

  return { transactions, loading, error, isLive, refetch: fetchTransactions };
}
