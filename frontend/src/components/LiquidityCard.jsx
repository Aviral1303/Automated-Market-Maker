import { useState } from 'react';
import { PlusIcon, MinusIcon } from '@heroicons/react/24/outline';
import { addLiquidity, removeLiquidity } from '../api';
import { PoolComposition } from './PoolComposition';

export function LiquidityCard({ onSuccess, loading, setLoading, showMessage, reserves }) {
  const [amountA, setAmountA] = useState('');
  const [amountB, setAmountB] = useState('');
  const [removeAmount, setRemoveAmount] = useState('');

  const rA = parseFloat(reserves?.reserveA || 0);
  const rB = parseFloat(reserves?.reserveB || 0);
  const ratio = rA > 0 ? rB / rA : 1;

  const handleAdd = async () => {
    if (!amountA || !amountB || parseFloat(amountA) <= 0 || parseFloat(amountB) <= 0) {
      showMessage('Enter amounts for both tokens', 'error');
      return;
    }
    setLoading(true);
    try {
      const { data } = await addLiquidity(amountA, amountB);
      if (data.success) {
        showMessage('Liquidity added successfully', 'success');
        setAmountA('');
        setAmountB('');
        onSuccess?.();
      }
    } catch (err) {
      showMessage(err.response?.data?.error || err.message || 'Failed to add liquidity', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async () => {
    if (!removeAmount || parseFloat(removeAmount) <= 0) {
      showMessage('Enter LP amount to remove', 'error');
      return;
    }
    setLoading(true);
    try {
      const { data } = await removeLiquidity(removeAmount);
      if (data.success) {
        showMessage('Liquidity removed successfully', 'success');
        setRemoveAmount('');
        onSuccess?.();
      }
    } catch (err) {
      showMessage(err.response?.data?.error || err.message || 'Failed to remove liquidity', 'error');
    } finally {
      setLoading(false);
    }
  };

  const setAmountAFromB = (b) => {
    setAmountB(b);
    setAmountA(b && ratio ? (parseFloat(b) / ratio).toString() : '');
  };
  const setAmountBFromA = (a) => {
    setAmountA(a);
    setAmountB(a && ratio ? (parseFloat(a) * ratio).toString() : '');
  };

  return (
    <div className="space-y-8">
      <PoolComposition reserves={reserves} />

      <section>
        <h3 className="text-sm font-semibold text-text mb-4">Add liquidity</h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-textMuted block mb-1">Token A</label>
            <input
              type="number"
              value={amountA}
              onChange={(e) => setAmountBFromA(e.target.value)}
              placeholder="0.0"
              className="w-full px-4 py-3 rounded-xl bg-surface border border-border text-text font-mono focus:outline-none focus:border-primary/50"
            />
          </div>
          <div>
            <label className="text-xs text-textMuted block mb-1">Token B</label>
            <input
              type="number"
              value={amountB}
              onChange={(e) => setAmountAFromB(e.target.value)}
              placeholder="0.0"
              className="w-full px-4 py-3 rounded-xl bg-surface border border-border text-text font-mono focus:outline-none focus:border-primary/50"
            />
          </div>
          <button
            onClick={handleAdd}
            disabled={loading || !amountA || !amountB}
            className="w-full py-3 rounded-xl font-semibold bg-primary hover:bg-primaryHover disabled:opacity-40 disabled:cursor-not-allowed text-bg transition-colors flex items-center justify-center gap-2"
          >
            <PlusIcon className="w-5 h-5" />
            Add liquidity
          </button>
        </div>
      </section>

      <div className="border-t border-border" />

      <section>
        <h3 className="text-sm font-semibold text-text mb-4">Remove liquidity</h3>
        <div className="space-y-3">
          <label className="text-xs text-textMuted block">LP tokens to burn</label>
          <input
            type="number"
            value={removeAmount}
            onChange={(e) => setRemoveAmount(e.target.value)}
            placeholder="0.0"
            className="w-full px-4 py-3 rounded-xl bg-surface border border-border text-text font-mono focus:outline-none focus:border-primary/50"
          />
          <button
            onClick={handleRemove}
            disabled={loading || !removeAmount}
            className="w-full py-3 rounded-xl font-semibold bg-danger/20 text-danger border border-danger/30 hover:bg-danger/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            <MinusIcon className="w-5 h-5" />
            Remove liquidity
          </button>
        </div>
      </section>
    </div>
  );
}
