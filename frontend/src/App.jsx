import { useState, useEffect } from 'react';
import { StatsBar } from './components/StatsBar';
import { SwapCard } from './components/SwapCard';
import { LiquidityCard } from './components/LiquidityCard';
import { AnalyticsCard } from './components/AnalyticsCard';
import { PriceChart } from './components/PriceChart';
import { SlippageChart } from './components/SlippageChart';
import { ILChart } from './components/ILChart';
import { ILCalculator } from './components/ILCalculator';
import { MarketArbitrageCard } from './components/MarketArbitrageCard';
import { WalletButton } from './components/WalletButton';
import { BacktestCard } from './components/BacktestCard';
import { MEVSimulator } from './components/MEVSimulator';
import { Toast } from './components/Toast';
import {
  getReserves,
  getStats,
  getTransactions,
  getPriceHistory,
  getSlippageCurve,
} from './api';

const TABS = [
  { id: 'swap', label: 'Swap' },
  { id: 'liquidity', label: 'Liquidity' },
  { id: 'analytics', label: 'Analytics' },
];

function App() {
  const [activeTab, setActiveTab] = useState('swap');
  const [reserves, setReserves] = useState({ reserveA: '0', reserveB: '0' });
  const [stats, setStats] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [priceHistory, setPriceHistory] = useState([]);
  const [slippageCurve, setSlippageCurve] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'success' });

  const refresh = () => {
    getReserves().then((r) => r.data.success && setReserves(r.data.data));
    getStats().then((r) => r.data.success && setStats(r.data.data));
    getTransactions(20).then((r) => r.data.success && setTransactions(r.data.data.transactions));
    getPriceHistory().then((r) => r.data.success && setPriceHistory(r.data.data));
    getSlippageCurve('A').then((r) => r.data.success && setSlippageCurve(r.data.data));
  };

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 4000);
    return () => clearInterval(interval);
  }, []);

  const showMessage = (msg, type = 'success') => {
    setToast({ message: msg, type });
    setTimeout(() => setToast((t) => ({ ...t, message: '' })), 5000);
  };

  return (
    <div className="min-h-screen bg-bg">
      <header className="border-b border-border bg-surface/95 backdrop-blur sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display font-semibold text-xl text-text">Crypto AMM</h1>
              <p className="text-xs text-textMuted mt-0.5">Constant product · x×y=k · 0.3% fee</p>
            </div>
            <WalletButton />
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <StatsBar reserves={reserves} stats={stats} />

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-2xl bg-surface border border-border overflow-hidden">
              <div className="flex border-b border-border">
                {TABS.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 py-3.5 text-sm font-medium transition-colors ${
                      activeTab === tab.id
                        ? 'text-primary border-b-2 border-primary bg-primary/5'
                        : 'text-textMuted hover:text-text hover:bg-white/5'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <div className="p-6">
                {activeTab === 'swap' && (
                  <SwapCard
                    onSuccess={refresh}
                    loading={loading}
                    setLoading={setLoading}
                    showMessage={showMessage}
                    reserves={reserves}
                  />
                )}
                {activeTab === 'liquidity' && (
                  <LiquidityCard
                    onSuccess={refresh}
                    loading={loading}
                    setLoading={setLoading}
                    showMessage={showMessage}
                    reserves={reserves}
                  />
                )}
                {activeTab === 'analytics' && (
                  <AnalyticsCard transactions={transactions} stats={stats} />
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <MarketArbitrageCard reserves={reserves} />

            <div className="rounded-2xl bg-surface border border-border p-5">
              <h3 className="text-sm font-semibold text-text mb-4">Price (A/B)</h3>
              <PriceChart data={priceHistory} />
            </div>

            <div className="rounded-2xl bg-surface border border-border p-5">
              <h3 className="text-sm font-semibold text-text mb-4">Slippage by trade size</h3>
              <SlippageChart data={slippageCurve} />
            </div>

            <BacktestCard />

            <MEVSimulator />

            <div className="rounded-2xl bg-surface border border-border p-5">
              <h3 className="text-sm font-semibold text-text mb-4">Impermanent loss</h3>
              <p className="text-xs text-textMuted mb-3">IL vs price ratio (P/P₀)</p>
              <ILChart />
              <ILCalculator currentPrice={reserves?.reserveA > 0 ? reserves.reserveB / reserves.reserveA : 1} />
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-2xl bg-surface border border-border p-6">
          <h3 className="font-display font-semibold text-text mb-4">How it works</h3>
          <div className="grid md:grid-cols-3 gap-6 text-sm text-textMuted">
            <div>
              <h4 className="font-medium text-primary mb-2">Swap</h4>
              <p>Trade Token A ↔ B using the constant product formula. Price impact increases with trade size.</p>
            </div>
            <div>
              <h4 className="font-medium text-primary mb-2">Liquidity</h4>
              <p>Provide both tokens in the pool ratio to earn 0.3% of each swap as fees.</p>
            </div>
            <div>
              <h4 className="font-medium text-primary mb-2">Impermanent loss</h4>
              <p>LP value can diverge from holding if the price ratio changes. Fees may offset IL.</p>
            </div>
          </div>
        </div>
      </main>

      <Toast
        message={toast.message}
        type={toast.type}
        onDismiss={() => setToast((t) => ({ ...t, message: '' }))}
      />
    </div>
  );
}

export default App;
