import { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import { getILCurve } from '../api';

export function ILChart() {
  const [data, setData] = useState([]);

  useEffect(() => {
    getILCurve().then((r) => r.data.success && setData(r.data.data));
  }, []);

  if (!data.length) {
    return (
      <div className="h-44 flex items-center justify-center text-textMuted text-sm">
        Loading…
      </div>
    );
  }

  return (
    <div className="h-44">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#243049" vertical={false} />
          <XAxis
            dataKey="ratio"
            stroke="#8b9cb8"
            fontSize={10}
            tickLine={false}
            tickFormatter={(v) => v.toFixed(1)}
          />
          <YAxis
            stroke="#8b9cb8"
            fontSize={10}
            tickLine={false}
            tickFormatter={(v) => `${v.toFixed(1)}%`}
            domain={[-50, 0]}
          />
          <ReferenceLine y={0} stroke="#243049" strokeDasharray="4 4" />
          <Tooltip
            contentStyle={{ backgroundColor: '#1a2540', border: '1px solid #243049', borderRadius: 8 }}
            formatter={(value) => [`${Number(value).toFixed(2)}%`, 'Impermanent Loss']}
            labelFormatter={(label) => `Price ratio: ${Number(label).toFixed(2)}x`}
          />
          <Line
            type="monotone"
            dataKey="impermanentLossPercent"
            stroke="#ef4444"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
