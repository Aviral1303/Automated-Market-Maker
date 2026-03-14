import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

export function SlippageChart({ data }) {
  if (!data?.length) {
    return (
      <div className="h-40 flex items-center justify-center text-textMuted text-sm">
        Loading slippage data…
      </div>
    );
  }

  const maxIn = data[data.length - 1]?.amountIn || 1;
  const chartData = data.map((d) => ({
    size: `${((d.amountIn / maxIn) * 100).toFixed(0)}%`,
    slippage: d.slippageBps,
  }));

  return (
    <div className="h-40">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="#243049" horizontal={false} />
          <XAxis type="number" stroke="#8b9cb8" fontSize={10} tickLine={false} tickFormatter={(v) => `${v} bps`} />
          <YAxis type="category" dataKey="size" stroke="#8b9cb8" fontSize={10} tickLine={false} width={36} />
          <Tooltip
            contentStyle={{ backgroundColor: '#1a2540', border: '1px solid #243049', borderRadius: 8 }}
            formatter={(value) => [`${value} bps`, 'Slippage']}
          />
          <Bar dataKey="slippage" fill="#f59e0b" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
