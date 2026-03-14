import { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

export function PriceChart({ data }) {
  const chartData = useMemo(() => {
    if (!data?.length) return [];
    const base = data[0]?.t || Date.now();
    return data.map((d) => ({
      time: new Date(d.t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      price: Number(d.p.toFixed(6)),
    }));
  }, [data]);

  if (!chartData.length) {
    return (
      <div className="h-48 flex items-center justify-center text-textMuted text-sm">
        Execute swaps to see price history
      </div>
    );
  }

  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#14b8a6" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#14b8a6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#243049" vertical={false} />
          <XAxis dataKey="time" stroke="#8b9cb8" fontSize={10} tickLine={false} />
          <YAxis stroke="#8b9cb8" fontSize={10} tickLine={false} tickFormatter={(v) => v.toFixed(4)} domain={['auto', 'auto']} />
          <Tooltip
            contentStyle={{ backgroundColor: '#1a2540', border: '1px solid #243049', borderRadius: 8 }}
            labelStyle={{ color: '#8b9cb8' }}
            formatter={(value) => [value.toFixed(6), 'Price (A/B)']}
          />
          <Area type="monotone" dataKey="price" stroke="#14b8a6" strokeWidth={2} fill="url(#priceGradient)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
